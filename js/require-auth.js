/**
 * Staff-only pages: redirect to auth.html if not signed in.
 * Calls window.gjApplyStaffSession(session) when present (see header-profile.js).
 * Must load after supabase-client.js and header-profile.js. Exposes window.gjRequireAuthPromise.
 */
(function () {
  function pageFileName() {
    var p = window.location.pathname || "";
    var i = p.lastIndexOf("/");
    return i >= 0 ? p.slice(i + 1) || "catalog.html" : "catalog.html";
  }

  window.gjRequireAuthPromise = (async function () {
    var c = window.gjSupabase;
    if (!c) {
      window.location.replace("auth.html?redirect=" + encodeURIComponent(pageFileName()));
      return false;
    }

    var result = await c.auth.getSession();
    var session = result.data && result.data.session;

    if (!session) {
      window.location.replace("auth.html?redirect=" + encodeURIComponent(pageFileName()));
      return false;
    }

    if (typeof window.gjApplyStaffSession === "function") {
      window.gjApplyStaffSession(session);
    }

    return true;
  })();
})();
