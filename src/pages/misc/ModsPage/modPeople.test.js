import assert from 'node:assert/strict';
import test from 'node:test';

import {
  creatorSortKey,
  dumpCreatorLabel,
  hasAssignees,
  listCreatorText,
  otherAssignees,
} from './modPeople.js';

const dumpMod = {
  name: 'AdofaiTweaks',
  creatorUsername: 'crackthrough',
  creatorDiscordId: '543672901585469441',
  projectUrl: 'https://github.com/PizzaLovers007/AdofaiTweaks',
  assignees: [],
  postedBy: null,
};

const assignedMod = {
  name: 'AdofaiTweaks',
  creatorUsername: 'crackthrough',
  creatorDiscordId: '543672901585469441',
  projectUrl: 'https://github.com/PizzaLovers007/AdofaiTweaks',
  postedBy: {userId: 'u1', playerId: 1, name: 'Ali', username: 'alice'},
  assignees: [
    {userId: 'u1', playerId: 1, name: 'Ali', username: 'alice'},
    {userId: 'u2', playerId: 2, name: 'Bob', username: 'bobby'},
  ],
};

void test('dumpCreatorLabel formats username and snowflake', () => {
  assert.equal(dumpCreatorLabel(dumpMod), 'crackthrough @543672901585469441');
});

void test('hasAssignees and listCreatorText hide dump identity when assigned', () => {
  assert.equal(hasAssignees(dumpMod), false);
  assert.equal(listCreatorText(dumpMod), 'crackthrough @543672901585469441');
  assert.equal(hasAssignees(assignedMod), true);
  assert.equal(listCreatorText(assignedMod), 'Ali, Bob');
});

void test('otherAssignees skips postedBy', () => {
  assert.deepEqual(
    otherAssignees(assignedMod).map((person) => person.userId),
    ['u2'],
  );
});

void test('creatorSortKey prefers assigned display name', () => {
  assert.equal(creatorSortKey(dumpMod), 'crackthrough');
  assert.equal(creatorSortKey(assignedMod), 'Ali');
});
