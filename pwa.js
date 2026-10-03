(() => {
  "use strict";

  // Relative URLs preserve the /flip-clock/ scope used by GitHub project Pages.
  if ("serviceWorker" in navigator && ["https:", "http:"].includes(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })
        .catch(error => console.warn("离线缓存暂未就绪，请联网后重新打开。", error));
    }, { once: true });
  }

  // Keep the tablet awake while this clock is visible, where the browser allows it.
  let wakeLock = null;
  let requestingWakeLock = false;
  async function keepAwake() {
    if (!("wakeLock" in navigator) || document.hidden || wakeLock || requestingWakeLock) return;
    requestingWakeLock = true;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; }, { once: true });
    } catch {
      // Low battery, browser permissions or unsupported devices may reject this.
    } finally {
      requestingWakeLock = false;
    }
  }

  async function toggleFullscreen() {
    const root = document.documentElement;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        return;
      }
      const enter = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!enter) return;
      await enter.call(root);
      if (screen.orientation?.lock) await screen.orientation.lock("landscape").catch(() => {});
    } catch {
      // Home-screen app mode is the alternative on browsers without Fullscreen API.
    }
  }

  // No extra buttons: two taps anywhere on the clock request fullscreen.
  let previousTap = -Infinity;
  document.querySelector(".clock").addEventListener("pointerup", event => {
    if (!event.isPrimary || event.button !== 0) return;
    const now = performance.now();
    if (now - previousTap < 350) {
      previousTap = -Infinity;
      void toggleFullscreen();
    } else {
      previousTap = now;
    }
    void keepAwake();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void keepAwake();
  });
  window.addEventListener("focus", () => { void keepAwake(); });
  void keepAwake();
})();
