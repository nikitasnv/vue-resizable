import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { parse } from "@vue/compiler-sfc";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const name of [
  "window",
  "document",
  "Element",
  "HTMLElement",
  "SVGElement",
  "Node",
  "MutationObserver",
])
  global[name] = dom.window[name];
const { mount } = await import("@vue/test-utils");
const { nextTick } = await import("vue");
const { descriptor } = parse(
  await readFile(
    new URL("../src/components/vue-resizable.vue", import.meta.url),
    "utf8"
  )
);
const source = descriptor.script.content.replace(
  /from (["'])(\.[^"']+)\1/g,
  (_, quote, specifier) => {
    const path = specifier.endsWith(".js") ? specifier : `${specifier}.js`;
    return `from ${JSON.stringify(
      new URL(
        path,
        new URL("../src/components/vue-resizable.vue", import.meta.url)
      ).href
    )}`;
  }
);
const { default: component } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
component.template = descriptor.template.content;
const wrappers = [];
const containers = [];
function create(
  props = {},
  scale = 1,
  slot = '<div class="drag"><span>title</span></div>'
) {
  const container = document.createElement("div");
  Object.defineProperties(container, {
    clientWidth: { configurable: true, value: 300 },
    clientHeight: { configurable: true, value: 300 },
  });
  document.body.appendChild(container);
  containers.push(container);
  const wrapper = mount(component, {
    props: { width: 100, height: 100, ...props },
    slots: { default: slot },
    attachTo: container,
  });
  wrappers.push(wrapper);
  const el = wrapper.element;
  Object.defineProperties(el, {
    offsetWidth: { get: () => 100 },
    offsetHeight: { get: () => 100 },
  });
  el.getBoundingClientRect = () => ({
    width: 100 * scale,
    height: 100 * scale,
    left: 0,
    top: 0,
  });
  Object.defineProperties(el.parentElement, {
    clientWidth: { configurable: true, value: 300 },
    clientHeight: { configurable: true, value: 300 },
  });
  return wrapper;
}
function pointer(target, type, x = 0, y = 0, options = {}) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    ...options,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    isPrimary: { value: options.isPrimary ?? true },
  });
  target.dispatchEvent(event);
  return event;
}
function down(wrapper, handle = "r", x = 0, y = 0, options) {
  pointer(
    wrapper.find(`.resizable-${handle}`).element,
    "pointerdown",
    x,
    y,
    options
  );
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  containers.splice(0).forEach((container) => container.remove());
  document.body.style.cursor = "";
});

