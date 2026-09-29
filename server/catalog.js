import { z } from "zod";
import { arenas, investors, panelFor } from "../src/game-data.js";
import { regions } from "../src/world-catalog.js";
const pair = (max) =>
  z.tuple([
    z.string().trim().min(1).max(max),
    z.string().trim().min(1).max(max),
  ]);
const source = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine((v) => {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    }, "HTTPS required"),
]);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/);
const region = z.enum(regions.map((r) => r[0]));
const coordinates = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-85).max(85),
]);
export const arenaEdit = z
  .object({
    title: pair(80),
    description: pair(1400),
    pitchSeconds: z.number().int().min(30).max(600),
    level: z.number().int().min(1).max(5),
    enabled: z.boolean(),
    region: region.optional(),
    country: z
      .string()
      .regex(/^\d{3}$/)
      .optional(),
    city: pair(80).optional(),
    coordinates: coordinates.optional(),
    source: source.optional(),
    symbol: z.string().trim().min(1).max(6).optional(),
  })
  .strict();
export const investorEdit = z
  .object({
    name: pair(80),
    role: z.string().trim().min(1).max(120),
    focus: pair(200),
    source,
    enabled: z.boolean(),
    arenaId: id.optional(),
    level: z.number().int().min(1).max(5).optional(),
  })
  .strict();
export const arenaCreate = arenaEdit.extend({
  region,
  country: z.string().regex(/^\d{3}$/),
  city: pair(80),
  coordinates,
  source,
  symbol: z.string().trim().min(1).max(6),
});
export const investorCreate = investorEdit.extend({
  arenaId: id,
  level: z.number().int().min(1).max(5),
});
export const catalogId = id;
export function newCatalogItem(kind, id, data, parent) {
  if (kind === "investor")
    return {
      ...data,
      id,
      region: parent.region,
      country: parent.country,
      photo: null,
      initial: data.name[1]
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join(""),
      color: "blue",
      verifiedAt: null,
    };
  return {
    ...data,
    id,
    kind: "venture",
    subtitle: data.city,
    tag: ["УЧЕБНАЯ АРЕНА", "PRACTICE ARENA"],
    difficulty: ["Сценарий тренировки", "Practice scenario"],
    time: 8,
    xp: data.level * 70,
    mapPosition: [500, 230],
  };
}
export async function seedCatalog(store) {
  for (const [kind, items] of [
    ["arena", arenas],
    ["investor", investors],
  ])
    for (const item of items)
      await store.run(
        "INSERT INTO catalog(kind,id,data,revision,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data WHERE catalog.revision=1",
        kind,
        item.id,
        JSON.stringify({ ...item, enabled: true }),
        new Date().toISOString(),
      );
}
export async function readCatalog(store) {
  const rows = await store.all("SELECT * FROM catalog ORDER BY kind,id");
  const get = (kind, base) => {
    const merged = new Map(
      base.map((item) => [item.id, { ...item, enabled: true, revision: 0 }]),
    );
    for (const row of rows.filter((r) => r.kind === kind)) {
      const saved = JSON.parse(row.data);
      const defaults = merged.get(row.id);
      merged.set(row.id, {
        ...defaults,
        ...saved,
        // Fill newly sourced portraits without overwriting an admin's edits.
        ...(kind === "investor" && !saved.photo && defaults?.photo
          ? { photo: defaults.photo }
          : {}),
        revision: row.revision,
        updatedAt: row.updated_at,
      });
    }
    return [...merged.values()];
  };
  const locations = get("arena", arenas);
  const people = get("investor", investors).map((p) => {
    const a = locations.find((a) => a.id === p.arenaId);
    return {
      ...p,
      region: a?.region ?? p.region,
      country: a?.country ?? p.country,
    };
  });
  return {
    arenas: locations.map((a) => {
      const members = people.filter(
        (p) => p.enabled !== false && p.arenaId === a.id,
      );
      return {
        ...a,
        personaIds: members.length ? members.map((p) => p.id) : undefined,
        panelMembers: members.length
          ? members
          : panelFor({ ...a, personaIds: undefined, panelMembers: undefined }),
      };
    }),
    investors: people,
  };
}
