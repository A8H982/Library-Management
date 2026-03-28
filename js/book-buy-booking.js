/**
 * Book purchase / booking: date-range form, then confirmation with 4-digit verification PIN.
 * Used from catalog (Buy) and home Explore books (Buy).
 */
(function () {
  var modal = null;
  var step1 = null;
  var step2 = null;
  var inputStart = null;
  var inputEnd = null;
  var errEl = null;
  var pinEl = null;
  var allottedLead = null;
  var pinHint = null;
  var currentTitle = "";

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function todayIsoDate() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function randomFourDigitPin() {
    return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  }

  function ensureModal() {
    if (document.getElementById("gj-book-booking-modal")) {
      modal = document.getElementById("gj-book-booking-modal");
      step1 = document.getElementById("gj-book-booking-step1");
      step2 = document.getElementById("gj-book-booking-step2");
      inputStart = document.getElementById("gj-book-booking-start");
      inputEnd = document.getElementById("gj-book-booking-end");
      errEl = document.getElementById("gj-book-booking-err");
      pinEl = document.getElementById("gj-book-booking-pin");
      allottedLead = document.getElementById("gj-book-booking-allotted-lead");
      pinHint = document.getElementById("gj-book-booking-pin-hint");
      return;
    }

    var wrap = document.createElement("div");
    wrap.id = "gj-book-booking-modal";
    wrap.className = "modal-backdrop gj-book-booking-modal";
    wrap.setAttribute("hidden", "");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "gj-book-booking-title");
    wrap.innerHTML =
      '<div class="modal modal-wide">' +
      '<div id="gj-book-booking-step1">' +
      '<h2 id="gj-book-booking-title">Confirm your booking</h2>' +
      '<p class="page-sub" style="margin-top:-0.35rem;">Fill the form to confirm your booking.</p>' +
      '<p class="form-field-hint">Choose the date range for your possession of this book.</p>' +
      '<div class="form-field">' +
      '<label for="gj-book-booking-start">From</label>' +
      '<input type="date" id="gj-book-booking-start" required>' +
      "</div>" +
      '<div class="form-field">' +
      '<label for="gj-book-booking-end">To</label>' +
      '<input type="date" id="gj-book-booking-end" required>' +
      "</div>" +
      '<div class="form-error" id="gj-book-booking-err" hidden></div>' +
      '<div class="form-actions" style="justify-content:flex-end;flex-wrap:wrap;gap:0.65rem;margin-top:0.5rem;">' +
      '<button type="button" class="btn btn-ghost" id="gj-book-booking-cancel">Cancel</button>' +
      '<button type="button" class="btn btn-primary" id="gj-book-booking-submit">Submit</button>' +
      "</div></div>" +
      '<div id="gj-book-booking-step2" hidden>' +
      "<h2>Book allotted to you</h2>" +
      '<p id="gj-book-booking-allotted-lead" class="page-sub" style="margin-top:-0.35rem;"></p>' +
      '<p class="gj-book-pin-display" id="gj-book-booking-pin" aria-live="polite">0000</p>' +
      '<p id="gj-book-booking-pin-hint" class="page-sub"></p>' +
      '<div class="form-actions" style="justify-content:flex-end;margin-top:0.75rem;">' +
      '<button type="button" class="btn btn-primary" id="gj-book-booking-done">OK</button>' +
      "</div></div></div>";
    document.body.appendChild(wrap);

    modal = wrap;
    step1 = document.getElementById("gj-book-booking-step1");
    step2 = document.getElementById("gj-book-booking-step2");
    inputStart = document.getElementById("gj-book-booking-start");
    inputEnd = document.getElementById("gj-book-booking-end");
    errEl = document.getElementById("gj-book-booking-err");
    pinEl = document.getElementById("gj-book-booking-pin");
    allottedLead = document.getElementById("gj-book-booking-allotted-lead");
    pinHint = document.getElementById("gj-book-booking-pin-hint");

    var minD = todayIsoDate();
    if (inputStart) inputStart.min = minD;
    if (inputEnd) inputEnd.min = minD;

    if (inputStart) {
      inputStart.addEventListener("change", function () {
        if (inputEnd && inputStart.value) inputEnd.min = inputStart.value;
      });
    }

    document.getElementById("gj-book-booking-cancel").addEventListener("click", closeModal);
    document.getElementById("gj-book-booking-submit").addEventListener("click", onSubmitStep1);
    document.getElementById("gj-book-booking-done").addEventListener("click", closeModal);
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) closeModal();
    });
  }

  function setStepErr(msg) {
    if (!errEl) return;
    errEl.textContent = msg || "";
    errEl.hidden = !msg;
  }

  function onSubmitStep1() {
    setStepErr("");
    var s = inputStart && inputStart.value ? inputStart.value : "";
    var e = inputEnd && inputEnd.value ? inputEnd.value : "";
    if (!s || !e) {
      setStepErr("Please choose both start and end dates.");
      return;
    }
    if (s > e) {
      setStepErr("The end date must be on or after the start date.");
      return;
    }

    var pin = randomFourDigitPin();
    var title = currentTitle && String(currentTitle).trim() ? String(currentTitle).trim() : "this book";

    if (allottedLead) {
      allottedLead.innerHTML =
        "<strong>" +
        escapeHtml(title) +
        "</strong> is allotted to you for the dates you selected.";
    }
    if (pinEl) {
      pinEl.textContent = pin;
    }
    if (pinHint) {
      pinHint.textContent =
        "This is your verification PIN. Give it to the librarian when you reach the college library to collect this book.";
    }

    if (step1) step1.hidden = true;
    if (step2) step2.hidden = false;
  }

  function openModal(bookTitle) {
    ensureModal();
    currentTitle = bookTitle || "";
    setStepErr("");
    if (inputStart) {
      inputStart.value = "";
      inputStart.min = todayIsoDate();
    }
    if (inputEnd) {
      inputEnd.value = "";
      inputEnd.min = todayIsoDate();
    }
    if (step1) step1.hidden = false;
    if (step2) step2.hidden = true;
    modal.hidden = false;
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
    if (inputStart) inputStart.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    setTimeout(function () {
      if (modal) modal.hidden = true;
    }, 200);
    setStepErr("");
  }

  window.gjOpenBookBookingFlow = function (bookTitle) {
    openModal(bookTitle);
  };

  /** @returns {boolean} true if a modal was open and is now closed */
  window.gjCloseBookBookingModal = function () {
    if (!modal || modal.hidden) return false;
    closeModal();
    return true;
  };

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (modal && !modal.hidden) {
      closeModal();
    }
  });
})();
