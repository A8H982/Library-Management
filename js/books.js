(async function () {
  var COVERS_BUCKET = "book-covers";
  var MAX_COVER_BYTES = 5 * 1024 * 1024;

  var tbody = document.getElementById("book-rows");
  var statusEl = document.getElementById("catalog-load-status");
  var modal = document.getElementById("add-book-modal");
  var form = document.getElementById("book-form");
  var formError = document.getElementById("book-form-error");
  var btnOpen = document.getElementById("btn-open-add-book");
  var btnReload = document.getElementById("btn-reload-catalog");
  var btnDeleteAll = document.getElementById("btn-delete-all-books");
  var btnCancel = document.getElementById("btn-cancel-add-book");
  var inputTitle = document.getElementById("book-title");
  var inputAuthor = document.getElementById("book-author");
  var inputCover = document.getElementById("book-cover");

  var detailModal = document.getElementById("book-detail-modal");
  var detailForm = document.getElementById("detail-form");
  var detailMeta = document.getElementById("detail-meta");
  var detailError = document.getElementById("detail-form-error");
  var detailCoverPreview = document.getElementById("detail-cover-preview");
  var inputDetailCover = document.getElementById("detail-cover");
  var checkDetailCoverClear = document.getElementById("detail-cover-clear");
  var detailTitle = document.getElementById("detail-title");
  var detailAuthor = document.getElementById("detail-author");
  var detailIsbn = document.getElementById("detail-isbn");
  var detailShelf = document.getElementById("detail-shelf");
  var detailYear = document.getElementById("detail-year");
  var detailStatus = document.getElementById("detail-status");
  var detailIsbnWrap = document.getElementById("detail-isbn-wrap");
  var detailShelfWrap = document.getElementById("detail-shelf-wrap");
  var detailYearWrap = document.getElementById("detail-year-wrap");
  var detailStatusWrap = document.getElementById("detail-status-wrap");
  var btnCloseDetail = document.getElementById("btn-close-detail");
  var btnDeleteBook = document.getElementById("btn-delete-book");
  var btnUpdateBook = document.getElementById("btn-update-book");
  var viewModal = document.getElementById("book-view-modal");
  var viewImg = document.getElementById("book-view-cover-img");
  var viewEmpty = document.getElementById("book-view-cover-empty");
  var viewTitleText = document.getElementById("book-view-title-text");
  var viewByline = document.getElementById("book-view-byline");
  var viewMeta = document.getElementById("book-view-meta");
  var viewHint = document.getElementById("book-view-hint");
  var btnBookViewClose = document.getElementById("btn-book-view-close");
  var btnBookViewBuy = document.getElementById("btn-book-view-buy");

  var booksById = {};
  var editingId = null;
  var viewingId = null;
  var catalogCanEditStaff = false;
  var catalogIsStudent = false;
  var catalogSearchInput = document.getElementById("catalog-search");
  var lastCatalogRows = [];

  if (!tbody) return;

  function coverPublicUrl(client, storagePath) {
    if (!client || !storagePath || String(storagePath).trim() === "") return "";
    var r = client.storage.from(COVERS_BUCKET).getPublicUrl(String(storagePath).trim());
    return r.data && r.data.publicUrl ? r.data.publicUrl : "";
  }

  function coverExtension(file) {
    var n = file.name || "";
    var last = n.split(".").pop();
    if (!last || last.length > 5) last = "jpg";
    last = last.toLowerCase();
    if (last === "jpeg") last = "jpg";
    if (["jpg", "png", "webp"].indexOf(last) < 0) last = "jpg";
    return last;
  }

  async function uploadCoverForBook(client, bookId, file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      return { path: null, error: "Choose a JPEG, PNG, or WebP image." };
    }
    if (file.size > MAX_COVER_BYTES) {
      return { path: null, error: "Image must be under 5 MB." };
    }
    var ext = coverExtension(file);
    var path = String(bookId) + "/cover." + ext;
    var up = await client.storage.from(COVERS_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (up.error) return { path: null, error: up.error.message || String(up.error) };
    return { path: path, error: null };
  }

  async function removeCoverFromStorage(client, storagePath) {
    if (!client || !storagePath || String(storagePath).trim() === "") return;
    await client.storage.from(COVERS_BUCKET).remove([String(storagePath).trim()]);
  }

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#f87171" : "var(--text-muted)";
  }

  function setFormError(msg) {
    if (!formError) return;
    if (msg) {
      formError.textContent = msg;
      formError.hidden = false;
    } else {
      formError.textContent = "";
      formError.hidden = true;
    }
  }

  function setDetailError(msg) {
    if (!detailError) return;
    if (msg) {
      detailError.textContent = msg;
      detailError.hidden = false;
    } else {
      detailError.textContent = "";
      detailError.hidden = true;
    }
  }

  function hasCol(row, col) {
    return row != null && Object.prototype.hasOwnProperty.call(row, col);
  }

  function badgeForStatus(status) {
    var st = (status || "available").toLowerCase();
    var label =
      st === "available"
        ? "Available"
        : st === "on_loan"
          ? "On loan"
          : st === "reference"
            ? "Reference"
            : st === "lost"
              ? "Lost"
              : st === "repair"
                ? "Repair"
                : status;
    var cls =
      st === "available"
        ? "badge-success"
        : st === "on_loan"
          ? "badge-warning"
          : st === "reference"
            ? "badge-info"
            : st === "lost"
              ? "badge-warning"
              : "badge-info";
    return '<span class="badge ' + cls + '">' + label + "</span>";
  }

  function normalizeBook(b) {
    var acc =
      b.accession_code != null && String(b.accession_code).trim() !== ""
        ? String(b.accession_code).trim()
        : "BK-" + String(b.id).replace(/-/g, "");
    var title =
      b.title != null && String(b.title).trim() !== "" ? String(b.title).trim() : "—";
    var author =
      b.author != null && String(b.author).trim() !== "" ? String(b.author).trim() : "—";
    var isbn = b.isbn != null && String(b.isbn).trim() !== "" ? String(b.isbn).trim() : "—";
    var shelf =
      b.shelf_location != null && String(b.shelf_location).trim() !== ""
        ? String(b.shelf_location).trim()
        : "—";
    var yr = b.publication_year != null ? String(b.publication_year) : "—";
    var st = b.status != null && String(b.status).trim() !== "" ? String(b.status).trim().toLowerCase() : "available";
    if (["available", "on_loan", "reference", "lost", "repair"].indexOf(st) < 0) st = "available";
    var cov =
      b.cover_image_path != null && String(b.cover_image_path).trim() !== ""
        ? String(b.cover_image_path).trim()
        : "";
    return {
      accession_code: acc,
      title: title,
      author: author,
      isbn: isbn,
      shelf_location: shelf,
      year: yr,
      status: st,
      cover_image_path: cov,
    };
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

  function newAccession() {
    return "BK-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  async function insertBookRow(client, title, author) {
    var full = {
      accession_code: newAccession(),
      title: title,
      author: author,
      isbn: null,
      shelf_location: "General",
      publication_year: null,
      cover_image_path: null,
      status: "available",
    };
    var minimal = {
      accession_code: newAccession(),
      title: title,
      author: author,
      status: "available",
    };

    function looksLikeSchemaMismatch(msg) {
      return /column|Could not find the|PGRST204|42703|schema cache/i.test(msg || "");
    }

    var ins = await client.from("books").insert([full]).select();
    if (!ins.error) return ins;

    var em = ins.error.message || "";
    if (looksLikeSchemaMismatch(em)) {
      ins = await client.from("books").insert([minimal]).select();
    }
    return ins;
  }

  function openModal() {
    if (!catalogCanEditStaff || !modal) return;
    modal.hidden = false;
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
    });
    setFormError("");
    if (form) form.reset();
    if (inputTitle) inputTitle.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    setTimeout(function () {
      modal.hidden = true;
    }, 200);
    setFormError("");
  }

  function syncDetailCoverPreview(client, row) {
    if (!detailCoverPreview) return;
    var path = row && hasCol(row, "cover_image_path") && row.cover_image_path ? String(row.cover_image_path) : "";
    var url = path ? coverPublicUrl(client, path) : "";
    if (url) {
      detailCoverPreview.src = url;
      detailCoverPreview.hidden = false;
    } else {
      detailCoverPreview.removeAttribute("src");
      detailCoverPreview.hidden = true;
    }
  }

  function promptSignInForCatalog(message, portal) {
    if (typeof window.gjShowSignInRequired !== "function") return;
    var opts = {
      message: message,
      redirectPage: "catalog.html",
    };
    if (portal === "staff" || portal === "student") opts.portal = portal;
    window.gjShowSignInRequired(opts);
  }

  async function refreshStaffFlag() {
    var client = window.gjSupabase;
    catalogCanEditStaff = false;
    catalogIsStudent = false;
    if (!client) return;
    var result = await client.auth.getSession();
    var session = result.data && result.data.session;
    catalogCanEditStaff = !!(session && typeof window.gjIsStaffFromSession === "function" && window.gjIsStaffFromSession(session));
    catalogIsStudent = !!(session && typeof window.gjIsStudentFromSession === "function" && window.gjIsStudentFromSession(session));
    syncCatalogToolbar();
    if (lastCatalogRows.length) renderFilteredCatalog();
  }

  function syncCatalogToolbar() {
    var bar = document.getElementById("catalog-toolbar-staff");
    if (bar) bar.hidden = !catalogCanEditStaff;
  }

  function closeBookViewModal() {
    viewingId = null;
    if (!viewModal) return;
    viewModal.classList.remove("is-open");
    setTimeout(function () {
      viewModal.hidden = true;
    }, 200);
  }

  function openBookViewModal(id) {
    var row = booksById[id];
    var client = window.gjSupabase;
    if (!row || !viewModal) return;
    viewingId = id;
    var r = normalizeBook(row);
    if (viewTitleText) viewTitleText.textContent = r.title;
    if (viewByline) {
      viewByline.textContent = r.author && r.author !== "—" ? "by " + r.author : "";
    }
    var stLabel =
      r.status === "on_loan"
        ? "On loan"
        : r.status === "reference"
          ? "Reference"
          : r.status === "lost"
            ? "Lost"
            : r.status === "repair"
              ? "Repair"
              : r.status === "available"
                ? "Available"
                : r.status;
    var metaParts = ["Accession " + r.accession_code];
    if (r.isbn && r.isbn !== "—") metaParts.push("ISBN " + r.isbn);
    if (r.shelf_location && r.shelf_location !== "—") metaParts.push("Shelf " + r.shelf_location);
    if (r.year && r.year !== "—") metaParts.push("Year " + r.year);
    metaParts.push("Status: " + stLabel);
    if (viewMeta) viewMeta.textContent = metaParts.join(" · ");

    if (viewHint) {
      viewHint.textContent = catalogIsStudent
        ? "Signed in as a student — tap Buy to register interest. Staff will use your account email at the desk."
        : "Sign in with a student account to submit a request from here, or visit the library desk.";
    }

    var path = row && hasCol(row, "cover_image_path") && row.cover_image_path ? String(row.cover_image_path) : "";
    var url = path && client ? coverPublicUrl(client, path) : "";
    if (viewImg && viewEmpty) {
      if (url) {
        viewImg.src = url;
        viewImg.alt = r.title || "Book cover";
        viewImg.hidden = false;
        viewEmpty.hidden = true;
      } else {
        viewImg.removeAttribute("src");
        viewImg.alt = "";
        viewImg.hidden = true;
        viewEmpty.hidden = false;
      }
    }

    viewModal.hidden = false;
    requestAnimationFrame(function () {
      viewModal.classList.add("is-open");
    });
    if (btnBookViewClose) btnBookViewClose.focus();
  }

  function openStaffDetailModal(id) {
    var row = booksById[id];
    var client = window.gjSupabase;
    if (!row || !detailModal) return;
    editingId = id;
    setDetailError("");
    if (checkDetailCoverClear) checkDetailCoverClear.checked = false;
    if (inputDetailCover) inputDetailCover.value = "";
    syncDetailCoverPreview(client, row);

    var r = normalizeBook(row);
    if (detailMeta) {
      detailMeta.textContent = "Accession: " + r.accession_code + " · Database id: " + String(row.id);
    }
    if (detailTitle) detailTitle.value = hasCol(row, "title") && row.title != null ? String(row.title) : "";
    if (detailAuthor) detailAuthor.value = hasCol(row, "author") && row.author != null ? String(row.author) : "";
    if (detailIsbnWrap) detailIsbnWrap.hidden = !hasCol(row, "isbn");
    if (detailShelfWrap) detailShelfWrap.hidden = !hasCol(row, "shelf_location");
    if (detailYearWrap) detailYearWrap.hidden = !hasCol(row, "publication_year");
    if (detailStatusWrap) detailStatusWrap.hidden = !hasCol(row, "status");

    if (detailIsbn) detailIsbn.value = hasCol(row, "isbn") && row.isbn != null ? String(row.isbn) : "";
    if (detailShelf)
      detailShelf.value =
        hasCol(row, "shelf_location") && row.shelf_location != null ? String(row.shelf_location) : "";
    if (detailYear)
      detailYear.value =
        hasCol(row, "publication_year") && row.publication_year != null ? String(row.publication_year) : "";
    if (detailStatus)
      detailStatus.value = hasCol(row, "status") && row.status ? String(row.status).toLowerCase() : "available";

    detailModal.hidden = false;
    requestAnimationFrame(function () {
      detailModal.classList.add("is-open");
    });
    if (detailTitle) detailTitle.focus();
  }

  function openBookRow(id) {
    if (catalogCanEditStaff) openStaffDetailModal(id);
    else openBookViewModal(id);
  }

  function closeDetailModal() {
    editingId = null;
    if (!detailModal) return;
    detailModal.classList.remove("is-open");
    setTimeout(function () {
      detailModal.hidden = true;
    }, 200);
    setDetailError("");
  }

  function buildUpdatePayload(row) {
    var t = detailTitle ? detailTitle.value.trim() : "";
    var a = detailAuthor ? detailAuthor.value.trim() : "";
    var payload = {};
    if (hasCol(row, "title")) payload.title = t;
    if (hasCol(row, "author")) payload.author = a;
    if (hasCol(row, "isbn") && detailIsbn && !detailIsbnWrap.hidden) {
      payload.isbn = detailIsbn.value.trim() || null;
    }
    if (hasCol(row, "shelf_location") && detailShelf && !detailShelfWrap.hidden) {
      payload.shelf_location = detailShelf.value.trim() || null;
    }
    if (hasCol(row, "publication_year") && detailYear && !detailYearWrap.hidden) {
      var y = detailYear.value.trim();
      if (y === "") payload.publication_year = null;
      else {
        var yn = parseInt(y, 10);
        payload.publication_year = isNaN(yn) ? null : yn;
      }
    }
    if (hasCol(row, "status") && detailStatus && !detailStatusWrap.hidden) {
      payload.status = detailStatus.value;
    }

    if (hasCol(row, "cover_image_path")) {
      if (checkDetailCoverClear && checkDetailCoverClear.checked) {
        payload.cover_image_path = null;
      }
    }
    return payload;
  }

  function catalogStatusSuffix() {
    return catalogCanEditStaff
      ? "Tap a row to edit or remove a record."
      : "Tap a row to view a title and buy or request it.";
  }

  function rowMatchesSearch(b, q) {
    if (!q) return true;
    var r = normalizeBook(b);
    var st = r.status || "";
    var hay = [r.title, r.author, r.accession_code, r.isbn, r.shelf_location, r.year, st, st.replace(/_/g, " ")]
      .join(" ")
      .toLowerCase();
    var parts = q.split(/\s+/).filter(Boolean);
    return parts.every(function (p) {
      return hay.indexOf(p) !== -1;
    });
  }

  function buildCatalogRowHtml(b, client) {
    var r = normalizeBook(b);
    var bid = String(b.id);
    var label = "View details for " + r.title.replace(/"/g, "'");
    var thumbUrl = r.cover_image_path ? coverPublicUrl(client, r.cover_image_path) : "";
    var thumbCell = thumbUrl
      ? '<img class="catalog-cover-thumb" src="' +
        escapeAttr(thumbUrl) +
        '" alt="" width="40" height="56" loading="lazy">'
      : '<span class="catalog-cover-placeholder" title="No cover">—</span>';
    return (
      '<tr class="book-row" data-book-id="' +
      escapeAttr(bid) +
      '" tabindex="0" role="button" aria-label="' +
      escapeAttr(label) +
      '"><td class="catalog-cover-cell">' +
      thumbCell +
      "</td><td>" +
      escapeHtml(r.accession_code) +
      "</td><td>" +
      escapeHtml(r.title) +
      "</td><td>" +
      escapeHtml(r.author) +
      "</td><td>" +
      escapeHtml(r.isbn) +
      "</td><td>" +
      escapeHtml(r.shelf_location) +
      "</td><td>" +
      badgeForStatus(r.status) +
      "</td></tr>"
    );
  }

  function renderFilteredCatalog() {
    if (!tbody) return;
    var client = window.gjSupabase;
    var rawQ = catalogSearchInput ? catalogSearchInput.value.trim() : "";
    var q = rawQ.toLowerCase();
    if (lastCatalogRows.length === 0) return;
    var rows = q
      ? lastCatalogRows.filter(function (b) {
          return rowMatchesSearch(b, q);
        })
      : lastCatalogRows.slice();
    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr class="catalog-empty-row"><td colspan="7" class="catalog-empty-cell">No titles match your search. Try different keywords.</td></tr>';
      setStatus('No matches for "' + rawQ + '".', false);
      return;
    }
    tbody.innerHTML = rows
      .map(function (b) {
        return buildCatalogRowHtml(b, client);
      })
      .join("");
    var suffix = catalogStatusSuffix();
    if (q) {
      setStatus(rows.length + " of " + lastCatalogRows.length + " titles shown. " + suffix, false);
    } else {
      setStatus(lastCatalogRows.length + " title(s) in catalog. " + suffix, false);
    }
  }

  async function loadBooks() {
    var client = window.gjSupabase;
    if (!client) {
      var why = window.GJ_SUPABASE_INIT_ERROR;
      var msg =
        why === "sdk_not_loaded"
          ? "Could not load the database connection script. Check your network and try again."
          : why === "missing_config"
            ? "Database connection is not configured. Ask your administrator to set js/supabase-config.js."
            : why && why !== "createClient_failed"
              ? why
              : "Could not connect to the database. Refresh the page or contact your administrator.";
      setStatus(msg, true);
      return;
    }

    setStatus("Loading…");
    var res = await client.from("books").select("*").order("accession_code", { ascending: true });

    if (res.error) {
      var errMsg = res.error.message || String(res.error);
      var code = res.error.code || "";
      var hint = "";
      if (code === "42703" || /column .* does not exist/i.test(errMsg)) {
        hint = " Check `books` columns — run supabase/setup.sql and setup-book-covers.sql if needed.";
      } else if (/Could not find the table|schema cache|PGRST205|42P01/i.test(errMsg)) {
        hint =
          " Run supabase/create-books-only.sql or supabase/setup.sql in the Supabase SQL Editor, then wait ~1 min (or reload the page). NOTIFY reload is included.";
      } else {
        hint =
          " Check RLS on public.books (see supabase/auth-rls-authenticated.sql).";
      }
      setStatus(errMsg + hint, true);
      return;
    }

    var rows = res.data || [];
    booksById = {};
    rows.forEach(function (b) {
      booksById[String(b.id)] = b;
    });
    lastCatalogRows = rows;

    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7">No catalog records yet. After signing in, staff can use <strong>Add book</strong> to create the first copy.</td></tr>';
      setStatus("");
      return;
    }

    renderFilteredCatalog();
  }

  async function onSubmitForm(e) {
    e.preventDefault();
    if (!catalogCanEditStaff) return;
    var client = window.gjSupabase;
    if (!client) {
      setFormError("Database is not connected.");
      return;
    }

    var title = inputTitle ? inputTitle.value.trim() : "";
    var author = inputAuthor ? inputAuthor.value.trim() : "";
    if (!title) {
      setFormError("Please enter a title.");
      if (inputTitle) inputTitle.focus();
      return;
    }
    if (!author) {
      setFormError("Please enter an author.");
      if (inputAuthor) inputAuthor.focus();
      return;
    }

    setFormError("");
    var saveBtn = document.getElementById("btn-save-book");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
    }

    var ins = await insertBookRow(client, title, author);

    if (ins.error) {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save book";
      }
      var em = ins.error.message || String(ins.error);
      var hint = "";
      if (/column .* does not exist/i.test(em)) {
        hint = " Compare `books` with supabase/setup.sql (add cover_image_path if missing).";
      } else if (/RLS|row-level security|policy|42501/i.test(em)) {
        hint =
          " Ensure INSERT policy for role `authenticated` (see supabase/auth-rls-authenticated.sql).";
      }
      setFormError(em + hint);
      return;
    }

    var row = ins.data && ins.data[0];
    var file = inputCover && inputCover.files && inputCover.files[0];
    var uploadWarn = "";
    if (row && file && hasCol(row, "cover_image_path")) {
      var up = await uploadCoverForBook(client, row.id, file);
      if (up.error) {
        uploadWarn = " Cover not uploaded: " + up.error + " (check Storage policies for book-covers.)";
      } else {
        var pu = await client.from("books").update({ cover_image_path: up.path }).eq("id", row.id).select();
        if (pu.error) uploadWarn = " Cover file saved but database path failed: " + (pu.error.message || "");
      }
    } else if (row && file && !hasCol(row, "cover_image_path")) {
      uploadWarn = " Add column cover_image_path (run supabase/setup-book-covers.sql), then upload a cover from book details.";
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save book";
    }

    closeModal();
    setStatus("Book added to catalog." + uploadWarn, !!uploadWarn);
    await loadBooks();
  }

  async function onDetailSubmit(e) {
    e.preventDefault();
    if (!catalogCanEditStaff) return;
    var client = window.gjSupabase;
    if (!client || !editingId) {
      setDetailError("Not connected or no book selected.");
      return;
    }
    var row = booksById[editingId];
    if (!row) {
      setDetailError("Book not found. Try Reload.");
      return;
    }

    var t = detailTitle ? detailTitle.value.trim() : "";
    var a = detailAuthor ? detailAuthor.value.trim() : "";
    if (!t) {
      setDetailError("Title is required.");
      if (detailTitle) detailTitle.focus();
      return;
    }
    if (!a) {
      setDetailError("Author is required.");
      if (detailAuthor) detailAuthor.focus();
      return;
    }

    setDetailError("");
    if (btnUpdateBook) {
      btnUpdateBook.disabled = true;
      btnUpdateBook.textContent = "Saving…";
    }

    var oldCoverPath =
      hasCol(row, "cover_image_path") && row.cover_image_path ? String(row.cover_image_path).trim() : "";

    if (checkDetailCoverClear && checkDetailCoverClear.checked && oldCoverPath) {
      await removeCoverFromStorage(client, oldCoverPath);
    }

    var payload = buildUpdatePayload(row);

    var file = inputDetailCover && inputDetailCover.files && inputDetailCover.files[0];
    if (file && hasCol(row, "cover_image_path")) {
      if (oldCoverPath && !checkDetailCoverClear.checked) {
        await removeCoverFromStorage(client, oldCoverPath);
      }
      var up = await uploadCoverForBook(client, editingId, file);
      if (up.error) {
        if (btnUpdateBook) {
          btnUpdateBook.disabled = false;
          btnUpdateBook.textContent = "Save changes";
        }
        setDetailError(up.error);
        return;
      }
      payload.cover_image_path = up.path;
    }

    var upd = await client.from("books").update(payload).eq("id", editingId).select();

    if (btnUpdateBook) {
      btnUpdateBook.disabled = false;
      btnUpdateBook.textContent = "Save changes";
    }

    if (upd.error) {
      var msg = upd.error.message || String(upd.error);
      var h = /RLS|policy|42501/i.test(msg) ? " Ensure UPDATE policy exists for your role." : "";
      setDetailError(msg + h);
      return;
    }

    closeDetailModal();
    setStatus("Book updated.");
    await loadBooks();
  }

  async function onDeleteBook() {
    if (!editingId) return;
    if (!catalogCanEditStaff) return;
    if (!window.confirm("Remove this book record from the catalog? This cannot be undone.")) return;

    var client = window.gjSupabase;
    if (!client) {
      setDetailError("Database is not connected.");
      return;
    }

    var row = booksById[editingId];
    var cov =
      row && hasCol(row, "cover_image_path") && row.cover_image_path ? String(row.cover_image_path).trim() : "";

    if (btnDeleteBook) btnDeleteBook.disabled = true;
    if (cov) await removeCoverFromStorage(client, cov);
    var del = await client.from("books").delete().eq("id", editingId);
    if (btnDeleteBook) btnDeleteBook.disabled = false;

    if (del.error) {
      var msg = del.error.message || String(del.error);
      setDetailError(msg + (/RLS|policy|42501/i.test(msg) ? " Add DELETE policy for your role." : ""));
      return;
    }

    closeDetailModal();
    setStatus("Book removed from catalog.");
    await loadBooks();
  }

  async function onDeleteAllBooks() {
    if (!catalogCanEditStaff) return;
    var client = window.gjSupabase;
    if (!client) {
      setStatus("Database is not connected.", true);
      return;
    }
    var count = Object.keys(booksById).length;
    if (count === 0) {
      setStatus("There are no catalog records to delete.");
      return;
    }
    if (
      !window.confirm(
        "Delete ALL " +
          count +
          " book record(s)? This empties the catalog permanently and cannot be undone."
      )
    ) {
      return;
    }
    if (!window.confirm("Final confirmation: erase every row in the books table?")) {
      return;
    }

    if (btnDeleteAll) btnDeleteAll.disabled = true;
    setStatus("Removing all catalog records…");

    var ids = Object.keys(booksById);
    for (var i = 0; i < ids.length; i++) {
      var row = booksById[ids[i]];
      var p =
        row && hasCol(row, "cover_image_path") && row.cover_image_path
          ? String(row.cover_image_path).trim()
          : "";
      if (p) await removeCoverFromStorage(client, p);
    }

    var del = await client.from("books").delete().not("id", "is", null);

    if (btnDeleteAll) btnDeleteAll.disabled = false;

    if (del.error) {
      var msg = del.error.message || String(del.error);
      setStatus(
        msg + (/RLS|policy|42501/i.test(msg) ? " Check DELETE policy on public.books." : ""),
        true
      );
      return;
    }

    booksById = {};
    editingId = null;
    if (viewModal && !viewModal.hidden) closeBookViewModal();
    if (detailModal && !detailModal.hidden) closeDetailModal();
    setStatus("All books were removed from the database.");
    await loadBooks();
  }

  function onTbodyClick(ev) {
    var tr = ev.target.closest("tr.book-row");
    if (!tr || !tbody.contains(tr)) return;
    var id = tr.getAttribute("data-book-id");
    if (id) openBookRow(id);
  }

  function onTbodyKeydown(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var tr = ev.target.closest("tr.book-row");
    if (!tr || !tbody.contains(tr)) return;
    ev.preventDefault();
    var id = tr.getAttribute("data-book-id");
    if (id) openBookRow(id);
  }

  async function onBookViewBuy() {
    var client = window.gjSupabase;
    if (!client) return;
    var row = viewingId ? booksById[viewingId] : null;
    var title = row && row.title != null ? String(row.title).trim() : "this title";
    var res = await client.auth.getSession();
    var session = res.data && res.data.session;
    if (!session) {
      promptSignInForCatalog("To buy this book, sign in with your student account.", "student");
      return;
    }
    if (!window.gjIsStudentFromSession || !window.gjIsStudentFromSession(session)) {
      window.alert(
        "Purchase requests from this dialog are for student accounts. Staff manage copies with Add book and row details."
      );
      return;
    }
    closeBookViewModal();
    if (typeof window.gjOpenBookBookingFlow === "function") {
      window.gjOpenBookBookingFlow(title);
    }
  }

  if (btnOpen) btnOpen.addEventListener("click", openModal);
  if (btnReload) btnReload.addEventListener("click", loadBooks);
  if (catalogSearchInput) catalogSearchInput.addEventListener("input", renderFilteredCatalog);
  if (btnDeleteAll) btnDeleteAll.addEventListener("click", onDeleteAllBooks);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) closeModal();
    });
  }
  if (form) form.addEventListener("submit", onSubmitForm);

  if (tbody) {
    tbody.addEventListener("click", onTbodyClick);
    tbody.addEventListener("keydown", onTbodyKeydown);
  }
  if (btnCloseDetail) btnCloseDetail.addEventListener("click", closeDetailModal);
  if (btnBookViewClose) btnBookViewClose.addEventListener("click", closeBookViewModal);
  if (btnBookViewBuy) btnBookViewBuy.addEventListener("click", onBookViewBuy);
  if (viewModal) {
    viewModal.addEventListener("click", function (ev) {
      if (ev.target === viewModal) closeBookViewModal();
    });
  }
  if (btnDeleteBook) btnDeleteBook.addEventListener("click", onDeleteBook);
  if (detailForm) detailForm.addEventListener("submit", onDetailSubmit);
  if (detailModal) {
    detailModal.addEventListener("click", function (ev) {
      if (ev.target === detailModal) closeDetailModal();
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (typeof window.gjCloseBookBookingModal === "function" && window.gjCloseBookBookingModal()) return;
    var signInEl = document.getElementById("gj-sign-in-required-backdrop");
    if (signInEl && !signInEl.hasAttribute("hidden")) return;
    if (viewModal && !viewModal.hidden) {
      closeBookViewModal();
      return;
    }
    if (detailModal && !detailModal.hidden) {
      closeDetailModal();
      return;
    }
    if (modal && !modal.hidden) closeModal();
  });

  await refreshStaffFlag();
  if (window.gjSupabase) {
    window.gjSupabase.auth.onAuthStateChange(function () {
      refreshStaffFlag();
    });
  }
  syncCatalogToolbar();
  loadBooks();
})();
