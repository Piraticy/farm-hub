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

    // Every CRUD page's edit/delete modal (#editModal / #deleteModal) only
    // closed via its own Cancel/X button -- clicking the dimmed backdrop
    // around the card, or pressing Escape, did nothing, unlike every other
    // dismissible overlay in the app (the mobile nav dropdown supports
    // both). `cancelBtn` is whichever button the page already wires to
    // close this modal, so this reuses its exact existing side effects
    // (e.g. crops.html resetting docIdToDelete) instead of duplicating
    // them here.
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
    }

    return { escapeHtml, loadJsonArray, toCsvField, wireModalDismiss };
})();
