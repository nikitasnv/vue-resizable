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

const dimensions = () =>
  page.locator(".resizable-component").evaluate((el) => {
    const style = getComputedStyle(el);
    return [parseFloat(style.width), parseFloat(style.height)];
  });

async function resizeBy(handle, x, y = 0) {
  const box = await page.locator(`.resizable-${handle}`).boundingBox();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + x, startY + y);
  await page.mouse.up();
}

test("resize steps keep opposite edges anchored and yield to CSS limits", async () => {
  await page.evaluate(() =>
    window.fixture.setProps({
      width: 105,
      height: 85,
      minWidth: 0,
      left: 100,
      top: 100,
      fitParent: false,
      step: 20,
    })
  );
  await resizeBy("rb", 13, 29);
  assert.deepEqual(await dimensions(), [125, 105]);
  await resizeBy("lt", -13, -29);
  assert.deepEqual(await dimensions(), [145, 125]);
  assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
    width: 145,
    left: 80,
    top: 80,
  });
  await page.evaluate(() =>
    window.fixture.setProps({ maxWidth: "160px", minHeight: "80px" })
  );
  await resizeBy("r", 100);
  await resizeBy("b", 0, -200);
  assert.deepEqual(await dimensions(), [160, 80]);
  const end = await page.evaluate(() => window.fixture.endState());
  assert.deepEqual([end.width, end.height], [160, 80]);
  assert.deepEqual(errors, []);
});

test("resize steps preserve aspect ratio and prioritize its limiting axis", async () => {
  await page.evaluate(async () => {
    window.fixture.setEndFeedback(true);
    await window.fixture.setProps({
      width: 200,
      height: 100,
      minWidth: 0,
      step: 50,
      lockAspectRatio: true,
    });
  });
  await resizeBy("rb", 46, 18);
  assert.deepEqual(await dimensions(), [250, 125]);
  await page.evaluate(() =>
    window.fixture.setProps({ width: 200, height: 100 })
  );
  await resizeBy("b", 0, 26);
  assert.deepEqual(await dimensions(), [300, 150]);
  await page.evaluate(() =>
    window.fixture.setProps({ width: 200, height: 100, maxHeight: "30%" })
  );
  await resizeBy("r", 100);
  assert.deepEqual(await dimensions(), [240, 120]);
});

test("resize steps leave external dimensions and dragging unsnapped", async () => {
  await page.evaluate(() =>
    window.fixture.setProps({
      width: 205,
      height: 105,
      minWidth: 0,
      fitParent: false,
      step: 50,
    })
  );
  await resizeBy("r", 13);
  assert.equal(await width(), 205);
  await page.evaluate(() =>
    window.fixture.setProps({ width: 217, height: 119 })
  );
  assert.deepEqual(await dimensions(), [217, 119]);
  const header = await page.locator("#handle").boundingBox();
  await page.mouse.move(header.x + 20, header.y + 15);
  await page.mouse.down();
  await page.mouse.move(header.x + 33, header.y + 32);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
    width: 217,
    left: 13,
    top: 17,
  });
});

test("resize steps use CSS pixels under a transformed component", async () => {
  await page.evaluate(async () => {
    await window.fixture.setBoxStyle({
      transform: "scale(2)",
      transformOrigin: "top left",
    });
    await window.fixture.setProps({
      width: 105,
      height: 85,
      minWidth: 0,
      fitParent: false,
      step: 20,
    });
  });
  await resizeBy("r", 26);
  assert.deepEqual(await dimensions(), [125, 85]);
  assert.equal(await width(), 250);
});

test("percentage steps use separate axes and freeze parent dimensions during resize", async () => {
  await page.evaluate(() =>
    window.fixture.setProps({
      width: 205,
      height: 105,
      minWidth: 0,
      fitParent: false,
      step: "10%",
    })
  );
  await resizeBy("rb", 46, 26);
  assert.deepEqual(await dimensions(), [285, 145]);
  await page.evaluate(() => window.fixture.setParentWidth(1000));
  const box = await page.locator(".resizable-rb").boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.evaluate(() => window.fixture.setParentWidth(600));
  await page.mouse.move(x + 61, y + 26);
  await page.mouse.up();
  assert.deepEqual(await dimensions(), [385, 185]);
  await resizeBy("rb", 31, 21);
  assert.deepEqual(await dimensions(), [445, 225]);
  await page.evaluate(() => window.fixture.setProps({ maxWidth: "450px" }));
  await resizeBy("r", 100);
  assert.equal(await width(), 450);
  assert.deepEqual(errors, []);
});

