import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateSizeLimit } from "../src/utils/size-limits.js";

const context = Object.freeze({
  parentSize: 800,
  viewportWidth: 1200,
  viewportHeight: 600,
  fontSize: 20,
  rootFontSize: 16,
});

test("CSS length calculations use explicit context without mutating it", () => {
  for (const [value, expected] of [
    [250, 250],
    [0, 0],
    [undefined, undefined],
    ["320px", 320],
    [" 12.5PX ", 12.5],
    ["50%", 400],
    ["66vw", 792],
    ["50vh", 300],
    ["25vmin", 150],
    ["25vmax", 300],
    ["2em", 40],
    ["2rem", 32],
    [".5em", 10],
    ["0", 0],
  ])
    assert.equal(calculateSizeLimit(value, context), expected, String(value));
});

test("expressions and unsupported values are left to browser measurement", () => {
  for (const value of [
    "calc(100vw * 2 / 3)",
    "min(50%, 300px)",
    "2cm",
    "none",
    "auto",
    "invalid",
    "200",
    "-10px",
    "",
  ])
    assert.equal(calculateSizeLimit(value, context), undefined, value);
  assert.equal(calculateSizeLimit("50%"), undefined);
  assert.equal(calculateSizeLimit("20px"), 20);
});
