import test from "node:test";
import assert from "node:assert/strict";
import { cloudChoiceMessage, needsCloudChoice } from "../dist-test/nano.js";

test("unavailable Nano offers a separate cloud choice without implying fallback", () => {
  assert.equal(needsCloudChoice("unsupported"), true);
  assert.equal(needsCloudChoice("unavailable"), true);
  assert.equal(needsCloudChoice("available"), false);
  assert.match(cloudChoiceMessage, /Nothing was sent/);
  assert.match(cloudChoiceMessage, /separately/);
});
