/**
 * Lenis smooth scroll (portfolio-style inertial scrolling).
 * https://github.com/darkroomengineering/lenis
 */
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.18/+esm";

function headerOffset() {
  var raw = getComputedStyle(document.documentElement).scrollPaddingTop;
  var px = parseFloat(raw);
  if (isNaN(px) || px < 40) return 88;
  return px;
}

var lenis = new Lenis({
  duration: 1.15,
  easing: function (t) {
    return Math.min(1, 1.001 - Math.pow(2, -10 * t));
  },
  orientation: "vertical",
  gestureOrientation: "vertical",
  smoothWheel: true,
  smoothTouch: false,
  touchMultiplier: 2,
  wheelMultiplier: 1,
  infinite: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

window.gjLenis = lenis;

function scrollToHashFromLocation() {
  var hash = window.location.hash;
  if (!hash || hash.length < 2) return;
  var el = document.querySelector(hash);
  if (!el) return;
  lenis.scrollTo(el, {
    offset: -headerOffset(),
    duration: 1.35,
  });
}

document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener(
    "click",
    function (e) {
      var href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, {
        offset: -headerOffset(),
        duration: 1.35,
      });
      if (history.pushState) {
        history.pushState(null, "", href);
      }
    },
    { passive: false }
  );
});

window.addEventListener("hashchange", function () {
  scrollToHashFromLocation();
});

function runHashAfterPaint() {
  requestAnimationFrame(function () {
    requestAnimationFrame(scrollToHashFromLocation);
  });
}

if (window.location.hash) {
  if (document.readyState === "complete") {
    setTimeout(runHashAfterPaint, 0);
  } else {
    window.addEventListener("load", function () {
      setTimeout(runHashAfterPaint, 0);
    });
  }
}
