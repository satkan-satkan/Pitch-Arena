import pg from "pg";
import { randomBytes } from "node:crypto";
import { openPostgres } from "../server/postgres.js";
export async function createPgTestStore() {
  const connectionString =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "Set TEST_DATABASE_URL or DATABASE_URL for PostgreSQL tests",
    );
  const schema = `pa_test_${randomBytes(8).toString("hex")}`;
  const owner = new pg.Client({ connectionString });
  await owner.connect();
  await owner.query(`CREATE SCHEMA ${schema}`);
  try {
    const store = await openPostgres({ connectionString, schema });
    const close = store.close;
    store.close = async () => {
      await close();
      await owner.query(`DROP SCHEMA ${schema} CASCADE`);
      await owner.end();
    };
    return store;
  } catch (error) {
    await owner.query(`DROP SCHEMA ${schema} CASCADE`);
    await owner.end();
    throw error;
  }
}
