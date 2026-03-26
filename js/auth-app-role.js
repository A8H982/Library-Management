/**
 * Reads app_role from Supabase Auth user_metadata (set at sign-up).
 * Legacy accounts without app_role are treated as staff so existing catalogs keep working.
 */
(function () {
  function normalizeRole(raw) {
    var r = raw != null ? String(raw).trim().toLowerCase() : "";
    if (r === "staff" || r === "student") return r;
    return null;
  }

  window.gjAppRoleFromSession = function (session) {
    if (!session || !session.user) return null;
    var meta = session.user.user_metadata || {};
    var v = normalizeRole(meta.app_role);
    if (v) return v;
    return "staff";
  };

  window.gjIsStaffFromSession = function (session) {
    return window.gjAppRoleFromSession(session) === "staff";
  };

  window.gjIsStudentFromSession = function (session) {
    return window.gjAppRoleFromSession(session) === "student";
  };
})();