test("percentage steps select the aspect ratio handle's primary axis", async () => {
  await page.evaluate(async () => {
    window.fixture.setEndFeedback(true);
    await window.fixture.setParentWidth(1000);
    await window.fixture.setProps({
      width: 200,
      height: 100,
      minWidth: 0,
      fitParent: false,
      lockAspectRatio: true,
      step: "10%",
    });
  });
  await resizeBy("rb", 61, 26);
  assert.deepEqual(await dimensions(), [300, 150]);
  await page.evaluate(() =>
    window.fixture.setProps({ width: 200, height: 100 })
  );
  await resizeBy("b", 0, 21);
  assert.deepEqual(await dimensions(), [280, 140]);
  await page.evaluate(() =>
    window.fixture.setProps({ width: 200, height: 100, maxHeight: "35%" })
  );
  await resizeBy("r", 100);
  assert.deepEqual(await dimensions(), [280, 140]);
});

test("percentage steps use unscaled parent client dimensions including padding", async () => {
  await page.evaluate(async () => {
    document.getElementById("parent").style.padding = "20px";
    await window.fixture.setBoxStyle({
      transform: "scale(2)",
      transformOrigin: "top left",
    });
    await window.fixture.setProps({
      width: 105,
      height: 85,
      minWidth: 0,
      fitParent: false,
      step: "10%",
    });
  });
  await resizeBy("rb", 100, 50);
  assert.deepEqual(await dimensions(), [189, 129]);
  assert.equal(await width(), 378);
});

test("CSS maximums resolve on mount and follow parent size changes", async () => {
  const props = {
    minWidth: 0,
    width: 700,
    height: 350,
    maxWidth: "calc(50% - 20px)",
    maxHeight: "50%",
  };
  await page.goto(
    `${origin}?props=${encodeURIComponent(JSON.stringify(props))}`
  );
  await page.waitForFunction(() => Boolean(window.fixture));
  assert.deepEqual(await dimensions(), [380, 200]);
  assert.equal(await page.evaluate(() => window.fixture.state().width), 380);
  await page.evaluate(() => window.fixture.setParentWidth(600));
  await page.waitForFunction(() => window.fixture.state().width === 280);
  assert.deepEqual(await dimensions(), [280, 200]);
  await page.evaluate(() => window.fixture.setParentWidth(1000));
  await resizeBy("rb", 1000, 1000);
  assert.deepEqual(await dimensions(), [480, 200]);
  assert.deepEqual(errors, []);
});

for (const display of ["flex", "grid"]) {
  test(`CSS expression measurement stays outside the ${display} layout`, async () => {
    const query = new URLSearchParams({
      props: JSON.stringify({
        width: 600,
        height: 300,
        minWidth: 0,
        fitParent: false,
        maxWidth: "calc(50% - 20px)",
        maxHeight: "calc(50% - 20px)",
      }),
      parentStyle: JSON.stringify({ display, gridTemplateColumns: "1fr" }),
    });
    await page.goto(`${origin}?${query}`);
    await page.waitForFunction(() => Boolean(window.fixture));
    await page.evaluate(async () => {
      for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
    });
    assert.deepEqual(await dimensions(), [380, 180]);
    assert.equal(await page.evaluate(() => window.fixture.state().width), 380);
    assert.equal(await page.locator("#parent > *").count(), 1);
    assert.deepEqual(errors, []);
  });
}

for (const [property, value, expected] of [
  ["maxHeight", "50%", 200],
  ["minHeight", "200%", 800],
  ["maxHeight", "calc(50% - 10px)", 190],
  ["minHeight", "calc(200% + 10px)", 810],
]) {
  test(`${property}=${value} avoids circular sizing with an auto-height parent`, async () => {
    const query = new URLSearchParams({
      props: JSON.stringify({
        width: 200,
        height: 100,
        minWidth: 0,
        fitParent: false,
        [property]: value,
      }),
      parentStyle: JSON.stringify({ height: "auto" }),
    });
    await page.goto(`${origin}?${query}`);
    await page.waitForFunction(() => Boolean(window.fixture));
    const heights = await page
      .locator(".resizable-component")
      .evaluate(async (el) => {
        const values = [];
        for (let i = 0; i < 8; i++) {
          await new Promise(requestAnimationFrame);
          values.push(parseFloat(getComputedStyle(el).height));
        }
        return values;
      });
    assert.deepEqual(heights, Array(8).fill(100));
    assert.deepEqual(await dimensions(), [200, 100]);
    await page.evaluate(() =>
      window.fixture.setParentStyle({ height: "400px" })
    );
    await page.waitForFunction(
      () => document.getElementById("parent").clientHeight === 400
    );
    await page.evaluate(() => window.fixture.setProps({ height: 300 }));
    assert.deepEqual(await dimensions(), [200, expected]);
    await page.evaluate(() =>
      window.fixture.setParentStyle({ height: "auto" })
    );
    // Observe the removal of the definite height before assigning a new size.
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
      await window.fixture.setProps({ height: 301 });
    });
    assert.deepEqual(await dimensions(), [200, 301]);
    assert.equal(await page.locator("#parent > *").count(), 1);
    assert.deepEqual(errors, []);
  });
}

