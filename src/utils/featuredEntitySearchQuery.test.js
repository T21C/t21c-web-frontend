import assert from "node:assert/strict";
import test from "node:test";
import { buildIdOrQuery, orderByIds, normalizePositiveIds } from "./featuredEntitySearchQuery.js";

test("buildIdOrQuery joins ids with search OR", () => {
  assert.equal(buildIdOrQuery([11425, 3]), "id:11425 | id:3");
});

test("normalizePositiveIds drops junk and duplicates", () => {
  assert.deepEqual(normalizePositiveIds([11425, "11425", 0, -1, "x", 7]), [11425, 7]);
});

test("orderByIds follows the requested id order", () => {
  const rows = [{ id: 2, song: "b" }, { id: 1, song: "a" }];
  assert.deepEqual(
    orderByIds(rows, [1, 2]).map((row) => row.song),
    ["a", "b"],
  );
});