test("zero dimensions survive mounting", () => {
  const w = create({ width: 0, height: 0 });
  assert.equal(w.vm.w, 0);
  assert.equal(w.vm.h, 0);
});
test("string dimensions and coordinates update after DOM rendering", async () => {
  const w = create();
  await w.setProps({
    width: "150px",
    height: "180px",
    left: "20px",
    top: "30px",
  });
  await nextTick();
  assert.deepEqual([w.vm.w, w.vm.h, w.vm.l, w.vm.t], [150, 180, 20, 30]);
  await w.setProps({ width: "auto" });
  assert.equal(w.vm.w, "auto");
});
test("string coordinates do not subtract the parent's offset", () => {
  const w = create({ left: "20px", top: "30px" });
  assert.equal(w.vm.l, 20);
  assert.equal(w.vm.t, 30);
});
test("all eight handles move the expected edges", () => {
  for (const [handle, expected] of Object.entries({
    r: [0, 0, 120, 100],
    rb: [0, 0, 120, 130],
    b: [0, 0, 100, 130],
    lb: [20, 0, 80, 130],
    l: [20, 0, 80, 100],
    lt: [20, 30, 80, 70],
    t: [0, 30, 100, 70],
    rt: [0, 30, 120, 70],
  })) {
    const w = create();
    down(w, handle);
    pointer(document, "pointermove", 20, 30);
    pointer(document, "pointerup", 20, 30);
    assert.deepEqual([w.vm.l, w.vm.t, w.vm.w, w.vm.h], expected, handle);
    assert.equal(w.emitted("resize:start").length, 1);
    assert.equal(w.emitted("resize:end").length, 1);
  }
});
test("scaled resizing stays at the minimum until the pointer returns to its boundary", () => {
  const w = create({ minWidth: 80 }, 2);
  down(w);
  for (const x of [-100, -100, -40]) {
    pointer(document, "pointermove", x);
    assert.equal(w.vm.w, 80);
  }
  pointer(document, "pointermove", -20);
  assert.equal(w.vm.w, 90);
});
test("fitParent and maximum apply together in the component", () => {
  const w = create({ width: 200, maxWidth: 400, fitParent: true });
  down(w);
  pointer(document, "pointermove", 250);
  assert.equal(w.vm.w, 300);
});
test("CSS maximums constrain mounting, resizing and external updates", async () => {
  const w = create({
    width: 200,
    height: 180,
    maxWidth: "150px",
    maxHeight: "120px",
  });
  assert.deepEqual([w.vm.w, w.vm.h], [150, 120]);
  down(w, "rb");
  pointer(document, "pointermove", 100, 100);
  assert.deepEqual([w.vm.w, w.vm.h], [150, 120]);
  await w.setProps({ maxWidth: "80px", maxHeight: "90px" });
  await nextTick();
  assert.equal(w.vm.interaction, null);
  assert.deepEqual([w.vm.w, w.vm.h], [80, 90]);
  assert.equal(w.emitted("resize:end").length, 1);
  await w.setProps({
    maxWidth: 0,
    maxHeight: undefined,
    width: 210,
    height: 190,
  });
  assert.deepEqual([w.vm.w, w.vm.h], [210, 190]);
});
test("CSS minimums constrain mounting, resizing and external updates", async () => {
  const w = create({
    width: 20,
    height: 10,
    minWidth: "150px",
    minHeight: "120px",
  });
  assert.deepEqual([w.vm.w, w.vm.h], [150, 120]);
  down(w, "rb");
  pointer(document, "pointermove", -100, -100);
  assert.deepEqual([w.vm.w, w.vm.h], [150, 120]);
  await w.setProps({ minWidth: "180px", minHeight: "140px" });
  await nextTick();
  assert.equal(w.vm.interaction, null);
  assert.deepEqual([w.vm.w, w.vm.h], [180, 140]);
  assert.equal(w.emitted("resize:end").length, 1);
  await w.setProps({
    minWidth: 0,
    minHeight: "invalid",
    width: 30,
    height: 40,
  });
  assert.deepEqual([w.vm.w, w.vm.h], [30, 40]);
});

test("CSS minimums defer to maximums and parent boundaries", async () => {
  const w = create({
    minWidth: "200px",
    minHeight: "180px",
    maxWidth: "150px",
    maxHeight: "120px",
    fitParent: true,
  });
  assert.deepEqual([w.vm.w, w.vm.h], [150, 120]);
  await w.setProps({
    maxWidth: undefined,
    maxHeight: undefined,
    minWidth: "400px",
    minHeight: "400px",
  });
  assert.deepEqual([w.vm.w, w.vm.h], [300, 300]);
});

