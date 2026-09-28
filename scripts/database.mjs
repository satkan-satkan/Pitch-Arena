import { openPostgres } from "../server/postgres.js";
import { seedCatalog } from "../server/catalog.js";
import { importSqlite } from "../server/import-sqlite.js";
import { grantOwner } from "../server/admin.js";
const [command, ...args] = process.argv.slice(2);
let store;
try {
  store = await openPostgres();
  if (command === "migrate") {
    await seedCatalog(store);
    console.log("PostgreSQL migrations and catalog are ready.");
  } else if (command === "import-sqlite")
    console.log(
      JSON.stringify(
        await importSqlite(store, args[0] ? { source: args[0] } : {}),
        null,
        2,
      ),
    );
  else if (command === "grant-admin") {
    if (!args[0])
      throw new Error("Usage: npm run admin:grant -- account@example.com");
    console.log(JSON.stringify(await grantOwner(store, args[0])));
  } else throw new Error("Commands: migrate, import-sqlite, grant-admin");
} catch (error) {
  console.error(error.code || error.message);
  process.exitCode = 1;
} finally {
  await store?.close();
}
