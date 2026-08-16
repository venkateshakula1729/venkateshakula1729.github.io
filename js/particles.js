/*
 That is a real graph traversal, not an expanding circle.
 ----------------------------------------------------------- */

(function () {
  'use strict';

  function initGraph() {
    var canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    var container = canvas.parentElement;
    var ctx = canvas.getContext('2d', { alpha: true });

    /* ---- tuning ------------ */
    var CFG = {
      density:       0.000075, // nodes per px^2 - scales with viewport
      minNodes:      40,
      maxNodes:      130,
      radius:        3.4,      // node size
      radiusVar:     1.6,      // random size variance
      speed:         32,       // px per second - ambient node drift
      linkDist:      150,      // px, max edge length
      linkAlpha:     0.20,     // edge opacity at zero length
      nodeAlpha:     0.30,
      edgeWidth:     1.5,      // thickness of the resting connection lines
      signalWidth:   2.8,      // thickness of the travelling pulse
      outwardOnly:   true,     // wavefront may only move AWAY from the click
      outwardSlack:  6,        // px of tolerance, so the wave can round corners
      hoverRadius:   140,
      signalSpeed:   900,      // px per second - the travelling pulse
      hopDecay:      0.66,     // energy multiplier per hop
      minEnergy:     0.16,     // below this the signal dies
      refractory:    220,      // ms before a node can re-emit
      flashDecay:    1.8,      // flash units lost per second
      maxSignals:    220,      // hard safety cap
      maxHops:       6         // hard ceiling on cascade depth
    };
    /* ------------------------ */

    var nodes = [], signals = [], adj = [];
    var waveId = 0;
    var w = 0, h = 0, dpr = 1;
    var mouse = { x: -9999, y: -9999 };
    var running = false, inView = true, rafId = null, lastT = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ---- theme-aware colours, read from your CSS variables ---- */
    var COL = { node: '150,150,155', accent: '120,180,255' };

    function readThemeColors() {
      var cs = getComputedStyle(document.documentElement);
      COL.node = toRGB(cs.getPropertyValue('--text-muted') || cs.getPropertyValue('--text-secondary')) || COL.node;
      COL.accent = toRGB(cs.getPropertyValue('--accent')) || COL.accent;
    }

    function toRGB(value) {
      value = (value || '').trim();
      if (!value) return null;
      var m = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (m) {
        var hex = m[1];
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        return parseInt(hex.slice(0, 2), 16) + ',' + parseInt(hex.slice(2, 4), 16) + ',' + parseInt(hex.slice(4, 6), 16);
      }
      m = value.match(/rgba?\(([\s\S]+)\)/i);
      if (m) return m[1].split(',').slice(0, 3).map(function (n) { return Math.round(parseFloat(n)); }).join(',');
      return null;
    }

    /* ---- sizing ---- */
    function resize() {
      var rect = container.getBoundingClientRect();
      var newW = Math.max(1, rect.width), newH = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2 - 3x DPR kills fill rate
      canvas.width = Math.round(newW * dpr);
      canvas.height = Math.round(newH * dpr);
      canvas.style.width = newW + 'px';
      canvas.style.height = newH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (w && h && nodes.length) {
        // keep the existing graph, rescale it instead of teleporting nodes
        var sx = newW / w, sy = newH / h;
        for (var i = 0; i < nodes.length; i++) { nodes[i].x *= sx; nodes[i].y *= sy; }
      }
      w = newW; h = newH;
      reconcileCount();
    }

    function targetCount() {
      return Math.max(CFG.minNodes, Math.min(CFG.maxNodes, Math.round(w * h * CFG.density)));
    }

    function reconcileCount() {
      var target = targetCount();
      while (nodes.length < target) nodes.push(makeNode(Math.random() * w, Math.random() * h));
      if (nodes.length > target) nodes.length = target;
    }

    function makeNode(x, y) {
      var a = Math.random() * Math.PI * 2;
      var s = CFG.speed * (0.4 + Math.random() * 0.8);
      return {
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: CFG.radius + Math.random() * CFG.radiusVar,
        baseAlpha: CFG.nodeAlpha + Math.random() * 0.12,
        flash: 0,              // VISUAL only - never read by the propagation logic
        born: 0,
        lastWave: -1,          // which cascade last visited this node
        lastFired: -Infinity
      };
    }

    /* ---- graph: rebuild adjacency once per frame ---- */
    function buildAdjacency() {
      var n = nodes.length, maxSq = CFG.linkDist * CFG.linkDist;
      for (var i = 0; i < n; i++) { adj[i] = adj[i] || []; adj[i].length = 0; }
      adj.length = n;
      for (var i = 0; i < n; i++) {
        var a = nodes[i];
        for (var j = i + 1; j < n; j++) {
          var b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dsq = dx * dx + dy * dy;
          if (dsq < maxSq) {    // squared compare - no sqrt in the hot loop
            var d = Math.sqrt(dsq);
            adj[i].push({ n: j, d: d });
            adj[j].push({ n: i, d: d });
          }
        }
      }
    }

    /* ---- propagation ---- */
    function fireNode(index, energy, now, cameFrom, hops, wave, ox, oy) {
      var node = nodes[index];
      if (!node) return;

      // Termination is guaranteed by dampers that are all INDEPENDENT OF
      // RENDERING: a hop ceiling, energy decay, and a per-wave visit marker.
      // Deliberately not keyed on node.flash - that is a visual value, and
      // coupling the two makes the animation breakable by a styling tweak.
      if (hops > CFG.maxHops) return;
      if (energy < CFG.minEnergy) return;
      if (node.lastWave === wave) return;                 // already part of this cascade
      if (now - node.lastFired < CFG.refractory) return;

      node.lastWave = wave;
      node.lastFired = now;
      node.flash = Math.max(node.flash, energy);

      // Distance of THIS node from the click point. The wavefront may only
      // advance to neighbours further out than this, which is what stops the
      // cascade folding back over itself.
      var here = Math.sqrt((node.x - ox) * (node.x - ox) + (node.y - oy) * (node.y - oy));

      var neighbours = adj[index] || [];
      for (var k = 0; k < neighbours.length; k++) {
        var nb = nodes[neighbours[k].n];
        if (!nb) continue;
        if (neighbours[k].n === cameFrom) continue;      // never bounce straight back
        if (nb.lastWave === wave) continue;              // already lit by this cascade

        if (CFG.outwardOnly) {
          var there = Math.sqrt((nb.x - ox) * (nb.x - ox) + (nb.y - oy) * (nb.y - oy));
          if (there < here - CFG.outwardSlack) continue;   // inward - drop it
        }

        if (signals.length >= CFG.maxSignals) break;
        signals.push({
          from: index,
          to: neighbours[k].n,
          len: neighbours[k].d,
          t: 0,
          hops: hops + 1,
          wave: wave,
          ox: ox, oy: oy,
          energy: energy * CFG.hopDecay
        });
      }
    }

    function advanceSignals(dt, now) {
      for (var i = signals.length - 1; i >= 0; i--) {
        var s = signals[i];
        var a = nodes[s.from], b = nodes[s.to];
        if (!a || !b) { signals.splice(i, 1); continue; }

        s.t += (CFG.signalSpeed * dt) / Math.max(1, s.len);
        if (s.t >= 1) {
          signals.splice(i, 1);
          nodes[s.to].flash = Math.max(nodes[s.to].flash, s.energy); // always light the arrival node
          fireNode(s.to, s.energy, now, s.from, s.hops, s.wave, s.ox, s.oy);
        }
      }
    }

    /* ---- interaction ---- */
    function onPointerDown(e) {
      // never swallow a click meant for a link, button or form control
      if (e.target.closest && e.target.closest('a, button, input, textarea, select, [role="button"]')) return;

      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var now = performance.now();

      // A click ALWAYS drops a new node exactly under the cursor and starts the
      // cascade there - the dot you clicked into existence is the one that fires.
      if (nodes.length >= CFG.maxNodes) nodes.shift();   // recycle the oldest
      var node = makeNode(x, y);
      node.vx *= 0.25;                                   // born nearly still, so it reads as "placed"
      node.vy *= 0.25;
      node.born = now;
      nodes.push(node);

      buildAdjacency();                                  // the new node needs edges before it can fire
      var idx = nodes.length - 1;

      waveId++;                                          // each click is its own cascade
      nodes[idx].lastFired = -Infinity;                  // a deliberate click always fires
      nodes[idx].lastWave = -1;
      fireNode(idx, 1, now, -1, 0, waveId, x, y);
    }

    /* ---- rendering ---- */
    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      // edges
      ctx.lineWidth = CFG.edgeWidth;
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        var list = adj[i];
        for (var k = 0; k < list.length; k++) {
          if (list[k].n < i) continue;                   // draw each edge once
          var b = nodes[list[k].n];
          var alpha = (1 - list[k].d / CFG.linkDist) * CFG.linkAlpha;
          var lit = Math.max(a.flash, b.flash);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = lit > 0.05
            ? 'rgba(' + COL.accent + ',' + Math.min(0.55, alpha + lit * 0.35) + ')'
            : 'rgba(' + COL.node + ',' + alpha + ')';
          ctx.stroke();
        }
      }

      // travelling signals - a short bright segment moving along the edge
      for (var s = 0; s < signals.length; s++) {
        var sig = signals[s];
        var p = nodes[sig.from], q = nodes[sig.to];
        if (!p || !q) continue;
        var head = Math.min(1, sig.t);
        var tail = Math.max(0, sig.t - 0.22);
        ctx.beginPath();
        ctx.moveTo(p.x + (q.x - p.x) * tail, p.y + (q.y - p.y) * tail);
        ctx.lineTo(p.x + (q.x - p.x) * head, p.y + (q.y - p.y) * head);
        ctx.strokeStyle = 'rgba(' + COL.accent + ',' + Math.min(0.85, 0.25 + sig.energy * 0.6) + ')';
        ctx.lineWidth = CFG.signalWidth;
        ctx.stroke();
      }
      ctx.lineWidth = CFG.edgeWidth;

      // nodes
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var dx = n.x - mouse.x, dy = n.y - mouse.y;
        var md = Math.sqrt(dx * dx + dy * dy);
        var hover = md < CFG.hoverRadius ? (1 - md / CFG.hoverRadius) * 0.35 : 0;
        var alpha = Math.min(0.95, n.baseAlpha + hover + n.flash * 0.65);

        if (n.flash > 0.05) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + n.flash * 7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + COL.accent + ',' + (n.flash * 0.12) + ')';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + n.flash * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = n.flash > 0.05
          ? 'rgba(' + COL.accent + ',' + alpha + ')'
          : 'rgba(' + COL.node + ',' + alpha + ')';
        ctx.fill();
      }
    }

    function step(now) {
      rafId = requestAnimationFrame(step);
      if (!inView || document.hidden) { lastT = now; return; }

      var dt = Math.min((now - lastT) / 1000, 0.05); // seconds, clamped so a tab switch can't teleport nodes
      lastT = now;

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx); }
        if (n.x > w) { n.x = w; n.vx = -Math.abs(n.vx); }
        if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy); }
        if (n.y > h) { n.y = h; n.vy = -Math.abs(n.vy); }
        n.flash = Math.max(0, n.flash - CFG.flashDecay * dt);
      }

      buildAdjacency();
      advanceSignals(dt, now);
      drawFrame();
    }

    function start() {
      if (running) return;
      running = true;
      lastT = performance.now();
      rafId = requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    /* ---- wiring ---- */
    readThemeColors();
    resize();
    buildAdjacency();   // so a click landing before the first frame still has edges

    new MutationObserver(readThemeColors)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', function (e) {
      var rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }, { passive: true });
    container.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

    // stop burning battery when the hero is off screen or the tab is hidden
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(container);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    if (reduced.matches) {
      buildAdjacency();
      drawFrame();                          // one static frame, no motion
    } else {
      start();
    }
    reduced.addEventListener('change', function (e) {
      if (e.matches) { stop(); buildAdjacency(); drawFrame(); }
      else start();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();