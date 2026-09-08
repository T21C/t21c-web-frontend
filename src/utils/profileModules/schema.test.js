import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneModulesDocument,
  parseFavoriteItemId,
  readStoredProfileModules,
  removeModuleAt,
  reorderModules,
  resolveLayout,
} from "./schema";

test("pack favorite ids are link codes, not private numeric ids", () => {
  assert.equal(parseFavoriteItemId("pack", "Ab12Cd34"), "Ab12Cd34");
  assert.equal(parseFavoriteItemId("pack", 9), null);
  assert.equal(parseFavoriteItemId("level", 11425), 11425);
  assert.equal(parseFavoriteItemId("level", "Ab12Cd34"), null);

  const stored = readStoredProfileModules({
    version: 1,
    modules: [
      {
        id: "fav-1",
        type: "favorite",
        config: {
          items: [
            { kind: "pack", id: 9 },
            { kind: "pack", id: "Ab12Cd34" },
            { kind: "level", id: 3 },
          ],
        },
      },
    ],
  });
  assert.deepEqual(stored?.modules[0].config.items, [
    { kind: "pack", id: "Ab12Cd34" },
    { kind: "level", id: 3 },
  ]);
});

test("scores and charts stay in the layout and cannot be removed", () => {
  const player = cloneModulesDocument("player", {
    version: 1,
    modules: [{ id: "stock-bio", type: "bio", config: {} }],
  });
  assert.ok(player.modules.some((mod) => mod.type === "scores"));
  const scoresIndex = player.modules.findIndex((mod) => mod.type === "scores");
  const afterRemove = removeModuleAt(player, "player", scoresIndex);
  assert.ok(afterRemove.modules.some((mod) => mod.type === "scores"));
  const reordered = reorderModules(player, "player", scoresIndex, 0);
  assert.equal(reordered.modules[0].type, "scores");

  const creatorLayout = resolveLayout(
    { version: 1, modules: [{ id: "stock-bio", type: "bio", config: {} }] },
    "creator",
  );
  assert.ok(creatorLayout.some((mod) => mod.type === "charts"));
  const chartsIndex = creatorLayout.findIndex((mod) => mod.type === "charts");
  const creatorDoc = {
    version: 1,
    modules: creatorLayout,
  };
  const afterChartsRemove = removeModuleAt(creatorDoc, "creator", chartsIndex);
  assert.ok(afterChartsRemove.modules.some((mod) => mod.type === "charts"));
});
