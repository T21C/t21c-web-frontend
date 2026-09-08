import assert from "node:assert/strict";
import test from "node:test";
import {
  PROFILE_MODULES_FREE_CAP,
  PROFILE_MODULES_STELLAR_CAP,
  profileModulesCap,
  profileModulesCapsFromUser,
} from "./catalog.js";

test("profileModulesCapsFromUser reads auth-user fields from the server", () => {
  const caps = profileModulesCapsFromUser({
    profileModulesFreeCap: 10,
    profileModulesStellarCap: 20,
    profileModulesMaxFavoriteItems: 20,
  });
  assert.equal(caps.freeCap, 10);
  assert.equal(caps.stellarCap, 20);
  assert.equal(caps.maxFavoriteItems, 20);
  assert.equal(profileModulesCap(false, { profileModulesFreeCap: 10, profileModulesStellarCap: 20 }), 10);
  assert.equal(profileModulesCap(true, { profileModulesFreeCap: 10, profileModulesStellarCap: 20 }), 20);
});

test("profileModulesCapsFromUser ignores junk and falls back", () => {
  const caps = profileModulesCapsFromUser({
    profileModulesFreeCap: "nope",
    profileModulesStellarCap: 0,
  });
  assert.equal(caps.freeCap, PROFILE_MODULES_FREE_CAP);
  assert.equal(caps.stellarCap, PROFILE_MODULES_STELLAR_CAP);
});
