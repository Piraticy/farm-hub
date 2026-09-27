// Shared FarmHub header behavior: the dark-mode toggle (persisted in
// localStorage, applied on every page with a #themeToggle button and
// #moon-icon/#sun-icon children) and the mobile nav menu toggle (every
// page's #navToggleBtn / #fhNavTabs pair -- collapsed by default below
// the sm breakpoint per theme.css, expanded by adding .fh-nav-open).
(function () {
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        var moon = document.getElementById('moon-icon');
        var sun = document.getElementById('sun-icon');
        if (moon && sun) {
            moon.classList.toggle('hidden', theme === 'dark');
            sun.classList.toggle('hidden', theme !== 'dark');
        }
    }

    function initTheme() {
        applyTheme(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

        var toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                var next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
                applyTheme(next);
                localStorage.setItem('theme', next);
            });
        }
    }

    function initNavToggle() {
        var btn = document.getElementById('navToggleBtn');
        var nav = document.getElementById('fhNavTabs');
        if (!btn || !nav) {
            return;
        }

        function setOpen(open) {
            nav.classList.toggle('fh-nav-open', open);
            btn.setAttribute('aria-expanded', String(open));
        }

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            setOpen(!nav.classList.contains('fh-nav-open'));
        });

        // Collapse again once a link is actually followed, so coming
        // back (or a same-page reload) doesn't leave it stuck open.
        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                setOpen(false);
            }
        });

        // Standard dropdown/menu expectations: dismiss on Escape, and
        // on any click outside the menu and its toggle button.
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        });
        document.addEventListener('click', function (e) {
            if (!nav.contains(e.target) && e.target !== btn) {
                setOpen(false);
            }
        });

        // A resize past the breakpoint (e.g. rotating to landscape,
        // or a desktop window growing) shouldn't leave the collapsed
        // state's aria-expanded=false lying about a now-always-visible
        // menu, nor leave .fh-nav-open lingering if the window later
        // shrinks back below the breakpoint.
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 640) {
                setOpen(false);
            }
        });
    }

    function init() {
        initTheme();
        initNavToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
