(function () {
  var THEME_KEY = "gj-theme";
  var PROFILE_KEY = "gj-profile";

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
      return true;
    } catch (e) {
      return false;
    }
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

  /** File inputs cannot show a previously saved path — show stored image in a preview instead. */
  function ensureAvatarPreviewMarkup() {
    if (document.getElementById("profile-edit-avatar-preview-wrap")) return;
    var fileIn = document.getElementById("profile-edit-avatar");
    if (!fileIn) return;
    var field = fileIn.closest(".form-field");
    if (!field) return;
    var wrap = document.createElement("div");
    wrap.id = "profile-edit-avatar-preview-wrap";
    wrap.className = "profile-edit-avatar-preview-wrap";
    wrap.setAttribute("hidden", "");
    wrap.innerHTML =
      '<p class="form-field-hint profile-edit-avatar-preview-caption">Current profile photo</p>' +
      '<img id="profile-edit-avatar-preview" class="profile-edit-avatar-preview" alt="Current profile photo">';
    field.insertBefore(wrap, fileIn);
    if (!document.getElementById("profile-edit-avatar-file-hint")) {
      var hint = document.createElement("p");
      hint.className = "form-field-hint";
      hint.id = "profile-edit-avatar-file-hint";
      hint.textContent =
        "“No file chosen” is normal — your saved photo is above. Choose a file only to replace it.";
      field.appendChild(hint);
    }
  }

  var avatarPreviewObjectUrl = null;

  function revokeAvatarPreviewObjectUrl() {
    if (avatarPreviewObjectUrl) {
      URL.revokeObjectURL(avatarPreviewObjectUrl);
      avatarPreviewObjectUrl = null;
    }
  }

  function syncEditModalAvatarPreview() {
    revokeAvatarPreviewObjectUrl();
    var wrap = document.getElementById("profile-edit-avatar-preview-wrap");
    var img = document.getElementById("profile-edit-avatar-preview");
    if (!wrap || !img) return;
    var url = state.profile.avatarDataUrl;
    if (url) {
      img.src = url;
      wrap.hidden = false;
    } else {
      img.removeAttribute("src");
      wrap.hidden = true;
    }
  }

  function ensureModal() {
    if (document.getElementById("profile-edit-modal")) {
      ensureAvatarPreviewMarkup();
      return;
    }
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
      '<p class="page-sub" style="margin-top:-0.5rem;font-size:0.85rem;">Name and photo are stored in this browser only. Leave the name empty to show your sign-in email in the header.</p>' +
      '<div class="form-field">' +
      '<label for="profile-edit-name">Display name</label>' +
      '<input type="text" id="profile-edit-name" autocomplete="name" maxlength="80" placeholder="Optional — defaults to your email">' +
      "</div>" +
      '<div class="form-field">' +
      '<label for="profile-edit-avatar">Profile photo</label>' +
      '<div id="profile-edit-avatar-preview-wrap" class="profile-edit-avatar-preview-wrap" hidden>' +
      '<p class="form-field-hint profile-edit-avatar-preview-caption">Current profile photo</p>' +
      '<img id="profile-edit-avatar-preview" class="profile-edit-avatar-preview" alt="Current profile photo">' +
      "</div>" +
      '<input type="file" id="profile-edit-avatar" accept="image/jpeg,image/png,image/webp,image/gif">' +
      '<p class="form-field-hint" id="profile-edit-avatar-file-hint">“No file chosen” is normal — your saved photo is above. Choose a file only to replace it.</p>' +
      "</div>" +
      '<div class="form-error" id="profile-edit-error" hidden></div>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn-ghost" id="profile-edit-cancel">Cancel</button>' +
      '<button type="button" class="btn btn-primary" id="profile-edit-save">Save</button>' +
      "</div></div>";
    document.body.appendChild(wrap);
    ensureAvatarPreviewMarkup();
  }

  var state = {
    signedInEmail: "",
    session: null,
    profile: readProfile(),
    dropdownOpen: false,
    systemMq: null,
  };

  function applyRoleNav() {
    var path = window.location.pathname || "";
    var staff =
      !!state.session && typeof window.gjIsStaffFromSession === "function" && window.gjIsStaffFromSession(state.session);
    var student =
      !!state.session && typeof window.gjIsStudentFromSession === "function" && window.gjIsStudentFromSession(state.session);
    var onStudentsPage = /students\.html/i.test(path);
    var onStudentProfilePage = /student-profile\.html/i.test(path);
    document.querySelectorAll("[data-gj-staff-only]").forEach(function (el) {
      if (el.id === "profile-dropdown-students-link") {
        el.hidden = !staff || onStudentsPage;
      } else {
        el.hidden = !staff;
      }
    });
    document.querySelectorAll("[data-gj-student-only]").forEach(function (el) {
      if (el.id === "profile-dropdown-student-course-link") {
        el.hidden = !student || onStudentProfilePage;
      } else {
        el.hidden = !student;
      }
    });
  }

  /** Header label: manual name first, then email when signed in, else Guest. */
  function effectiveHeaderLabel() {
    if (state.profile.displayName) return state.profile.displayName;
    if (state.signedInEmail) return state.signedInEmail;
    return "Guest";
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
          state.profile.displayName || "",
          state.signedInEmail || ""
        );
      }
    }
  }

  function renderTriggerLabel() {
    var el = document.getElementById("profile-display-name");
    if (!el) return;
    el.textContent = effectiveHeaderLabel();
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
    syncEditModalAvatarPreview();
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
    revokeAvatarPreviewObjectUrl();
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
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        cb(null, "Could not read that file.");
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
    if (fileIn && !fileIn.dataset.gjAvatarPreviewWired) {
      fileIn.dataset.gjAvatarPreviewWired = "1";
      fileIn.addEventListener("change", function () {
        var wrap = document.getElementById("profile-edit-avatar-preview-wrap");
        var img = document.getElementById("profile-edit-avatar-preview");
        if (!img) return;
        var f = fileIn.files && fileIn.files[0];
        revokeAvatarPreviewObjectUrl();
        if (!f) {
          syncEditModalAvatarPreview();
          return;
        }
        if (!f.type || f.type.indexOf("image/") !== 0) {
          syncEditModalAvatarPreview();
          return;
        }
        avatarPreviewObjectUrl = URL.createObjectURL(f);
        img.src = avatarPreviewObjectUrl;
        if (wrap) wrap.hidden = false;
      });
    }
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
          if (!writeProfile(state.profile)) {
            showErr(
              "Could not save this photo — it may exceed your browser’s storage limit. Try a smaller image or free some site data."
            );
            return;
          }
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

  var STUDENT_PROFILE_SYNC_KEY = "gj-student-profiles-synced";

  /**
   * Ensures public.student_profiles has a row for this student so the staff directory can list them.
   * Older accounts often have no row (migration ran after signup, or auth trigger did not run).
   */
  async function ensureStudentDirectoryRow(c, session) {
    if (!c || !session || !session.user) return;
    if (typeof window.gjIsStudentFromSession !== "function" || !window.gjIsStudentFromSession(session)) {
      return;
    }
    var uid = session.user.id;
    try {
      if (sessionStorage.getItem(STUDENT_PROFILE_SYNC_KEY) === uid) return;
    } catch (e) {}
    var sel = await c.from("student_profiles").select("id").eq("id", uid).maybeSingle();
    if (sel.error) return;
    if (sel.data) {
      try {
        sessionStorage.setItem(STUDENT_PROFILE_SYNC_KEY, uid);
      } catch (e2) {}
      return;
    }
    var meta = session.user.user_metadata || {};
    var fnFromAuth = meta.full_name != null ? String(meta.full_name).trim() : "";
    var ins = await c.from("student_profiles").insert({
      id: uid,
      email: session.user.email || null,
      full_name: fnFromAuth || null,
      is_active: true,
    });
    if (ins.error) {
      var code = ins.error.code;
      var msg = (ins.error.message || "").toLowerCase();
      if (String(code) !== "23505" && msg.indexOf("duplicate") === -1) return;
    }
    try {
      sessionStorage.setItem(STUDENT_PROFILE_SYNC_KEY, uid);
    } catch (e3) {}
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
    await ensureStudentDirectoryRow(c, session);
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
        try {
          sessionStorage.removeItem(STUDENT_PROFILE_SYNC_KEY);
        } catch (e) {}
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
