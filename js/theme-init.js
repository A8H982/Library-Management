/* Apply saved theme before first paint. Load synchronously in <head>. */
(function () {
  var STORAGE = "gj-theme";
  function readPref() {
    try {
      var v = localStorage.getItem(STORAGE);
      if (v === "light" || v === "dark" || v === "system") return v;
    } catch (e) {}
    return "dark";
  }
  function effective(pref) {
    if (pref === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return pref;
  }
  var pref = readPref();
  document.documentElement.setAttribute("data-theme-pref", pref);
  document.documentElement.setAttribute("data-theme", effective(pref));
})();
