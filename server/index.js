import { createApp } from "./app.js";
const app = createApp();
const port = Number(process.env.API_PORT || 3001),
  host = process.env.HOST || "127.0.0.1";
app.server.listen(port, host, () =>
  console.log(`Pitch Arena server: http://${host}:${port}`),
);
const stop = () =>
  app.server.close(() => {
    app.store.close();
    process.exit(0);
  });
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
