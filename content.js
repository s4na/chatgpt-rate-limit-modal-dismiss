(() => {
  "use strict";

  const modalSelector =
    '[data-testid="modal-conversation-history-rate-limit"]';
  const notificationSelector =
    "[data-chatgpt-rate-limit-dismiss-notification]";
  const maxDismissAttempts = 20;
  const dismissRetryInterval = 100;
  const dismissals = new WeakMap();

  function showDismissNotification(message) {
    document.querySelector(notificationSelector)?.remove();

    const notification = document.createElement("div");
    notification.dataset.chatgptRateLimitDismissNotification = "";
    notification.setAttribute("role", "status");
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
    globalThis.setTimeout(() => {
      notification.textContent = `「${message}」を自動で閉じました`;
      globalThis.setTimeout(() => notification.remove(), 4000);
    }, 0);
  }

  function findDismissButton(modal) {
    const dialog = modal.querySelector('[role="dialog"]');
    return [...(dialog?.querySelectorAll("button") ?? [])].find(
      (candidate) => candidate.textContent?.trim() === "了解"
    );
  }

  function restoreModal(state) {
    if (state.originalDisplay) {
      state.modal.style.setProperty(
        "display",
        state.originalDisplay,
        state.originalDisplayPriority
      );
    } else {
      state.modal.style.removeProperty("display");
    }
    state.status = "failed";
  }

  function notifyAfterScrollUnlock(state, attempts = 0) {
    if (!document.body?.hasAttribute("data-scroll-locked")) {
      showDismissNotification(state.message);
      return;
    }

    if (attempts + 1 >= maxDismissAttempts) {
      return;
    }

    globalThis.setTimeout(
      () => notifyAfterScrollUnlock(state, attempts + 1),
      dismissRetryInterval
    );
  }

  function attemptDismissal(state) {
    const button = findDismissButton(state.modal);
    if (button) {
      state.button = button;
      button.click();
    }

    if (!state.modal.isConnected) {
      dismissals.delete(state.modal);
      notifyAfterScrollUnlock(state);
      return;
    }

    state.attempts += 1;
    if (state.attempts >= maxDismissAttempts) {
      restoreModal(state);
      return;
    }

    globalThis.setTimeout(
      () => attemptDismissal(state),
      dismissRetryInterval
    );
  }

  function dismissRateLimitModal() {
    for (const modal of document.querySelectorAll(modalSelector)) {
      const heading = modal.querySelector('[role="dialog"] h2');
      const message = heading?.textContent?.trim();
      const button = findDismissButton(modal);
      const previousDismissal = dismissals.get(modal);

      if (
        message !== "リクエストが多すぎます" ||
        !button ||
        (previousDismissal &&
          (previousDismissal.status !== "failed" ||
            previousDismissal.button === button))
      ) {
        continue;
      }

      const state = {
        attempts: 0,
        button,
        message,
        modal,
        originalDisplay: modal.style.getPropertyValue("display"),
        originalDisplayPriority: modal.style.getPropertyPriority("display"),
        status: "pending"
      };
      dismissals.set(modal, state);
      modal.style.setProperty("display", "none", "important");
      attemptDismissal(state);
    }
  }

  const observer = new MutationObserver(dismissRateLimitModal);
  observer.observe(document, {
    childList: true,
    subtree: true
  });

  dismissRateLimitModal();
})();
