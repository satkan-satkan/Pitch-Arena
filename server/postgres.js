import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const { Pool } = pg;
pg.types.setTypeParser(20, (value) => Number(value));
const migrationsDir = new URL("./migrations/", import.meta.url);
// Existing repositories use positional ? placeholders; SQL is static application code.
const parameters = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};
export async function openPostgres({
  connectionString = process.env.DATABASE_URL,
  schema,
  migrate = true,
} = {}) {
  if (!connectionString)
    throw new Error("DATABASE_URL is required. See .env.example.");
  if (schema && !/^[a-z][a-z0-9_]*$/.test(schema))
    throw new Error("Invalid schema");
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
  });
  pool.on("error", () => console.error("PostgreSQL connection error"));
  const context = new AsyncLocalStorage();
  const query = (sql, params = []) =>
    (context.getStore() || pool).query(parameters(sql), params);
  const store = {
    dialect: "postgres",
    pool,
    async get(sql, ...params) {
      return (await query(sql, params)).rows[0];
    },
    async all(sql, ...params) {
      return (await query(sql, params)).rows;
    },
    async run(sql, ...params) {
      const r = await query(sql, params);
      return { changes: r.rowCount };
    },
    async transaction(fn) {
      if (context.getStore()) return fn();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await context.run(client, fn);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    // Transaction-scoped lock, shared by every API process using this database.
    async lock(key) {
      await query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", [key]);
    },
    async close() {
      await pool.end();
    },
  };
  try {
    if (migrate)
      await store.transaction(async () => {
        await store.lock("pitch-arena:migrations");
        await store.run(
          "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)",
        );
        const files = readdirSync(migrationsDir)
          .filter((f) => /^\d+.*\.sql$/.test(f))
          .sort();
        const applied = await store.all("SELECT * FROM schema_migrations");
        if (applied.some((m) => !files.includes(m.name)))
          throw new Error("Database contains newer migrations");
        for (const name of files) {
          const sql = readFileSync(new URL(name, migrationsDir), "utf8");
          const checksum = createHash("sha256").update(sql).digest("hex");
          const old = applied.find((m) => m.name === name);
          if (old) {
            if (old.checksum !== checksum)
              throw new Error(`Migration changed: ${name}`);
            continue;
          }
          await store.run(sql);
          await store.run(
            "INSERT INTO schema_migrations VALUES(?,?,?)",
            name,
            checksum,
            new Date().toISOString(),
          );
        }
      });
    else await store.get("SELECT 1");
    return store;
  } catch (error) {
    await pool.end();
    throw error;
  }
}
