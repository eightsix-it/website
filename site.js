/* ════════════════════════════════════════════════════════════════
   Eight Six IT Engineering — shared site behavior
   Two modes:
   • GSAP mode  — experience.js (GSAP/Lenis/Three.js) owns all motion;
                  this file provides UI behavior + counters/bars.
   • Fallback   — when GSAP can't load (or reduced motion), the CSS
                  reveal system below takes over so nothing is lost.
   Everything degrades gracefully without JS.
   ════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var docEl = document.documentElement;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    var gsapMode = !reduced && hasGsap;
    var animOn = !reduced && !gsapMode && 'IntersectionObserver' in window;
    var motion = gsapMode || animOn;

    if (gsapMode) docEl.classList.add('e86-gsap');

    /* ───────────────────────────── Mobile menu ── */
    var menuBtn = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');
    var menuIcon = document.getElementById('menu-icon');
    if (menuBtn && menu && menuIcon && !menuBtn.dataset.bound) {
        menuBtn.dataset.bound = '1';
        if (!menu.id) menu.id = 'mobile-menu';
        menuBtn.setAttribute('aria-controls', menu.id);
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.addEventListener('click', function () {
            var isOpen = !menu.classList.contains('hidden');
            menu.classList.toggle('hidden');
            menuIcon.textContent = isOpen ? 'menu' : 'close';
            menuBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });
    }

    /* ── Icon glyphs are decorative: keep them out of the accessibility tree ──
       Without this a screen reader reads "arrow forward", "smart toy" and the
       like in the middle of headings, links and button labels. */
    var icons = document.querySelectorAll('.material-symbols-outlined');
    for (var ic = 0; ic < icons.length; ic++) {
        icons[ic].setAttribute('aria-hidden', 'true');
    }

    /* ───────────────────────────── Header scrolled state ── */
    var header = document.querySelector('header');
    function onHeaderScroll() {
        if (!header) return;
        header.classList.toggle('e86-scrolled', window.scrollY > 12);
    }
    window.addEventListener('scroll', onHeaderScroll, { passive: true });
    onHeaderScroll();

    /* ───────────────────────────── Scroll progress bar ── */
    var progress = document.createElement('div');
    progress.className = 'e86-progress';
    document.body.appendChild(progress);
    var progTicking = false;
    function updateProgress() {
        var max = docEl.scrollHeight - window.innerHeight;
        var p = max > 0 ? window.scrollY / max : 0;
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
        progTicking = false;
    }
    window.addEventListener('scroll', function () {
        if (!progTicking) { progTicking = true; requestAnimationFrame(updateProgress); }
    }, { passive: true });
    updateProgress();

    /* ───────────────────────────── Back-to-top ── */
    var topBtn = document.createElement('button');
    topBtn.className = 'e86-top';
    topBtn.setAttribute('aria-label', 'Back to top');
    topBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>';
    document.body.appendChild(topBtn);
    topBtn.addEventListener('click', function () {
        if (window.E86_LENIS) { window.E86_LENIS.scrollTo(0); return; }
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    window.addEventListener('scroll', function () {
        topBtn.classList.toggle('show', window.scrollY > 700);
    }, { passive: true });

    /* ───────────────────────────── FAQ accordion ── */
    document.querySelectorAll('.e86-faq-item').forEach(function (item) {
        var q = item.querySelector('.e86-faq-q');
        if (!q) return;
        q.addEventListener('click', function () {
            var wasOpen = item.classList.contains('open');
            var group = item.closest('[data-faq]');
            if (group) {
                group.querySelectorAll('.e86-faq-item.open').forEach(function (other) {
                    other.classList.remove('open');
                    var ob = other.querySelector('.e86-faq-q');
                    if (ob) ob.setAttribute('aria-expanded', 'false');
                });
            }
            item.classList.toggle('open', !wasOpen);
            q.setAttribute('aria-expanded', String(!wasOpen));
        });
    });

    /* ───────────────────────────── Glow cards: cursor tracking ── */
    document.addEventListener('pointermove', function (e) {
        var card = e.target.closest && e.target.closest('.e86-glow-card');
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    /* ───────────────────────────── 2D particle network ──
       Used directly in fallback mode; exposed for experience.js
       as the fallback when WebGL is unavailable. */
    function startParticles2D(canvas) {
        if (!canvas || !canvas.getContext || canvas.dataset.particles) return;
        canvas.dataset.particles = '1';
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var nodes = [];
        var running = false;
        var W = 0, H = 0;

        function resize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            W = rect.width;
            H = rect.height;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function seed() {
            nodes = [];
            var count = Math.min(90, Math.max(35, Math.floor(W / 18)));
            for (var i = 0; i < count; i++) {
                nodes.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: Math.random() * 1.6 + 0.6,
                    gold: Math.random() < 0.07
                });
            }
        }

        function step() {
            if (!running) return;
            ctx.clearRect(0, 0, W, H);
            var linkDist = 130;
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                n.x += n.vx; n.y += n.vy;
                if (n.x < -10) n.x = W + 10; else if (n.x > W + 10) n.x = -10;
                if (n.y < -10) n.y = H + 10; else if (n.y > H + 10) n.y = -10;
                for (var j = i + 1; j < nodes.length; j++) {
                    var m = nodes[j];
                    var dx = n.x - m.x, dy = n.y - m.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < linkDist * linkDist) {
                        var a = (1 - Math.sqrt(d2) / linkDist) * 0.16;
                        ctx.strokeStyle = 'rgba(110, 140, 220,' + a.toFixed(3) + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(m.x, m.y);
                        ctx.stroke();
                    }
                }
            }
            for (var k = 0; k < nodes.length; k++) {
                var p = nodes[k];
                ctx.fillStyle = p.gold ? 'rgba(244, 196, 48, 0.8)' : 'rgba(125, 152, 224, 0.55)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            requestAnimationFrame(step);
        }

        resize();
        seed();
        window.addEventListener('resize', function () { resize(); seed(); });

        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var wasRunning = running;
                running = entry.isIntersecting;
                if (running && !wasRunning) requestAnimationFrame(step);
            });
        }, { threshold: 0 }).observe(canvas);
    }
    window.E86Particles2D = startParticles2D;

    if (!motion) return;

    /* ═════════════════ Shared motion utilities (both modes) ═════ */

    /* Animated counters */
    function startCount(el) {
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        var target = parseFloat(el.getAttribute('data-count'));
        if (isNaN(target)) return;
        var decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10);
        var prefix = el.getAttribute('data-count-prefix') || '';
        var suffix = el.getAttribute('data-count-suffix') || '';
        var dur = parseInt(el.getAttribute('data-count-duration') || '1800', 10);
        var start = null;
        function frame(ts) {
            if (start === null) start = ts;
            var t = Math.min(1, (ts - start) / dur);
            var eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
            var val = target * eased;
            el.textContent = prefix + val.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }) + suffix;
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
    var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                startCount(entry.target);
                countObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count]').forEach(function (el) {
        countObserver.observe(el);
    });

    /* Animated bars — inline widths are the no-JS fallback; zero them
       so the fill can animate in (CSS transition exists in both modes). */
    function startBar(el) {
        if (el.dataset.barred) return;
        el.dataset.barred = '1';
        var w = el.getAttribute('data-bar');
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { el.style.width = w + '%'; });
        });
    }
    document.querySelectorAll('.e86-bar[data-bar]').forEach(function (el) {
        el.style.width = '0%';
    });
    var barObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                startBar(entry.target);
                barObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('.e86-bar[data-bar]').forEach(function (el) {
        barObserver.observe(el);
    });

    /* 3D tilt cards — transform applied inline only while hovered */
    document.querySelectorAll('.e86-tilt').forEach(function (card) {
        var rect = null;
        card.addEventListener('pointerenter', function () {
            rect = card.getBoundingClientRect();
        });
        card.addEventListener('pointermove', function (e) {
            if (!rect) rect = card.getBoundingClientRect();
            var px = (e.clientX - rect.left) / rect.width - 0.5;
            var py = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = 'perspective(900px) rotateX(' + (py * -7).toFixed(2) +
                'deg) rotateY(' + (px * 7).toFixed(2) + 'deg) translateY(-4px)';
        });
        card.addEventListener('pointerleave', function () {
            card.style.transform = '';
            rect = null;
        });
    });

    /* Magnetic CTAs */
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
        btn.addEventListener('pointermove', function (e) {
            var r = btn.getBoundingClientRect();
            var x = (e.clientX - r.left - r.width / 2) * 0.18;
            var y = (e.clientY - r.top - r.height / 2) * 0.3;
            btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        });
        btn.addEventListener('pointerleave', function () {
            btn.style.transform = '';
        });
    });

    /* ═════════════════ CSS fallback motion (no GSAP) ═════════════ */
    if (!animOn) return;
    docEl.classList.add('e86-anim');

    /* Auto-tag scroll reveals */
    function tag(el, kind, delay) {
        if (el.hasAttribute('data-reveal') || el.closest('[data-reveal]') || el.closest('[data-no-reveal]')) return;
        if (el.offsetParent === null) return; // hidden (e.g. display:none success panels) — leave untouched
        el.setAttribute('data-reveal', kind || 'up');
        if (delay) el.setAttribute('data-delay', String(delay));
    }

    function autoTag() {
        var main = document.querySelector('main');
        if (!main || main.hasAttribute('data-no-autoreveal')) return;

        main.querySelectorAll('section h2').forEach(function (h) {
            tag(h, 'up');
            var next = h.nextElementSibling;
            if (next && next.tagName === 'P') tag(next, 'up', 120);
            var prev = h.previousElementSibling;
            if (prev && prev.tagName !== 'SECTION' && prev.children.length < 8 && !prev.querySelector('h1,h2,h3')) {
                tag(prev, 'up');
            }
        });

        main.querySelectorAll('.grid').forEach(function (grid) {
            var i = 0;
            Array.prototype.forEach.call(grid.children, function (child) {
                if (child.querySelector && child.querySelector('.grid')) return; // inner grid handles itself
                tag(child, 'up', (i % 9) * 80);
                i++;
            });
        });

        main.querySelectorAll('.space-y-3, .space-y-4').forEach(function (stack) {
            if (stack.closest('[data-reveal]')) return;
            var i = 0;
            Array.prototype.forEach.call(stack.children, function (child) {
                tag(child, 'up', (i % 8) * 90);
                i++;
            });
        });

        main.querySelectorAll('.glass-panel, .tool-card').forEach(function (p) {
            tag(p, 'up');
        });
    }
    autoTag();

    /* Reveal observer */
    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
            if (delay) el.style.transitionDelay = delay + 'ms';
            el.classList.add('is-in');
            revealObserver.unobserve(el);
            el.querySelectorAll('.e86-bar[data-bar]').forEach(startBar);
            el.querySelectorAll('[data-count]').forEach(startCount);
            if (el.hasAttribute('data-bar')) startBar(el);
            if (el.hasAttribute('data-count')) startCount(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
        revealObserver.observe(el);
    });

    /* Line-draw elements */
    var lineObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                lineObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    document.querySelectorAll('.e86-line-draw, .e86-line-draw-v').forEach(function (el) {
        lineObserver.observe(el);
    });

    /* Scroll parallax */
    var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (parallaxEls.length) {
        var pTicking = false;
        function updateParallax() {
            var vh = window.innerHeight;
            parallaxEls.forEach(function (el) {
                var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
                var r = el.getBoundingClientRect();
                if (r.bottom < -200 || r.top > vh + 200) return;
                var offset = (r.top + r.height / 2 - vh / 2) * -speed;
                el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
            });
            pTicking = false;
        }
        window.addEventListener('scroll', function () {
            if (!pTicking) { pTicking = true; requestAnimationFrame(updateParallax); }
        }, { passive: true });
        updateParallax();
    }

    /* Hero particles (2D fallback renderer) */
    startParticles2D(document.getElementById('hero-canvas'));
})();
