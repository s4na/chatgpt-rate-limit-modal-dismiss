import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import puppeteer from "puppeteer";

const extensionPath = path.resolve(".");

async function openFixture(page, { heading, button = "了解" }) {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.isNavigationRequest()) {
      request.respond({
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html>
          <body data-scroll-locked="1" style="pointer-events: none">
            <div data-testid="modal-conversation-history-rate-limit">
              <div role="dialog">
                <h2>${heading}</h2>
                <button>${button}</button>
              </div>
            </div>
            <script>
              document.querySelector("button").addEventListener("click", () => {
                document.body.dataset.dismissed = "true";
                document.body.removeAttribute("data-scroll-locked");
                document.body.style.pointerEvents = "";
              });
            </script>
          </body>`
      });
      return;
    }

    request.continue();
  });

  await page.goto("https://chatgpt.com/extension-test", {
    waitUntil: "domcontentloaded"
  });
}

test("loads the extension and dismisses only the target modal", async (t) => {
  const browser = await puppeteer.launch({
    enableExtensions: [extensionPath],
    args: process.env.CI ? ["--no-sandbox"] : []
  });
  t.after(() => browser.close());

  await t.test("dismisses the conversation history rate-limit modal", async () => {
    const page = await browser.newPage();
    await openFixture(page, { heading: "リクエストが多すぎます" });

    await page.waitForFunction(() => document.body.dataset.dismissed === "true");
    assert.equal(
      await page.evaluate(() => document.body.hasAttribute("data-scroll-locked")),
      false
    );
    await page.close();
  });

  await t.test("does not dismiss another modal after initialization", async () => {
    const page = await browser.newPage();
    await openFixture(page, { heading: "リクエストが多すぎます" });
    await page.waitForFunction(() => document.body.dataset.dismissed === "true");

    await page.evaluate(() => {
      delete document.body.dataset.dismissed;
      document.body.innerHTML = `
        <div data-testid="modal-conversation-history-rate-limit">
          <div role="dialog">
            <h2>削除しますか？</h2>
            <button>了解</button>
          </div>
        </div>
      `;
      document.querySelector("button").addEventListener("click", () => {
        document.body.dataset.dismissed = "true";
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(
      await page.evaluate(() => document.body.dataset.dismissed),
      undefined
    );
    await page.close();
  });
});