test("CSS minimum observation grows sizes and stops after switching to numbers", async () => {
  const original = window.ResizeObserver;
  let notify,
    disconnects = 0;
  window.ResizeObserver = class {
    constructor(callback) {
      notify = callback;
    }
    observe() {}
    disconnect() {
      disconnects++;
    }
  };
  try {
    const w = create({ minWidth: "50%" });
    notify();
    await nextTick();
    assert.equal(w.vm.w, 150);
    Object.defineProperty(w.element.parentElement, "clientWidth", {
      configurable: true,
      value: 600,
    });
    notify();
    await nextTick();
    assert.equal(w.vm.w, 300);
    await w.setProps({ minWidth: 0 });
    assert.equal(disconnects, 1);
    assert.equal(w.vm.sizeObserver, null);
  } finally {
    window.ResizeObserver = original;
  }
});
test("CSS limit observation follows parent changes and disconnects on unmount", async () => {
  const original = window.ResizeObserver;
  let notify,
    observed,
    disconnects = 0;
  window.ResizeObserver = class {
    constructor(callback) {
      notify = callback;
    }
    observe(element) {
      observed = element;
    }
    disconnect() {
      disconnects++;
    }
  };
  try {
    const w = create({ width: 200, maxWidth: "50%" });
    notify();
    await nextTick();
    assert.equal(w.vm.w, 150);
    assert.equal(observed, w.element.parentElement);
    Object.defineProperty(observed, "clientWidth", {
      configurable: true,
      value: 200,
    });
    notify();
    await nextTick();
    assert.equal(w.vm.w, 100);
    w.unmount();
    assert.equal(disconnects, 1);
  } finally {
    window.ResizeObserver = original;
  }
});
test("dragging preserves auto sizes and handles descendants", () => {
  const w = create({ width: "auto", height: "auto", dragSelector: ".drag" });
  pointer(w.find(".drag span").element, "pointerdown");
  pointer(document, "pointermove", 20, 30);
  assert.deepEqual([w.vm.l, w.vm.t, w.vm.w, w.vm.h], [20, 30, "auto", "auto"]);
  assert.equal(w.emitted("drag:move")[0][0].cmp, w.vm);
});
test("secondary buttons and other pointers do not control an interaction", () => {
  const w = create();
  down(w, "r", 0, 0, { button: 2 });
  assert.equal(w.vm.interaction, null);
  down(w);
  pointer(document, "pointermove", 50, 0, { pointerId: 2 });
  assert.equal(w.vm.w, 100);
  pointer(document, "pointerup", 50, 0, { pointerId: 2 });
  assert.ok(w.vm.interaction);
});
test("cancel and blur finish exactly once and restore the previous cursor", () => {
  for (const ending of ["pointercancel", "blur", "lostpointercapture"]) {
    document.body.style.cursor = "crosshair";
    const w = create();
    down(w);
    if (ending === "blur") window.dispatchEvent(new window.Event("blur"));
    else
      pointer(ending === "lostpointercapture" ? w.element : document, ending);
    pointer(document, "pointerup");
    assert.equal(w.vm.interaction, null);
    assert.equal(document.body.style.cursor, "crosshair");
    assert.equal(w.emitted("resize:end").length, 1);
    pointer(document, "pointermove", 50);
    assert.equal(w.vm.w, 100);
  }
});
test("unmount cleans up an active interaction", () => {
  const w = create();
  document.body.style.cursor = "crosshair";
  down(w);
  w.unmount();
  assert.equal(document.body.style.cursor, "crosshair");
  pointer(document, "pointermove", 50);
  assert.equal(w.emitted("resize:move"), undefined);
});
test("disableAttributes reacts to prop updates", async () => {
  const w = create();
  await w.setProps({ disableAttributes: ["w", "l"] });
  assert.equal(w.element.style.width, "");
  down(w, "l");
  pointer(document, "pointermove", 50);
  assert.deepEqual([w.vm.w, w.vm.l], [100, 0]);
  pointer(document, "pointerup");
  await w.setProps({ disableAttributes: [] });
  down(w);
  pointer(document, "pointermove", 50);
  assert.equal(w.vm.w, 150);
});
test("restoring maximize during drag does not restore stale coordinates on prop feedback", async () => {
  const w = create({ dragSelector: ".drag" });
  await w.setProps({ maximize: true });
  pointer(w.find(".drag").element, "pointerdown", 250, 250);
  pointer(document, "pointermove", 260, 260);
  await nextTick();
  const position = [w.vm.l, w.vm.t];
  assert.equal(w.emitted("maximize").at(-1)[0].state, false);
  await w.setProps({ maximize: false });
  assert.ok(w.vm.interaction);
  assert.deepEqual([w.vm.l, w.vm.t], position);
  pointer(document, "pointerup");
  await w.setProps({ maximize: true });
  await w.setProps({ maximize: false });
  assert.deepEqual([w.vm.l, w.vm.t], position);
});

test("restore geometry uses local pointer coordinates in a scaled, offset parent", async () => {
  const w = create({ dragSelector: ".drag" }, 2);
  w.element.parentElement.getBoundingClientRect = () => ({
    left: 500,
    top: 400,
  });
  await w.setProps({ maximize: true });
  pointer(w.find(".drag").element, "pointerdown", 550, 450);
  pointer(document, "pointermove", 560, 460);
  await nextTick();
  assert.deepEqual([w.vm.l, w.vm.t, w.vm.w, w.vm.h], [5, 5, 100, 100]);
  pointer(document, "pointermove", 580, 480);
  assert.deepEqual([w.vm.l, w.vm.t], [15, 15]);
});

