/**
 * Shared G.J. College program duration and session labels (e.g. 2023-26).
 * Used by staff student directory and student program/session page.
 */
(function () {
  function sessionGapYears() {
    var g = window.GJ_SESSION_GAP_YEARS;
    return typeof g === "number" && g >= 1 && g <= 15 ? Math.floor(g) : 3;
  }

  var GJ_PROGRAM_DURATION_YEARS = {
    "I.A / I.Sc": 2,
    "B. A. /B. Sc. /B. Com.": 3,
    "B.C.A": 3,
    "B.B.M": 3,
    "B.Sc ( IT )": 3,
    "B.Lis": 1,
  };

  window.gjGetProgramDurationYears = function (program) {
    if (!program || !String(program).trim()) return sessionGapYears();
    var d = GJ_PROGRAM_DURATION_YEARS[program];
    return d != null ? d : sessionGapYears();
  };

  window.gjFormatSessionRangeFromAdmAndDur = function (admissionYear, durationYears) {
    var s = parseInt(String(admissionYear), 10);
    if (isNaN(s)) return "—";
    var d = parseInt(String(durationYears), 10);
    if (isNaN(d) || d < 1) d = sessionGapYears();
    var endY = s + d;
    return s + "-" + String(endY).slice(-2);
  };

  /** Prefer row.year; legacy may use session_year or course_year. */
  window.gjYearFromStudentRow = function (row) {
    if (!row) return null;
    var v = row.year;
    if (v == null && row.session_year != null) v = row.session_year;
    if (v == null && row.course_year != null) v = row.course_year;
    if (v == null || v === "") return null;
    var n = parseInt(String(v), 10);
    return isNaN(n) ? null : n;
  };

  window.gjSessionYearFromSelect = function (el) {
    if (!el || !String(el.value).trim()) return null;
    var y = parseInt(String(el.value).trim(), 10);
    if (isNaN(y) || y < 1900 || y > 2100) return null;
    return y;
  };

  window.gjPopulateAdmissionYearSelect = function (sel) {
    if (!sel || sel.tagName !== "SELECT") return;
    var cy = new Date().getFullYear();
    var min = cy - 35;
    var max = cy;
    sel.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Select admission year —";
    sel.appendChild(opt0);
    for (var y = max; y >= min; y--) {
      var opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      sel.appendChild(opt);
    }
  };

  window.gjEnsureAdmissionYearOption = function (sel, y) {
    if (!sel || y == null || y === "") return;
    var iv = parseInt(String(y), 10);
    if (isNaN(iv)) return;
    var cy = new Date().getFullYear();
    if (iv <= cy) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === String(iv)) return;
    }
    var opt = document.createElement("option");
    opt.value = String(iv);
    opt.textContent = String(iv) + " (saved year)";
    opt.setAttribute("data-gj-legacy-admission", "1");
    if (sel.options[0]) sel.insertBefore(opt, sel.options[1]);
  };

  window.gjEnsureProgramOptionExists = function (sel, programValue) {
    if (!sel || sel.tagName !== "SELECT" || !programValue) return;
    var v = String(programValue).trim();
    if (!v) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === v) return;
    }
    var opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v + " (saved earlier — pick an official course above when you save)";
    opt.setAttribute("data-gj-legacy-program", "1");
    sel.appendChild(opt);
  };

  window.gjClearLegacyProgramOptions = function (sel) {
    if (!sel) return;
    sel.querySelectorAll("option[data-gj-legacy-program]").forEach(function (o) {
      o.remove();
    });
  };
})();
