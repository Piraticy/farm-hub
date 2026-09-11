// Shared FarmHub dark-mode toggle. Persists the choice in localStorage
// and applies it on every page that includes this script and has a
// #themeToggle button with #moon-icon / #sun-icon children.
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
})();
