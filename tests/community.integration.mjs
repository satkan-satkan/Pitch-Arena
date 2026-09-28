import test from "node:test";
import assert from "node:assert/strict";
import { communityFixture, listing } from "./community-fixture.mjs";
const setup = async (t) => {
  const f = await communityFixture();
  t.after(f.close);
  return f;
};
const create = async (f, cookie, teamId = null) => {
  const r = await f.request("/workspace/startups", {
    method: "POST",
    cookie,
    data: { teamId, data: listing },
  });
  assert.equal(r.status, 200);
  return r.data.id;
};
const mine = async (f, cookie, id) =>
  (await f.request("/workspace/startups", { cookie })).data.items.find(
    (s) => s.id === id,
  );
test("Drafts, private owners and team membership never leak into the public directory", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    stranger = await f.register("other@example.com");
  const id = await create(f, owner.cookie);
  assert.equal((await f.request("/startups")).data.total, 0);
  assert.equal((await f.request(`/startups/${id}`)).status, 404);
  assert.equal((await f.request("/workspace/startups")).status, 401);
  assert.equal(
    (await f.request("/workspace/startups", { cookie: stranger.cookie })).data
      .items.length,
    0,
  );
  assert.equal(
    (
      await f.request(`/workspace/startups/${id}`, {
        method: "PUT",
        cookie: stranger.cookie,
        data: { revision: 1, data: listing },
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.request("/admin/startups", { cookie: owner.cookie })).status,
    403,
  );
  assert.equal(
    (
      await f.request(`/admin/startups/${id}`, {
        method: "PUT",
        cookie: owner.cookie,
        data: { revision: 1, action: "publish", reason: "Attempt" },
      })
    ).status,
    403,
  );
});
test("Moderation publishes reviewed snapshots; revisions reject stale approval and drafts cannot change public data", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    admin = await f.register("admin@example.com", true);
  const id = await create(f, owner.cookie);
  const mutate = (suffix, revision) =>
    f.request(`/workspace/startups/${id}/${suffix}`, {
      method: "POST",
      cookie: owner.cookie,
      data: { revision },
    });
  const approve = (revision) =>
    f.request(`/admin/startups/${id}`, {
      method: "PUT",
      cookie: admin.cookie,
      data: { revision, action: "publish", reason: "Reviewed content" },
    });
  assert.equal((await approve(1)).status, 409);
  assert.equal((await mutate("submit", 1)).status, 200);
  assert.equal((await approve(2)).status, 200);
  let pub = (await f.request(`/startups/${id}`)).data;
  assert.equal(pub.monthlyRevenue, 0);
  assert.equal(pub.revenueVerification, "self_reported");
  assert.equal(pub.owner_id, undefined);
  assert.equal(pub.moderationNote, undefined);
  assert.equal(
    (
      await f.request(`/workspace/startups/${id}`, {
        method: "PUT",
        cookie: owner.cookie,
        data: { revision: 3, data: { ...listing, name: "Private new name" } },
      })
    ).status,
    200,
  );
  assert.equal((await f.request("/startups?q=Private")).data.total, 0);
  assert.equal((await f.request(`/startups/${id}`)).data.name, listing.name);
  assert.equal((await mutate("submit", 4)).status, 200);
  await f.request(`/workspace/startups/${id}`, {
    method: "PUT",
    cookie: owner.cookie,
    data: { revision: 5, data: { ...listing, name: "Another private name" } },
  });
  assert.equal((await approve(5)).status, 409);
  assert.equal((await mutate("submit", 6)).status, 200);
  assert.equal((await approve(7)).status, 200);
  assert.equal(
    (await f.request(`/startups/${id}`)).data.name,
    "Another private name",
  );
  assert.equal((await mutate("withdraw", 8)).status, 200);
  assert.equal((await f.request(`/startups/${id}`)).status, 404);
  const audits = (await f.request("/admin/audit", { cookie: admin.cookie }))
    .data.items;
  assert.equal(audits.filter((v) => v.action === "startup.publish").length, 2);
});
test("Invitations require acceptance; members are read-only and removed editors immediately lose access", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    editor = await f.register("editor@example.com"),
    reader = await f.register("reader@example.com");
  const team = (
    await f.request("/workspace/teams", {
      method: "POST",
      cookie: owner.cookie,
      data: {
        name: "Founders",
        description: "Our team",
        links: { telegram: "https://t.me/example" },
      },
    })
  ).data.id;
  const id = await create(f, owner.cookie, team);
  const invite = async (u, role) => {
    const r = await f.request(`/workspace/teams/${team}/invitations`, {
      method: "POST",
      cookie: owner.cookie,
      data: { email: u.data.user.email, role },
    });
    assert.equal(r.status, 200);
    return r.data.id;
  };
  const invitation = await invite(editor, "editor");
  assert.equal(
    (await f.request("/workspace/startups", { cookie: editor.cookie })).data
      .items.length,
    0,
  );
  assert.equal(
    (
      await f.request(`/workspace/invitations/${invitation}/accept`, {
        method: "POST",
        cookie: reader.cookie,
        data: {},
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request(`/workspace/invitations/${invitation}/accept`, {
        method: "POST",
        cookie: editor.cookie,
        data: {},
      })
    ).status,
    200,
  );
  assert.equal((await mine(f, editor.cookie, id)).canEdit, true);
  const edit = () =>
    f.request(`/workspace/startups/${id}`, {
      method: "PUT",
      cookie: editor.cookie,
      data: { revision: 1, data: { ...listing, name: "Team edition" } },
    });
  assert.equal((await edit()).status, 200);
  const ri = await invite(reader, "member");
  await f.request(`/workspace/invitations/${ri}/accept`, {
    method: "POST",
    cookie: reader.cookie,
    data: {},
  });
  assert.equal((await mine(f, reader.cookie, id)).canEdit, false);
  assert.equal(
    (
      await f.request(`/workspace/startups/${id}/submit`, {
        method: "POST",
        cookie: reader.cookie,
        data: { revision: 2 },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(`/workspace/teams/${team}/invitations`, {
        method: "POST",
        cookie: editor.cookie,
        data: { email: "evil@example.com", role: "editor" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        `/workspace/teams/${team}/members/${editor.data.user.id}`,
        { method: "DELETE", cookie: owner.cookie, data: {} },
      )
    ).status,
    200,
  );
  assert.equal((await edit()).status, 403);
  assert.equal(
    (await f.request("/workspace/startups", { cookie: editor.cookie })).data
      .items.length,
    0,
  );
});
test("Links reject scripts and embedded credentials; ownership and publication fields cannot be injected", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com");
  for (const links of [
    { website: "javascript:alert(1)" },
    { website: "http://example.com" },
    { website: "https://user:password@example.com" },
    { unknown: "https://example.com" },
  ])
    assert.equal(
      (
        await f.request("/workspace/startups", {
          method: "POST",
          cookie: owner.cookie,
          data: { teamId: null, data: { ...listing, links } },
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await f.request("/workspace/startups", {
        method: "POST",
        cookie: owner.cookie,
        data: { teamId: null, data: { ...listing, status: "published" } },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/workspace/teams", {
        method: "POST",
        cookie: owner.cookie,
        data: { name: "Team", description: "", links: {}, owner_id: "another" },
      })
    ).status,
    400,
  );
});
test("Concurrent listing updates have one winner; rejection feedback stays private and admins can hide published listings", async (t) => {
  const f = await setup(t),
    owner = await f.register("owner@example.com"),
    admin = await f.register("admin@example.com", true),
    id = await create(f, owner.cookie);
  const results = await Promise.all(
    ["First change", "Second change"].map((name) =>
      f.request(`/workspace/startups/${id}`, {
        method: "PUT",
        cookie: owner.cookie,
        data: { revision: 1, data: { ...listing, name } },
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const submit = (revision) =>
    f.request(`/workspace/startups/${id}/submit`, {
      method: "POST",
      cookie: owner.cookie,
      data: { revision },
    });
  const mod = (revision, action) =>
    f.request(`/admin/startups/${id}`, {
      method: "PUT",
      cookie: admin.cookie,
      data: { revision, action, reason: "Feedback for founder" },
    });
  await submit(2);
  assert.equal((await mod(3, "reject")).status, 200);
  assert.equal(
    (await mine(f, owner.cookie, id)).moderationNote,
    "Feedback for founder",
  );
  assert.equal((await f.request(`/startups/${id}`)).status, 404);
  await submit(4);
  await mod(5, "publish");
  assert.equal((await f.request(`/startups/${id}`)).status, 200);
  assert.equal((await mod(6, "hide")).status, 200);
  assert.equal((await f.request(`/startups/${id}`)).status, 404);
});