test("nested components do not start an interaction on their parent", () => {
  const parent = create({ dragSelector: ".drag" });
  const child = mount(component, {
    props: { width: 50, height: 50 },
    attachTo: parent.element,
  });
  wrappers.push(child);
  down(child);
  pointer(document, "pointermove", 20);
  assert.equal(child.vm.w, 70);
  assert.equal(parent.vm.w, 100);
  assert.equal(parent.vm.interaction, null);
});

test("pointer capture is acquired and released for the active pointer", () => {
  const w = create();
  const calls = [];
  w.element.setPointerCapture = (id) => calls.push(["capture", id]);
  w.element.hasPointerCapture = () => true;
  w.element.releasePointerCapture = (id) => calls.push(["release", id]);
  down(w);
  pointer(document, "pointerup");
  assert.deepEqual(calls, [
    ["capture", 1],
    ["release", 1],
  ]);
});

test("editable and interactive descendants keep their default pointer behavior", () => {
  for (const markup of [
    '<input class="target">',
    '<textarea class="target"></textarea>',
    '<select class="target"><option>value</option></select>',
    '<button><span class="target">action</span></button>',
    '<a href="#"><span class="target">link</span></a>',
    '<div contenteditable="true"><span class="target">text</span></div>',
    '<div contenteditable><span class="target">text</span></div>',
    '<div contenteditable="plaintext-only"><span class="target">text</span></div>',
  ]) {
    const w = create(
      { dragSelector: ".drag" },
      1,
      `<div class="drag">${markup}</div>`
    );
    const event = pointer(w.find(".target").element, "pointerdown");
    assert.equal(w.vm.interaction, null, markup);
    assert.equal(event.defaultPrevented, false, markup);
    assert.equal(w.emitted("drag:start"), undefined, markup);
  }
});

test("dragCancelSelector excludes custom editor descendants and updates dynamically", async () => {
  const w = create(
    { dragSelector: ".drag", dragCancelSelector: ".editor" },
    1,
    '<div class="drag"><div class="editor"><span>editor</span></div></div>'
  );
  const target = w.find(".editor span").element;
  const event = pointer(target, "pointerdown");
  assert.equal(w.vm.interaction, null);
  assert.equal(event.defaultPrevented, false);
  await w.setProps({ dragCancelSelector: undefined });
  pointer(target, "pointerdown");
  assert.equal(w.emitted("drag:start").length, 1);
});

test("contenteditable=false can be used as a drag handle within an editor", () => {
  const w = create(
    { dragSelector: ".drag" },
    1,
    '<div class="drag" contenteditable="true"><div contenteditable="false"><span class="target">handle</span></div></div>'
  );
  pointer(w.find(".target").element, "pointerdown");
  assert.equal(w.emitted("drag:start").length, 1);
});

test("right clicking the drag area leaves the context menu available", () => {
  const w = create({ dragSelector: ".drag" });
  const event = pointer(w.find(".drag span").element, "pointerdown", 0, 0, {
    button: 2,
  });
  assert.equal(event.defaultPrevented, false);
  assert.equal(w.vm.interaction, null);
  pointer(document, "pointerup", 0, 0, { button: 2 });
  assert.equal(w.emitted("drag:start"), undefined);
  assert.equal(w.emitted("drag:end"), undefined);
});

test("maximize ends an active resize once and ignores subsequent pointer movement", async () => {
  const w = create();
  down(w);
  pointer(document, "pointermove", 20);
  await w.setProps({ maximize: true });
  assert.equal(w.vm.interaction, null);
  assert.equal(w.emitted("resize:end").length, 1);
  pointer(document, "pointermove", 40);
  pointer(document, "pointerup", 40);
  assert.deepEqual([w.vm.w, w.vm.h], [300, 300]);
  assert.equal(w.emitted("resize:end").length, 1);
  await w.setProps({ maximize: false });
  assert.deepEqual([w.vm.w, w.vm.h], [120, 100]);
});

test("canceling a gesture during asynchronous auto restoration prevents later move events", async () => {
  const w = create({ height: "auto", dragSelector: ".drag" });
  await w.setProps({ maximize: true });
  pointer(w.find(".drag").element, "pointerdown");
  pointer(document, "pointermove", 20, 30);
  pointer(document, "pointercancel", 20, 30);
  await nextTick();
  assert.equal(w.vm.interaction, null);
  assert.equal(w.emitted("drag:move"), undefined);
  assert.equal(w.emitted("drag:end").length, 1);
  assert.equal(w.emitted("maximize").at(-1)[0].state, false);
});

