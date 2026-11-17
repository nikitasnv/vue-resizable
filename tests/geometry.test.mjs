import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAxis,
  calculateRectangle,
  calculateRestoreRectangle,
  constrainSize,
} from "../src/utils/geometry.js";

const axis = (options) =>
  calculateAxis({
    position: 0,
    size: 200,
    delta: 250,
    edge: "end",
    ...options,
  });

test("maximum and parent boundaries apply together", () => {
  assert.deepEqual(axis({ max: 400, fitParent: true, parentSize: 300 }), {
    position: 0,
    size: 300,
  });
});
test("start edge keeps the opposite edge anchored", () => {
  assert.deepEqual(
    axis({
      position: 100,
      delta: -250,
      edge: "start",
      max: 400,
      parentSize: 500,
      fitParent: true,
    }),
    { position: 0, size: 300 }
  );
});
test("minimum size applies to both edges", () => {
  assert.equal(axis({ delta: -300, min: 80 }).size, 80);
  assert.deepEqual(
    axis({ position: 100, delta: 300, edge: "start", min: 80 }),
    { position: 220, size: 80 }
  );
});
test("parent boundary wins when the minimum does not fit", () => {
  assert.equal(
    axis({ min: 400, max: 500, fitParent: true, parentSize: 300 }).size,
    300
  );
});
test("drag clamps position without resizing", () => {
  assert.deepEqual(axis({ edge: "drag", fitParent: true, parentSize: 300 }), {
    position: 100,
    size: 200,
  });
  assert.deepEqual(
    axis({ delta: -50, edge: "drag", fitParent: true, parentSize: 300 }),
    { position: 0, size: 200 }
  );
});
test("disabled position and size remain unchanged", () => {
  assert.deepEqual(
    axis({ position: 100, edge: "start", canMove: false, delta: 20 }),
    { position: 100, size: 180 }
  );
  assert.deepEqual(axis({ edge: "end", canResize: false }), {
    position: 0,
    size: 200,
  });
  assert.deepEqual(axis({ edge: "start", canResize: false, delta: 20 }), {
    position: 20,
    size: 200,
  });
});
test("size normalization preserves zero and the legacy unlimited maximum", () => {
  assert.equal(constrainSize(0), 0);
  assert.equal(constrainSize(200, 0, 0), 200);
  assert.equal(constrainSize(200, 80, 0, 50), 50);
  assert.equal(constrainSize(200, 80, 0, 0), 0);
  assert.equal(constrainSize(20, 80, 40), 40);
});

const rectangleOptions = {
  start: { l: 20, t: 30, w: 100, h: 80 },
  delta: { x: 200, y: 200 },
  parentSize: { width: 200, height: 150 },
  limits: { minWidth: 60, maxWidth: 150, minHeight: 50, maxHeight: 100 },
  fitParent: true,
};

test("corner resizing combines independent constraints on both axes", () => {
  assert.deepEqual(
    calculateRectangle({
      ...rectangleOptions,
      direction: { horizontal: "end", vertical: "end" },
    }),
    { l: 20, t: 30, w: 150, h: 100 }
  );
  assert.deepEqual(
    calculateRectangle({
      ...rectangleOptions,
      delta: { x: -200, y: -200 },
      direction: { horizontal: "start", vertical: "start" },
    }),
    { l: 0, t: 10, w: 120, h: 100 }
  );
  assert.deepEqual(
    calculateRectangle({
      ...rectangleOptions,
      direction: { horizontal: "end", vertical: "start" },
    }),
    { l: 20, t: 60, w: 150, h: 50 }
  );
});

test("resizing one axis leaves the other axis unchanged", () => {
  assert.deepEqual(
    calculateRectangle({
      ...rectangleOptions,
      direction: { horizontal: "end" },
    }),
    { l: 20, t: 30, w: 150, h: 80 }
  );
});

test("rectangle dragging clamps both coordinates and ignores size limits", () => {
  assert.deepEqual(
    calculateRectangle({
      ...rectangleOptions,
      delta: { x: 1000, y: -1000 },
      limits: { maxWidth: 50, maxHeight: 40 },
      dragging: true,
    }),
    { l: 100, t: 0, w: 100, h: 80 }
  );
});

test("disabled rectangle attributes are respected independently", () => {
  assert.deepEqual(
    calculateRectangle({
      ...rectangleOptions,
      delta: { x: 20, y: 30 },
      direction: { horizontal: "start", vertical: "start" },
      disabledAttributes: ["l", "h"],
    }),
    { l: 20, t: 60, w: 80, h: 80 }
  );
});

test("rectangle calculation accepts frozen inputs without mutating them", () => {
  const options = Object.freeze({
    start: Object.freeze({ l: 20, t: 30, w: 100, h: 80 }),
    delta: Object.freeze({ x: 20, y: 30 }),
    direction: Object.freeze({ horizontal: "start", vertical: "end" }),
    limits: Object.freeze({ minWidth: 60 }),
    parentSize: Object.freeze({ width: 200, height: 150 }),
    disabledAttributes: Object.freeze([]),
  });
  assert.deepEqual(calculateRectangle(options), {
    l: 40,
    t: 30,
    w: 80,
    h: 110,
  });
});

test("restoring from maximize positions the rectangle in each parent quadrant", () => {
  const size = Object.freeze({ width: 100, height: 80 });
  const parentSize = Object.freeze({ width: 300, height: 200 });
  for (const [x, y, l, t] of [
    [20, 30, 0, 0],
    [280, 30, 200, 0],
    [20, 180, 0, 120],
    [280, 180, 200, 120],
    [150, 100, 0, 0],
  ]) {
    assert.deepEqual(
      calculateRestoreRectangle({
        size,
        parentSize,
        pointer: Object.freeze({ x, y }),
      }),
      { l, t, w: 100, h: 80 }
    );
  }
});

test("content-box padding and borders reduce available size and drag space", () => {
  assert.deepEqual(
    calculateRectangle({
      start: { l: 0, t: 0, w: 100, h: 100 },
      delta: { x: 500, y: 500 },
      direction: { horizontal: "end", vertical: "end" },
      parentSize: { width: 300, height: 300 },
      fitParent: true,
      boxSize: { width: 44, height: 24 },
    }),
    { l: 0, t: 0, w: 256, h: 276 }
  );
  assert.deepEqual(
    calculateRectangle({
      start: { l: 0, t: 0, w: 100, h: 100 },
      delta: { x: 500, y: 500 },
      dragging: true,
      parentSize: { width: 300, height: 300 },
      fitParent: true,
      boxSize: { width: 44, height: 24 },
    }),
    { l: 156, t: 176, w: 100, h: 100 }
  );
});

test("start edges stay anchored while accounting for the outer box", () => {
  assert.deepEqual(
    calculateRectangle({
      start: { l: 100, t: 80, w: 100, h: 100 },
      delta: { x: -500, y: -500 },
      direction: { horizontal: "start", vertical: "start" },
      parentSize: { width: 300, height: 300 },
      fitParent: true,
      boxSize: { width: 44, height: 24 },
    }),
    { l: 0, t: 0, w: 200, h: 180 }
  );
  assert.deepEqual(
    calculateRestoreRectangle({
      size: { width: 100, height: 100 },
      pointer: { x: 250, y: 250 },
      parentSize: { width: 300, height: 300 },
      boxSize: { width: 44, height: 24 },
    }),
    { l: 156, t: 176, w: 100, h: 100 }
  );
});
