import { z } from "zod";
import { arenas, investors, panelFor } from "../src/game-data.js";
const pair = (max) =>
  z.tuple([
    z.string().trim().min(1).max(max),
    z.string().trim().min(1).max(max),
  ]);
const source = z.union([
  z.literal(""),
  z.url().refine((v) => v.startsWith("https://"), "HTTPS required"),
]);
export const arenaEdit = z
  .object({
    title: pair(80),
    description: pair(1400),
    pitchSeconds: z.number().int().min(30).max(600),
    level: z.number().int().min(1).max(5),
    enabled: z.boolean(),
  })
  .strict();
export const investorEdit = z
  .object({
    name: pair(80),
    role: z.string().trim().min(1).max(120),
    focus: pair(200),
    source,
    enabled: z.boolean(),
  })
  .strict();
export async function seedCatalog(store) {
  for (const [kind, items] of [
    ["arena", arenas],
    ["investor", investors],
  ]) {
    for (const item of items)
      await store.run(
        "INSERT INTO catalog(kind,id,data,revision,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(kind,id) DO NOTHING",
        kind,
        item.id,
        JSON.stringify({ ...item, enabled: true }),
        new Date().toISOString(),
      );
  }
}
export async function readCatalog(store) {
  const rows = await store.all("SELECT * FROM catalog ORDER BY kind,id");
  const get = (kind, base) =>
    base.map((item) => {
      const row = rows.find((r) => r.kind === kind && r.id === item.id);
      return row
        ? {
            ...JSON.parse(row.data),
            revision: row.revision,
            updatedAt: row.updated_at,
          }
        : { ...item, enabled: true, revision: 0 };
    });
  const people = get("investor", investors);
  const locations = get("arena", arenas).map((a) => ({
    ...a,
    panelMembers: a.personaIds
      ? a.personaIds
          .map((id) => people.find((p) => p.id === id))
          .filter(Boolean)
      : panelFor(a),
  }));
  return { arenas: locations, investors: people };
}