test("drag markers follow inserted nodes and selector attribute changes", async () => {
  const w = create({ dragSelector: ".late" });
  const node = document.createElement("div");
  node.className = "late";
  w.find(".drag").element.appendChild(node);
  await nextTick();
  assert.equal(node.hasAttribute("data-resizable-drag"), true);
  assert.equal(w.vm.dragElements.includes(node), true);
  node.className = "other";
  await nextTick();
  assert.equal(node.hasAttribute("data-resizable-drag"), false);
  assert.equal(w.vm.dragElements.includes(node), false);
  node.className = "late";
  await nextTick();
  assert.equal(node.hasAttribute("data-resizable-drag"), true);
  w.unmount();
  assert.equal(node.hasAttribute("data-resizable-drag"), false);
  node.className = "late";
  await nextTick();
  assert.equal(node.hasAttribute("data-resizable-drag"), false);
});

test("drag cleanup preserves classes owned by slot content", async () => {
  const w = create(
    { dragSelector: ".drag" },
    1,
    '<div class="drag drag-el">handle</div>'
  );
  const node = w.find(".drag").element;
  await w.setProps({ dragSelector: undefined });
  assert.equal(node.classList.contains("drag-el"), true);
});

test("size props and changing limits use the same numeric constraints", async () => {
  const w = create({
    minWidth: 80,
    maxWidth: 150,
    minHeight: 60,
    maxHeight: 140,
  });
  await w.setProps({ width: 10, height: 200 });
  assert.deepEqual([w.vm.w, w.vm.h], [80, 140]);
  await w.setProps({ minWidth: 120, maxHeight: 90 });
  assert.deepEqual([w.vm.w, w.vm.h], [120, 90]);
  await w.setProps({ width: "200px", height: "20px" });
  await nextTick();
  assert.deepEqual([w.vm.w, w.vm.h], [150, 60]);
});

test("updates while maximized affect the saved geometry and respect new limits", async () => {
  const w = create();
  await w.setProps({ maximize: true });
  await w.setProps({ width: 200, height: 180, left: 20, top: 30 });
  assert.deepEqual([w.vm.w, w.vm.h, w.vm.l, w.vm.t], [300, 300, 0, 0]);
  await w.setProps({ maxWidth: 150, minHeight: 190 });
  assert.deepEqual([w.vm.w, w.vm.h], [300, 300]);
  await w.setProps({ maximize: false });
  assert.deepEqual([w.vm.w, w.vm.h, w.vm.l, w.vm.t], [150, 190, 20, 30]);
});

test("drag markers leave an exact class selector stable across DOM updates", async () => {
  const w = create(
    { dragSelector: '[class="header"]' },
    1,
    '<div class="header">handle</div>'
  );
  const node = w.find(".header").element;
  assert.equal(node.className, "header");
  pointer(node, "pointerdown");
  assert.equal(w.emitted("drag:start").length, 1);
  pointer(document, "pointerup");
  await w.setProps({ left: 1 });
  assert.equal(node.className, "header");
  assert.equal(node.hasAttribute("data-resizable-drag"), true);
});

test("echoing displayed geometry while maximized preserves the restore snapshot", async () => {
  const w = create({ left: 10, top: 20 });
  await w.setProps({ maximize: true });
  await w.setProps({
    width: w.vm.w,
    height: w.vm.h,
    left: w.vm.l,
    top: w.vm.t,
  });
  await w.setProps({ maximize: false });
  assert.deepEqual([w.vm.w, w.vm.h, w.vm.l, w.vm.t], [100, 100, 10, 20]);
});

test("limit changes preserve fitParent priority and leave the other axis alone", async () => {
  const w = create({ width: 400, minWidth: 400, fitParent: true });
  down(w);
  pointer(document, "pointermove", 10);
  pointer(document, "pointerup");
  assert.equal(w.vm.w, 300);
  await w.setProps({ maxHeight: 80 });
  assert.deepEqual([w.vm.w, w.vm.h], [300, 80]);
  await w.setProps({ minWidth: 500 });
  assert.equal(w.vm.w, 300);
});

