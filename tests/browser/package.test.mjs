import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { chromium } from "playwright";
import { build, createServer, preview } from "vite";

const require = createRequire(import.meta.url);
const vuePackage = require("vue/package.json");
const vueRequire = createRequire(require.resolve("vue/package.json"));
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
let directory, server, browser, page, origin;
const errors = [];

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "vue-resizable-consumer-"));
  const pack = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", directory], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 60000,
    })
  )[0];
  assert.ok(pack.files.some(({ path }) => path === "src/utils/drag.js"));
  assert.ok(
    pack.files.some(({ path }) => path === "dist/vue-resizable.esm.mjs")
  );
  assert.ok(
    pack.files.some(({ path }) => path === "dist/vue-resizable.umd.min.js")
  );
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({
      name: "resizable-consumer",
      private: true,
      type: "module",
    })
  );
  execFileSync(
    "npm",
    [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      join(directory, pack.filename),
      `vue@${vuePackage.version}`,
      `vue-server-renderer@${vuePackage.version}`,
      ...Object.keys(vuePackage.dependencies || {}).map(
        (name) => `${name}@${vueRequire(`${name}/package.json`).version}`
      ),
    ],
    {
      cwd: directory,
      encoding: "utf8",
      timeout: 60000,
    }
  );
  await cp(new URL("./fixture/", import.meta.url), directory, {
    recursive: true,
  });
  await build({ root: directory, configFile: false, logLevel: "error" });
  server = await preview({
    root: directory,
    configFile: false,
    logLevel: "error",
    preview: { host: "127.0.0.1", port: 0 },
  });
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  page = await browser.newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", (error) => errors.push(error.message));
});

beforeEach(async () => {
  errors.length = 0;
  await page.goto(origin);
  await page.waitForFunction(() => Boolean(window.fixture));
  assert.equal(
    await page.locator(".resizable-component").count(),
    1,
    JSON.stringify(await page.evaluate(() => window.fixture.importedExport))
  );
});

after(async () => {
  await browser?.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve()))
    );
  if (directory) await rm(directory, { recursive: true, force: true });
});

const width = () =>
  page
    .locator(".resizable-component")
    .evaluate((el) => el.getBoundingClientRect().width);

test("the packed package builds and mounts in a Vite production application", async () => {
  assert.equal(await width(), 600);
  assert.deepEqual(errors, []);
  assert.equal(
    await page
      .locator(".resizable-r")
      .evaluate((el) => getComputedStyle(el).touchAction),
    "none"
  );
});

test("ordinary package import works in Node without a browser DOM", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        import Vue from "vue";
        import renderer from "vue-server-renderer";
        import component from "vue-resizable";
        if (component.name !== "VResizable") process.exit(1);
        const html = await renderer.createRenderer().renderToString(new Vue({
          render: (h) => h(component, { props: { width: 123, height: 77 } }),
        }));
        if (!html.includes("resizable-component") || !html.includes("width:123px")) process.exit(1);
        console.log("ok");
      `,
    ],
    { cwd: directory, encoding: "utf8", timeout: 10000 }
  );
  assert.equal(output.trim(), "ok");
});

test("CommonJS resolution and public subpaths remain available", () => {
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      `
    const { basename } = require("node:path");
    console.log(JSON.stringify({
      entry: basename(require.resolve("vue-resizable")),
      legacy: basename(require.resolve("vue-resizable/dist/vue-resizable.common.js")),
      source: basename(require.resolve("vue-resizable/src/main.js")),
      name: require("vue-resizable/package.json").name,
    }));
  `,
    ],
    { cwd: directory, encoding: "utf8", timeout: 10000 }
  );
  assert.deepEqual(JSON.parse(output), {
    entry: "vue-resizable.umd.min.js",
    legacy: "vue-resizable.common.js",
    source: "main.js",
    name: "vue-resizable",
  });
});

test("the packed package works in the Vite development server", async () => {
  const devServer = await createServer({
    root: directory,
    configFile: false,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0 },
  });
  try {
    await devServer.listen();
    await page.goto(`http://127.0.0.1:${devServer.httpServer.address().port}`);
    await page.locator(".resizable-component").waitFor();
    assert.equal(await width(), 600);
    assert.deepEqual(errors, []);
  } finally {
    await page.goto("about:blank");
    await devServer.close();
  }
});

