import { createApp } from "../server/app.js";
import { createPgTestStore } from "./postgres-fixture.mjs";
import { grantOwner } from "../server/admin.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const listing = {
  name: "Oral Studio",
  tagline: "Tools for independent founders",
  description:
    "A real product that helps founders prepare and share their progress.",
  category: "saas",
  stage: "live",
  region: "Kazakhstan",
  links: {
    website: "https://example.com",
    github: "https://github.com/example",
  },
  monthlyRevenue: 0,
  currency: "USD",
};
export async function communityFixture() {
  const store = await createPgTestStore(),
    dir = mkdtempSync(join(tmpdir(), "pa-community-"));
  const app = createApp({
    store,
    assetDir: join(dir, "assets"),
    mentor: { ready: false },
    secureCookies: false,
  });
  await app.ready;
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  const request = async (path, { method = "GET", data, cookie } = {}) => {
    const r = await fetch(origin + "/api" + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const register = async (email, admin = false) => {
    const r = await request("/auth/register", {
      method: "POST",
      data: {
        email,
        password: "community test password 123",
        name: email.split("@")[0],
      },
    });
    if (admin) await grantOwner(store, email);
    return r;
  };
  return {
    store,
    origin,
    request,
    register,
    close: async () => {
      await new Promise((r) => app.server.close(r));
      await store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