test("an external size change ends resize once and survives subsequent movement", async () => {
  const w = create();
  await w.setProps({
    "onResize:end": (event) => {
      w.setProps({
        width: event.width,
        height: event.height,
        left: event.left,
        top: event.top,
      });
    },
  });
  down(w);
  pointer(document, "pointermove", 20);
  await w.setProps({ width: 200 });
  await nextTick();
  assert.equal(w.vm.interaction, null);
  assert.equal(w.emitted("resize:end").length, 1);
  pointer(document, "pointermove", 30);
  pointer(document, "pointerup");
  assert.equal(w.vm.w, 200);
  assert.equal(w.emitted("resize:end").length, 1);
  assert.equal(w.emitted("resize:end")[0][0].width, 200);
});

test("external coordinates end drag but echoed geometry keeps it active", async () => {
  const w = create({ dragSelector: ".drag" });
  pointer(w.find(".drag span").element, "pointerdown");
  pointer(document, "pointermove", 20, 30);
  await w.setProps({ left: 20, top: 30, width: 100, height: 100 });
  assert.ok(w.vm.interaction);
  assert.equal(w.emitted("drag:end"), undefined);
  await w.setProps({ left: 50 });
  await nextTick();
  assert.equal(w.vm.interaction, null);
  pointer(document, "pointermove", 40, 50);
  assert.deepEqual([w.vm.l, w.vm.t], [50, 30]);
  assert.equal(w.emitted("drag:end").length, 1);
});

test("a size-changing limit update ends resize without a stale cross-axis rollback", async () => {
  const w = create();
  down(w);
  pointer(document, "pointermove", 20);
  await w.setProps({ maxHeight: 80 });
  await nextTick();
  assert.equal(w.vm.interaction, null);
  pointer(document, "pointermove", 30);
  assert.deepEqual([w.vm.w, w.vm.h], [120, 80]);
  assert.equal(w.emitted("resize:end").length, 1);
});

test("combined external size and position updates retain existing prop behavior", async () => {
  const w = create({ left: 150, fitParent: true });
  await w.setProps({ width: 200, left: 0 });
  assert.deepEqual([w.vm.w, w.vm.l], [200, 0]);
});

for (const mode of ["resize", "drag"]) {
  test(`batched geometry updates emit one complete ${mode}:end with parent feedback`, async () => {
    const w = create({ dragSelector: ".drag" });
    await w.setProps({
      [`on${mode === "resize" ? "Resize" : "Drag"}:end`]: (event) => {
        w.setProps({
          width: event.width,
          height: event.height,
          left: event.left,
          top: event.top,
        });
      },
    });
    if (mode === "resize") down(w);
    else pointer(w.find(".drag span").element, "pointerdown");
    pointer(document, "pointermove", 20, 10);
    const requested = { width: 200, height: 150, left: 50, top: 60 };
    await w.setProps(requested);
    assert.equal(w.vm.interaction, null);
    pointer(document, "pointermove", 40, 30);
    await nextTick();
    await nextTick();
    const ends = w.emitted(`${mode}:end`);
    assert.equal(ends.length, 1);
    for (const [key, value] of Object.entries(requested))
      assert.equal(ends[0][0][key], value, key);
    assert.deepEqual([w.vm.w, w.vm.h, w.vm.l, w.vm.t], [200, 150, 50, 60]);
    pointer(document, "pointerup");
    assert.equal(w.emitted(`${mode}:end`).length, 1);
  });
}

test("batched CSS geometry is resolved before the external-update end event", async () => {
  const w = create();
  down(w);
  await w.setProps({
    width: "200px",
    height: "150px",
    left: "50px",
    top: "60px",
  });
  await nextTick();
  await nextTick();
  const end = w.emitted("resize:end")[0][0];
  assert.deepEqual(
    [end.width, end.height, end.left, end.top],
    [200, 150, 50, 60]
  );
});

test("unmount suppresses a deferred external-update end event", async () => {
  const ends = [];
  let destroys = 0;
  const w = create({
    "onResize:end": (event) => ends.push(event),
    onDestroy: () => destroys++,
  });
  down(w);
  await w.setProps({ width: 200, height: 150 });
  assert.equal(w.vm.interaction, null);
  assert.equal(ends.length, 0);
  w.unmount();
  await nextTick();
  await nextTick();
  assert.equal(ends.length, 0);
  assert.equal(destroys, 1);
});

