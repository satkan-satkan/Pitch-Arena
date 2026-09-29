import test from "node:test";
import assert from "node:assert/strict";
import { communityFixture } from "./community-fixture.mjs";
import { seedCatalog, investorEdit } from "../server/catalog.js";
const fund = {
  title: ["Новый фонд", "New fund"],
  description: ["Учебная симуляция", "Practice simulation"],
  pitchSeconds: 120,
  level: 3,
  enabled: true,
  region: "cis",
  country: "398",
  city: ["Алматы, Казахстан", "Almaty, Kazakhstan"],
  coordinates: [76.89, 43.24],
  source: "https://example.com",
  symbol: "NF",
};
const person = {
  name: ["Новый инвестор", "New investor"],
  role: "New fund",
  focus: ["Проверка спроса", "Demand validation"],
  source: "https://example.com",
  enabled: true,
  arenaId: "test-fund",
  level: 3,
};
test("Only admins create validated, unique funds and investors; linked people enter new sessions and snapshots remain stable", async () => {
  const f = await communityFixture();
  try {
    const admin = await f.register("admin@example.com", true),
      member = await f.register("member@example.com");
    const call = (kind, id, data, cookie = admin.cookie) =>
      f.request(`/admin/catalog/${kind}`, {
        method: "POST",
        cookie,
        data: { id, data, reason: "Test catalog creation" },
      });
    assert.equal(
      (await call("arena", "test-fund", fund, member.cookie)).status,
      403,
    );
    assert.equal(
      (await call("arena", "test-fund", { ...fund, coordinates: [181, 0] }))
        .status,
      400,
    );
    assert.equal((await call("investor", "test-person", person)).status, 400);
    assert.equal((await call("arena", "test-fund", fund)).status, 200);
    assert.equal((await call("arena", "test-fund", fund)).status, 409);
    assert.equal((await call("investor", "test-person", person)).status, 200);
    await seedCatalog(f.store);
    let catalog = (await f.request("/catalog")).data;
    for (const p of catalog.investors) {
      assert.ok(
        investorEdit.safeParse({
          name: p.name,
          role: p.role,
          focus: p.focus,
          source: p.source,
          enabled: p.enabled,
        }).success,
        `${p.id} can be edited without reshaping its fields`,
      );
    }
    const a = catalog.arenas.find((a) => a.id === "test-fund");
    assert.deepEqual(a.personaIds, ["test-person"]);
    assert.equal(a.panelMembers[0].name[1], "New investor");
    const p = (
      await f.request("/projects", {
        method: "POST",
        cookie: member.cookie,
        data: { name: "Test product" },
      })
    ).data;
    const session = await f.request("/sessions", {
      method: "POST",
      cookie: member.cookie,
      data: {
        projectId: p.id,
        arenaId: a.id,
        personaId: "test-person",
        ask: 100000,
        pitchSeconds: 120,
        language: "en",
        spokenQuestions: false,
      },
    });
    assert.equal(session.status, 201);
    assert.equal(
      session.data.config.arena.panelMembers[0].name[1],
      "New investor",
    );
    const edited = await f.request("/admin/catalog/investor/test-person", {
      method: "PUT",
      cookie: admin.cookie,
      data: {
        revision: 1,
        data: { ...person, enabled: false, name: ["Изменено", "Changed"] },
        reason: "Hide for testing",
      },
    });
    assert.equal(edited.status, 200);
    const saved = (
      await f.request(`/sessions/${session.data.id}`, { cookie: member.cookie })
    ).data;
    assert.equal(saved.config.arena.panelMembers[0].name[1], "New investor");
    catalog = (await f.request("/catalog")).data;
    assert.ok(
      !catalog.arenas
        .find((a) => a.id === "test-fund")
        ?.personaIds?.includes("test-person"),
    );
    const audit = (await f.request("/admin/audit", { cookie: admin.cookie }))
      .data.items;
    assert.equal(audit.filter((a) => a.action === "catalog.created").length, 2);
  } finally {
    await f.close();
  }
});
