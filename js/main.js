(function () {
  var nav = document.querySelector(".site-nav");
  var toggle = document.querySelector(".nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Home page: sync .active on in-page nav links with the section in view */
  if (document.body.classList.contains("page-home") && nav) {
    /* Only sections that have a matching <a href="#..."> in the nav (not contact.html / catalog / students.html) */
    var sectionIds = ["home-hero", "explore-books", "about", "services", "contact"];
    var ticking = false;

    function scrollSpyLine() {
      var pad = parseInt(getComputedStyle(document.documentElement).scrollPaddingTop, 10);
      if (isNaN(pad) || pad < 40) pad = 88;
      return pad;
    }

    function updateHomeNavActive() {
      var line = scrollSpyLine();
      var activeId = "home-hero";
      for (var i = 0; i < sectionIds.length; i++) {
        var id = sectionIds[i];
        var el = document.getElementById(id);
        if (!el || el.hidden) continue;
        var top = el.getBoundingClientRect().top;
        if (top <= line + 12) activeId = id;
      }
      nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
        var href = a.getAttribute("href") || "";
        var hash = href.slice(1);
        if (sectionIds.indexOf(hash) === -1) return;
        a.classList.toggle("active", hash === activeId);
      });
    }

    function onScrollOrResize() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          updateHomeNavActive();
        });
      }
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    updateHomeNavActive();
    window.addEventListener("hashchange", updateHomeNavActive);
    setTimeout(updateHomeNavActive, 0);
  }

  document.querySelectorAll(".att-bar-fill").forEach(function (el) {
    requestAnimationFrame(function () {
      el.classList.add("animate");
    });
  });

  /* Lenis smooth scroll (portfolio-style); skip when user prefers reduced motion */
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.css";
    document.head.appendChild(link);
    var sc = document.createElement("script");
    sc.type = "module";
    sc.src = "js/lenis-init.js";
    document.head.appendChild(sc);
  }
})();
