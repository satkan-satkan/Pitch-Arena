import { DatabaseSync, backup } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, copyFileSync, statSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
const columns = {
  users: ["id", "email", "password_hash", "profile", "created_at"],
  logins: ["token_hash", "user_id", "expires"],
  projects: ["id", "user_id", "name", "industry", "description", "created_at"],
  sessions: [
    "id",
    "user_id",
    "project_id",
    "status",
    "data",
    "revision",
    "created_at",
    "updated_at",
  ],
  assets: ["id", "session_id", "user_id", "name", "mime", "bytes", "path"],
  imports: ["user_id", "source_id", "data"],
};
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function importSqlite(
  store,
  {
    source = resolve(".data/pitch-arena.sqlite"),
    backupRoot = resolve(".data/backups"),
  } = {},
) {
  if (store.dialect !== "postgres")
    throw new Error("Import target must be PostgreSQL");
  const db = new DatabaseSync(source, { readOnly: true });
  let backupDir;
  try {
    const version = db.prepare("PRAGMA user_version").get().user_version;
    if (version > 3) throw new Error("Unsupported SQLite schema");
    backupDir = join(
      backupRoot,
      new Date().toISOString().replace(/[:.]/g, "-"),
    );
    mkdirSync(join(backupDir, "assets"), { recursive: true, mode: 0o700 });
    await backup(db, join(backupDir, "pitch-arena.sqlite"));
    chmodSync(join(backupDir, "pitch-arena.sqlite"), 0o600);
  } finally {
    db.close();
  }
  const snapshot = new DatabaseSync(join(backupDir, "pitch-arena.sqlite"), {
    readOnly: true,
  });
  const data = {};
  try {
    for (const [table, fields] of Object.entries(columns))
      data[table] = snapshot
        .prepare(
          `SELECT ${fields.join(",")} FROM ${table} ORDER BY ${fields.slice(0, table === "imports" ? 2 : 1).join(",")}`,
        )
        .all();
  } finally {
    snapshot.close();
  }
  for (const asset of data.assets) {
    if (statSync(asset.path).size !== asset.bytes)
      throw new Error("Source slide is missing or has an unexpected size");
    const destination = join(backupDir, "assets", asset.id);
    if (
      resolve(destination) !== join(resolve(backupDir), "assets", asset.id) ||
      !/^[a-zA-Z0-9-]+$/.test(asset.id)
    )
      throw new Error("Invalid asset id");
    copyFileSync(asset.path, destination);
    chmodSync(destination, 0o600);
  }
  const sourceHash = digest(data),
    counts = Object.fromEntries(
      Object.entries(data).map(([table, rows]) => [table, rows.length]),
    );
  return store.transaction(async () => {
    await store.lock("pitch-arena:sqlite-import");
    const previous = await store.get(
      "SELECT counts FROM data_imports WHERE source_hash=?",
      sourceHash,
    );
    if (previous)
      return {
        alreadyImported: true,
        counts: JSON.parse(previous.counts),
        backupDir,
      };
    await store.run(
      `LOCK TABLE ${Object.keys(columns).join(",")} IN ACCESS EXCLUSIVE MODE`,
    );
    for (const table of Object.keys(columns))
      if (
        Number((await store.get(`SELECT count(*) AS n FROM ${table}`)).n) !== 0
      )
        throw new Error("Target contains data; refusing to merge or overwrite");
    for (const [table, fields] of Object.entries(columns)) {
      for (const row of data[table])
        await store.run(
          `INSERT INTO ${table}(${fields.join(",")}) VALUES(${fields.map(() => "?").join(",")})`,
          ...fields.map((f) => row[f]),
        );
      const copied = await store.all(
        `SELECT ${fields.join(",")} FROM ${table} ORDER BY ${fields.slice(0, table === "imports" ? 2 : 1).join(",")}`,
      );
      if (digest(copied) !== digest(data[table]))
        throw new Error(`Verification failed for ${table}`);
    }
    await store.run(
      "INSERT INTO data_imports VALUES(?,?,?)",
      sourceHash,
      JSON.stringify(counts),
      new Date().toISOString(),
    );
    return { alreadyImported: false, counts, backupDir };
  });
}
