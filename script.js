(() => {
  "use strict";

  // A fixed zone and Latin digits make output independent of the system zone/locale.
  const formatter = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  });

  function beijingTime(date) {
    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    // Normalize midnight defensively for implementations that return hour 24.
    return [String(Number(values.hour) % 24).padStart(2, "0"), values.minute, values.second];
  }

  class FlipDigit {
    constructor(element) {
      this.element = element;
      this.top = element.querySelector(".top .glyph");
      this.bottom = element.querySelector(".bottom .glyph");
      this.oldTop = element.querySelector(".flap-top .glyph");
      this.newBottom = element.querySelector(".flap-bottom .glyph");
      this.value = null;
      this.cleanupTimer = null;
      element.querySelector(".flap-bottom").addEventListener("animationend", () => this.finish());
    }

    finish() {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
      this.bottom.textContent = this.value;
      this.element.classList.remove("flipping");
    }

    set(value, animate) {
      if (value === this.value) {
        if (!animate) this.finish();
        return;
      }

      const previous = this.value;
      this.finish();
      this.value = value;
      this.top.textContent = value;

      if (!animate || previous === null) {
        this.bottom.textContent = value;
        return;
      }

      this.bottom.textContent = previous;
      this.oldTop.textContent = previous;
      this.newBottom.textContent = value;
      // Restart only this digit; the six cards are never recreated on a tick.
      void this.element.offsetHeight;
      this.element.classList.add("flipping");
      // Fallback if animationend is lost (background tab, sleep, browser interruption).
      const duration = parseFloat(getComputedStyle(this.element).getPropertyValue("--flip-duration"));
      this.cleanupTimer = setTimeout(() => this.finish(), duration + 80);
    }
  }

  const clock = document.querySelector(".clock");
  const template = document.querySelector("#digit-template");
  const digits = [];
  for (const pair of clock.querySelectorAll(".digit-pair")) {
    for (let index = 0; index < 2; index += 1) {
      const element = template.content.firstElementChild.cloneNode(true);
      pair.append(element);
      digits.push(new FlipDigit(element));
    }
  }

  let tickTimer = null;
  let previousTimestamp = null;

  function update(allowAnimation = true) {
    clearTimeout(tickTimer);
    const now = new Date();
    const timestamp = now.getTime();
    const units = beijingTime(now);
    const characters = units.join("");
    const elapsed = timestamp - previousTimestamp;
    const animate = allowAnimation && previousTimestamp !== null && elapsed >= 0 && elapsed < 1600;
    digits.forEach((digit, index) => digit.set(characters[index], animate));
    clock.setAttribute("aria-label", `北京时间 ${units.join(":")}`);
    previousTimestamp = timestamp;

    // Re-read wall time at each boundary, never increment a stored seconds counter.
    if (!document.hidden) tickTimer = setTimeout(update, 1000 - (Date.now() % 1000) + 12);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(tickTimer);
      digits.forEach(digit => digit.finish());
    } else {
      update(false);
    }
  });
  window.addEventListener("pageshow", () => update(false));
  window.addEventListener("focus", () => update(false));
  update(false);
})();
