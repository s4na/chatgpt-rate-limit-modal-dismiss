import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import puppeteer from "puppeteer";

const extensionPath = path.resolve(".");
const modalSelector =
  '[data-testid="modal-conversation-history-rate-limit"]';
const notificationSelector =
  "[data-chatgpt-rate-limit-dismiss-notification]";

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
                <button onclick="
                  document.body.dataset.dismissed = 'true';
                  document.body.removeAttribute('data-scroll-locked');
                  document.body.style.pointerEvents = '';
                  this.closest('[data-testid=modal-conversation-history-rate-limit]').remove();
                ">${button}</button>
              </div>
            </div>
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

async function replaceModalAndReadFirstFrame(page, heading, handlerDelay = 0) {
  return page.evaluate(
    ({
      dismissNotificationSelector,
      modalHeading,
      modalSelectorForTest,
      clickHandlerDelay
    }) =>
      new Promise((resolve) => {
        document.querySelectorAll(dismissNotificationSelector).forEach(
          (notification) => notification.remove()
        );
        delete document.body.dataset.dismissed;
        document.body.setAttribute("data-scroll-locked", "1");
        document.body.style.pointerEvents = "none";
        document.body.innerHTML = `
          <div data-testid="modal-conversation-history-rate-limit">
            <div role="dialog">
              <h2>${modalHeading}</h2>
              <button>了解</button>
            </div>
          </div>
        `;

        const modal = document.querySelector(modalSelectorForTest);
        const attachClickHandler = () => {
          document.querySelector("button").addEventListener("click", () => {
            document.body.dataset.dismissed = "true";
            document.body.removeAttribute("data-scroll-locked");
            document.body.style.pointerEvents = "";
            modal.remove();
          });
        };

        if (clickHandlerDelay > 0) {
          globalThis.setTimeout(attachClickHandler, clickHandlerDelay);
        } else {
          attachClickHandler();
        }

        globalThis.requestAnimationFrame(() => {
          resolve({
            dismissed: document.body.dataset.dismissed ?? null,
            display:
              modal.style.getPropertyValue("display") ||
              globalThis.getComputedStyle(modal).display,
            notification:
              document.querySelector(dismissNotificationSelector)?.textContent ??
              null
          });
        });
      }),
    {
      clickHandlerDelay: handlerDelay,
      dismissNotificationSelector: notificationSelector,
      modalHeading: heading,
      modalSelectorForTest: modalSelector
    }
  );
}

test("loads the extension and dismisses only the target modal", async (t) => {
  const browser = await puppeteer.launch({
    enableExtensions: true,
    args: process.env.CI ? ["--no-sandbox"] : []
  });
  t.after(() => browser.close());

  const extensionId = await browser.installExtension(extensionPath);
  assert.ok(extensionId, "the unpacked extension should be installed");

  await t.test("hides and dismisses the target before its first frame", async () => {
    const page = await browser.newPage();
    await openFixture(page, { heading: "リクエストが多すぎます" });
    await page.waitForFunction(() => document.body.dataset.dismissed === "true");
    await page.waitForSelector(notificationSelector);

    assert.equal(
      await page.$eval(notificationSelector, ({ textContent }) => textContent),
      "「リクエストが多すぎます」を自動で閉じました"
    );

    const firstFrame = await replaceModalAndReadFirstFrame(
      page,
      "リクエストが多すぎます"
    );
    assert.equal(firstFrame.display, "none");
    assert.equal(firstFrame.dismissed, "true");
    assert.equal(
      await page.$eval(notificationSelector, ({ textContent }) => textContent),
      "「リクエストが多すぎます」を自動で閉じました"
    );
    await page.close();
  });

  await t.test("retries until the click handler is ready", async () => {
    const page = await browser.newPage();
    await openFixture(page, { heading: "リクエストが多すぎます" });
    await page.waitForFunction(() => document.body.dataset.dismissed === "true");

    const firstFrame = await replaceModalAndReadFirstFrame(
      page,
      "リクエストが多すぎます",
      150
    );
    assert.deepEqual(firstFrame, {
      dismissed: null,
      display: "none",
      notification: null
    });

    await page.waitForFunction(() => document.body.dataset.dismissed === "true");
    await page.waitForSelector(notificationSelector);
    assert.equal(
      await page.$eval(notificationSelector, ({ textContent }) => textContent),
      "「リクエストが多すぎます」を自動で閉じました"
    );
    await page.close();
  });

  await t.test("leaves another notification visible", async () => {
    const page = await browser.newPage();
    await openFixture(page, { heading: "リクエストが多すぎます" });
    await page.waitForFunction(() => document.body.dataset.dismissed === "true");

    const firstFrame = await replaceModalAndReadFirstFrame(page, "削除しますか？");
    assert.deepEqual(firstFrame, {
      dismissed: null,
      display: "block",
      notification: null
    });
    assert.equal(
      await page.evaluate(() => document.body.hasAttribute("data-scroll-locked")),
      true
    );
    await page.close();
  });
});
