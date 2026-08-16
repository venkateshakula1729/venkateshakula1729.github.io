/* ================================================
   Portfolio — Main JS
   ================================================ */
(function() {
  'use strict';

  // --- Theme ---
  var THEME_KEY = 'va-theme';
  function getTheme() {
    return localStorage.getItem(THEME_KEY) ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle
    var toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.addEventListener('click', function() {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    // Mobile nav
    var menuBtn = document.getElementById('nav-menu-btn');
    var navLinks = document.getElementById('nav-links');
    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', function() { navLinks.classList.toggle('open'); });
      document.addEventListener('click', function(e) {
        if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) navLinks.classList.remove('open');
      });
    }

    // Active nav
    var path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(function(link) {
      var href = link.getAttribute('href');
      if (href === '/' && (path === '/' || path === '/index.html')) link.classList.add('active');
      else if (href !== '/' && path.startsWith(href)) link.classList.add('active');
    });

    // Scroll fade-in
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(function(el) { obs.observe(el); });

    // --- Unified scroll handler (rAF-gated, passive) ---
    var header = document.getElementById('site-header');
    var progressBar = document.getElementById('reading-progress');
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        if (header) header.classList.toggle('scrolled', window.scrollY > 60);
        if (progressBar) {
          var max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          progressBar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
        }
        ticking = false;
      });
    }, { passive: true });

    // --- TOC highlighting (IntersectionObserver-based) ---
    (function() {
      var links = document.querySelectorAll('.blog-toc-sidebar .toc-link');
      if (!links.length) return;
      var targets = [];
      links.forEach(function(l) {
        var el = document.querySelector(l.getAttribute('href'));
        if (el) targets.push({ link: l, el: el });
      });
      if (!targets.length) return;

      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function(l) { l.classList.remove('active'); });
          var hit = targets.find(function(t) { return t.el === entry.target; });
          if (hit) hit.link.classList.add('active');
        });
      }, { rootMargin: '-80px 0px -70% 0px' });

      targets.forEach(function(t) { io.observe(t.el); });
    })();

  });
})();

// --- Global Search ---
(function() {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    var searchBtns = document.querySelectorAll('#search-btn, .search-btn');
    if (searchBtns.length === 0) return;

    // Create modal HTML
    var modalHtml = '<div id="search-modal" class="search-modal">' +
      '<div class="search-modal-content">' +
      '<div class="search-header">' +
      '<input type="text" id="search-input" placeholder="Search posts, life, readings..." autocomplete="off">' +
      '<button id="search-close">&times;</button>' +
      '</div>' +
      '<div id="search-results" class="search-results"></div>' +
      '</div></div>';
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    var modal = document.getElementById('search-modal');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var closeBtn = document.getElementById('search-close');
    var searchData = null;
    var debounceTimer = null;

    function openSearch() {
      modal.classList.add('active');
      input.focus();
      if (!searchData) {
        fetch('/assets/search.json')
          .then(function(res) { return res.json(); })
          .then(function(data) { searchData = data; })
          .catch(function(err) { console.error("Failed to load search index", err); });
      }
    }

    function closeSearch() {
      modal.classList.remove('active');
      input.value = '';
      results.innerHTML = '';
    }

    searchBtns.forEach(function(btn) { btn.addEventListener('click', openSearch); });
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeSearch();
    });

    // Keyboard shortcuts: Cmd/Ctrl+K to open, Escape to close
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    });

    // Debounced search input
    input.addEventListener('input', function() {
      var query = this.value.toLowerCase().trim();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (!query || !searchData) {
        results.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(function() {
        var matches = searchData.filter(function(item) {
          return item.title.toLowerCase().includes(query) ||
            item.content.toLowerCase().includes(query);
        }).slice(0, 15);

        if (matches.length === 0) {
          results.innerHTML = '<div class="search-no-result">No results found.</div>';
          return;
        }

        results.innerHTML = matches.map(function(item) {
          return '<a href="' + encodeURI(item.url) + '" class="search-result-item">' +
            '<div class="search-result-title">' + esc(item.title) +
            ' <span class="search-result-cat">' + esc(item.category) + '</span></div></a>';
        }).join('');
      }, 120);
    });
  });
})();