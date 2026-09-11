// Registers the service worker and wires up the "Install App" button using
// the standard beforeinstallprompt flow (Chrome/Edge/Android). Browsers that
// don't support it (Safari/iOS) simply never show the button.
(function () {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch((err) => {
                console.error('Service worker registration failed:', err);
            });
        });
    }

    let deferredPrompt = null;

    function initInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (!installBtn) {
            return;
        }

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event;
            installBtn.classList.remove('hidden');
        });

        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                return;
            }
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInstallButton);
    } else {
        initInstallButton();
    }
})();
