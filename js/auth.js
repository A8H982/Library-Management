(function () {
  var client = window.gjSupabase;
  var tabLogin = document.querySelector('.auth-tab[data-tab="login"]');
  var tabSignup = document.querySelector('.auth-tab[data-tab="signup"]');
  var blockLogin = document.getElementById("auth-block-login");
  var blockSignup = document.getElementById("auth-block-signup");
  var formLogin = document.getElementById("form-login");
  var formSignup = document.getElementById("form-signup");
  var msgEl = document.getElementById("auth-global-message");

  var tabStaff = document.querySelector('.auth-portal-tab[data-portal="staff"]');
  var tabStudent = document.querySelector('.auth-portal-tab[data-portal="student"]');
  var brandTagline = document.getElementById("auth-brand-tagline");
  var loginTitle = document.getElementById("auth-login-title");
  var loginLead = document.getElementById("auth-login-lead");
  var signupTitle = document.getElementById("auth-signup-title");
  var signupLead = document.getElementById("auth-signup-lead");

  var params = new URLSearchParams(window.location.search);
  var currentPortal = params.get("portal") === "student" ? "student" : "staff";

  function syncPortalUi() {
    var isStaff = currentPortal === "staff";
    if (tabStaff) {
      tabStaff.classList.toggle("is-active", isStaff);
      tabStaff.setAttribute("aria-selected", isStaff ? "true" : "false");
    }
    if (tabStudent) {
      tabStudent.classList.toggle("is-active", !isStaff);
      tabStudent.setAttribute("aria-selected", isStaff ? "false" : "true");
    }
    if (brandTagline) {
      brandTagline.textContent = isStaff
        ? "Staff manage the catalog and student directory."
        : "Students explore the collection and request books.";
    }
    if (loginTitle) loginTitle.textContent = isStaff ? "Staff sign in" : "Student sign in";
    if (loginLead) {
      loginLead.textContent = isStaff
        ? "Sign in with your library staff account."
        : "Sign in to browse titles, reserve, or buy from the catalog.";
    }
    if (signupTitle) signupTitle.textContent = isStaff ? "Register as staff" : "Register as student";
    if (signupLead) {
      signupLead.textContent = isStaff
        ? "Use your work email. This account will be registered as library staff."
        : "Use your college email and your full name. This account will be registered as a student.";
    }
    var nameWrap = document.getElementById("signup-name-wrap");
    if (nameWrap) nameWrap.hidden = isStaff;
  }

  function setPortal(portal) {
    currentPortal = portal === "student" ? "student" : "staff";
    syncPortalUi();
    var p = new URLSearchParams(window.location.search);
    p.set("portal", currentPortal);
    var r = p.get("redirect");
    var qs = "portal=" + encodeURIComponent(currentPortal);
    if (r) qs += "&redirect=" + encodeURIComponent(r);
    window.history.replaceState({}, "", "auth.html?" + qs);
  }

  if (tabStaff) {
    tabStaff.addEventListener("click", function () {
      setPortal("staff");
    });
  }
  if (tabStudent) {
    tabStudent.addEventListener("click", function () {
      setPortal("student");
    });
  }
  syncPortalUi();

  function getRedirectTarget(session) {
    var p = new URLSearchParams(window.location.search);
    var r = p.get("redirect");
    if (r && /^[a-zA-Z0-9._-]+\.html?$/.test(r)) return r;
    if (session && typeof window.gjIsStaffFromSession === "function") {
      return window.gjIsStaffFromSession(session) ? "catalog.html" : "index.html";
    }
    return "index.html";
  }

  function showMessage(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.hidden = !text;
    msgEl.className = "auth-message " + (type === "error" ? "is-error" : type === "success" ? "is-success" : "");
  }

  function setActiveTab(which, opts) {
    opts = opts || {};
    var isLogin = which === "login";
    if (tabLogin) tabLogin.classList.toggle("is-active", isLogin);
    if (tabSignup) tabSignup.classList.toggle("is-active", !isLogin);
    if (blockLogin) blockLogin.hidden = !isLogin;
    if (blockSignup) blockSignup.hidden = isLogin;
    if (tabLogin) tabLogin.setAttribute("aria-selected", isLogin ? "true" : "false");
    if (tabSignup) tabSignup.setAttribute("aria-selected", isLogin ? "false" : "true");
    if (!opts.preserveMessage) showMessage("");
  }

  if (tabLogin) tabLogin.addEventListener("click", function () { setActiveTab("login"); });
  if (tabSignup) tabSignup.addEventListener("click", function () { setActiveTab("signup"); });

  function initPasswordToggles() {
    document.querySelectorAll(".password-input-wrap").forEach(function (wrap) {
      var input = wrap.querySelector("input");
      var btn = wrap.querySelector(".password-toggle");
      if (!input || !btn) return;

      function sync() {
        var visible = input.type === "text";
        btn.setAttribute("aria-pressed", visible ? "true" : "false");
        btn.setAttribute("aria-label", visible ? "Hide password" : "Show password");
        btn.setAttribute("title", visible ? "Hide password" : "Show password");
      }

      btn.addEventListener("click", function () {
        input.type = input.type === "password" ? "text" : "password";
        sync();
      });
      sync();
    });
  }

  initPasswordToggles();

  function isAuthRateLimited(error) {
    if (!error) return false;
    var status = Number(error.status);
    if (status === 429) return true;
    var m = String(error.message || "").toLowerCase();
    return (
      m.indexOf("rate limit") !== -1 ||
      m.indexOf("too many") !== -1 ||
      m.indexOf("over_email_send_rate") !== -1 ||
      m.indexOf("email rate limit") !== -1
    );
  }

  function messageForRateLimit() {
    return (
      "Too many attempts right now. Wait a few minutes and try again. " +
      "To allow more sign-ins per minute, open your Supabase project → Authentication → Rate limits and raise the limits (see Supabase docs for which values you can change)."
    );
  }

  function messageForSignInError(error) {
    if (isAuthRateLimited(error)) return messageForRateLimit();
    var msg = (error && error.message) || "Sign in failed.";
    var code = (error && error.code) || "";
    var lower = msg.toLowerCase();
    if (code === "email_not_confirmed" || lower.indexOf("email not confirmed") !== -1) {
      return (
        "This account is not confirmed yet. Either use the link in your email, or in Supabase Dashboard → Authentication → Providers → Email turn off “Confirm email” for immediate sign-in."
      );
    }
    if (
      lower.indexOf("invalid login") !== -1 ||
      lower.indexOf("invalid credentials") !== -1
    ) {
      return "That email and password don’t match. Check spelling, or create an account first.";
    }
    return msg;
  }

  async function redirectIfSession() {
    if (!client) return;
    var result = await client.auth.getSession();
    var session = result.data && result.data.session;
    if (session) {
      window.location.replace(getRedirectTarget(session));
    }
  }

  if (client) {
    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_IN" && session) {
        window.location.replace(getRedirectTarget(session));
      }
    });
  }

  if (formLogin) {
    formLogin.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!client) {
        showMessage("Sign-in service is not configured.", "error");
        return;
      }
      var email = document.getElementById("login-email").value.trim();
      var password = document.getElementById("login-password").value;
      var btn = document.getElementById("btn-login-submit");
      showMessage("");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Signing in…";
      }

      var result = await client.auth.signInWithPassword({ email: email, password: password });
      var data = result.data;
      var error = result.error;

      if (btn) {
        btn.disabled = false;
        btn.textContent = "Sign in";
      }

      if (error) {
        showMessage(messageForSignInError(error), "error");
        return;
      }

      if (data.session) {
        window.location.replace(getRedirectTarget(data.session));
      }
    });
  }

  if (formSignup) {
    formSignup.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!client) {
        showMessage("Sign-in service is not configured.", "error");
        return;
      }
      var appRole = currentPortal === "staff" ? "staff" : "student";
      var email = document.getElementById("signup-email").value.trim();
      var password = document.getElementById("signup-password").value;
      var password2 = document.getElementById("signup-password-confirm").value;
      var btn = document.getElementById("btn-signup-submit");
      showMessage("");

      if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", "error");
        return;
      }
      if (password !== password2) {
        showMessage("Passwords do not match.", "error");
        return;
      }

      var nameEl = document.getElementById("signup-name");
      var fullName = nameEl && nameEl.value ? String(nameEl.value).trim() : "";
      if (appRole === "student" && !fullName) {
        showMessage("Please enter your full name.", "error");
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Creating account…";
      }

      var redirectTo =
        window.location.origin +
        window.location.pathname.replace(/[^/]*$/, "auth.html");

      var userMeta = { app_role: appRole };
      if (appRole === "student" && fullName) userMeta.full_name = fullName;

      var signUpResult = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectTo,
          data: userMeta,
        },
      });

      if (btn) {
        btn.disabled = false;
        btn.textContent = "Create account";
      }

      var data = signUpResult.data;
      var error = signUpResult.error;

      if (error) {
        showMessage(isAuthRateLimited(error) ? messageForRateLimit() : error.message, "error");
        return;
      }

      if (data.user && !data.session) {
        var loginEmail = document.getElementById("login-email");
        if (loginEmail) loginEmail.value = email;
        setActiveTab("login", { preserveMessage: true });
        showMessage(
          "Account created. If email confirmation is still enabled in Supabase, use the link in your email, then sign in. Otherwise disable “Confirm email” in Authentication → Providers → Email so sign-in works immediately.",
          "success"
        );
        var loginPw = document.getElementById("login-password");
        if (loginPw) {
          loginPw.value = "";
          loginPw.focus();
        }
        return;
      }

      if (data.session) {
        window.location.replace(getRedirectTarget(data.session));
      }
    });
  }

  if (!client) {
    showMessage(
      "Sign-in is not configured. The administrator must set the connection keys in js/supabase-config.js.",
      "error"
    );
    return;
  }

  redirectIfSession();
})();
