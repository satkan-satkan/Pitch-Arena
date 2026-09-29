import { createApp } from "./app.js";
import { openPostgres } from "./postgres.js";
import { createMailer } from "./mailer.js";
const app = createApp({ store: await openPostgres(), mailer: createMailer() });
await app.ready;
const port = Number(process.env.API_PORT || 3001),
  host = process.env.HOST || "127.0.0.1";
app.server.listen(port, host, () =>
  console.log(`Pitch Arena server: http://${host}:${port}`),
);
const stop = () =>
  app.server.close(async () => {
    await app.drainMail();
    await app.store.close();
    process.exit(0);
  });
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
