/**
 * Runs after js/supabase-config.js. Requires the UMD script before both.
 */
(function () {
  window.gjSupabase = null;
  window.GJ_SUPABASE_INIT_ERROR = null;

  function trim(v) {
    return typeof v === "string" ? v.trim() : v;
  }

  var url = trim(window.GJ_SUPABASE_URL);
  var key = trim(window.GJ_SUPABASE_ANON_KEY);

  if (
    !url ||
    !key ||
    url === "PASTE_PROJECT_URL_HERE" ||
    key === "PASTE_ANON_KEY_HERE" ||
    url.indexOf("PASTE_") === 0
  ) {
    window.GJ_SUPABASE_INIT_ERROR = "missing_config";
    return;
  }

  var globalLib = window.supabase;
  if (!globalLib || typeof globalLib.createClient !== "function") {
    window.GJ_SUPABASE_INIT_ERROR = "sdk_not_loaded";
    return;
  }

  try {
    window.gjSupabase = globalLib.createClient(url, key);
  } catch (err) {
    window.GJ_SUPABASE_INIT_ERROR = err && err.message ? err.message : "createClient_failed";
  }
})();