test("the existing UMD browser global still exposes the component and styles", async () => {
  await page.goto("about:blank");
  await page.setContent('<div id="app"></div>');
  await page.addScriptTag({
    path: join(directory, "node_modules/vue/dist/vue.min.js"),
  });
  await page.addScriptTag({
    path: join(
      directory,
      "node_modules/vue-resizable/dist/vue-resizable.umd.min.js"
    ),
  });
  await page.evaluate(() => {
    const component = window["vue-resizable"].default;
    new window.Vue({
      render: (h) =>
        h(
          component,
          { props: { width: 100, height: 100, dragSelector: ".header" } },
          [h("div", { class: "header" }, "Drag here")]
        ),
    }).$mount("#app");
  });
  assert.equal(await width(), 100);
  assert.equal(
    await page
      .locator(".resizable-r")
      .evaluate((el) => getComputedStyle(el).touchAction),
    "none"
  );
  assert.equal(
    await page
      .locator(".header")
      .evaluate((el) => getComputedStyle(el).touchAction),
    "none"
  );
  assert.deepEqual(errors, []);
});

test("percentage width updates resolve against the current parent", async () => {
  await page.evaluate(() => window.fixture.setWidth("50%"));
  assert.equal(await width(), 400);
  await page.evaluate(() => window.fixture.setParentWidth(1000));
  // Assigned CSS widths are converted to pixels; resizing the parent keeps that pixel size.
  assert.equal(await width(), 400);
  await page.evaluate(() => window.fixture.setWidth("75%"));
  assert.equal(await width(), 750);
  await page.evaluate(() => window.fixture.setWidth("calc(50% - 20px)"));
  assert.equal(await width(), 480);
});

test("resizing after a percentage update respects minimum and parent boundaries", async () => {
  await page.evaluate(() => window.fixture.setWidth("50%"));
  let box = await page.locator(".resizable-r").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 300, box.y + box.height / 2);
  await page.mouse.up();
  assert.equal(await width(), 320);
  box = await page.locator(".resizable-r").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(1200, box.y + box.height / 2);
  await page.mouse.up();
  assert.equal(await width(), 800);
  assert.deepEqual(await page.evaluate(() => window.fixture.events), [
    "resize:start",
    "resize:end",
    "resize:start",
    "resize:end",
  ]);
});

test("textarea and contenteditable receive focus and typing without dragging", async () => {
  await page.locator("#text").click();
  await page.keyboard.type("textarea input");
  assert.equal(await page.locator("#text").inputValue(), "textarea input");
  await page.locator("#editable").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("editor input");
  assert.equal(await page.locator("#editable").textContent(), "editor input");
  await page.locator("#custom").click();
  assert.deepEqual(await page.evaluate(() => window.fixture.events), []);
});

test("dragging the header works while the right button keeps native behavior", async () => {
  const box = await page.locator("#handle").boundingBox();
  const x = box.x + 40,
    y = box.y + 15;
  await page.mouse.click(x, y, { button: "right" });
  assert.deepEqual(await page.evaluate(() => window.fixture.events), []);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 30);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
    width: 600,
    left: 40,
    top: 30,
  });
  assert.deepEqual(await page.evaluate(() => window.fixture.events), [
    "drag:start",
    "drag:end",
  ]);
});

test("touch input preserves textarea focus and typing", async () => {
  const context = await browser.newContext({ hasTouch: true });
  try {
    const touchPage = await context.newPage();
    await touchPage.goto(origin);
    await touchPage.locator("#text").tap();
    await touchPage.waitForFunction(
      () => document.activeElement?.id === "text"
    );
    await touchPage.keyboard.type("touch input");
    assert.equal(await touchPage.locator("#text").inputValue(), "touch input");
    assert.deepEqual(await touchPage.evaluate(() => window.fixture.events), []);
  } finally {
    await context.close();
  }
});

test("touch dragging moves the header through native pointer events", async () => {
  const context = await browser.newContext({ hasTouch: true });
  try {
    const touchPage = await context.newPage();
    await touchPage.goto(origin);
    const box = await touchPage.locator("#handle").boundingBox();
    const session = await context.newCDPSession(touchPage);
    const start = { x: box.x + 40, y: box.y + 15 };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x + 40, y: start.y + 30 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.deepEqual(await touchPage.evaluate(() => window.fixture.state()), {
      width: 600,
      left: 40,
      top: 30,
    });
    assert.deepEqual(await touchPage.evaluate(() => window.fixture.events), [
      "drag:start",
      "drag:end",
    ]);
  } finally {
    await context.close();
  }
});

test("maximize terminates an active resize without a later size rollback", async () => {
  const box = await page.locator(".resizable-r").boundingBox();
  await page.mouse.move(box.x + 6, box.y + 50);
  await page.mouse.down();
  await page.evaluate(() => window.fixture.setProps({ maximize: true }));
  await page.mouse.move(box.x + 40, box.y + 50);
  await page.mouse.up();
  assert.equal(await width(), 800);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    400
  );
  assert.deepEqual(await page.evaluate(() => window.fixture.events), [
    "resize:start",
    "resize:end",
  ]);
});

