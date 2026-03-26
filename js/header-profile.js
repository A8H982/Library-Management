(function () {
  var THEME_KEY = "gj-theme";
  var PROFILE_KEY = "gj-profile";
  var AVATAR_MAX_BYTES = 180000;

  function readProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return { displayName: "", avatarDataUrl: "" };
      var o = JSON.parse(raw);
      return {
        displayName: typeof o.displayName === "string" ? o.displayName.trim() : "",
        avatarDataUrl: typeof o.avatarDataUrl === "string" ? o.avatarDataUrl : "",
      };
    } catch (e) {
      return { displayName: "", avatarDataUrl: "" };
    }
  }

  function writeProfile(p) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) {}
  }

  function readThemePref() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark" || v === "system") return v;
    } catch (e) {}
    return "dark";
  }

  function setThemePref(pref) {
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch (e) {}
    var resolved = pref === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : pref;
    document.documentElement.setAttribute("data-theme-pref", pref);
    document.documentElement.setAttribute("data-theme", resolved);
    document.querySelectorAll(".theme-switcher [data-theme-pref]").forEach(function (btn) {
      var on = btn.getAttribute("data-theme-pref") === pref;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function initialsFrom(name, email) {
    var s = (name || "").trim();
    if (s) {
      var parts = s.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return s.slice(0, 2).toUpperCase();
    }
    if (email) {
      var local = email.split("@")[0] || "";
      return local.slice(0, 2).toUpperCase() || "?";
    }
    return "G";
  }

  function ensureModal() {
    if (document.getElementById("profile-edit-modal")) return;
    var wrap = document.createElement("div");
    wrap.id = "profile-edit-modal";
    wrap.className = "modal-backdrop profile-edit-modal";
    wrap.setAttribute("hidden", "");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "profile-edit-title");
    wrap.innerHTML =
      '<div class="modal profile-edit-modal-inner">' +
      '<h2 id="profile-edit-title">Edit profile</h2>' +
      '<p class="page-sub" style="margin-top:-0.5rem;font-size:0.85rem;">Name and photo are stored in this browser only.</p>' +
      '<div class="form-field">' +
      '<label for="profile-edit-name">Display name</label>' +
      '<input type="text" id="profile-edit-name" autocomplete="name" maxlength="80" placeholder="Your name">' +
      "</div>" +
      '<div class="form-field">' +
      '<label for="profile-edit-avatar">Profile photo</label>' +
      '<input type="file" id="profile-edit-avatar" accept="image/jpeg,image/png,image/webp,image/gif">' +
      "</div>" +
      '<div class="form-error" id="profile-edit-error" hidden></div>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn-ghost" id="profile-edit-cancel">Cancel</button>' +
      '<button type="button" class="btn btn-primary" id="profile-edit-save">Save</button>' +
      "</div></div>";
    document.body.appendChild(wrap);
  }

  var state = {
    signedInEmail: "",
    session: null,
    profile: readProfile(),
    dropdownOpen: false,
    systemMq: null,
  };

  function applyRoleNav() {
    var staff =
      !!state.session && typeof window.gjIsStaffFromSession === "function" && window.gjIsStaffFromSession(state.session);
    var onStudentsPage = /students\.html/i.test(window.location.pathname || "");
    document.querySelectorAll("[data-gj-staff-only]").forEach(function (el) {
      if (el.id === "profile-dropdown-students-link") {
        el.hidden = !staff || onStudentsPage;
      } else {
        el.hidden = !staff;
      }
    });
  }

  function renderAvatar() {
    var img = document.getElementById("profile-avatar-img");
    var ini = document.getElementById("profile-avatar-initials");
    var url = state.profile.avatarDataUrl;
    if (img && ini) {
      if (url) {
        img.src = url;
        img.hidden = false;
        ini.hidden = true;
      } else {
        img.removeAttribute("src");
        img.hidden = true;
        ini.hidden = false;
        ini.textContent = initialsFrom(
          state.signedInEmail ? "" : state.profile.displayName,
          state.signedInEmail
        );
      }
    }
  }

  function renderTriggerLabel() {
    var el = document.getElementById("profile-display-name");
    if (!el) return;
    if (state.signedInEmail) {
      el.textContent = state.signedInEmail;
      return;
    }
    if (state.profile.displayName) {
      el.textContent = state.profile.displayName;
      return;
    }
    el.textContent = "Guest";
  }

  function setRowVisibility() {
    var signed = !!state.signedInEmail;
    var path = window.location.pathname || "";
    var onCatalogPage = /catalog\.html/i.test(path);
    var rowIn = document.getElementById("profile-dropdown-signin");
    var rowOut = document.getElementById("profile-dropdown-signout");
    var rowCatalog = document.getElementById("profile-dropdown-catalog-link");
    if (rowIn) rowIn.hidden = signed;
    if (rowOut) rowOut.hidden = !signed;
    if (rowCatalog) rowCatalog.hidden = !signed || onCatalogPage;
    var emailEl = document.getElementById("profile-dropdown-email");
    if (emailEl) {
      emailEl.textContent = signed ? state.signedInEmail : "Not signed in";
    }
  }

  function closeDropdown() {
    state.dropdownOpen = false;
    var dd = document.getElementById("profile-dropdown");
    var tr = document.getElementById("profile-menu-trigger");
    if (dd) {
      dd.hidden = true;
    }
    if (tr) {
      tr.setAttribute("aria-expanded", "false");
    }
  }

  function openDropdown() {
    state.dropdownOpen = true;
    var dd = document.getElementById("profile-dropdown");
    var tr = document.getElementById("profile-menu-trigger");
    if (dd) dd.hidden = false;
    if (tr) tr.setAttribute("aria-expanded", "true");
    setRowVisibility();
  }

  function toggleDropdown() {
    if (state.dropdownOpen) closeDropdown();
    else openDropdown();
  }

  function openEditModal() {
    ensureModal();
    var modal = document.getElementById("profile-edit-modal");
    var nameIn = document.getElementById("profile-edit-name");
    var err = document.getElementById("profile-edit-error");
    if (nameIn) nameIn.value = state.profile.displayName;
    var fileIn = document.getElementById("profile-edit-avatar");
    if (fileIn) fileIn.value = "";
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    if (modal) {
      modal.hidden = false;
      requestAnimationFrame(function () {
        modal.classList.add("is-open");
      });
    }
    closeDropdown();
    if (nameIn) nameIn.focus();
  }

  function closeEditModal() {
    var modal = document.getElementById("profile-edit-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    setTimeout(function () {
      modal.hidden = true;
    }, 200);
  }

  function fileToDataUrl(file, cb) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      cb(null, "Choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES * 2) {
      cb(null, "Image too large. Use a smaller photo (under ~350 KB).");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      if (typeof dataUrl !== "string" || dataUrl.length > AVATAR_MAX_BYTES) {
        cb(null, "Image is still too large after load. Try a smaller file.");
        return;
      }
      cb(dataUrl, null);
    };
    reader.onerror = function () {
      cb(null, "Could not read that file.");
    };
    reader.readAsDataURL(file);
  }

  function wireModal() {
    ensureModal();
    var modal = document.getElementById("profile-edit-modal");
    var btnCancel = document.getElementById("profile-edit-cancel");
    var btnSave = document.getElementById("profile-edit-save");
    var fileIn = document.getElementById("profile-edit-avatar");
    if (modal) {
      modal.addEventListener("click", function (ev) {
        if (ev.target === modal) closeEditModal();
      });
    }
    if (btnCancel) btnCancel.addEventListener("click", closeEditModal);
    if (btnSave) {
      btnSave.addEventListener("click", function () {
        var nameIn = document.getElementById("profile-edit-name");
        var err = document.getElementById("profile-edit-error");
        var name = nameIn ? nameIn.value.trim() : "";
        function showErr(msg) {
          if (err) {
            err.textContent = msg;
            err.hidden = !msg;
          }
        }
        function finishSave(avatarUrl) {
          state.profile.displayName = name;
          if (avatarUrl != null) state.profile.avatarDataUrl = avatarUrl;
          writeProfile(state.profile);
          renderAvatar();
          renderTriggerLabel();
          closeEditModal();
        }
        showErr("");
        var f = fileIn && fileIn.files && fileIn.files[0];
        if (f) {
          fileToDataUrl(f, function (url, emsg) {
            if (emsg) {
              showErr(emsg);
              return;
            }
            finishSave(url);
          });
        } else {
          finishSave(null);
        }
      });
    }
  }

  async function refreshSessionFromSupabase() {
    var c = window.gjSupabase;
    if (!c) return;
    var result = await c.auth.getSession();
    var session = result.data && result.data.session;
    state.session = session;
    state.signedInEmail = session && session.user ? session.user.email || "" : "";
    renderTriggerLabel();
    renderAvatar();
    setRowVisibility();
    applyRoleNav();
  }

  window.gjApplyStaffSession = function (session) {
    state.session = session;
    state.signedInEmail = session && session.user ? session.user.email || "" : "";
    renderTriggerLabel();
    renderAvatar();
    setRowVisibility();
    applyRoleNav();
  };

  function initThemeControls() {
    setThemePref(readThemePref());
    if (!state.systemMq) {
      state.systemMq = window.matchMedia("(prefers-color-scheme: dark)");
      state.systemMq.addEventListener("change", function () {
        if (readThemePref() === "system") {
          setThemePref("system");
        }
      });
    }
    document.querySelectorAll(".theme-switcher [data-theme-pref]").forEach(function (btn) {
      if (btn.dataset.gjThemeWired) return;
      btn.dataset.gjThemeWired = "1";
      btn.addEventListener("click", function () {
        var pref = btn.getAttribute("data-theme-pref");
        if (pref === "light" || pref === "dark" || pref === "system") {
          setThemePref(pref);
        }
      });
    });
  }

  function init() {
    initThemeControls();

    if (!document.getElementById("profile-menu-trigger")) return;

    var tr = document.getElementById("profile-menu-trigger");
    if (tr) {
      tr.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleDropdown();
      });
    }

    document.addEventListener("click", function () {
      closeDropdown();
    });
    var dd = document.getElementById("profile-dropdown");
    if (dd) {
      dd.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    var btnEdit = document.getElementById("profile-dropdown-edit");
    if (btnEdit) btnEdit.addEventListener("click", openEditModal);

    var btnSignout = document.getElementById("btn-profile-sign-out");
    if (btnSignout) {
      btnSignout.addEventListener("click", async function () {
        var c = window.gjSupabase;
        if (c) await c.auth.signOut();
        state.signedInEmail = "";
        state.session = null;
        renderTriggerLabel();
        renderAvatar();
        setRowVisibility();
        applyRoleNav();
        closeDropdown();
        window.location.href = "auth.html";
      });
    }

    var btnCatalog = document.getElementById("profile-dropdown-catalog-link");
    if (btnCatalog) {
      btnCatalog.addEventListener("click", closeDropdown);
    }

    wireModal();
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        closeEditModal();
        closeDropdown();
      }
    });

    renderAvatar();
    renderTriggerLabel();
    setRowVisibility();
    applyRoleNav();
    refreshSessionFromSupabase();

    if (window.gjSupabase) {
      window.gjSupabase.auth.onAuthStateChange(function () {
        refreshSessionFromSupabase();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
