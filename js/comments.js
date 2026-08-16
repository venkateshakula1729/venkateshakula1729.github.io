/* -----------------------------------------------------------
   Comments - name + comment, no account required.
   Talks to the Cloudflare Worker in workers/comments-worker.js

   Usage: drop <div id="comments"></div> into a post, then
   <script src="/js/comments.js" defer></script>
   ----------------------------------------------------------- */
(function () {
    'use strict';

    // paste your deployed Worker URL here (no trailing slash)
    var WORKER_URL = 'https://YOUR-WORKER.workers.dev';

    var mount = document.getElementById('comments');
    if (!mount) return;

    var page = window.location.pathname;
    if (!page.endsWith('/')) page += '/';

    mount.innerHTML =
        '<h2 class="comments-title">Comments</h2>' +
        '<form class="comment-form" id="comment-form" novalidate>' +
        '<div class="comment-form-row">' +
        '<input type="text" id="comment-name" name="name" maxlength="60" required ' +
        'placeholder="Name" autocomplete="name" aria-label="Your name">' +
        '</div>' +
        // honeypot - hidden from people, irresistible to bots
        '<input type="text" id="comment-website" name="website" tabindex="-1" ' +
        'autocomplete="off" aria-hidden="true" class="comment-hp">' +
        '<textarea id="comment-body" name="body" rows="4" maxlength="4000" required ' +
        'placeholder="Leave a comment" aria-label="Your comment"></textarea>' +
        '<div class="comment-form-foot">' +
        '<span class="comment-note" id="comment-note">No account needed. Be kind.</span>' +
        '<button type="submit" class="btn btn-outline" id="comment-submit">Post</button>' +
        '</div>' +
        '</form>' +
        '<div class="comment-list" id="comment-list" aria-live="polite">' +
        '<p class="comment-empty">Loading comments...</p>' +
        '</div>';

    var form = document.getElementById('comment-form');
    var nameEl = document.getElementById('comment-name');
    var bodyEl = document.getElementById('comment-body');
    var hpEl = document.getElementById('comment-website');
    var listEl = document.getElementById('comment-list');
    var noteEl = document.getElementById('comment-note');
    var submitEl = document.getElementById('comment-submit');

    // Remember the name across posts - the one bit of friction worth removing.
    try {
        var saved = localStorage.getItem('va-comment-name');
        if (saved) nameEl.value = saved;
    } catch (e) { }

    function api(path) {
        return WORKER_URL.replace(/\/$/, '') + '/?page=' + encodeURIComponent(page) + (path || '');
    }

    function when(iso) {
        var then = new Date(iso);
        if (isNaN(then)) return '';
        var secs = Math.floor((Date.now() - then) / 1000);
        if (secs < 60) return 'just now';
        if (secs < 3600) return Math.floor(secs / 60) + ' min ago';
        if (secs < 86400) return Math.floor(secs / 3600) + ' hr ago';
        if (secs < 604800) return Math.floor(secs / 86400) + ' d ago';
        return then.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function initials(name) {
        return name.trim().split(/\s+/).slice(0, 2).map(function (w) {
            return w.charAt(0).toUpperCase();
        }).join('');
    }

    // Deterministic hue from the name, so a given person keeps one avatar colour.
    function hue(name) {
        var h = 0;
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
        return h;
    }

    function render(comments) {
        listEl.innerHTML = '';
        if (!comments.length) {
            var empty = document.createElement('p');
            empty.className = 'comment-empty';
            empty.textContent = 'No comments yet - be the first.';
            listEl.appendChild(empty);
            return;
        }

        comments
            .slice()
            .sort(function (a, b) { return new Date(a.at) - new Date(b.at); })
            .forEach(function (c) {
                var item = document.createElement('article');
                item.className = 'comment';

                var avatar = document.createElement('div');
                avatar.className = 'comment-avatar';
                avatar.style.background = 'hsl(' + hue(c.name) + ' 55% 45%)';
                avatar.textContent = initials(c.name);          // textContent - never innerHTML
                avatar.setAttribute('aria-hidden', 'true');

                var main = document.createElement('div');
                main.className = 'comment-main';

                var head = document.createElement('div');
                head.className = 'comment-head';

                var who = document.createElement('span');
                who.className = 'comment-name';
                who.textContent = c.name;

                var time = document.createElement('time');
                time.className = 'comment-time';
                time.dateTime = c.at;
                time.textContent = when(c.at);

                var text = document.createElement('p');
                text.className = 'comment-body';
                text.textContent = c.body;                      // markup can never execute

                head.appendChild(who);
                head.appendChild(time);
                main.appendChild(head);
                main.appendChild(text);
                item.appendChild(avatar);
                item.appendChild(main);
                listEl.appendChild(item);
            });
    }

    function load() {
        fetch(api(), { method: 'GET' })
            .then(function (r) { return r.json(); })
            .then(function (d) { render(d.comments || []); })
            .catch(function () {
                listEl.innerHTML = '';
                var p = document.createElement('p');
                p.className = 'comment-empty';
                p.textContent = 'Comments are unavailable right now.';
                listEl.appendChild(p);
            });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = nameEl.value.trim();
        var body = bodyEl.value.trim();
        if (!name || !body) {
            noteEl.textContent = 'Please fill in both your name and a comment.';
            noteEl.className = 'comment-note comment-note-error';
            return;
        }

        submitEl.disabled = true;
        submitEl.textContent = 'Posting...';
        noteEl.className = 'comment-note';
        noteEl.textContent = 'Posting...';

        fetch(api(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, body: body, website: hpEl.value })
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (res) {
                if (!res.ok) throw new Error(res.d.error || 'Failed');
                try { localStorage.setItem('va-comment-name', name); } catch (e) { }
                bodyEl.value = '';
                noteEl.textContent = 'Posted. Thanks.';
                load();
            })
            .catch(function (err) {
                noteEl.textContent = err.message || 'Could not post. Try again.';
                noteEl.className = 'comment-note comment-note-error';
            })
            .finally(function () {
                submitEl.disabled = false;
                submitEl.textContent = 'Post';
            });
    });

    load();
})();