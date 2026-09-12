// Dashboard-only interactions: staggered entrance animation, tap ripple
// feedback, swipe-to-navigate between sections, pull-to-refresh, and
// swipeable "pin to top" section cards. Only index.html loads this file,
// so nothing here runs on any other page.
(function () {
    const PIN_KEY = 'farmhub_pinned_features';
    const OPEN_OFFSET = -76;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function loadPinned() {
        try {
            return JSON.parse(localStorage.getItem(PIN_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function savePinned(pinned) {
        localStorage.setItem(PIN_KEY, JSON.stringify(pinned));
    }

    function setPinBtnFocusable(wrap, focusable) {
        const btn = wrap.querySelector('.fh-pin-btn');
        if (btn) {
            btn.tabIndex = focusable ? 0 : -1;
        }
    }

    function closeSwipe(wrap) {
        const card = wrap.querySelector('.fh-card');
        wrap.classList.remove('fh-swiped-open');
        setPinBtnFocusable(wrap, false);
        if (card) {
            card.style.transform = '';
        }
    }

    function wireSwipe(wrap, card) {
        let startX = 0;
        let startY = 0;
        let baseX = 0;
        let dragging = false;
        let axisLocked = null;
        const isOpen = () => wrap.classList.contains('fh-swiped-open');

        card.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            baseX = isOpen() ? OPEN_OFFSET : 0;
            dragging = true;
            axisLocked = null;
            card.dataset.dragged = 'false';
            card.style.transition = 'none';
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!dragging) {
                return;
            }
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;

            if (axisLocked === null) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
                    return;
                }
                axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }
            if (axisLocked === 'y') {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            let next = baseX + dx;
            next = Math.max(OPEN_OFFSET - 24, Math.min(0, next));
            card.style.transform = `translateX(${next}px)`;
            card.dataset.dragged = Math.abs(dx) > 8 ? 'true' : 'false';
        }, { passive: false });

        card.addEventListener('touchend', (e) => {
            if (!dragging) {
                return;
            }
            dragging = false;
            card.style.transition = '';
            if (axisLocked === 'x') {
                e.stopPropagation();
                const match = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(card.style.transform || '');
                const value = match ? parseFloat(match[1]) : 0;
                if (value < OPEN_OFFSET / 2) {
                    wrap.classList.add('fh-swiped-open');
                    setPinBtnFocusable(wrap, true);
                    card.style.transform = `translateX(${OPEN_OFFSET}px)`;
                } else {
                    wrap.classList.remove('fh-swiped-open');
                    setPinBtnFocusable(wrap, false);
                    card.style.transform = '';
                }
            }
            axisLocked = null;
        });

        card.addEventListener('click', (e) => {
            if (card.dataset.dragged === 'true' || isOpen()) {
                e.preventDefault();
                card.dataset.dragged = 'false';
                if (isOpen()) {
                    closeSwipe(wrap);
                }
            }
        });
    }

    function initPins() {
        const grid = document.getElementById('fhCardGrid');
        if (!grid) {
            return;
        }
        const wraps = Array.from(grid.querySelectorAll('.fh-card-wrap'));

        function applyOrder() {
            const pinned = loadPinned();
            wraps
                .slice()
                .sort((a, b) => {
                    const aPinned = pinned.includes(a.dataset.feature) ? 0 : 1;
                    const bPinned = pinned.includes(b.dataset.feature) ? 0 : 1;
                    return aPinned - bPinned;
                })
                .forEach((el) => grid.appendChild(el));

            wraps.forEach((el) => {
                const isPinned = pinned.includes(el.dataset.feature);
                const btn = el.querySelector('.fh-pin-btn');
                const star = el.querySelector('.fh-pin-star');
                if (btn) {
                    btn.classList.toggle('fh-pinned', isPinned);
                    btn.setAttribute('aria-pressed', String(isPinned));
                }
                if (star) {
                    star.classList.toggle('hidden', !isPinned);
                }
            });
        }

        wraps.forEach((wrap) => {
            const key = wrap.dataset.feature;
            const btn = wrap.querySelector('.fh-pin-btn');
            const card = wrap.querySelector('.fh-card');
            if (!btn || !card) {
                return;
            }

            btn.addEventListener('click', () => {
                const pinned = loadPinned();
                const idx = pinned.indexOf(key);
                if (idx === -1) {
                    pinned.push(key);
                } else {
                    pinned.splice(idx, 1);
                }
                savePinned(pinned);
                closeSwipe(wrap);
                applyOrder();
            });

            wireSwipe(wrap, card);
        });

        applyOrder();
    }

    function initEntrance() {
        const items = document.querySelectorAll('.fh-animate-in');
        if (prefersReducedMotion) {
            items.forEach((el) => el.classList.add('fh-visible'));
            return;
        }
        items.forEach((el, i) => {
            el.style.transitionDelay = `${Math.min(i * 60, 360)}ms`;
        });
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                items.forEach((el) => el.classList.add('fh-visible'));
            });
        });
    }

    function initRipple() {
        document.querySelectorAll('.fh-ripple').forEach((el) => {
            el.addEventListener('pointerdown', (e) => {
                const rect = el.getBoundingClientRect();
                const span = document.createElement('span');
                span.className = 'fh-ripple-dot';
                const size = Math.max(rect.width, rect.height) * 1.6;
                span.style.width = `${size}px`;
                span.style.height = `${size}px`;
                span.style.left = `${e.clientX - rect.left - size / 2}px`;
                span.style.top = `${e.clientY - rect.top - size / 2}px`;
                el.appendChild(span);
                span.addEventListener('animationend', () => span.remove());
            });
        });
    }

    function initSwipeNav() {
        const main = document.querySelector('main');
        if (!main || typeof FarmHubAuth === 'undefined') {
            return;
        }
        const pages = ['index.html'].concat(
            FarmHubAuth.FEATURES.filter((f) => FarmHubAuth.hasFeature(f.key)).map((f) => f.page)
        );
        if (pages.length < 2) {
            return;
        }

        let startX = 0;
        let startY = 0;
        let tracking = false;

        main.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) {
                return;
            }
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            tracking = true;
        }, { passive: true });

        main.addEventListener('touchend', (e) => {
            if (!tracking) {
                return;
            }
            tracking = false;
            const t = e.changedTouches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) {
                return;
            }
            const nextIndex = dx < 0 ? 1 % pages.length : (pages.length - 1) % pages.length;
            window.location.href = pages[nextIndex];
        }, { passive: true });
    }

    function initPullToRefresh() {
        const indicator = document.createElement('div');
        indicator.className = 'fh-ptr-indicator';
        indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0014.5 3.5M19.5 9A8 8 0 005 5.5"/></svg>';
        document.body.appendChild(indicator);

        const THRESHOLD = 72;
        let startX = 0;
        let startY = 0;
        let pulling = false;
        let verticalPull = false;

        window.addEventListener('touchstart', (e) => {
            if (window.scrollY > 0 || e.touches.length !== 1) {
                return;
            }
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            pulling = true;
            verticalPull = false;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!pulling) {
                return;
            }
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;

            if (!verticalPull) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    pulling = false;
                    return;
                }
                if (dy <= 0) {
                    return;
                }
                verticalPull = true;
            }

            const damped = Math.min(THRESHOLD * 1.4, Math.sqrt(Math.max(dy, 0)) * 8);
            indicator.style.opacity = String(Math.min(1, damped / THRESHOLD));
            indicator.style.transform = `translateY(${damped}%) translateX(-50%) rotate(${damped * 3}deg)`;
            indicator.classList.toggle('fh-ptr-ready', damped >= THRESHOLD);
        }, { passive: true });

        window.addEventListener('touchend', () => {
            if (!pulling || !verticalPull) {
                pulling = false;
                return;
            }
            pulling = false;
            if (indicator.classList.contains('fh-ptr-ready')) {
                indicator.classList.add('fh-ptr-spinning');
                indicator.style.transform = 'translateY(100%) translateX(-50%)';
                indicator.style.opacity = '1';
                setTimeout(() => window.location.reload(), 500);
            } else {
                indicator.style.opacity = '0';
                indicator.style.transform = 'translateY(-100%) translateX(-50%)';
            }
        }, { passive: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initEntrance();
        initRipple();
        initPins();
        initSwipeNav();
        initPullToRefresh();
    });
})();