test("auto dimensions avoid circular fitParent bounds and still respect zero-height parents", async () => {
  const query = new URLSearchParams({
    props: JSON.stringify({
      width: 200,
      height: "auto",
      minWidth: 0,
      top: 20,
      fitParent: true,
      maxHeight: "50%",
    }),
    parentStyle: JSON.stringify({ height: "auto" }),
  });
  await page.goto(`${origin}?${query}`);
  await page.waitForFunction(() => Boolean(window.fixture));
  await page.evaluate(() =>
    window.fixture.setContentStyle({ height: "100px" })
  );
  const heights = await page
    .locator(".resizable-component")
    .evaluate(async (el) => {
      const values = [];
      for (let i = 0; i < 8; i++) {
        await new Promise(requestAnimationFrame);
        values.push(parseFloat(getComputedStyle(el).height));
      }
      return values;
    });
  assert.deepEqual(heights, Array(8).fill(100));
  await page.evaluate(() => window.fixture.setParentStyle({ height: "0px" }));
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".resizable-component"))
        .height === "0px"
  );
  await page.evaluate(() => window.fixture.setParentStyle({ height: "400px" }));
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".resizable-component"))
        .height === "100px"
  );
  await page.evaluate(() =>
    window.fixture.setContentStyle({ height: "300px" })
  );
  assert.deepEqual(await dimensions(), [200, 200]);
  await page.evaluate(() => window.fixture.setParentStyle({ height: "auto" }));
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".resizable-component"))
        .height === "300px"
  );
  assert.deepEqual(errors, []);
});

test("percentage maximums use and observe the positioned containing block", async () => {
  await page.evaluate(async () => {
    const containingBlock = document.createElement("div");
    containingBlock.id = "containing-block";
    containingBlock.style.cssText =
      "position:relative;width:1000px;height:600px";
    document.body.appendChild(containingBlock);
    const parent = document.getElementById("parent");
    const style = document.createElement("style");
    style.textContent = "#parent { position: static !important }";
    document.head.appendChild(style);
    containingBlock.appendChild(parent);
    await window.fixture.setBoxStyle({ position: "absolute" });
    await window.fixture.setProps({
      minWidth: 0,
      fitParent: false,
      width: 900,
      height: 500,
      maxWidth: "50%",
      maxHeight: "50%",
    });
  });
  assert.deepEqual(await dimensions(), [500, 300]);
  await page.evaluate(() => {
    document.getElementById("containing-block").style.width = "600px";
  });
  await page.waitForFunction(() => window.fixture.state().width === 300);
  assert.deepEqual(await dimensions(), [300, 300]);
});

test("relative positioning resolves percentage limits against the parent's content box", async () => {
  await page.evaluate(async () => {
    document.getElementById("parent").style.padding = "20px";
    await window.fixture.setBoxStyle({ position: "relative" });
    await window.fixture.setProps({
      minWidth: 0,
      width: 700,
      height: 350,
      maxWidth: "50%",
      maxHeight: "50%",
    });
  });
  assert.deepEqual(await dimensions(), [400, 200]);
  await page.evaluate(() =>
    window.fixture.setProps({
      maxWidth: "calc(50% - 20px)",
      maxHeight: "calc(50% - 20px)",
    })
  );
  assert.deepEqual(await dimensions(), [380, 180]);
  await page.evaluate(() =>
    window.fixture.setProps({
      minWidth: "60%",
      minHeight: "75%",
      maxWidth: undefined,
      maxHeight: undefined,
      width: 10,
      height: 10,
    })
  );
  assert.deepEqual(await dimensions(), [480, 300]);
  await page.evaluate(() => window.fixture.setParentWidth(1000));
  await page.waitForFunction(() => window.fixture.state().width === 600);
  assert.deepEqual(await dimensions(), [600, 300]);
});

