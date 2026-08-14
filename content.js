(() => {
  "use strict";

  const modalSelector =
    '[data-testid="modal-conversation-history-rate-limit"]';
  const notificationSelector =
    "[data-chatgpt-rate-limit-dismiss-notification]";
  const clickedButtons = new WeakSet();

  function showDismissNotification(message) {
    document.querySelector(notificationSelector)?.remove();

    const notification = document.createElement("div");
    notification.dataset.chatgptRateLimitDismissNotification = "";
    notification.setAttribute("role", "status");
    notification.textContent = `「${message}」を自動で閉じました`;
    notification.style.cssText = [
      "all: initial",
      "position: fixed",
      "top: 16px",
      "right: 16px",
      "z-index: 2147483647",
      "box-sizing: border-box",
      "max-width: min(360px, calc(100vw - 32px))",
      "padding: 12px 16px",
      "border-radius: 8px",
      "background: #202123",
      "color: #fff",
      'font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      "box-shadow: 0 4px 16px rgb(0 0 0 / 25%)"
    ].join(";");

    document.documentElement.append(notification);
    globalThis.setTimeout(() => notification.remove(), 4000);
  }

  function dismissRateLimitModal() {
    for (const modal of document.querySelectorAll(modalSelector)) {
      const dialog = modal.querySelector('[role="dialog"]');
      const heading = dialog?.querySelector("h2");
      const message = heading?.textContent?.trim();
      const button = [...(dialog?.querySelectorAll("button") ?? [])].find(
        (candidate) => candidate.textContent?.trim() === "了解"
      );

      if (
        message !== "リクエストが多すぎます" ||
        !button ||
        clickedButtons.has(button)
      ) {
        continue;
      }

      modal.style.setProperty("display", "none", "important");
      clickedButtons.add(button);
      button.click();
      showDismissNotification(message);
    }
  }

  const observer = new MutationObserver(dismissRateLimitModal);
  observer.observe(document, {
    childList: true,
    subtree: true
  });

  dismissRateLimitModal();
})();
