/**
 * Home page — fetch books from Supabase and render "Explore books" cards (public read).
 */
(function () {
  var grid = document.getElementById("explore-books-grid");
  var statusEl = document.getElementById("explore-books-status");
  if (!grid) return;

  var COVERS_BUCKET = "book-covers";

  function publicUrl(client, path) {
    if (!client || !path || String(path).trim() === "") return "";
    var r = client.storage.from(COVERS_BUCKET).getPublicUrl(String(path).trim());
    return r.data && r.data.publicUrl ? r.data.publicUrl : "";
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

  async function loadExploreBooks() {
    var client = window.gjSupabase;
    if (!client) {
      grid.innerHTML = "";
      if (statusEl) {
        statusEl.textContent =
          "Titles from the catalog will show here after you configure js/supabase-config.js.";
      }
      return;
    }

    if (statusEl) statusEl.textContent = "Loading catalog…";

    var res = await client
      .from("books")
      .select("id,title,author,isbn,publication_year,status,cover_image_path,created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (res.error) {
      grid.innerHTML = "";
      if (statusEl) {
        var em = res.error.message || "Could not load books.";
        var hint =
          /PGRST205|schema cache|Could not find the table/i.test(em)
            ? " Run supabase/create-books-only.sql (or supabase/setup.sql) in the Supabase SQL Editor, then wait a minute and refresh. Confirm your Project URL in js/supabase-config.js matches this project."
            : " Ensure public.books exists and RLS allows SELECT for anon (see supabase/setup.sql).";
        statusEl.textContent = em + " — " + hint;
      }
      return;
    }

    var rows = res.data || [];
    if (statusEl) statusEl.textContent = "";

    if (rows.length === 0) {
      grid.innerHTML =
        '<p class="explore-books-empty">No books in the catalog yet. Staff can add copies and cover images from the <a href="catalog.html">library catalog</a>.</p>';
      return;
    }

    grid.innerHTML = rows
      .map(function (b) {
        var imgUrl = publicUrl(client, b.cover_image_path);
        var title = escapeHtml(b.title || "Untitled");
        var author = escapeHtml(b.author || "—");
        var isbn = b.isbn && String(b.isbn).trim() ? escapeHtml(String(b.isbn).trim()) : "";
        var year =
          b.publication_year != null && !isNaN(b.publication_year) ? String(b.publication_year) : "";
        var coverBlock = imgUrl
          ? '<div class="explore-book-cover"><img src="' +
            escapeAttr(imgUrl) +
            '" alt="' +
            escapeAttr(b.title || "Book cover") +
            '" loading="lazy" width="200" height="280"></div>'
          : '<div class="explore-book-cover explore-book-cover--empty" aria-hidden="true"><span class="explore-book-cover-placeholder">No image</span></div>';
        var meta = [];
        if (isbn) meta.push("ISBN " + isbn);
        if (year) meta.push(year);
        var metaHtml = meta.length ? '<p class="explore-book-meta">' + meta.join(" · ") + "</p>" : "";
        return (
          '<article class="explore-book-card">' +
          coverBlock +
          '<div class="explore-book-body"><h3 class="explore-book-title">' +
          title +
          "</h3>" +
          '<p class="explore-book-author">' +
          author +
          "</p>" +
          metaHtml +
          '<div class="explore-book-actions">' +
          '<button type="button" class="btn btn-primary btn-sm explore-book-buy-btn" data-book-id="' +
          escapeAttr(String(b.id)) +
          '" data-book-title="' +
          escapeAttr(b.title || "") +
          '">Buy</button></div></div></article>'
        );
      })
      .join("");
  }

  if (grid) {
    grid.addEventListener("click", async function (ev) {
      var btn = ev.target.closest(".explore-book-buy-btn");
      if (!btn || !grid.contains(btn)) return;

      var client = window.gjSupabase;
      if (!client) return;

      var sessionResult = await client.auth.getSession();
      var session = sessionResult.data && sessionResult.data.session;
      if (!session) {
        if (typeof window.gjShowSignInRequired === "function") {
          window.gjShowSignInRequired({
            message: "To buy this book you must sign in.",
            redirectPage: "index.html",
            portal: "student",
          });
        }
        return;
      }

      if (!window.gjIsStudentFromSession || !window.gjIsStudentFromSession(session)) {
        window.alert(
          "Book bookings are for student accounts. Library staff manage the catalog from the catalog page."
        );
        return;
      }

      var rawTitle = btn.getAttribute("data-book-title") || "";
      if (typeof window.gjOpenBookBookingFlow === "function") {
        window.gjOpenBookBookingFlow(rawTitle);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadExploreBooks);
  } else {
    loadExploreBooks();
  }
})();
