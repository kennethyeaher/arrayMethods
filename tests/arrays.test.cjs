"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const names = [
  "Milano's Italian Restaurant",
  "Sakura Sushi",
  "Border Café",
  "The Brass Elephant",
  "Pho Corner",
  "Tandoor Palace",
  "Le Petit Bistro",
  "Seoul Kitchen",
];
const affordableNames = [names[0], names[2], names[4], names[5], names[7]];
const cuisines = [
  "Italian",
  "Japanese",
  "Mexican",
  "American",
  "Vietnamese",
  "Indian",
  "French",
  "Korean",
];
let server;
let browser;
let origin;

/** Serve repository files for isolated browser checks; reject paths outside the root. */
async function serveFile(request, response) {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const filename = path.resolve(
    root,
    `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`,
  );
  if (!filename.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const content = await fs.readFile(filename);
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
    };
    response.writeHead(200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
}

before(async () => {
  server = http.createServer(serveFile);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || undefined,
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

/** Open a clean page and collect browser exceptions, warnings, and failed responses. */
async function openPage(viewport = { width: 1440, height: 1000 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${origin}/tutorial_5_arrays/`);
  return { page, errors };
}

test("all four buttons display the required data without duplicates or source mutations", async () => {
  const { page, errors } = await openPage();
  try {
    assert.equal(await page.title(), "Table for eight | Array methods");
    const original = await page.evaluate(() => JSON.stringify(restaurants));
    // Freeze every nested value so accidental mutations fail during the interaction.
    await page.evaluate(() => {
      restaurants.forEach((restaurant) => {
        Object.freeze(restaurant.specialties);
        Object.freeze(restaurant);
      });
      Object.freeze(restaurants);
    });
    for (let repeat = 0; repeat < 2; repeat += 1) {
      await page.locator("#display-button").click();
      assert.deepEqual(
        await page
          .locator("#restaurant-list .restaurant-name")
          .allTextContents(),
        names,
      );
      assert.deepEqual(
        await page
          .locator("#restaurant-list .restaurant-cuisine")
          .allTextContents(),
        cuisines,
      );
      await page.locator("#filter-button").click();
      assert.deepEqual(
        await page.locator("#filtered-list .restaurant-name").allTextContents(),
        affordableNames,
      );
      assert.deepEqual(
        await page
          .locator("#filtered-list .restaurant-details")
          .allTextContents(),
        [
          "$$ · 4.5 / 5",
          "$ · 4.0 / 5",
          "$ · 4.3 / 5",
          "$$ · 4.1 / 5",
          "$$ · 4.4 / 5",
        ],
      );
      await page.locator("#map-button").click();
      assert.deepEqual(
        await page.locator("#mapped-list li").allTextContents(),
        names,
      );
      assert.equal(
        await page.locator("#mapped-list .restaurant-cuisine").count(),
        0,
      );
      await page.locator("#find-button").click();
      assert.equal(
        await page.locator("#found-item .restaurant-name").textContent(),
        "The Brass Elephant",
      );
      assert.equal(
        await page.locator("#found-item .restaurant-cuisine").textContent(),
        "American",
      );
      assert.equal(
        await page.locator("#found-item .restaurant-details").textContent(),
        "$$$$ · 4.8 / 5",
      );
    }
    assert.equal(
      await page.evaluate(() => JSON.stringify(restaurants)),
      original,
    );
    assert.equal(await page.locator(".placeholder").count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("find handles a missing match and returns the first exact match", async () => {
  const { page, errors } = await openPage();
  try {
    await page.evaluate(() => {
      restaurants[3].rating = 4.7;
      restaurants[0].rating = 4.9;
    });
    await page.locator("#find-button").click();
    assert.equal(
      await page.locator("#found-item").textContent(),
      "No restaurant has a rating of 4.8.",
    );
    await page.evaluate(() => {
      restaurants[0].rating = 4.8;
      restaurants[3].rating = 4.8;
    });
    await page.locator("#find-button").click();
    assert.equal(
      await page.locator("#found-item .restaurant-name").textContent(),
      names[0],
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("empty arrays clear all prior results and explain missing selections", async () => {
  const { page, errors } = await openPage();
  try {
    for (const id of ["display", "filter", "map", "find"])
      await page.locator(`#${id}-button`).click();
    await page.evaluate(() => {
      restaurants.length = 0;
    });
    for (const id of ["display", "filter", "map", "find"])
      await page.locator(`#${id}-button`).click();
    assert.equal(
      await page.locator("#restaurant-list li, #mapped-list li").count(),
      0,
    );
    assert.equal(
      await page.locator("#filtered-list").textContent(),
      "No restaurants match $ or $$.",
    );
    assert.equal(
      await page.locator("#found-item").textContent(),
      "No restaurant has a rating of 4.8.",
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("restaurant names render as literal text rather than executable markup", async () => {
  const { page, errors } = await openPage();
  try {
    const literalName = '<img src=x onerror="window.injected=true">';
    await page.evaluate((name) => {
      restaurants[0].name = name;
    }, literalName);
    for (const id of ["display", "filter", "map"])
      await page.locator(`#${id}-button`).click();
    assert.equal(
      await page
        .locator("#restaurant-list .restaurant-name")
        .first()
        .textContent(),
      literalName,
    );
    assert.equal(
      await page
        .locator("#filtered-list .restaurant-name")
        .first()
        .textContent(),
      literalName,
    );
    assert.equal(
      await page.locator("#mapped-list li").first().textContent(),
      literalName,
    );
    assert.equal(await page.locator(".result-area img").count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("keyboard activation and explanation disclosure work", async () => {
  const { page, errors } = await openPage();
  try {
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".skip-link")
        .evaluate((element) => element === document.activeElement),
      true,
    );
    await page.keyboard.press("Enter");
    await page.locator("#display-button").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#restaurant-list li").count(), 8);
    await page.locator("#filter-button").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#filtered-list li").count(), 5);
    await page.locator("summary").first().click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      "",
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`results stay within the viewport at ${width}px`, async () => {
    const { page, errors } = await openPage({ width, height: 900 });
    try {
      for (const id of ["display", "filter", "map", "find"])
        await page.locator(`#${id}-button`).click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      const columns = await page
        .locator(".methods-grid")
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(" ").length,
        );
      assert.equal(columns, width <= 760 ? 1 : 2);
      if (process.env.CAPTURE_PREVIEWS === "1" && [390, 1440].includes(width)) {
        await fs.mkdir(path.join(root, "docs/assets"), { recursive: true });
        await page.screenshot({
          path: path.join(root, `docs/assets/preview-${width}.png`),
          fullPage: true,
        });
      }
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });
}

test("repository entry point redirects to the exercise", async () => {
  const { page, errors } = await openPage();
  try {
    await page.goto(`${origin}/`);
    await page.waitForURL(`${origin}/tutorial_5_arrays/`);
    assert.equal(
      await page.locator("h1").textContent(),
      "One table.Four perspectives.",
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});
