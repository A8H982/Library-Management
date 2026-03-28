/**
 * Contact form: saves to Supabase public.contact_messages when the table exists.
 * Run supabase/contact-messages.sql in your project. Optional: window.GJ_CONTACT_EMAIL for mailto fallback.
 */
(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;

  var errEl = document.getElementById("contact-form-error");
  var okEl = document.getElementById("contact-form-success");
  var btn = document.getElementById("contact-submit");

  function setErr(msg) {
    if (!errEl) return;
    errEl.textContent = msg || "";
    errEl.hidden = !msg;
  }

  function setOk(msg) {
    if (!okEl) return;
    okEl.textContent = msg || "";
    okEl.hidden = !msg;
  }

  function mailtoHref(to, subj, body) {
    var q = "subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
    if (to && to.indexOf("@") > 0) {
      return "mailto:" + encodeURIComponent(to.trim()) + "?" + q;
    }
    return "mailto:?" + q;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    setErr("");
    setOk("");

    var nameEl = document.getElementById("contact-name");
    var emailEl = document.getElementById("contact-email");
    var subjectEl = document.getElementById("contact-subject");
    var messageEl = document.getElementById("contact-message");
    var n = nameEl ? nameEl.value.trim() : "";
    var em = emailEl ? emailEl.value.trim() : "";
    var sub = subjectEl ? subjectEl.value.trim() : "";
    var msg = messageEl ? messageEl.value.trim() : "";

    if (!n) {
      setErr("Please enter your name.");
      if (nameEl) nameEl.focus();
      return;
    }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErr("Please enter a valid email address.");
      if (emailEl) emailEl.focus();
      return;
    }
    if (!msg) {
      setErr("Please enter a message.");
      if (messageEl) messageEl.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending…";
    }

    var client = window.gjSupabase;
    var initErr = window.GJ_SUPABASE_INIT_ERROR;
    var canTryDb = client && !initErr;

    if (canTryDb) {
      var ins = await client.from("contact_messages").insert([
        {
          name: n,
          email: em,
          subject: sub || null,
          message: msg,
        },
      ]);

      if (!ins.error) {
        form.reset();
        setOk("Thanks — your message was sent. We’ll reply when we can.");
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Send message";
        }
        return;
      }

      var errMsg = ins.error.message || String(ins.error);
      if (!/relation|does not exist|schema cache|PGRST205|42P01|Could not find the table/i.test(errMsg)) {
        setErr(errMsg + " If this persists, email the college office directly.");
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Send message";
        }
        return;
      }
    }

    var to = typeof window.GJ_CONTACT_EMAIL === "string" ? window.GJ_CONTACT_EMAIL.trim() : "";
    var subj = sub || "G.J. College contact from " + n;
    var body = "Name: " + n + "\nReply to: " + em + "\n\n" + msg;
    window.location.href = mailtoHref(to, subj, body);

    setOk(
      canTryDb
        ? "Database storage isn’t set up yet — your email app should open with a draft. Run supabase/contact-messages.sql in Supabase to save messages online."
        : "Your email app should open with a draft. Configure js/supabase-config.js to connect Supabase, or add GJ_CONTACT_EMAIL for a fixed recipient."
    );
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Send message";
    }
  });
})();
