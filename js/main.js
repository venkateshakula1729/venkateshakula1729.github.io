/* ================================================
   Portfolio — Main JS + Interactive Particle System
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
  setTheme(getTheme());

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

    // Header shadow
    var header = document.getElementById('site-header');
    if (header) window.addEventListener('scroll', function() {
      header.style.boxShadow = window.scrollY > 60 ? '0 2px 16px rgba(0,0,0,.15)' : 'none';
    }, { passive: true });

    // --- Particle Canvas (HOMEPAGE ONLY) ---
    initParticles();

    // --- Generate TOC for Blog Posts ---
    generateTOC();
  });

  // --- TOC ---
  function generateTOC() {
    var content = document.querySelector('.blog-post-body');
    var tocContainer = document.getElementById('toc-list');
    if (!content || !tocContainer) return;

    var headings = content.querySelectorAll('h2, h3');
    if (headings.length === 0) return;

    headings.forEach(function(h, index) {
      if (!h.id) h.id = 'heading-' + index;
      var link = document.createElement('a');
      link.href = '#' + h.id;
      link.textContent = h.textContent;
      link.className = h.tagName.toLowerCase() === 'h3' ? 'toc-h3' : 'toc-h2';
      tocContainer.appendChild(link);
    });

    var tocLinks = tocContainer.querySelectorAll('a');
    window.addEventListener('scroll', function() {
      var current = '';
      headings.forEach(function(h) {
        if (window.scrollY >= h.offsetTop - 100) current = h.id;
      });
      tocLinks.forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }, { passive: true });
  }

  // --- Particle System (homepage hero only) ---
  function initParticles() {
    var canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    var container = canvas.parentElement;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    // ========== CONFIGURABLE CONSTANTS ==========
    // Adjust these to change the look and feel of the animation

    var PARTICLE_COUNT    = 70;        // Number of initial nodes
    var MAX_PARTICLES     = 150;       // Cap so clicks don't slow things down
    var NODE_RADIUS       = 3.5;       // Base radius of each node (px)
    var NODE_RADIUS_VAR   = 1.5;       // Random variance added to radius
    var NODE_COLOR        = '160, 160, 165';  // RGB for nodes (grey)
    var NODE_ALPHA        = 0.25;      // Base opacity of nodes
    var NODE_ALPHA_VAR    = 0.1;       // Random variance on opacity
    var EDGE_COLOR        = '160, 160, 165';  // RGB for connection lines
    var EDGE_WIDTH        = 1.0;       // Base line width for edges
    var EDGE_ALPHA_MULT   = 0.18;      // Max alpha multiplier for edges
    var CONNECTION_DIST   = 140;       // Max distance to draw a connection (px)
    var PARTICLE_SPEED    = 0.4;       // Max speed per axis
    var CONNECT_ON_CLICK  = 5;         // How many nearest nodes a new click-node connects to
    var PULSE_COLOR       = '120, 180, 255';  // Pulse / ripple color (soft blue)
    var PULSE_TRAIL_LEN   = 25;        // Max trail segment length (px) — keep short
    var PULSE_DECAY       = 0.04;      // How fast pulse fades per frame
    var RIPPLE_SPEED      = 12;        // How fast ripple ring expands
    var MOUSE_GLOW_RADIUS = 130;       // Radius of mouse proximity glow
    // =============================================

    var w, h, particles = [], ripples = [], mouse = { x: -1000, y: -1000 };

    function makeParticle(x, y, pulsed) {
      return {
        x: x, y: y,
        vx: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
        r: NODE_RADIUS + Math.random() * NODE_RADIUS_VAR,
        baseAlpha: NODE_ALPHA + Math.random() * NODE_ALPHA_VAR,
        alpha: NODE_ALPHA,
        pulseIntensity: pulsed ? 1.0 : 0
      };
    }

    function resize() {
      var rect = container.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Seed initial particles
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(makeParticle(Math.random() * w, Math.random() * h, false));
    }

    // Click: spawn node at click point, connect to K nearest, pulse outward
    function onInteract(px, py) {
      if (particles.length < MAX_PARTICLES) {
        var newP = makeParticle(px, py, true);
        particles.push(newP);

        // Find K nearest and pulse them
        var dists = [];
        for (var i = 0; i < particles.length - 1; i++) {
          var dx = particles[i].x - px, dy = particles[i].y - py;
          dists.push({ idx: i, d: Math.sqrt(dx * dx + dy * dy) });
        }
        dists.sort(function(a, b) { return a.d - b.d; });
        for (var k = 0; k < Math.min(CONNECT_ON_CLICK, dists.length); k++) {
          particles[dists[k].idx].pulseIntensity = 0.8;
        }
      }
      // Also fire a ripple ring
      ripples.push({ x: px, y: py, radius: 0, alpha: 0.6 });
    }

    container.addEventListener('click', function(e) {
      var rect = container.getBoundingClientRect();
      onInteract(e.clientX - rect.left, e.clientY - rect.top);
    });
    container.addEventListener('touchstart', function(e) {
      var rect = container.getBoundingClientRect();
      var t = e.touches[0];
      onInteract(t.clientX - rect.left, t.clientY - rect.top);
    }, { passive: true });

    container.addEventListener('mousemove', function(e) {
      var rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    });
    container.addEventListener('mouseleave', function() { mouse.x = -1000; mouse.y = -1000; });

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Draw edges
      for (var i = 0; i < particles.length; i++) {
        var a = particles[i];
        for (var j = i + 1; j < particles.length; j++) {
          var b = particles[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DIST) {
            var lineAlpha = (1 - d / CONNECTION_DIST) * EDGE_ALPHA_MULT;
            var maxPulse = Math.max(a.pulseIntensity, b.pulseIntensity);

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            if (maxPulse > 0.05) {
              ctx.strokeStyle = 'rgba(' + PULSE_COLOR + ',' + Math.min(0.7, lineAlpha + maxPulse * 0.5) + ')';
              ctx.lineWidth = EDGE_WIDTH + maxPulse * 1.5;
            } else {
              ctx.strokeStyle = 'rgba(' + EDGE_COLOR + ',' + lineAlpha + ')';
              ctx.lineWidth = EDGE_WIDTH;
            }
            ctx.stroke();
          }
        }
      }

      // Update and draw nodes
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));

        p.pulseIntensity = Math.max(0, p.pulseIntensity - PULSE_DECAY);

        // Ripple interaction: pulse nodes the wavefront passes through
        for (var r = 0; r < ripples.length; r++) {
          var rp = ripples[r];
          var rdx = p.x - rp.x, rdy = p.y - rp.y;
          var rdist = Math.sqrt(rdx * rdx + rdy * rdy);
          if (Math.abs(rdist - rp.radius) < 30) {
            p.pulseIntensity = Math.min(1, p.pulseIntensity + 0.3);
          }
        }

        // Mouse proximity glow
        var md = Math.sqrt((p.x - mouse.x) * (p.x - mouse.x) + (p.y - mouse.y) * (p.y - mouse.y));
        p.alpha = md < MOUSE_GLOW_RADIUS
          ? Math.min(0.9, p.baseAlpha + (1 - md / MOUSE_GLOW_RADIUS) * 0.4)
          : p.baseAlpha;

        var drawR = p.r + p.pulseIntensity * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
        if (p.pulseIntensity > 0.05) {
          ctx.fillStyle = 'rgba(' + PULSE_COLOR + ',' + Math.min(0.9, p.alpha + p.pulseIntensity * 0.6) + ')';
        } else {
          ctx.fillStyle = 'rgba(' + NODE_COLOR + ',' + p.alpha + ')';
        }
        ctx.fill();
      }

      // Update ripple rings
      for (var r = ripples.length - 1; r >= 0; r--) {
        ripples[r].radius += RIPPLE_SPEED;
        ripples[r].alpha *= 0.92;
        if (ripples[r].alpha < 0.005) ripples.splice(r, 1);
      }

      requestAnimationFrame(draw);
    }
    draw();
  }
})();

// Reading Progress Bar & TOC Highlighting
document.addEventListener('DOMContentLoaded', function() {
  var progressBar = document.getElementById('reading-progress');
  var tocLinks = document.querySelectorAll('.toc a');
  var headings = Array.from(document.querySelectorAll('.blog-post-body h2, .blog-post-body h3'));

  if (progressBar) {
    window.addEventListener('scroll', function() {
      var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    });
  }

  if (tocLinks.length > 0 && headings.length > 0) {
    window.addEventListener('scroll', function() {
      var scrollPos = window.scrollY + 100;
      var currentId = '';

      for (var i = headings.length - 1; i >= 0; i--) {
        if (headings[i].offsetTop <= scrollPos) {
          currentId = headings[i].id;
          break;
        }
      }

      if (currentId) {
        tocLinks.forEach(function(link) {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + currentId) {
            link.classList.add('active');
          }
        });
      }
    });
  }
});

// --- Global Search ---
document.addEventListener('DOMContentLoaded', function() {
  var searchBtns = document.querySelectorAll('#search-btn, .search-btn');
  if (searchBtns.length === 0) return;

  // Create modal HTML
  var modalHtml = `
    <div id="search-modal" class="search-modal">
      <div class="search-modal-content">
        <div class="search-header">
          <input type="text" id="search-input" placeholder="Search posts, life, readings..." autocomplete="off">
          <button id="search-close">&times;</button>
        </div>
        <div id="search-results" class="search-results"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  var modal = document.getElementById('search-modal');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var closeBtn = document.getElementById('search-close');
  var searchData = null;

  function openSearch() {
    modal.classList.add('active');
    input.focus();
    if (!searchData) {
      fetch('/assets/search.json')
        .then(res => res.json())
        .then(data => searchData = data)
        .catch(err => console.error("Failed to load search index", err));
    }
  }

  function closeSearch() {
    modal.classList.remove('active');
  }

  searchBtns.forEach(btn => btn.addEventListener('click', openSearch));
  closeBtn.addEventListener('click', closeSearch);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeSearch();
  });

  input.addEventListener('input', function() {
    var query = this.value.toLowerCase().trim();
    if (!query || !searchData) {
      results.innerHTML = '';
      return;
    }
    var matches = searchData.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.content.toLowerCase().includes(query)
    ).slice(0, 15);

    if (matches.length === 0) {
      results.innerHTML = '<div class="search-no-result">No results found.</div>';
      return;
    }

    results.innerHTML = matches.map(item => `
      <a href="${item.url}" class="search-result-item">
        <div class="search-result-title">${item.title} <span class="search-result-cat">${item.category}</span></div>
      </a>
    `).join('');
  });
});
