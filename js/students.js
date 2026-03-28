(async function () {
  var tbody = document.getElementById("student-rows");
  var statusEl = document.getElementById("students-load-status");
  var gate = document.getElementById("students-gate");
  var gateMsg = document.getElementById("students-gate-msg");
  var app = document.getElementById("students-app");
  var btnReload = document.getElementById("btn-students-reload");
  var btnAdd = document.getElementById("btn-student-add");
  var modal = document.getElementById("staff-student-modal");
  var modalTitle = document.getElementById("staff-student-modal-title");
  var form = document.getElementById("staff-student-form");
  var formErr = document.getElementById("staff-student-form-error");
  var createOnlyWrap = document.getElementById("staff-stu-create-only");
  var inputId = document.getElementById("staff-stu-id");
  var inputEmail = document.getElementById("staff-stu-email");
  var inputPw = document.getElementById("staff-stu-password");
  var inputPw2 = document.getElementById("staff-stu-password2");
  var inputName = document.getElementById("staff-stu-name");
  var inputProgram = document.getElementById("staff-stu-program");
  var inputYear = document.getElementById("staff-stu-year");
  var btnCancel = document.getElementById("btn-staff-student-cancel");
  var btnSave = document.getElementById("btn-staff-student-save");
  var btnRemove = document.getElementById("btn-staff-student-remove");

  var byId = {};
  var editingPk = null;
  var createMode = false;

  if (!tbody) return;

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#f87171" : "var(--text-muted)";
  }

  function setFormErr(msg) {
    if (!formErr) return;
    formErr.textContent = msg || "";
    formErr.hidden = !msg;
  }

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
  }

  function rowDisplayName(row) {
    if (!row) return "";
    if (row.full_name != null && String(row.full_name).trim() !== "") return String(row.full_name);
    return "";
  }

  function displaySession(row) {
    var prog = row.program != null ? String(row.program).trim() : "";
    var y = window.gjYearFromStudentRow ? window.gjYearFromStudentRow(row) : null;
    if (!prog || y == null) return "—";
    var dur = window.gjGetProgramDurationYears(prog);
    return window.gjFormatSessionRangeFromAdmAndDur(y, dur);
  }

  function updateStaffSessionPreview() {
    var prev = document.getElementById("staff-stu-session-preview");
    if (!prev) return;
    var prog = inputProgram && inputProgram.value ? String(inputProgram.value).trim() : "";
    var adm = window.gjSessionYearFromSelect ? window.gjSessionYearFromSelect(inputYear) : null;
    var dur = window.gjGetProgramDurationYears ? window.gjGetProgramDurationYears(prog) : 3;
    if (!prog) {
      prev.textContent = "Set program and admission year to preview session.";
      return;
    }
    if (adm == null) {
      prev.textContent = "Select admission year to preview session for " + prog + ".";
      return;
    }
    var endY = adm + dur;
    var label = window.gjFormatSessionRangeFromAdmAndDur(adm, dur);
    prev.innerHTML =
      "Session: <strong>" +
      label +
      "</strong> — Passout <strong>" +
      endY +
      "</strong> (" +
      dur +
      "-year programme).";
  }

  async function ensureAccess() {
    var client = window.gjSupabase;
    if (!client) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      if (gateMsg) gateMsg.textContent = "Database is not configured.";
      return false;
    }
    var result = await client.auth.getSession();
    var session = result.data && result.data.session;
    if (!session) {
      window.location.replace("auth.html?portal=staff&redirect=students.html");
      return false;
    }
    if (!window.gjIsStaffFromSession || !window.gjIsStaffFromSession(session)) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      if (gateMsg) {
        gateMsg.textContent =
          "This directory is only available to library staff. Student accounts can set program and session under Program & session in the profile menu.";
      }
      return false;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    return true;
  }

  function hintForProfilesError(em) {
    if (!em) return "";
    if (/PGRST205|Could not find the table|schema cache/i.test(em)) {
      return " Run supabase/student-profiles.sql in the Supabase SQL Editor, then reload.";
    }
    if (/permission denied|policy|42501|row-level security/i.test(em)) {
      return " Run supabase/fix-student-profiles-staff-update-rls.sql in the Supabase SQL Editor.";
    }
    if (/is_active|schema cache/i.test(em)) {
      return " Run supabase/student-profiles-is-active.sql in the Supabase SQL Editor.";
    }
    return "";
  }

  function openCreateModal() {
    if (!modal) return;
    createMode = true;
    editingPk = null;
    setFormErr("");
    if (modalTitle) modalTitle.textContent = "Add student";
    if (inputId) inputId.value = "";
    if (inputEmail) {
      inputEmail.value = "";
      inputEmail.readOnly = false;
      inputEmail.removeAttribute("readonly");
    }
    if (inputName) inputName.value = "";
    if (inputPw) inputPw.value = "";
    if (inputPw2) inputPw2.value = "";
    if (window.gjClearLegacyProgramOptions) window.gjClearLegacyProgramOptions(inputProgram);
    if (inputProgram) inputProgram.value = "";
    if (inputYear && window.gjPopulateAdmissionYearSelect) {
      window.gjPopulateAdmissionYearSelect(inputYear);
      inputYear.value = "";
    }
    if (createOnlyWrap) createOnlyWrap.hidden = false;
    if (btnRemove) btnRemove.hidden = true;
    updateStaffSessionPreview();
    modal.hidden = false;
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
    if (inputEmail) inputEmail.focus();
  }

  function openModal(row) {
    if (!modal || !row || !row.id) return;
    createMode = false;
    editingPk = String(row.id);
    setFormErr("");
    if (modalTitle) modalTitle.textContent = "Edit student record";
    if (inputId) inputId.value = editingPk;
    if (inputEmail) {
      inputEmail.value = row.email != null ? String(row.email) : "";
      inputEmail.readOnly = true;
    }
    if (createOnlyWrap) createOnlyWrap.hidden = true;
    if (btnRemove) btnRemove.hidden = false;
    if (inputPw) inputPw.value = "";
    if (inputPw2) inputPw2.value = "";
    if (inputName) inputName.value = rowDisplayName(row);
    if (window.gjClearLegacyProgramOptions) window.gjClearLegacyProgramOptions(inputProgram);
    if (inputProgram) {
      var pv = row.program != null ? String(row.program).trim() : "";
      if (pv && window.gjEnsureProgramOptionExists) window.gjEnsureProgramOptionExists(inputProgram, pv);
      inputProgram.value = pv;
    }
    if (inputYear && window.gjPopulateAdmissionYearSelect) {
      window.gjPopulateAdmissionYearSelect(inputYear);
      var yRow = window.gjYearFromStudentRow(row);
      if (yRow != null && window.gjEnsureAdmissionYearOption) window.gjEnsureAdmissionYearOption(inputYear, yRow);
      inputYear.value = yRow != null ? String(yRow) : "";
    }
    updateStaffSessionPreview();
    modal.hidden = false;
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
    if (inputName) inputName.focus();
  }

  function closeModal() {
    editingPk = null;
    createMode = false;
    if (createOnlyWrap) createOnlyWrap.hidden = true;
    if (btnRemove) {
      btnRemove.hidden = true;
      btnRemove.disabled = false;
    }
    if (inputEmail) inputEmail.readOnly = false;
    if (!modal) return;
    modal.classList.remove("is-open");
    setTimeout(function () {
      modal.hidden = true;
    }, 200);
    setFormErr("");
  }

  async function loadStudents() {
    var client = window.gjSupabase;
    if (!client) return;
    setStatus("Loading…");
    var res = await client
      .from("student_profiles")
      .select("*")
      .or("is_active.is.null,is_active.eq.true")
      .order("email", { ascending: true });
    if (res.error) {
      var em = res.error.message || String(res.error);
      setStatus(em + hintForProfilesError(em), true);
      tbody.innerHTML = "<tr><td colspan='4'>Could not load students.</td></tr>";
      return;
    }
    var rows = res.data || [];
    byId = {};
    rows.forEach(function (r) {
      byId[String(r.id)] = r;
    });
    if (rows.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan='4'>No students in the directory yet. Use <strong>Add student</strong> or have students register on the sign-in page.</td></tr>";
      setStatus("");
      return;
    }
    tbody.innerHTML = rows
      .map(function (r) {
        var id = String(r.id);
        var email = r.email != null && String(r.email).trim() !== "" ? String(r.email) : "—";
        var nm = rowDisplayName(r) || "—";
        var prog = r.program != null && String(r.program).trim() !== "" ? String(r.program) : "—";
        var sess = displaySession(r);
        return (
          '<tr class="student-row" data-student-id="' +
          escapeAttr(id) +
          '" tabindex="0" role="button"><td>' +
          escapeHtml(email) +
          "</td><td>" +
          escapeHtml(nm) +
          "</td><td>" +
          escapeHtml(prog) +
          "</td><td>" +
          escapeHtml(sess) +
          "</td></tr>"
        );
      })
      .join("");
    setStatus(rows.length + " student(s). Tap a row to edit, or use Add student to create a login.");
  }

  async function onSubmit(e) {
    e.preventDefault();
    var client = window.gjSupabase;
    if (!client) return;

    if (createMode) {
      var email = inputEmail ? inputEmail.value.trim() : "";
      var pw = inputPw ? inputPw.value : "";
      var pw2 = inputPw2 ? inputPw2.value : "";
      var name = inputName ? inputName.value.trim() : "";
      var program = inputProgram ? inputProgram.value.trim() : "";
      var y = window.gjSessionYearFromSelect ? window.gjSessionYearFromSelect(inputYear) : null;

      setFormErr("");
      if (!email) {
        setFormErr("Email is required.");
        return;
      }
      if (pw.length < 6) {
        setFormErr("Password must be at least 6 characters.");
        return;
      }
      if (pw !== pw2) {
        setFormErr("Passwords do not match.");
        return;
      }

      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = "Creating…";
      }

      try {
        var staffSnap = await client.auth.getSession();
        var staffSession = staffSnap.data && staffSnap.data.session;
        if (!staffSession) {
          setFormErr("Your session expired. Sign in again.");
          return;
        }

        var redirectTo =
          window.location.origin + window.location.pathname.replace(/[^/]*$/, "auth.html");

        var meta = { app_role: "student" };
        if (name) meta.full_name = name;

        var signUpResult = await client.auth.signUp({
          email: email.trim(),
          password: pw,
          options: {
            emailRedirectTo: redirectTo,
            data: meta,
          },
        });

        if (signUpResult.error) {
          setFormErr(signUpResult.error.message || String(signUpResult.error));
          return;
        }

        var newUser = signUpResult.data && signUpResult.data.user;
        if (!newUser) {
          setFormErr("Sign up did not return a user.");
          return;
        }

        var newSession = signUpResult.data && signUpResult.data.session;
        if (newSession && staffSession && newSession.user.id !== staffSession.user.id) {
          var restored = await client.auth.setSession({
            access_token: staffSession.access_token,
            refresh_token: staffSession.refresh_token,
          });
          if (restored.error) {
            setFormErr(
              "Student account was created. Sign in again as staff — could not restore your session: " +
                (restored.error.message || "")
            );
            closeModal();
            return;
          }
          if (typeof window.gjApplyStaffSession === "function") {
            var sAgain = await client.auth.getSession();
            if (sAgain.data && sAgain.data.session) window.gjApplyStaffSession(sAgain.data.session);
          }
        }

        var profilePayload = {
          full_name: name || null,
          program: program || null,
          year: y,
        };

        var upd = await client.from("student_profiles").update(profilePayload).eq("id", newUser.id).select();

        if (!upd.error && upd.data && upd.data.length) {
          closeModal();
          await loadStudents();
          return;
        }

        var ins = await client
          .from("student_profiles")
          .upsert(
            {
              id: newUser.id,
              email: email.trim().toLowerCase(),
              full_name: profilePayload.full_name,
              program: profilePayload.program,
              year: profilePayload.year,
              is_active: true,
            },
            { onConflict: "id" }
          )
          .select();

        if (ins.error) {
          var im = ins.error.message || String(ins.error);
          var um = upd.error ? upd.error.message || "" : "";
          setFormErr(
            im +
              (um ? " (update: " + um + ")" : "") +
              hintForProfilesError(im) +
              " If this is a permission error, run supabase/student-profiles-staff-insert.sql in Supabase."
          );
          return;
        }
        if (!ins.data || !ins.data.length) {
          setFormErr(
            "Student was created but the profile row was not saved. Run supabase/student-profiles-staff-insert.sql in the SQL Editor."
          );
          return;
        }

        closeModal();
        await loadStudents();
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = "Save";
        }
      }
      return;
    }

    if (!editingPk) return;

    var name = inputName ? inputName.value.trim() : "";
    var program = inputProgram ? inputProgram.value.trim() : "";
    var y = window.gjSessionYearFromSelect ? window.gjSessionYearFromSelect(inputYear) : null;

    setFormErr("");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "Saving…";
    }

    var payload = {
      full_name: name || null,
      program: program || null,
      year: y,
    };

    var upd = await client.from("student_profiles").update(payload).eq("id", editingPk).select();
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Save";
    }
    if (upd.error) {
      var um = upd.error.message || String(upd.error);
      setFormErr(um + hintForProfilesError(um));
      return;
    }
    var rows = upd.data;
    if (!rows || !rows.length) {
      setFormErr(
        "Save did not update any row (permission denied or missing policy). In Supabase → SQL Editor, run the script supabase/fix-student-profiles-staff-update-rls.sql, then reload this page."
      );
      return;
    }
    closeModal();
    await loadStudents();
  }

  function onTbodyClick(ev) {
    var tr = ev.target.closest("tr.student-row");
    if (!tr || !tbody.contains(tr)) return;
    var id = tr.getAttribute("data-student-id");
    if (id && byId[id]) openModal(byId[id]);
  }

  async function onRemoveFromDirectory() {
    if (!editingPk || createMode) return;
    if (
      !window.confirm(
        "Remove this student from the directory? Their login still works unless you delete the user in Supabase → Authentication."
      )
    ) {
      return;
    }
    var client = window.gjSupabase;
    if (!client) return;
    setFormErr("");
    if (btnRemove) btnRemove.disabled = true;
    var upd = await client.from("student_profiles").update({ is_active: false }).eq("id", editingPk).select();
    if (btnRemove) btnRemove.disabled = false;
    if (upd.error) {
      var xm = upd.error.message || String(upd.error);
      setFormErr(xm + hintForProfilesError(xm));
      return;
    }
    if (!upd.data || !upd.data.length) {
      setFormErr(
        "Could not remove this row. Run supabase/student-profiles-is-active.sql in the Supabase SQL Editor, then reload."
      );
      return;
    }
    closeModal();
    await loadStudents();
  }

  if (btnAdd) btnAdd.addEventListener("click", openCreateModal);
  if (btnReload) btnReload.addEventListener("click", loadStudents);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (btnRemove) btnRemove.addEventListener("click", onRemoveFromDirectory);
  if (form) form.addEventListener("submit", onSubmit);
  if (inputProgram) inputProgram.addEventListener("change", updateStaffSessionPreview);
  if (inputYear) inputYear.addEventListener("change", updateStaffSessionPreview);
  if (modal) {
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) closeModal();
    });
  }
  if (tbody) {
    tbody.addEventListener("click", onTbodyClick);
    tbody.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var tr = ev.target.closest("tr.student-row");
      if (!tr || !tbody.contains(tr)) return;
      ev.preventDefault();
      var id = tr.getAttribute("data-student-id");
      if (id && byId[id]) openModal(byId[id]);
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape" || !modal || modal.hidden) return;
    closeModal();
  });

  if (inputYear && window.gjPopulateAdmissionYearSelect) window.gjPopulateAdmissionYearSelect(inputYear);

  var ok = await ensureAccess();
  if (ok) await loadStudents();
})();
