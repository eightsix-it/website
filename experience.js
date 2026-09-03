/* ════════════════════════════════════════════════════════════════
   Eight Six IT Engineering — cinematic experience layer
   GSAP + ScrollTrigger + Lenis + Three.js (hero only).
   Progressive enhancement: if this file (or the GSAP CDN) doesn't
   run, site.js provides the CSS-based fallback. Honors
   prefers-reduced-motion by never initializing.
   ════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    var docEl = document.documentElement;

    /* ───────────────────────────── Lenis smooth scrolling ── */
    var lenis = null;
    if (typeof window.Lenis !== 'undefined') {
        lenis = new window.Lenis({ lerp: 0.105, smoothWheel: true });
        window.E86_LENIS = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
        docEl.classList.add('e86-lenis');
    }

    /* Same-page anchors glide via Lenis */
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -92, duration: 1.2 });
        else target.scrollIntoView({ behavior: 'smooth' });
    });

    /* ───────────────────────────── Split text into masked words ── */
    function splitWords(el) {
        if (!el || el.dataset.split) return [];
        el.dataset.split = '1';
        var words = [];
        var shimmerSpans = Array.prototype.slice.call(el.querySelectorAll('.e86-shimmer'));
        (function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (child) {
                if (child.nodeType === 3) {
                    if (!child.textContent.trim()) return;
                    var frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        var mask = document.createElement('span');
                        mask.className = 'e86-word-mask';
                        var w = document.createElement('span');
                        w.className = 'e86-word';
                        w.textContent = part;
                        if (child.parentElement && child.parentElement.closest('.e86-shimmer')) {
                            w.classList.add('e86-shimmer');
                        }
                        mask.appendChild(w);
                        frag.appendChild(mask);
                        words.push(w);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1 && !child.classList.contains('e86-word-mask')) {
                    walk(child);
                }
            });
        })(el);
        // background-clip:text breaks across nested inline-blocks —
        // the word spans carry the class now, so drop it on the wrapper
        shimmerSpans.forEach(function (s) { s.classList.remove('e86-shimmer'); });
        return words;
    }

    /* ───────────────────────────── Hero entrance ── */
    var heroWrap = document.querySelector('.hero-stagger');
    var heroItems = []; // [{el, words|null}]
    if (heroWrap) {
        Array.prototype.slice.call(heroWrap.children).forEach(function (child) {
            if (child.tagName === 'H1') {
                var w = splitWords(child);
                gsap.set(w, { yPercent: 115 });
                heroItems.push({ el: child, words: w });
            } else {
                gsap.set(child, { autoAlpha: 0, y: 28 });
                heroItems.push({ el: child, words: null });
            }
        });
    }

    var entered = false;
    function pageEnter() {
        if (entered) return;
        entered = true;
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        var pos = 0;
        heroItems.forEach(function (item) {
            if (item.words) {
                tl.to(item.words, { yPercent: 0, duration: 1.15, stagger: 0.045, ease: 'power4.out' }, pos);
                pos += 0.3;
            } else {
                tl.to(item.el, { autoAlpha: 1, y: 0, duration: 0.9, clearProps: 'transform' }, pos);
                pos += 0.1;
            }
        });
    }

    /* ───────────────────────────── Hero entrance ──
       No preloader and no page-transition curtain: a marketing site should
       paint as soon as it can, and internal links navigate natively. */
    pageEnter();

    /* ───────────────────────────── Headline word reveals on scroll ── */
    document.querySelectorAll('main h2').forEach(function (h) {
        if (h.closest('.hero-stagger') || h.querySelector('.underline')) return;
        h.removeAttribute('data-reveal'); // words replace the block reveal
        var words = splitWords(h);
        if (!words.length) return;
        gsap.set(words, { yPercent: 115 });
        gsap.to(words, {
            yPercent: 0, duration: 1.05, stagger: 0.04, ease: 'power4.out',
            scrollTrigger: { trigger: h, start: 'top 88%', once: true }
        });
    });

    /* ───────────────────────────── Generic scroll reveals ──
       Mirrors site.js auto-tagging so all pages animate, then lets
       GSAP own the motion. Explicit data-reveal attributes win. */
    function tag(el, kind, delay) {
        if (el.hasAttribute('data-reveal') || el.closest('[data-reveal]') || el.closest('[data-no-reveal]')) return;
        if (el.offsetParent === null) return;
        el.setAttribute('data-reveal', kind || 'up');
        if (delay) el.setAttribute('data-delay', String(delay));
    }
    (function autoTag() {
        var main = document.querySelector('main');
        if (!main) return;
        main.querySelectorAll('section h2').forEach(function (h) {
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
                if (child.querySelector && child.querySelector('.grid')) return;
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
        main.querySelectorAll('.glass-panel, .tool-card').forEach(function (p) { tag(p, 'up'); });
    })();

    var FROM = {
        up:    { autoAlpha: 0, y: 46 },
        down:  { autoAlpha: 0, y: -46 },
        left:  { autoAlpha: 0, x: -60 },
        right: { autoAlpha: 0, x: 60 },
        scale: { autoAlpha: 0, scale: 0.9 },
        blur:  { autoAlpha: 0, y: 30, filter: 'blur(10px)' }
    };
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        if (el.closest('[data-pin]') || el.closest('.hero-stagger')) return;
        var kind = el.getAttribute('data-reveal') || 'up';
        var from = FROM[kind] || FROM.up;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10) / 1000;
        gsap.set(el, from);
        var to = {
            autoAlpha: 1, x: 0, y: 0, scale: 1,
            duration: 1.15, delay: delay, ease: 'power3.out',
            clearProps: 'transform,filter',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        };
        if (kind === 'blur') to.filter = 'blur(0px)';
        gsap.to(el, to);
    });

    /* ───────────────────────────── Scrubbed parallax orbs ── */
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        gsap.fromTo(el, { y: speed * 220 }, {
            y: -speed * 220, ease: 'none',
            scrollTrigger: {
                trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.1
            }
        });
    });

    /* Scroll cue fades away as soon as the journey starts */
    var cue = document.querySelector('.e86-scroll-cue');
    if (cue) {
        gsap.to(cue, {
            autoAlpha: 0, ease: 'none',
            scrollTrigger: { start: 30, end: 220, scrub: true }
        });
    }

    /* ───────────────────────────── Velocity-reactive marquee ── */
    var tracks = gsap.utils.toArray('.e86-marquee-track');
    if (tracks.length) {
        var wrapX = gsap.utils.wrap(-50, 0);
        var marqueePos = 0;
        var lastY = window.scrollY;
        var skewTo = tracks.map(function (t) {
            return gsap.quickTo(t, 'skewX', { duration: 0.4, ease: 'power2.out' });
        });
        gsap.ticker.add(function (time, deltaMS) {
            var dt = Math.min(deltaMS / 1000, 0.05);
            var y = window.scrollY;
            var vel = (y - lastY) / Math.max(dt, 0.001);
            lastY = y;
            var speed = 2.1 + Math.min(Math.abs(vel) * 0.007, 13);
            marqueePos = wrapX(marqueePos - speed * dt);
            var skew = gsap.utils.clamp(-9, 9, vel * 0.004);
            tracks.forEach(function (t, i) {
                gsap.set(t, { xPercent: marqueePos });
                skewTo[i](skew);
            });
        });
    }

    /* ───────────────────────────── Pinned "How We Work" timeline ── */
    var pinSec = document.querySelector('[data-pin="steps"]');
    if (pinSec) {
        var mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', function () {
            var line = pinSec.querySelector('.e86-line-draw');
            var steps = gsap.utils.toArray(pinSec.querySelectorAll('.e86-step'));
            if (!steps.length) return;
            gsap.set(steps, { autoAlpha: 0, y: 80 });
            if (line) gsap.set(line, { scaleX: 0, transformOrigin: '0 50%' });
            var tl = gsap.timeline({
                scrollTrigger: {
                    trigger: pinSec, start: 'top top', end: '+=150%',
                    pin: true, scrub: 0.7, anticipatePin: 1
                }
            });
            if (line) tl.to(line, { scaleX: 1, ease: 'none', duration: steps.length }, 0.25);
            steps.forEach(function (s, i) {
                tl.to(s, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out' }, i + 0.05);
                var node = s.querySelector('.e86-step-node');
                if (node) {
                    tl.from(node, { scale: 0.3, rotate: -90, duration: 0.6, ease: 'back.out(2.2)' }, i + 0.1);
                }
            });
            return function () {
                gsap.set(steps, { clearProps: 'all' });
                if (line) gsap.set(line, { clearProps: 'all' });
            };
        });
        mm.add('(max-width: 1023px)', function () {
            var steps = gsap.utils.toArray(pinSec.querySelectorAll('.e86-step'));
            steps.forEach(function (s, i) {
                gsap.fromTo(s, { autoAlpha: 0, y: 44 }, {
                    autoAlpha: 1, y: 0, duration: 0.9, delay: (i % 4) * 0.12, ease: 'power3.out',
                    clearProps: 'transform',
                    scrollTrigger: { trigger: s, start: 'top 90%', once: true }
                });
            });
            return function () { gsap.set(steps, { clearProps: 'all' }); };
        });
    }

    /* FAQ height changes shift everything below — keep triggers honest */
    document.querySelectorAll('.e86-faq-q').forEach(function (q) {
        q.addEventListener('click', function () {
            setTimeout(function () { ScrollTrigger.refresh(); }, 500);
        });
    });

    /* ───────────────────────────── Custom cursor ── */
    if (window.matchMedia('(pointer: fine)').matches) {
        var dot = document.createElement('div');
        dot.className = 'e86-cursor-dot';
        var ring = document.createElement('div');
        ring.className = 'e86-cursor-ring';
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
        var dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' });
        var dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' });
        var ringX = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3.out' });
        var ringY = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3.out' });
        var cursorOn = false;
        window.addEventListener('pointermove', function (e) {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            if (!cursorOn) { cursorOn = true; docEl.classList.add('e86-cursor-active'); }
            dotX(e.clientX); dotY(e.clientY);
            ringX(e.clientX); ringY(e.clientY);
            var interactive = e.target.closest &&
                e.target.closest('a, button, input, select, textarea, label, [data-cursor], .e86-faq-q');
            ring.classList.toggle('is-link', !!interactive);
        }, { passive: true });
        document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
        document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
        docEl.addEventListener('mouseleave', function () {
            cursorOn = false;
            docEl.classList.remove('e86-cursor-active');
        });
    }

    /* ───────────────────────────── Three.js hero scene ── */
    var heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
        var webglOK = (function () {
            try {
                var c = document.createElement('canvas');
                return !!(window.WebGLRenderingContext &&
                    (c.getContext('webgl') || c.getContext('experimental-webgl')));
            } catch (e) { return false; }
        })();
        var fallback2D = function () {
            if (window.E86Particles2D) window.E86Particles2D(heroCanvas);
        };
        // The WebGL scene costs a 594 KB library plus a live render loop. It is
        // decoration, and the 2D canvas fallback reads almost identically, so
        // only devices that can absorb the cost get it.
        var canAffordWebGL = (function () {
            try {
                if (window.matchMedia && !window.matchMedia('(min-width: 1024px)').matches) return false;
                var conn = navigator.connection;
                if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return false;
                if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4) return false;
                if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency < 4) return false;
                return true;
            } catch (e) { return false; }
        })();
        // Ambient particles are decoration. Phones keep the static hero — its
        // armor texture and gradients carry the look — because a continuous
        // canvas loop is main-thread time they cannot spare.
        var wantsAmbient = !window.matchMedia || window.matchMedia('(min-width: 768px)').matches;
        if (!webglOK || !canAffordWebGL) {
            if (wantsAmbient) fallback2D();
        } else {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
            s.onload = function () {
                try { initHero3D(heroCanvas); } catch (e) { fallback2D(); }
            };
            s.onerror = fallback2D;
            document.head.appendChild(s);
        }
    }

    function initHero3D(canvas) {
        var THREE = window.THREE;
        var wrap = canvas.parentElement;
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 7.5;

        var group = new THREE.Group();
        group.position.y = 0.15;
        scene.add(group);

        // Wireframe shield + golden core — pushed deep and dimmed so it
        // reads as ambient texture and never competes with the headline
        var shieldGroup = new THREE.Group();
        shieldGroup.position.set(0, -1.1, -3.2);
        var shield = new THREE.Mesh(
            new THREE.IcosahedronGeometry(2.25, 1),
            new THREE.MeshBasicMaterial({ color: 0x4f6fc4, wireframe: true, transparent: true, opacity: 0.13 })
        );
        var core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.15, 1),
            new THREE.MeshBasicMaterial({ color: 0xf4c430, wireframe: true, transparent: true, opacity: 0.06 })
        );
        shieldGroup.add(shield);
        shieldGroup.add(core);
        group.add(shieldGroup);

        // Soft round glow sprite so points don't render as hard squares
        var sprite = (function () {
            var c = document.createElement('canvas');
            c.width = c.height = 64;
            var g = c.getContext('2d');
            var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(c);
        })();

        function makePoints(count, color, size, rMin, rMax, opacity) {
            var arr = new Float32Array(count * 3);
            for (var i = 0; i < count; i++) {
                var r = rMin + Math.random() * (rMax - rMin);
                var theta = Math.random() * Math.PI * 2;
                var phi = Math.acos(2 * Math.random() - 1);
                arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
                arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
                arr[i * 3 + 2] = r * Math.cos(phi);
            }
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
            return new THREE.Points(geo, new THREE.PointsMaterial({
                color: color, size: size, transparent: true, opacity: opacity,
                sizeAttenuation: true, depthWrite: false,
                map: sprite, blending: THREE.AdditiveBlending
            }));
        }
        var dustBlue = makePoints(620, 0x7d98e0, 0.06, 3.3, 6.4, 0.65);
        var dustGold = makePoints(70, 0xf4c430, 0.09, 3.4, 6.0, 0.8);
        group.add(dustBlue);
        group.add(dustGold);

        // Pointer parallax + scroll-driven motion
        var tx = 0, ty = 0, mx = 0, my = 0, prog = 0;
        window.addEventListener('pointermove', function (e) {
            tx = e.clientX / window.innerWidth - 0.5;
            ty = e.clientY / window.innerHeight - 0.5;
        }, { passive: true });
        ScrollTrigger.create({
            trigger: wrap, start: 'top top', end: 'bottom top', scrub: true,
            onUpdate: function (self) { prog = self.progress; }
        });

        function resize() {
            var w = wrap.clientWidth, h = wrap.clientHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener('resize', resize);

        var running = true;
        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) { running = entry.isIntersecting; });
        }, { threshold: 0 }).observe(wrap);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) running = false;
            else running = true;
        });

        function loop(t) {
            requestAnimationFrame(loop);
            if (!running) return;
            mx += (tx - mx) * 0.045;
            my += (ty - my) * 0.045;
            group.rotation.y = t * 0.00006 + mx * 0.55 + prog * 1.1;
            group.rotation.x = my * 0.35 + prog * 0.45;
            group.position.y = 0.15 - prog * 1.3;
            shield.rotation.z = t * 0.00004;
            core.rotation.y = -t * 0.00012;
            dustBlue.rotation.y = -t * 0.000028;
            dustGold.rotation.y = t * 0.00004;
            camera.position.z = 7.5 + prog * 1.7;
            canvas.style.opacity = String(1 - prog * 0.85);
            renderer.render(scene, camera);
        }
        requestAnimationFrame(loop);
    }

    /* Recalculate trigger positions once everything (images) settles */
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
