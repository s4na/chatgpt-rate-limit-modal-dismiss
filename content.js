(() => {
  "use strict";

  const clickedButtons = new WeakSet();

  function dismissRateLimitModal() {
    const modal = document.querySelector(
      '[data-testid="modal-conversation-history-rate-limit"]'
    );
    const dialog = modal?.querySelector('[role="dialog"]');
    const heading = dialog?.querySelector("h2");
    const button = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (candidate) => candidate.textContent?.trim() === "了解"
    );

    if (
      heading?.textContent?.trim() !== "リクエストが多すぎます" ||
      !button ||
      clickedButtons.has(button)
    ) {
      return;
    }

    clickedButtons.add(button);
    button.click();
  }

  dismissRateLimitModal();

  const observer = new MutationObserver(dismissRateLimitModal);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
