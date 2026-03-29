/**
 * Staff-only: list contact form submissions from public.contact_messages.
 * Requires supabase/contact-messages.sql in Supabase. If the dashboard shows rows but this page
 * lists none, run supabase/fix-contact-messages-staff-select.sql (RLS must match auth.users role).
 */
(function () {
  var gate = document.getElementById("contact-messages-gate");
  var gateMsg = document.getElementById("contact-messages-gate-msg");
  var app = document.getElementById("contact-messages-app");
  var statusEl = document.getElementById("contact-messages-status");
  var tbody = document.getElementById("contact-messages-rows");
  var btnReload = document.getElementById("btn-contact-messages-reload");

  var viewBackdrop = document.getElementById("contact-msg-view-backdrop");
  var viewSubject = document.getElementById("contact-msg-view-subject");
  var viewAvatar = document.getElementById("contact-msg-view-avatar");
  var viewSenderName = document.getElementById("contact-msg-view-sender-name");
  var viewEmail = document.getElementById("contact-msg-view-email");
  var viewDate = document.getElementById("contact-msg-view-date");
  var viewReplyToLine = document.getElementById("contact-msg-view-reply-to-line");
  var viewBody = document.getElementById("contact-msg-view-body");
  var viewReply = document.getElementById("contact-msg-view-reply");
  var btnViewClose = document.getElementById("contact-msg-view-close");
  var btnViewCloseFooter = document.getElementById("contact-msg-view-close-footer");

  var messagesById = {};

  if (!tbody) return;

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return escapeHtml(String(iso));
      return escapeHtml(
        d.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      );
    } catch (e) {
      return escapeHtml(String(iso));
    }
  }

  function formatWhenLong(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch (e) {
      return String(iso);
    }
  }

  function previewSnippet(text, maxLen) {
    var t = text != null ? String(text).replace(/\s+/g, " ").trim() : "";
    if (!t) return "—";
    if (t.length > maxLen) return t.slice(0, maxLen) + "…";
    return t;
  }

  function senderInitial(name, email) {
    var s =
      name && String(name).trim()
        ? String(name).trim()
        : email && String(email).trim()
          ? String(email).trim()
          : "?";
    var ch = s.charAt(0);
    return ch ? ch.toUpperCase() : "?";
  }

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#f87171" : "var(--text-muted)";
  }

  function closeContactMsgView() {
    if (!viewBackdrop) return;
    viewBackdrop.classList.remove("is-open");
    setTimeout(function () {
      viewBackdrop.hidden = true;
    }, 200);
  }

  function openContactMsgView(id) {
    var row = messagesById[id];
    if (!row || !viewBackdrop) return;

    var name = row.name != null ? String(row.name).trim() : "";
    var em = row.email != null ? String(row.email).trim() : "";
    var subjRaw = row.subject != null && String(row.subject).trim() !== "" ? String(row.subject).trim() : "";
    var subjDisplay = subjRaw || "(No subject)";
    var msgText = row.message != null ? String(row.message) : "";

    if (viewSubject) viewSubject.textContent = subjDisplay;

    if (viewAvatar) viewAvatar.textContent = senderInitial(name, em);

    if (viewSenderName) {
      viewSenderName.textContent = name ? name : "(No name provided)";
    }

    if (viewDate) {
      var iso = row.created_at != null ? String(row.created_at) : "";
      if (iso) viewDate.setAttribute("datetime", iso);
      viewDate.textContent = formatWhenLong(row.created_at);
    }

    if (viewEmail) {
      if (em) {
        viewEmail.innerHTML =
          '<a href="mailto:' + escapeAttr(em) + '">' + escapeHtml(em) + "</a>";
      } else {
        viewEmail.textContent = "—";
      }
    }

    if (viewReplyToLine) {
      if (em) {
        viewReplyToLine.textContent = em;
      } else {
        viewReplyToLine.textContent = "—";
      }
    }

    if (viewBody) viewBody.textContent = msgText || "(No message text.)";

    if (viewReply) {
      if (em) {
        var replySubj = "Re: " + (subjRaw || "(No subject)");
        var replyBody =
          "\n\n---\nOriginal message (" + formatWhenLong(row.created_at) + "):\n\n" + msgText;
        viewReply.href =
          "mailto:" +
          encodeURIComponent(em) +
          "?subject=" +
          encodeURIComponent(replySubj) +
          "&body=" +
          encodeURIComponent(replyBody);
        viewReply.hidden = false;
      } else {
        viewReply.href = "#";
        viewReply.hidden = true;
      }
    }

    viewBackdrop.hidden = false;
    requestAnimationFrame(function () {
      viewBackdrop.classList.add("is-open");
    });
    if (btnViewClose) btnViewClose.focus();
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
      window.location.replace("auth.html?portal=staff&redirect=contact-messages.html");
      return false;
    }
    if (!window.gjIsStaffFromSession || !window.gjIsStaffFromSession(session)) {
      if (gate) gate.hidden = false;
      if (app) app.hidden = true;
      if (gateMsg) {
        gateMsg.textContent =
          "This inbox is only available to library staff. Use the staff sign-in link below.";
      }
      return false;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    return true;
  }

  async function loadMessages() {
    var client = window.gjSupabase;
    if (!client) return;
    setStatus("Loading…", false);
    if (tbody) tbody.innerHTML = "<tr><td colspan=\"5\">Loading…</td></tr>";

    var res = await client
      .from("contact_messages")
      .select("id, name, email, subject, message, created_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      var em = res.error.message || String(res.error);
      setStatus(em, true);
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan=\"5\">Could not load messages. Check Row Level Security (run <code>supabase/fix-contact-messages-staff-select.sql</code>).</td></tr>";
      }
      messagesById = {};
      return;
    }

    setStatus(res.data && res.data.length ? res.data.length + " message(s)." : "No messages yet.", false);

    if (!res.data || !res.data.length) {
      if (tbody) tbody.innerHTML = "<tr><td colspan=\"5\">No contact form submissions yet.</td></tr>";
      messagesById = {};
      return;
    }

    messagesById = {};
    var html = "";
    for (var i = 0; i < res.data.length; i++) {
      var row = res.data[i];
      var id = row.id != null ? String(row.id) : "";
      if (id) messagesById[id] = row;

      var subj = row.subject != null && String(row.subject).trim() !== "" ? String(row.subject).trim() : "—";
      var em = row.email != null ? String(row.email).trim() : "";
      var mailHref = em ? "mailto:" + encodeURIComponent(em) : "#";
      var label = "Open message from " + (row.name || "sender");
      var prev = previewSnippet(row.message, 160);

      html +=
        '<tr class="contact-msg-row" tabindex="0" role="button" data-msg-id="' +
        escapeAttr(id) +
        '" aria-label="' +
        escapeAttr(label) +
        '">' +
        "<td>" +
        formatWhen(row.created_at) +
        "</td>" +
        "<td>" +
        escapeHtml(row.name || "") +
        "</td>" +
        '<td><a class="contact-msg-email-link" href="' +
        escapeAttr(mailHref) +
        '">' +
        escapeHtml(em) +
        "</a></td>" +
        "<td>" +
        escapeHtml(subj) +
        "</td>" +
        '<td class="contact-msg-preview-cell"><span class="contact-msg-preview-text">' +
        escapeHtml(prev) +
        "</span></td></tr>";
    }
    if (tbody) tbody.innerHTML = html;
  }

  function onTbodyClick(ev) {
    var a = ev.target.closest("a.contact-msg-email-link");
    if (a && tbody.contains(a)) return;
    var tr = ev.target.closest("tr.contact-msg-row");
    if (!tr || !tbody.contains(tr)) return;
    var mid = tr.getAttribute("data-msg-id");
    if (mid) openContactMsgView(mid);
  }

  function onTbodyKeydown(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var tr = ev.target.closest("tr.contact-msg-row");
    if (!tr || !tbody.contains(tr)) return;
    ev.preventDefault();
    var mid = tr.getAttribute("data-msg-id");
    if (mid) openContactMsgView(mid);
  }

  async function init() {
    var ok = await ensureAccess();
    if (!ok) return;
    await loadMessages();
    if (btnReload) {
      btnReload.addEventListener("click", function () {
        loadMessages();
      });
    }

    if (tbody) {
      tbody.addEventListener("click", onTbodyClick);
      tbody.addEventListener("keydown", onTbodyKeydown);
    }

    if (viewBackdrop) {
      viewBackdrop.addEventListener("click", function (ev) {
        if (ev.target === viewBackdrop) closeContactMsgView();
      });
    }
    if (btnViewClose) btnViewClose.addEventListener("click", closeContactMsgView);
    if (btnViewCloseFooter) btnViewCloseFooter.addEventListener("click", closeContactMsgView);

    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      if (!viewBackdrop || viewBackdrop.hidden) return;
      closeContactMsgView();
    });
  }

  init();
})();
