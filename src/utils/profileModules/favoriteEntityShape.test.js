import assert from "node:assert/strict";
import test from "node:test";
import {
  favoriteEntityId,
  favoriteItemFromEntity,
  unwrapFavoriteLevel,
  unwrapFavoritePack,
  unwrapFavoritePass,
  unwrapFavoritePlayer,
} from "./favoriteEntityShape.js";

test("unwrapFavoritePass reads LoadPassPopup-style results[0]", () => {
  const pass = { id: 28338, player: { name: "Ada" }, level: { song: "Track" } };
  assert.equal(unwrapFavoritePass({ count: 1, results: [pass] }).id, 28338);
  assert.equal(unwrapFavoritePass({ pass }).id, 28338);
});

test("unwrapFavoriteLevel reads byId document or { level }", () => {
  const level = { id: 11425, song: "Song" };
  assert.equal(unwrapFavoriteLevel(level).song, "Song");
  assert.equal(unwrapFavoriteLevel({ level }).id, 11425);
});

test("favoriteEntityId prefers packId over public linkCode id", () => {
  assert.equal(favoriteEntityId("pack", { id: "Ab12Cd34", packId: 9, name: "Pack" }), 9);
  assert.equal(favoriteEntityId("level", { id: 11425 }), 11425);
  assert.equal(favoriteItemFromEntity("pack", { id: "Ab12Cd34", packId: 9 }).id, 9);
});

test("unwrapFavoritePlayer and pack accept top-level payloads", () => {
  assert.equal(unwrapFavoritePlayer({ id: 25, name: "Player" }).name, "Player");
  assert.equal(unwrapFavoritePack({ id: "Ab12Cd34", packId: 9, name: "Pack" }).name, "Pack");
});
