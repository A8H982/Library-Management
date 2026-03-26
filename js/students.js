(async function () {
  var tbody = document.getElementById("student-rows");
  var statusEl = document.getElementById("students-load-status");
  var gate = document.getElementById("students-gate");
  var gateMsg = document.getElementById("students-gate-msg");
  var app = document.getElementById("students-app");
  var modal = document.getElementById("student-modal");
  var form = document.getElementById("student-form");
  var formErr = document.getElementById("student-form-error");
  var modalTitle = document.getElementById("student-modal-title");
  var inputSid = document.getElementById("stu-id");
  var inputName = document.getElementById("stu-name");
  var inputProgram = document.getElementById("stu-program");
  var inputYear = document.getElementById("stu-year");
  var inputStatus = document.getElementById("stu-status");
  var btnAdd = document.getElementById("btn-student-add");
  var btnReload = document.getElementById("btn-students-reload");
  var btnCancel = document.getElementById("btn-student-cancel");
  var btnDelete = document.getElementById("btn-student-delete");
  var btnSave = document.getElementById("btn-student-save");

  var byId = {};
  var editingPk = null;

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

  function newStudentId() {
    return "STU-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
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
          "This directory is only available to library staff. Student accounts can explore books on the home page.";
      }
      return false;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    return true;
  }

  function openModal(isNew, row) {
    if (!modal) return;
    editingPk = isNew ? null : row && row.id ? String(row.id) : null;
    if (modalTitle) modalTitle.textContent = isNew ? "Add student" : "Edit student";
    setFormErr("");
    if (btnDelete) btnDelete.hidden = isNew;
    if (isNew) {
      if (inputSid) inputSid.value = newStudentId();
      if (inputName) inputName.value = "";
      if (inputProgram) inputProgram.value = "";
      if (inputYear) inputYear.value = "";
      if (inputStatus) inputStatus.value = "active";
    } else if (row) {
      if (inputSid) inputSid.value = row.student_id != null ? String(row.student_id) : "";
      if (inputName) inputName.value = row.full_name != null ? String(row.full_name) : "";
      if (inputProgram) inputProgram.value = row.program != null ? String(row.program) : "";
      if (inputYear)
        inputYear.value =
          row.year != null && !isNaN(row.year) ? String(row.year) : "";
      if (inputStatus) inputStatus.value = row.status ? String(row.status).toLowerCase() : "active";
    }
    modal.hidden = false;
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
    if (inputName) inputName.focus();
  }

  function closeModal() {
    editingPk = null;
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
    var res = await client.from("students").select("*").order("student_id", { ascending: true });
    if (res.error) {
      var em = res.error.message || String(res.error);
      setStatus(
        em +
          (/PGRST205|Could not find the table|schema cache/i.test(em)
            ? " — Run supabase/rls-staff-student-roles.sql (creates students) or legacy-setup-students.sql, then reload."
            : ""),
        true
      );
      tbody.innerHTML = "<tr><td colspan='5'>Could not load students.</td></tr>";
      return;
    }
    var rows = res.data || [];
    byId = {};
    rows.forEach(function (r) {
      byId[String(r.id)] = r;
    });
    if (rows.length === 0) {
      tbody.innerHTML = "<tr><td colspan='5'>No rows yet. Add a student to begin.</td></tr>";
      setStatus("");
      return;
    }
    tbody.innerHTML = rows
      .map(function (r) {
        var id = String(r.id);
        var sid = r.student_id != null ? String(r.student_id) : "—";
        var nm = r.full_name != null ? String(r.full_name) : "—";
        var prog = r.program != null ? String(r.program) : "—";
        var yr = r.year != null && !isNaN(r.year) ? String(r.year) : "—";
        var st = r.status != null ? String(r.status) : "—";
        return (
          '<tr class="student-row" data-student-id="' +
          escapeAttr(id) +
          '" tabindex="0" role="button"><td>' +
          escapeHtml(sid) +
          "</td><td>" +
          escapeHtml(nm) +
          "</td><td>" +
          escapeHtml(prog) +
          "</td><td>" +
          escapeHtml(yr) +
          "</td><td>" +
          escapeHtml(st) +
          "</td></tr>"
        );
      })
      .join("");
    setStatus(rows.length + " student(s). Tap a row to edit.");
  }

  async function onSubmit(e) {
    e.preventDefault();
    var client = window.gjSupabase;
    if (!client) return;
    var name = inputName ? inputName.value.trim() : "";
    var program = inputProgram ? inputProgram.value.trim() : "";
    var sid = inputSid ? inputSid.value.trim() : "";
    var y = inputYear && inputYear.value.trim() ? parseInt(inputYear.value, 10) : null;
    var st = inputStatus ? inputStatus.value : "active";
    if (!name) {
      setFormErr("Name is required.");
      return;
    }
    if (!program) {
      setFormErr("Program is required.");
      return;
    }
    if (!sid) sid = newStudentId();
    setFormErr("");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "Saving…";
    }

    if (editingPk) {
      var upd = await client
        .from("students")
        .update({
          student_id: sid,
          full_name: name,
          program: program,
          year: y,
          status: st,
        })
        .eq("id", editingPk)
        .select();
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Save";
      }
      if (upd.error) {
        setFormErr(upd.error.message || String(upd.error));
        return;
      }
    } else {
      var ins = await client
        .from("students")
        .insert([
          {
            student_id: sid,
            full_name: name,
            program: program,
            year: y,
            status: st,
          },
        ])
        .select();
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Save";
      }
      if (ins.error) {
        setFormErr(ins.error.message || String(ins.error));
        return;
      }
    }
    closeModal();
    await loadStudents();
  }

  async function onDelete() {
    if (!editingPk) return;
    if (!window.confirm("Remove this student record?")) return;
    var client = window.gjSupabase;
    if (!client) return;
    var del = await client.from("students").delete().eq("id", editingPk);
    if (del.error) {
      setFormErr(del.error.message || String(del.error));
      return;
    }
    closeModal();
    await loadStudents();
  }

  function onTbodyClick(ev) {
    var tr = ev.target.closest("tr.student-row");
    if (!tr || !tbody.contains(tr)) return;
    var id = tr.getAttribute("data-student-id");
    if (id && byId[id]) openModal(false, byId[id]);
  }

  if (btnAdd) btnAdd.addEventListener("click", function () { openModal(true); });
  if (btnReload) btnReload.addEventListener("click", loadStudents);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (btnDelete) btnDelete.addEventListener("click", onDelete);
  if (form) form.addEventListener("submit", onSubmit);
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
      if (id && byId[id]) openModal(false, byId[id]);
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape" || !modal || modal.hidden) return;
    closeModal();
  });

  var ok = await ensureAccess();
  if (ok) await loadStudents();
})();