for (const dimension of ["width", "height"]) {
  test(`dragging out of maximize measures restored auto ${dimension}`, async () => {
    await page.evaluate(async (dimension) => {
      await window.fixture.setBoxStyle({ display: "inline-block" });
      await window.fixture.setContentStyle({ width: "120px", height: "100px" });
      await window.fixture.setProps({
        width: 120,
        height: 100,
        minWidth: 0,
        [dimension]: "auto",
      });
      await window.fixture.setProps({ maximize: true });
    }, dimension);
    const box = await page.locator("#handle").boundingBox();
    await page.mouse.move(box.x + 30, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + 45);
    await page.waitForFunction(() => {
      const el = document.querySelector(".resizable-component");
      return (
        el.offsetWidth === 120 &&
        el.offsetHeight === 100 &&
        el.style.top === "30px"
      );
    });
    await page.mouse.move(box.x + 70, box.y + 75);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
      width: dimension === "width" ? "auto" : 120,
      left: 40,
      top: 60,
    });
    assert.deepEqual(await page.evaluate(() => window.fixture.events), [
      "drag:start",
      "drag:end",
    ]);
  });
}

for (const boxSizing of ["content-box", "border-box"]) {
  test(`fitParent and maximize include padding and borders with ${boxSizing}`, async () => {
    await page.evaluate(async (boxSizing) => {
      await window.fixture.setParentWidth(300);
      await window.fixture.setBoxStyle({
        boxSizing,
        padding: "20px",
        border: "2px solid black",
      });
      await window.fixture.setProps({ width: 100, height: 100, minWidth: 0 });
    }, boxSizing);
    let box = await page.locator(".resizable-rb").boundingBox();
    await page.mouse.move(box.x + 6, box.y + 6);
    await page.mouse.down();
    await page.mouse.move(1100, 650);
    await page.mouse.up();
    assert.equal(await width(), 300);
    assert.equal(
      await page
        .locator(".resizable-component")
        .evaluate((el) => el.offsetHeight),
      400
    );
    await page.evaluate(() =>
      window.fixture.setProps({ width: 120, height: 120 })
    );
    assert.equal(await width(), boxSizing === "content-box" ? 164 : 120);
    box = await page.locator("#handle").boundingBox();
    await page.mouse.move(box.x + 30, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(1100, 650);
    await page.mouse.up();
    const bounds = await page.locator(".resizable-component").evaluate((el) => {
      const rect = el.getBoundingClientRect(),
        parent = el.parentElement.getBoundingClientRect();
      return {
        right: rect.right,
        bottom: rect.bottom,
        parentRight: parent.right,
        parentBottom: parent.bottom,
      };
    });
    assert.equal(bounds.right, bounds.parentRight);
    assert.equal(bounds.bottom, bounds.parentBottom);
    await page.evaluate(() => window.fixture.setProps({ maximize: true }));
    assert.equal(await width(), 300);
    assert.equal(
      await page
        .locator(".resizable-component")
        .evaluate((el) => el.offsetHeight),
      400
    );
  });
}

test("a dynamically inserted drag handle is prepared before a touch gesture", async () => {
  const context = await browser.newContext({ hasTouch: true });
  try {
    const touchPage = await context.newPage();
    await touchPage.goto(origin);
    await touchPage.evaluate(async () => {
      await window.fixture.setProps({ dragSelector: ".late-handle" });
      await window.fixture.setLateHandle(true);
    });
    assert.equal(
      await touchPage
        .locator("#late")
        .evaluate((el) => getComputedStyle(el).touchAction),
      "none"
    );
    const box = await touchPage.locator("#late").boundingBox();
    const session = await context.newCDPSession(touchPage);
    const start = { x: box.x + 30, y: box.y + 15 };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x + 40, y: start.y + 30 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.deepEqual(await touchPage.evaluate(() => window.fixture.state()), {
      width: 600,
      left: 40,
      top: 30,
    });
    assert.deepEqual(await touchPage.evaluate(() => window.fixture.events), [
      "drag:start",
      "drag:end",
    ]);
  } finally {
    await context.close();
  }
});

test("fitParent uses rendered dimensions when width and height are disabled", async () => {
  await page.evaluate(async () => {
    await window.fixture.setParentWidth(300);
    await window.fixture.setBoxStyle({ width: "300px", height: "200px" });
    await window.fixture.setProps({
      width: 100,
      height: 100,
      minWidth: 0,
      disableAttributes: ["w", "h"],
    });
  });
  const box = await page.locator("#handle").boundingBox();
  await page.mouse.move(box.x + 30, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 265);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
    width: 100,
    left: 0,
    top: 200,
  });
  assert.equal(await width(), 300);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    200
  );
});

