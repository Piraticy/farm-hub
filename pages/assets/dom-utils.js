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

    // Mirrors the dashboard's existing swipe-to-pin gesture (same
    // axis-lock/threshold/offset mechanics) but for the mobile stacked-
    // list row layout, and adds two more row gestures on top of it:
    //   - swipe left reveals both a blue "Edit" and a red "Delete"
    //     action side by side behind the row (a single direction, not
    //     mirrored to swipe-right: each row's data-label/value pair is
    //     a space-between flex row, value flush to the right edge --
    //     shifting content that only ever REVEALS more room to its own
    //     right, i.e. left, keeps the value on-screen the whole time;
    //     shifting it the other way pushes that same value straight
    //     past the row's clipped right edge into nothing).
    //   - a long-press (no swipe) on the row jumps straight to Edit
    // Both trigger the row's own existing .delete-btn/.edit-btn (so
    // they go through the exact same confirmation modal / edit form as
    // the always-visible icons, never a shortcut around them). Desktop
    // keeps the plain table with its always-visible icons -- this only
    // wires up below the sm breakpoint, where .fh-responsive-table turns
    // each row into a swipeable block.
    function wireSwipeRowActions(tbody) {
        if (!tbody || !window.matchMedia('(max-width: 639px)').matches) {
            return;
        }

        const OPEN_OFFSET = -168;
        const LONG_PRESS_MS = 550;
        let activeRow = null;
        let startX = 0;
        let startY = 0;
        let baseX = 0;
        let axisLocked = null;
        let dragged = false;
        let longPressTimer = null;
        let longPressFired = false;

        // The row's own td's start as direct children of <tr> (needed for
        // the plain desktop table markup); wrapping them the first time a
        // row is actually touched -- rather than up front for every row --
        // means this never has to re-run after a re-render, since a freshly
        // rendered <tr> just gets wrapped again on its own first touch.
        function ensureWrapped(tr) {
            let content = tr.querySelector(':scope > .fh-row-content');
            if (content) {
                return content;
            }
            content = document.createElement('div');
            content.className = 'fh-row-content';
            while (tr.firstChild) {
                content.appendChild(tr.firstChild);
            }
            const editAction = document.createElement('button');
            editAction.type = 'button';
            editAction.className = 'fh-swipe-action fh-swipe-action-edit';
            editAction.textContent = 'Edit';
            editAction.tabIndex = -1;
            editAction.setAttribute('aria-label', 'Edit');

            const deleteAction = document.createElement('button');
            deleteAction.type = 'button';
            deleteAction.className = 'fh-swipe-action fh-swipe-action-delete';
            deleteAction.textContent = 'Delete';
            deleteAction.tabIndex = -1;
            deleteAction.setAttribute('aria-label', 'Delete');

            tr.appendChild(editAction);
            tr.appendChild(deleteAction);
            tr.appendChild(content);
            return content;
        }

        function isOpenRow(tr) {
            return tr.classList.contains('fh-swiped-open');
        }

        function currentOffset(tr) {
            return isOpenRow(tr) ? OPEN_OFFSET : 0;
        }

        function closeRow(tr) {
            const content = tr.querySelector(':scope > .fh-row-content');
            const editAction = tr.querySelector(':scope > .fh-swipe-action-edit');
            const deleteAction = tr.querySelector(':scope > .fh-swipe-action-delete');
            tr.classList.remove('fh-swiped-open');
            if (content) {
                content.style.transform = '';
            }
            if (editAction) {
                editAction.tabIndex = -1;
            }
            if (deleteAction) {
                deleteAction.tabIndex = -1;
            }
        }

        function closeAllExcept(exceptTr) {
            tbody.querySelectorAll('tr.fh-swiped-open').forEach((tr) => {
                if (tr !== exceptTr) {
                    closeRow(tr);
                }
            });
        }

        function clearLongPress() {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        tbody.addEventListener('touchstart', (e) => {
            const tr = e.target.closest('tr');
            const onOwnActions = e.target.closest('.fh-swipe-action, .edit-btn, .delete-btn');
            if (!tr || onOwnActions) {
                activeRow = null;
                clearLongPress();
                return;
            }
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            activeRow = tr;
            baseX = currentOffset(tr);
            axisLocked = null;
            dragged = false;
            longPressFired = false;
            ensureWrapped(tr).style.transition = 'none';

            clearLongPress();
            // Only offer the long-press shortcut on a row that isn't
            // already swiped open, so a press-and-hold on an open row's
            // revealed action doesn't compete with tapping that action.
            if (!isOpenRow(tr)) {
                longPressTimer = setTimeout(() => {
                    longPressFired = true;
                    activeRow = null;
                    navigator.vibrate?.(15);
                    const realEditBtn = tr.querySelector('.edit-btn');
                    if (realEditBtn) {
                        realEditBtn.click();
                    }
                }, LONG_PRESS_MS);
            }
        }, { passive: true });

        tbody.addEventListener('touchmove', (e) => {
            if (!activeRow) {
                return;
            }
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;

            if (axisLocked === null) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
                    return;
                }
                clearLongPress();
                axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
                if (axisLocked === 'x') {
                    closeAllExcept(activeRow);
                }
            }
            if (axisLocked === 'y') {
                return;
            }

            e.preventDefault();
            let next = baseX + dx;
            next = Math.max(OPEN_OFFSET - 24, Math.min(0, next));
            ensureWrapped(activeRow).style.transform = `translateX(${next}px)`;
            dragged = Math.abs(dx) > 8;
        }, { passive: false });

        tbody.addEventListener('touchend', () => {
            clearLongPress();
            if (!activeRow) {
                return;
            }
            const tr = activeRow;
            const content = tr.querySelector(':scope > .fh-row-content');
            if (content) {
                content.style.transition = '';
            }
            if (axisLocked === 'x') {
                const match = content && /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(content.style.transform || '');
                const value = match ? parseFloat(match[1]) : 0;
                if (value < OPEN_OFFSET / 2) {
                    tr.classList.add('fh-swiped-open');
                    if (content) {
                        content.style.transform = `translateX(${OPEN_OFFSET}px)`;
                    }
                    const editAction = tr.querySelector(':scope > .fh-swipe-action-edit');
                    const deleteAction = tr.querySelector(':scope > .fh-swipe-action-delete');
                    if (editAction) {
                        editAction.tabIndex = 0;
                    }
                    if (deleteAction) {
                        deleteAction.tabIndex = 0;
                    }
                } else {
                    closeRow(tr);
                }
            }
            activeRow = null;
            axisLocked = null;
        });

        tbody.addEventListener('touchcancel', () => {
            clearLongPress();
            if (activeRow) {
                const content = activeRow.querySelector(':scope > .fh-row-content');
                if (content) {
                    content.style.transition = '';
                }
                closeRow(activeRow);
            }
            activeRow = null;
            axisLocked = null;
        });

        tbody.addEventListener('click', (e) => {
            if (longPressFired) {
                e.preventDefault();
                e.stopPropagation();
                longPressFired = false;
                return;
            }
            const tr = e.target.closest('tr');
            if (!tr) {
                return;
            }
            if (e.target.closest('.fh-swipe-action-delete')) {
                e.preventDefault();
                e.stopPropagation();
                closeRow(tr);
                const realDeleteBtn = tr.querySelector('.delete-btn');
                if (realDeleteBtn) {
                    realDeleteBtn.click();
                }
                return;
            }
            if (e.target.closest('.fh-swipe-action-edit')) {
                e.preventDefault();
                e.stopPropagation();
                closeRow(tr);
                const realEditBtn = tr.querySelector('.edit-btn');
                if (realEditBtn) {
                    realEditBtn.click();
                }
                return;
            }
            if (isOpenRow(tr)) {
                if (dragged) {
                    e.preventDefault();
                    dragged = false;
                    return;
                }
                closeRow(tr);
            }
        });
    }

    return { escapeHtml, loadJsonArray, toCsvField, wireModalDismiss, wireSwipeRowActions };
})();
