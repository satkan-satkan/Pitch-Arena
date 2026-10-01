import test from "node:test";
import assert from "node:assert/strict";
import { communityFixture, listing } from "./community-fixture.mjs";

test("Personal profile fields persist without creating or publishing a startup", async (t) => {
  const f = await communityFixture();
  t.after(() => f.close());
  const owner = await f.register("profile-flow@example.com");
  const data = {
    name: "Алия",
    startup: "My private pitch",
    industry: "HealthTech",
    bio: "Создаю продукт для врачей",
    role: "Основатель",
    location: "Алматы, Казахстан",
  };
  assert.equal(
    (await f.request("/profile", { method: "PUT", cookie: owner.cookie, data }))
      .status,
    200,
  );
  const saved = (await f.request("/bootstrap", { cookie: owner.cookie })).data
    .user.profile;
  assert.equal(saved.role, data.role);
  assert.equal(saved.location, data.location);
  assert.equal((await f.request("/startups")).data.total, 0);
  assert.equal(
    (await f.request("/workspace/startups", { cookie: owner.cookie })).data
      .items.length,
    0,
  );
  assert.equal(
    (
      await f.request("/profile", {
        method: "PUT",
        cookie: owner.cookie,
        data: { ...data, role: "x".repeat(81) },
      })
    ).status,
    400,
  );
  assert.equal(
    (await f.request("/bootstrap", { cookie: owner.cookie })).data.user.profile
      .role,
    data.role,
  );
});

test("Only a personal listing owner who owns the team can share it; published snapshots and private pitches stay separate", async (t) => {
  const f = await communityFixture();
  t.after(() => f.close());
  const owner = await f.register("team-owner@example.com", true);
  const member = await f.register("team-member@example.com");
  const stranger = await f.register("stranger@example.com");
  const team = (
    await f.request("/workspace/teams", {
      method: "POST",
      cookie: owner.cookie,
      data: { name: "Orbit", description: "", links: {} },
    })
  ).data.id;
  const invitation = (
    await f.request(`/workspace/teams/${team}/invitations`, {
      method: "POST",
      cookie: owner.cookie,
      data: { email: "team-member@example.com", role: "member" },
    })
  ).data.id;
  await f.request(`/workspace/invitations/${invitation}/accept`, {
    method: "POST",
    cookie: member.cookie,
    data: {},
  });
  const create = async (cookie) =>
    (
      await f.request("/workspace/startups", {
        method: "POST",
        cookie,
        data: { teamId: null, data: listing },
      })
    ).data.id;
  const id = await create(owner.cookie);
  const memberListing = await create(member.cookie);
  const share = (cookie, revision, listingId = id) =>
    f.request(`/workspace/startups/${listingId}/team`, {
      method: "POST",
      cookie,
      data: { revision, teamId: team },
    });
  assert.equal((await share(stranger.cookie, 1)).status, 403);
  assert.equal((await share(member.cookie, 1, memberListing)).status, 403);
  assert.equal((await share(owner.cookie, 2)).status, 409);
  assert.equal(
    (await f.request("/workspace/startups", { cookie: member.cookie })).data
      .items.length,
    1,
  );
  await f.request(`/workspace/startups/${id}/submit`, {
    method: "POST",
    cookie: owner.cookie,
    data: { revision: 1 },
  });
  await f.request(`/admin/startups/${id}`, {
    method: "PUT",
    cookie: owner.cookie,
    data: { revision: 2, action: "publish", reason: "Reviewed" },
  });
  const before = (await f.request(`/startups/${id}`)).data;
  await f.request("/projects", {
    method: "POST",
    cookie: owner.cookie,
    data: { name: "Private training project" },
  });
  assert.equal((await share(owner.cookie, 3)).status, 200);
  assert.deepEqual((await f.request(`/startups/${id}`)).data, before);
  const shared = (
    await f.request("/workspace/startups", { cookie: member.cookie })
  ).data.items.find((s) => s.id === id);
  assert.equal(shared.teamId, team);
  assert.equal(shared.canEdit, false);
  assert.equal(shared.revision, 4);
  assert.equal(
    (await f.request("/bootstrap", { cookie: member.cookie })).data.projects
      .length,
    0,
  );
  assert.equal((await share(owner.cookie, 4)).status, 403);
  assert.equal(
    (
      await f.request(`/workspace/startups/${id}`, {
        method: "PUT",
        cookie: member.cookie,
        data: { revision: 4, data: { ...listing, name: "Forbidden edit" } },
      })
    ).status,
    403,
  );
  await f.request(`/workspace/teams/${team}/members/${member.data.user.id}`, {
    method: "DELETE",
    cookie: owner.cookie,
    data: {},
  });
  assert.equal(
    (
      await f.request("/workspace/startups", { cookie: member.cookie })
    ).data.items.some((s) => s.id === id),
    false,
  );
});