test("viewport CSS expressions update maximums when the window changes", async () => {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.evaluate(() =>
      window.fixture.setProps({
        fitParent: false,
        minWidth: 0,
        width: 1000,
        height: 700,
        maxWidth: "calc(100vw * 2 / 3)",
        maxHeight: "50vh",
      })
    );
    assert.deepEqual(await dimensions(), [800, 400]);
    await page.setViewportSize({ width: 900, height: 600 });
    await page.waitForFunction(() => window.fixture.state().width === 600);
    assert.deepEqual(await dimensions(), [600, 300]);
    await page.evaluate(() => window.fixture.setProps({ maxWidth: "66vw" }));
    assert.equal(await width(), 594);
    await resizeBy("rb", 1000, 1000);
    assert.deepEqual(await dimensions(), [594, 300]);
  } finally {
    await page.setViewportSize(original);
  }
});

test("CSS maximums combine with aspect locking and box sizing", async () => {
  await page.evaluate(async () => {
    await window.fixture.setBoxStyle({
      padding: "10px",
      border: "2px solid black",
      boxSizing: "content-box",
      fontSize: "20px",
    });
    await window.fixture.setProps({
      minWidth: 0,
      width: 200,
      height: 100,
      maxWidth: "20em",
      maxHeight: "calc(50% - 20px)",
      lockAspectRatio: true,
    });
  });
  await resizeBy("r", 1000);
  assert.deepEqual(await dimensions(), [360, 180]);
  assert.equal(await width(), 384);
  await page.evaluate(async () => {
    await window.fixture.setBoxStyle({
      boxSizing: "border-box",
      padding: "10px",
      border: "2px solid black",
    });
    await window.fixture.setProps({ width: 200, height: 100 });
  });
  await resizeBy("r", 1000);
  assert.deepEqual(await dimensions(), [360, 180]);
  assert.equal(await width(), 360);
});

test("clearing CSS maximums preserves numeric zero as unlimited", async () => {
  await page.evaluate(() =>
    window.fixture.setProps({
      minWidth: 0,
      maxWidth: "250px",
      maxHeight: "150px",
    })
  );
  assert.deepEqual(await dimensions(), [250, 150]);
  await page.evaluate(() =>
    window.fixture.setProps({
      maxWidth: 0,
      maxHeight: "none",
      width: 600,
      height: 350,
    })
  );
  assert.deepEqual(await dimensions(), [600, 350]);
  await page.evaluate(() => window.fixture.setParentWidth(500));
  await page.waitForTimeout(50);
  assert.deepEqual(await dimensions(), [600, 350]);
});

test("auto sizes respect CSS maximums and remain constrained after resizing", async () => {
  await page.evaluate(async () => {
    await window.fixture.setContentStyle({ width: "600px", height: "350px" });
    await window.fixture.setProps({
      minWidth: 0,
      width: "auto",
      height: "auto",
      maxWidth: "50%",
      maxHeight: "calc(50% - 20px)",
    });
  });
  assert.deepEqual(await dimensions(), [400, 180]);
  await resizeBy("rb", 1000, 1000);
  assert.deepEqual(await dimensions(), [400, 180]);
});

test("CSS minimums resolve on mount and follow parent size changes", async () => {
  const props = {
    width: 10,
    height: 10,
    minWidth: "calc(50% - 20px)",
    minHeight: "25%",
  };
  await page.goto(
    `${origin}?props=${encodeURIComponent(JSON.stringify(props))}`
  );
  await page.waitForFunction(() => Boolean(window.fixture));
  assert.deepEqual(await dimensions(), [380, 100]);
  await page.evaluate(() => window.fixture.setParentWidth(1000));
  await page.waitForFunction(() => window.fixture.state().width === 480);
  assert.deepEqual(await dimensions(), [480, 100]);
  await resizeBy("rb", -1000, -1000);
  assert.deepEqual(await dimensions(), [480, 100]);
  await page.evaluate(() =>
    window.fixture.setProps({
      minWidth: "0",
      minHeight: "invalid",
      width: 20,
      height: 30,
    })
  );
  assert.deepEqual(await dimensions(), [20, 30]);
  assert.deepEqual(errors, []);
});

test("viewport CSS minimums update when the window grows", async () => {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 1000, height: 600 });
    await page.evaluate(() =>
      window.fixture.setProps({
        fitParent: false,
        width: 10,
        height: 10,
        minWidth: "20vw",
        minHeight: "calc(50vh - 20px)",
      })
    );
    assert.deepEqual(await dimensions(), [200, 280]);
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForFunction(() => window.fixture.state().width === 240);
    assert.deepEqual(await dimensions(), [240, 380]);
    await resizeBy("rb", -1000, -1000);
    assert.deepEqual(await dimensions(), [240, 380]);
  } finally {
    await page.setViewportSize(original);
  }
});