test("CSS sizes updated while maximized are resolved and constrained on restore", async () => {
  await page.evaluate(async () => {
    await window.fixture.setProps({ maximize: true });
    await window.fixture.setProps({
      width: "50%",
      height: "25%",
      maxWidth: 350,
      minHeight: 120,
    });
  });
  assert.equal(await width(), 800);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    400
  );
  await page.evaluate(() => window.fixture.setProps({ maximize: false }));
  assert.equal(await width(), 350);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    120
  );
});

test("changing numeric and CSS size props and limits applies constraints", async () => {
  await page.evaluate(() =>
    window.fixture.setProps({ width: 10, height: 20, minHeight: 80 })
  );
  assert.equal(await width(), 320);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    80
  );
  await page.evaluate(() =>
    window.fixture.setProps({
      width: "75%",
      height: "90%",
      maxWidth: 350,
      maxHeight: 200,
    })
  );
  assert.equal(await width(), 350);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    200
  );
  await page.evaluate(() =>
    window.fixture.setProps({ maxWidth: 330, maxHeight: 150 })
  );
  assert.equal(await width(), 330);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    150
  );
});

test("an exact class drag selector works after unrelated style updates", async () => {
  await page.evaluate(async () => {
    await window.fixture.setProps({ dragSelector: '[class="content"]' });
    await window.fixture.setBoxStyle({ border: "1px solid black" });
  });
  assert.equal(await page.locator(".content").getAttribute("class"), "content");
  assert.equal(
    await page
      .locator(".content")
      .evaluate((el) => getComputedStyle(el).touchAction),
    "none"
  );
  const box = await page.locator("#handle").boundingBox();
  await page.mouse.move(box.x + 30, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 70, box.y + 45);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
    width: 600,
    left: 40,
    top: 30,
  });
  assert.equal(await page.locator(".content").getAttribute("class"), "content");
  assert.deepEqual(await page.evaluate(() => window.fixture.events), [
    "drag:start",
    "drag:end",
  ]);
});

test("limit updates preserve parent boundaries independently on both axes", async () => {
  await page.evaluate(async () => {
    await window.fixture.setParentWidth(300);
    await window.fixture.setProps({
      width: 500,
      height: 600,
      minWidth: 500,
      minHeight: 600,
    });
  });
  const box = await page.locator(".resizable-rb").boundingBox();
  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  await page.mouse.move(box.x + 16, box.y + 16);
  await page.mouse.up();
  assert.equal(await width(), 300);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    400
  );
  await page.evaluate(() => window.fixture.setProps({ maxHeight: 80 }));
  assert.equal(await width(), 300);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    80
  );
  await page.evaluate(() =>
    window.fixture.setProps({ minWidth: 700, maxHeight: 0 })
  );
  assert.equal(await width(), 300);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    400
  );
  await page.evaluate(() => window.fixture.setProps({ maxWidth: 80 }));
  assert.equal(await width(), 80);
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    400
  );
});

test("external dimensions stop resize while echoed move values keep it active", async () => {
  const box = await page.locator(".resizable-r").boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + 50;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y);
  await page.evaluate(() =>
    window.fixture.setProps({ width: window.fixture.state().width })
  );
  assert.deepEqual(await page.evaluate(() => window.fixture.events), [
    "resize:start",
  ]);
  await page.mouse.move(x + 30, y);
  assert.equal(await width(), 630);
  await page.evaluate(() => window.fixture.setProps({ width: 700 }));
  await page.mouse.move(x + 40, y);
  await page.mouse.up();
  assert.equal(await width(), 700);
  assert.deepEqual(await page.evaluate(() => window.fixture.events), [
    "resize:start",
    "resize:end",
  ]);
});

for (const mode of ["resize", "drag"]) {
  test(`batched updates retain complete geometry with feedback on ${mode}:end`, async () => {
    await page.evaluate(() => window.fixture.setEndFeedback(true));
    const box = await page
      .locator(mode === "resize" ? ".resizable-r" : "#handle")
      .boundingBox();
    const x = box.x + box.width / 2,
      y = box.y + 15;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y + 10);
    const requested = { width: 500, height: 150, left: 50, top: 60 };
    await page.evaluate((value) => window.fixture.setProps(value), requested);
    await page.mouse.move(x + 40, y + 30);
    await page.mouse.up();
    assert.deepEqual(
      await page.evaluate(() => window.fixture.endState()),
      requested
    );
    assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
      width: 500,
      left: 50,
      top: 60,
    });
    assert.equal(
      await page
        .locator(".resizable-component")
        .evaluate((el) => el.offsetHeight),
      150
    );
    assert.deepEqual(await page.evaluate(() => window.fixture.events), [
      `${mode}:start`,
      `${mode}:end`,
    ]);
  });
}
