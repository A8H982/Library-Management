/**
 * Modal: prompt the user to sign in before continuing an action.
 * Exposes window.gjShowSignInRequired(options?)
 * options: { message?: string, redirectPage?: string, portal?: 'staff'|'student' }
 * portal: opens auth with ?portal=… (optional). redirectPage defaults to current HTML file name.
 */
(function () {
  var backdrop = null;

  function currentPageFile() {
    var p = window.location.pathname || "";
    var i = p.lastIndexOf("/");
    var name = i >= 0 ? p.slice(i + 1) : p;
    if (!name || name.indexOf(".") < 0) return "index.html";
    return name;
  }

  function ensureBackdrop() {
    if (backdrop) return backdrop;
    var el = document.createElement("div");
    el.id = "gj-sign-in-required-backdrop";
    el.className = "modal-backdrop";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "gj-sign-in-required-title");
    el.setAttribute("hidden", "");
    el.innerHTML =
      '<div class="modal">' +
      '<h2 id="gj-sign-in-required-title">Sign in required</h2>' +
      '<p class="page-sub" id="gj-sign-in-required-body" style="margin-top:0.5rem;line-height:1.5"></p>' +
      '<div class="form-actions" style="margin-top:1.25rem;justify-content:flex-end;flex-wrap:wrap;gap:0.65rem">' +
      '<button type="button" class="btn btn-ghost" id="gj-sign-in-required-cancel">Cancel</button>' +
      '<a class="btn btn-primary" id="gj-sign-in-required-confirm" href="auth.html">Sign in</a>' +
      "</div></div>";
    document.body.appendChild(el);

    function close() {
      el.classList.remove("is-open");
      setTimeout(function () {
        el.setAttribute("hidden", "");
      }, 200);
    }

    el.addEventListener("click", function (ev) {
      if (ev.target === el) close();
    });
    var btnCancel = el.querySelector("#gj-sign-in-required-cancel");
    if (btnCancel) btnCancel.addEventListener("click", close);

    backdrop = el;
    return backdrop;
  }

  window.gjShowSignInRequired = function (options) {
    options = options || {};
    var msg =
      typeof options.message === "string" && options.message.trim()
        ? options.message.trim()
        : "To complete this action you must sign in.";
    var redirect = typeof options.redirectPage === "string" && options.redirectPage.trim()
      ? options.redirectPage.trim()
      : currentPageFile();
    if (!/^[a-zA-Z0-9._-]+\.html?$/.test(redirect)) redirect = "index.html";

    var el = ensureBackdrop();
    var body = el.querySelector("#gj-sign-in-required-body");
    var link = el.querySelector("#gj-sign-in-required-confirm");
    if (body) body.textContent = msg;
    if (link) {
      var portal = options.portal;
      var q = "redirect=" + encodeURIComponent(redirect);
      if (portal === "staff" || portal === "student") {
        q = "portal=" + encodeURIComponent(portal) + "&" + q;
      }
      link.href = "auth.html?" + q;
    }

    el.removeAttribute("hidden");
    requestAnimationFrame(function () {
      el.classList.add("is-open");
    });
    var btnCancel = el.querySelector("#gj-sign-in-required-cancel");
    if (btnCancel) btnCancel.focus();
  };

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var el = document.getElementById("gj-sign-in-required-backdrop");
    if (!el || el.hasAttribute("hidden")) return;
    el.classList.remove("is-open");
    setTimeout(function () {
      el.setAttribute("hidden", "");
    }, 200);
  });
})();