test("aspect lock resizes both dimensions and emits the constrained geometry", () => {
  const w = create({
    width: 200,
    height: 100,
    lockAspectRatio: true,
    maxHeight: 120,
  });
  down(w);
  pointer(document, "pointermove", 100);
  pointer(document, "pointerup", 100);
  assert.deepEqual([w.vm.w, w.vm.h], [240, 120]);
  const end = w.emitted("resize:end")[0][0];
  assert.deepEqual([end.width, end.height], [240, 120]);
});

test("aspect lock uses local scaled coordinates and keeps the opposite corner fixed", () => {
  const w = create(
    { width: 200, height: 100, left: 100, top: 100, lockAspectRatio: true },
    2
  );
  down(w, "lt");
  pointer(document, "pointermove", -200, -100);
  assert.deepEqual([w.vm.l, w.vm.t, w.vm.w, w.vm.h], [0, 50, 300, 150]);
});

test("aspect lock changes apply on the next gesture", async () => {
  const w = create({ width: 200, height: 100, lockAspectRatio: true });
  down(w);
  await w.setProps({ lockAspectRatio: false });
  pointer(document, "pointermove", 100);
  pointer(document, "pointerup");
  assert.deepEqual([w.vm.w, w.vm.h], [300, 150]);
  down(w);
  pointer(document, "pointermove", 100);
  assert.deepEqual([w.vm.w, w.vm.h], [400, 150]);
});

test("resize steps accumulate from gesture start and changes apply on the next gesture", async () => {
  const w = create({ width: 105, height: 85, step: 20 });
  down(w);
  pointer(document, "pointermove", 9);
  assert.equal(w.vm.w, 105);
  pointer(document, "pointermove", 13);
  assert.equal(w.vm.w, 125);
  await w.setProps({ step: 50 });
  pointer(document, "pointermove", 32);
  assert.equal(w.vm.w, 145);
  pointer(document, "pointerup");
  assert.equal(w.emitted("resize:end")[0][0].width, 145);
  down(w);
  pointer(document, "pointermove", 32);
  assert.equal(w.vm.w, 195);
});

test("fractional resize steps use local coordinates under scaling", () => {
  const w = create({ width: 100.25, height: 80.75, step: 0.5 }, 2);
  down(w, "rb");
  pointer(document, "pointermove", 0.6, 1.6);
  assert.deepEqual([w.vm.w, w.vm.h], [100.75, 81.75]);
});

test("percentage steps capture parent size and prop changes for the next gesture", async () => {
  const w = create({ width: 105, height: 85, step: "10%" });
  const parent = w.element.parentElement;
  Object.defineProperty(parent, "clientHeight", {
    configurable: true,
    value: 200,
  });
  down(w, "rb");
  pointer(document, "pointermove", 17, 11);
  assert.deepEqual([w.vm.w, w.vm.h], [135, 105]);
  Object.defineProperties(parent, {
    clientWidth: { configurable: true, value: 600 },
    clientHeight: { configurable: true, value: 400 },
  });
  await w.setProps({ step: "20%" });
  pointer(document, "pointermove", 32, 21);
  assert.deepEqual([w.vm.w, w.vm.h], [135, 105]);
  pointer(document, "pointerup");
  down(w, "rb");
  pointer(document, "pointermove", 61, 41);
  assert.deepEqual([w.vm.w, w.vm.h], [255, 185]);
});

test("percentage steps preserve aspect ratio under scaling", () => {
  const w = create(
    { width: 200, height: 100, step: "10%", lockAspectRatio: true },
    2
  );
  Object.defineProperties(w.element.parentElement, {
    clientWidth: { configurable: true, value: 500 },
    clientHeight: { configurable: true, value: 200 },
  });
  down(w, "rb");
  pointer(document, "pointermove", 92, 36);
  pointer(document, "pointerup");
  assert.deepEqual([w.vm.w, w.vm.h], [250, 125]);
  const end = w.emitted("resize:end")[0][0];
  assert.deepEqual([end.width, end.height], [250, 125]);
});
