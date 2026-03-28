(function () {
  var gate = document.getElementById("student-profile-gate");
  var gateMsg = document.getElementById("student-profile-gate-msg");
  var app = document.getElementById("student-profile-app");
  var form = document.getElementById("student-profile-form");
  var formErr = document.getElementById("student-profile-form-error");
  var statusEl = document.getElementById("student-profile-status");
  var inputName = document.getElementById("sp-full-name");
  var inputProgram = document.getElementById("sp-program");
  var inputYear = document.getElementById("sp-year");
  var btnSave = document.getElementById("btn-student-profile-save");

  if (!form) return;

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

  function updateSessionPreview() {
    var prev = document.getElementById("sp-session-preview");
    if (!prev) return;
    var prog = inputProgram && inputProgram.value ? String(inputProgram.value).trim() : "";
    var adm = window.gjSessionYearFromSelect ? window.gjSessionYearFromSelect(inputYear) : null;
    var dur = window.gjGetProgramDurationYears ? window.gjGetProgramDurationYears(prog) : 3;
    if (!prog) {
      prev.textContent =
        "Program and admission year are optional. When both are set, your session (e.g. 2023-26) appears here.";
      return;
    }
    if (adm == null) {
      prev.textContent =
        "Optional: pick admission year to see session. Example for " +
        prog +
        ": " +
        dur +
        " year(s) → session like 2023-26 (admission 2023, passout " +
        (2023 + dur) +
        ").";
      return;
    }
    var endY = adm + dur;
    var label = window.gjFormatSessionRangeFromAdmAndDur(adm, dur);
    prev.innerHTML =
      "Session: <strong>" +
      label +
      "</strong> — Admission <strong>" +
      adm +
      "</strong>, Passout <strong>" +
      endY +
      "</strong> (" +
      dur +
      "-year programme).";
  }

  function hintForError(em) {
    if (!em) return "";
    if (/PGRST205|Could not find the table|schema cache/i.test(em)) {
      return " Run supabase/student-profiles.sql in the Supabase SQL Editor, then reload.";
    }
    return "";
  }

  async function ensureStudentAccess() {
    var c = window.gjSupabase;
    if (!c) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      if (gateMsg) gateMsg.textContent = "Database is not configured.";
      return null;
    }
    var result = await c.auth.getSession();
    var session = result.data && result.data.session;
    if (!session) {
      window.location.replace("auth.html?portal=student&redirect=student-profile.html");
      return null;
    }
    if (!window.gjIsStudentFromSession || !window.gjIsStudentFromSession(session)) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      if (gateMsg) {
        gateMsg.textContent =
          "Program and session are only for student accounts. Staff can view the directory on the Students page.";
      }
      return null;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    return session;
  }

  async function loadProfile(session) {
    setStatus("Loading…");
    var uid = session.user.id;
    var res = await window.gjSupabase.from("student_profiles").select("*").eq("id", uid).maybeSingle();
    if (res.error) {
      var em = res.error.message || String(res.error);
      setStatus(em + hintForError(em), true);
      return;
    }
    var row = res.data;
    if (!row) {
      var umeta = session.user.user_metadata || {};
      var fnFromAuth = umeta.full_name != null ? String(umeta.full_name).trim() : "";
      var ins = await window.gjSupabase
        .from("student_profiles")
        .insert({ id: uid, email: session.user.email || null, full_name: fnFromAuth || null, is_active: true })
        .select()
        .maybeSingle();
      if (!ins.error && ins.data) row = ins.data;
    }
    if (window.gjClearLegacyProgramOptions) window.gjClearLegacyProgramOptions(inputProgram);
    if (inputName) inputName.value = row && row.full_name != null ? String(row.full_name) : "";
    if (inputProgram) {
      var pv = row && row.program != null ? String(row.program).trim() : "";
      if (pv && window.gjEnsureProgramOptionExists) window.gjEnsureProgramOptionExists(inputProgram, pv);
      inputProgram.value = pv;
    }
    if (inputYear) {
      var yRow = row ? window.gjYearFromStudentRow(row) : null;
      if (yRow != null && window.gjEnsureAdmissionYearOption) window.gjEnsureAdmissionYearOption(inputYear, yRow);
      inputYear.value = yRow != null ? String(yRow) : "";
    }
    updateSessionPreview();
    setStatus("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    var c = window.gjSupabase;
    if (!c) return;
    var result = await c.auth.getSession();
    var session = result.data && result.data.session;
    if (!session || !window.gjIsStudentFromSession(session)) return;

    var name = inputName ? inputName.value.trim() : "";
    var program = inputProgram ? inputProgram.value.trim() : "";
    var y = window.gjSessionYearFromSelect ? window.gjSessionYearFromSelect(inputYear) : null;

    setFormErr("");

    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "Saving…";
    }

    var payload = {
      id: session.user.id,
      email: session.user.email || null,
      full_name: name || null,
      program: program || null,
      year: y,
    };

    var upsert = await c.from("student_profiles").upsert(payload, { onConflict: "id" }).select();
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Save";
    }
    if (upsert.error) {
      var um = upsert.error.message || String(upsert.error);
      setFormErr(um + hintForError(um));
      return;
    }
    setStatus("Saved. You can add program and session later, or staff can add them on the Students page.");
  }

  if (inputProgram) inputProgram.addEventListener("change", updateSessionPreview);
  if (inputYear) inputYear.addEventListener("change", updateSessionPreview);

  if (form) form.addEventListener("submit", onSubmit);

  if (window.gjPopulateAdmissionYearSelect && inputYear) window.gjPopulateAdmissionYearSelect(inputYear);

  (async function () {
    var session = await ensureStudentAccess();
    if (session) await loadProfile(session);
  })();
})();
