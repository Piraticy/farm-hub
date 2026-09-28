// Shared helper for safely interpolating user-entered data into innerHTML
// template strings. Every page builds its table rows this way, and every
// field in those rows (names, notes, addresses, ...) is free-text a user
// typed into a form -- without escaping, a value like `<img src=x onerror=...>`
// saved to localStorage would execute as markup the next time the table renders.
const FarmHubUtil = (function () {
    const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
    }

    // Every page's localStorage-backed list (crops, animals, employees, ...)
    // is loaded this same way. Corrupted or manually-edited localStorage
    // content would otherwise throw from a bare JSON.parse and take down
    // the whole page's script before anything renders.
    function loadJsonArray(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    // Every page's CSV export wraps each field in a literal `"..."` without
    // escaping quote characters inside it -- a value like `24" hose pipe`
    // closes the quoted field early, so anything after the embedded quote
    // spills into the next column when opened in Excel/Sheets. Per RFC 4180,
    // a literal quote inside a quoted field is escaped by doubling it.
    function toCsvField(value) {
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }

    // Excludes input[type="hidden"] -- every edit modal's first field is a
    // hidden id input (e.g. #editCropId), which matches "input:not([disabled])"
    // but can never actually receive focus; without this exclusion the
    // "focus the first focusable element" step below silently does nothing.
    const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Every CRUD page's edit/delete modal (#editModal / #deleteModal) only
    // closed via its own Cancel/X button -- clicking the dimmed backdrop
    // around the card, or pressing Escape, did nothing, unlike every other
    // dismissible overlay in the app (the mobile nav dropdown supports
    // both). `cancelBtn` is whichever button the page already wires to
    // close this modal, so this reuses its exact existing side effects
    // (e.g. crops.html resetting docIdToDelete) instead of duplicating
    // them here.
    //
    // It also traps keyboard focus inside the modal while it's open --
    // without this, Tab walked straight through into the table
    // underneath, which is only hidden visually (opacity/invisible),
    // not actually removed from the tab order -- and returns focus to
    // whatever triggered the modal once it closes. (If that trigger no
    // longer exists, e.g. its row was just deleted or re-rendered,
    // focusing it is a silent no-op; that's an acceptable fallback to
    // the browser's default next focus target, not a crash.)
    function wireModalDismiss(modal, cancelBtn) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cancelBtn.click();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('invisible')) {
                cancelBtn.click();
            }
        });

        let previouslyFocused = null;
        new MutationObserver(() => {
            const isOpen = !modal.classList.contains('invisible');
            if (isOpen && document.activeElement && !modal.contains(document.activeElement)) {
                previouslyFocused = document.activeElement;
                // Focusing the target right as the modal's own visibility
                // class is removed silently fails -- the click that opened
                // the modal keeps its own focus for a short moment after
                // the event handler returns, so a same-tick (or even
                // same-frame) focus() call gets reverted once that
                // settles. A short delay clears it reliably without being
                // perceptible to the person opening the modal.
                setTimeout(() => {
                    const first = modal.querySelector(FOCUSABLE_SELECTOR);
                    if (first) {
                        first.focus();
                    }
                }, 60);
            } else if (!isOpen && previouslyFocused) {
                previouslyFocused.focus();
                previouslyFocused = null;
            }
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });

        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') {
                return;
            }
            const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
            if (focusable.length === 0) {
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
    }

    return { escapeHtml, loadJsonArray, toCsvField, wireModalDismiss };
})();
