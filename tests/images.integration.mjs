import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { communityFixture, listing } from "./community-fixture.mjs";

const picture = async (background) =>
  `data:image/png;base64,${(
    await sharp({
      create: { width: 420, height: 300, channels: 3, background },
    })
      .png()
      .toBuffer()
  ).toString("base64")}`;
const profile = {
  name: "Founder",
  startup: "Orbit",
  industry: "SaaS",
  bio: "Hello",
};
test("Avatars are normalized, persist privately, can be removed, and reject unsafe uploads", async (t) => {
  const f = await communityFixture();
  t.after(f.close);
  const owner = await f.register("avatar@example.com"),
    other = await f.register("other@example.com");
  const save = (avatar) =>
    f.request("/profile", {
      method: "PUT",
      cookie: owner.cookie,
      data: { ...profile, avatar },
    });
  const saved = await save(await picture("#46748a"));
  assert.equal(saved.status, 200);
  const avatar = saved.data.profile.avatar;
  assert.ok(avatar.startsWith("data:image/webp;base64,"));
  assert.ok(avatar.length <= 64000);
  const meta = await sharp(
    Buffer.from(avatar.split(",")[1], "base64"),
  ).metadata();
  assert.equal(meta.width, 256);
  assert.equal(meta.height, 256);
  assert.equal(meta.exif, undefined);
  assert.equal(
    (await f.request("/bootstrap", { cookie: owner.cookie })).data.user.profile
      .avatar,
    avatar,
  );
  assert.ok(
    !JSON.stringify(
      (await f.request("/bootstrap", { cookie: other.cookie })).data,
    ).includes(avatar),
  );
  assert.equal((await f.request("/bootstrap")).data.user, null);
  for (const invalid of [
    "https://example.com/a.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,YmFk",
    `data:image/png;base64,${"A".repeat(64000)}`,
  ]) {
    assert.equal((await save(invalid)).status, 400);
  }
  const huge = `data:image/png;base64,${(
    await sharp({
      create: { width: 4100, height: 4000, channels: 3, background: "black" },
    })
      .png()
      .toBuffer()
  ).toString("base64")}`;
  assert.equal((await save(huge)).status, 400);
  assert.equal((await save(avatar)).data.profile.avatar, avatar);
  assert.equal((await save("")).data.profile.avatar, "");
  assert.equal(
    (await f.request("/bootstrap", { cookie: owner.cookie })).data.user.profile
      .bio,
    profile.bio,
  );
});

test("Startup images and new metrics follow reviewed snapshots and ownership", async (t) => {
  const f = await communityFixture();
  t.after(f.close);
  const owner = await f.register("founder@example.com"),
    admin = await f.register("admin@example.com", true),
    stranger = await f.register("stranger@example.com");
  const data = {
    ...listing,
    logo: await picture("#d5dd5d"),
    founderAvatar: await picture("#434343"),
    founderName: "Alex Founder",
    foundedMonth: "2025-03",
    totalRevenue: 15000,
    monthlyRecurringRevenue: 0,
  };
  const created = await f.request("/workspace/startups", {
    method: "POST",
    cookie: owner.cookie,
    data: { teamId: null, data },
  });
  assert.equal(created.status, 200);
  const id = created.data.id;
  assert.equal((await f.request(`/startups/${id}`)).status, 404);
  const submit = (revision) =>
    f.request(`/workspace/startups/${id}/submit`, {
      method: "POST",
      cookie: owner.cookie,
      data: { revision },
    });
  const approve = (revision) =>
    f.request(`/admin/startups/${id}`, {
      method: "PUT",
      cookie: admin.cookie,
      data: {
        revision,
        action: "publish",
        reason: "Reviewed images and reported metrics",
      },
    });
  assert.equal((await submit(1)).status, 200);
  assert.equal((await approve(2)).status, 200);
  const published = (await f.request(`/startups/${id}`)).data;
  assert.ok(published.logo.startsWith("data:image/webp;base64,"));
  assert.ok(published.founderAvatar.startsWith("data:image/webp;base64,"));
  assert.equal(published.monthlyRecurringRevenue, 0);
  assert.equal(published.totalRevenue, 15000);
  assert.equal(published.founderName, data.founderName);
  assert.equal(published.foundedMonth, data.foundedMonth);
  const edited = {
    ...data,
    logo: await picture("#4d738b"),
    founderAvatar: "",
    monthlyRecurringRevenue: null,
  };
  const edit = (cookie, changes, revision = 3) =>
    f.request(`/workspace/startups/${id}`, {
      method: "PUT",
      cookie,
      data: { revision, data: changes },
    });
  assert.equal((await edit(stranger.cookie, edited)).status, 403);
  assert.equal(
    (await edit(owner.cookie, { ...edited, foundedMonth: "2099-12" })).status,
    400,
  );
  assert.equal(
    (await edit(owner.cookie, { ...edited, totalRevenue: -1 })).status,
    400,
  );
  assert.equal(
    (
      await edit(owner.cookie, {
        ...edited,
        logo: "data:image/png;base64,YmFk",
      })
    ).status,
    400,
  );
  assert.equal((await edit(owner.cookie, edited)).status, 200);
  assert.deepEqual((await f.request(`/startups/${id}`)).data, published);
  assert.equal((await submit(4)).status, 200);
  assert.equal((await approve(5)).status, 200);
  const updated = (await f.request(`/startups/${id}`)).data;
  assert.notEqual(updated.logo, published.logo);
  assert.equal(updated.founderAvatar, "");
  assert.equal(updated.monthlyRecurringRevenue, null);
  assert.equal((await f.request("/startups")).data.items[0].logo, updated.logo);
});