test("CSS minimums combine with aspect locking and respect upper bounds", async () => {
  await page.evaluate(() =>
    window.fixture.setProps({
      width: 400,
      height: 200,
      minWidth: "40%",
      minHeight: "50%",
      maxWidth: "50%",
      maxHeight: "75%",
      lockAspectRatio: true,
    })
  );
  await resizeBy("r", -1000);
  assert.deepEqual(await dimensions(), [400, 200]);
  await page.evaluate(() =>
    window.fixture.setProps({ maxWidth: "45%", maxHeight: "35%" })
  );
  assert.deepEqual(await dimensions(), [360, 140]);
  for (const [boxSizing, expected] of [
    ["content-box", [756, 346]],
    ["border-box", [780, 370]],
  ]) {
    await page.evaluate(async (boxSizing) => {
      await window.fixture.setProps({
        minWidth: 0,
        minHeight: 0,
        width: 200,
        height: 100,
      });
      await window.fixture.setBoxStyle({
        boxSizing,
        padding: "10px",
        border: "2px solid black",
      });
      await window.fixture.setProps({
        width: 100,
        height: 100,
        left: 20,
        top: 30,
        minWidth: "200%",
        minHeight: "200%",
        maxWidth: undefined,
        maxHeight: undefined,
      });
    }, boxSizing);
    assert.deepEqual(await dimensions(), expected);
  }
});

test("auto CSS minimums remain below maximums and parent boundaries", async () => {
  await page.evaluate(async () => {
    await window.fixture.setContentStyle({ width: "10px", height: "10px" });
    await window.fixture.setBoxStyle({
      boxSizing: "content-box",
      padding: "10px",
      border: "2px solid black",
    });
    await window.fixture.setProps({
      width: "auto",
      height: "auto",
      minWidth: "40%",
      minHeight: "50%",
      maxWidth: "30%",
      maxHeight: "25%",
    });
  });
  assert.deepEqual(await dimensions(), [240, 100]);
  await page.evaluate(() =>
    window.fixture.setProps({
      left: 20,
      top: 30,
      minWidth: "200%",
      minHeight: "200%",
      maxWidth: undefined,
      maxHeight: undefined,
    })
  );
  assert.deepEqual(await dimensions(), [756, 346]);
  await page.evaluate(() => window.fixture.setParentWidth(500));
  await page.waitForFunction(
    () =>
      parseFloat(
        getComputedStyle(document.querySelector(".resizable-component")).width
      ) === 456
  );
  assert.deepEqual(await dimensions(), [456, 346]);
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
      maxWidth: "calc(50% - 50px)",
      minHeight: "30%",
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

for (const boxSizing of ["content-box", "border-box"]) {
  test(`aspect lock respects the secondary parent boundary with ${boxSizing}`, async () => {
    await page.evaluate(async (boxSizing) => {
      await window.fixture.setParentWidth(700);
      await window.fixture.setBoxStyle({
        boxSizing,
        padding: "10px",
        border: "2px solid black",
      });
      await window.fixture.setProps({
        width: 200,
        height: 100,
        minWidth: 0,
        top: 200,
        lockAspectRatio: true,
      });
    }, boxSizing);
    const handle = await page.locator(".resizable-r").boundingBox();
    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(1200, handle.y + handle.height / 2);
    await page.mouse.up();
    const geometry = await page
      .locator(".resizable-component")
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          width: parseFloat(style.width),
          height: parseFloat(style.height),
          bottom: el.offsetTop + el.offsetHeight,
        };
      });
    assert.equal(geometry.width / geometry.height, 2);
    assert.equal(geometry.bottom, 400);
    assert.deepEqual(await page.evaluate(() => window.fixture.events), [
      "resize:start",
      "resize:end",
    ]);
  });
}

test("aspect lock measures auto sizes and keeps the opposite corner fixed", async () => {
  await page.evaluate(async () => {
    await window.fixture.setBoxStyle({ display: "inline-block" });
    await window.fixture.setContentStyle({ width: "200px", height: "100px" });
    await window.fixture.setProps({
      width: "auto",
      height: "auto",
      minWidth: 0,
      left: 100,
      top: 100,
      lockAspectRatio: true,
    });
  });
  const handle = await page.locator(".resizable-lt").boundingBox();
  const x = handle.x + handle.width / 2,
    y = handle.y + handle.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 100, y - 50);
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => window.fixture.state()), {
    width: 300,
    left: 0,
    top: 50,
  });
  assert.equal(
    await page
      .locator(".resizable-component")
      .evaluate((el) => el.offsetHeight),
    150
  );
});
