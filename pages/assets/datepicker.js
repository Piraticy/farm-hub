// Lightweight custom date picker: a styled popover calendar bound to a
// hidden ISO-date input. Native <input type="date"> pickers are a
// browser-native widget that can't be restyled to match the rest of the
// UI, so this replaces it with plain HTML/CSS/JS instead.
//
// Expected markup per instance (see crops.html):
//   <div class="fh-datepicker" data-datepicker>
//     <button type="button" class="fh-date-trigger">
//       <span class="fh-date-text" data-placeholder="Select date...">Select date...</span>
//     </button>
//     <input type="hidden" name="...">
//     <div class="fh-calendar-popover hidden"></div>
//   </div>
const FarmHubDatePicker = (function () {
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function toISO(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function fromISO(iso) {
        if (!iso) {
            return null;
        }
        const parts = iso.split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            return null;
        }
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function formatDisplay(date) {
        return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    const instances = [];

    function closeAll() {
        instances.forEach((instance) => instance.close());
    }

    function attach(root) {
        const trigger = root.querySelector('.fh-date-trigger');
        const textEl = root.querySelector('.fh-date-text');
        const hidden = root.querySelector('input[type="hidden"]');
        const popover = root.querySelector('.fh-calendar-popover');
        if (!trigger || !textEl || !hidden || !popover) {
            return;
        }

        let selected = fromISO(hidden.value);
        let viewDate = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date();

        function setValue(date) {
            selected = date;
            if (date) {
                hidden.value = toISO(date);
                textEl.textContent = formatDisplay(date);
                textEl.classList.remove('fh-date-placeholder');
            } else {
                hidden.value = '';
                textEl.textContent = textEl.dataset.placeholder || '';
                textEl.classList.add('fh-date-placeholder');
            }
            hidden.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function render() {
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const firstOfMonth = new Date(year, month, 1);
            const startOffset = (firstOfMonth.getDay() + 6) % 7;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();

            let cells = '';
            for (let i = 0; i < startOffset; i++) {
                cells += '<span></span>';
            }
            for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = new Date(year, month, d);
                const classes = ['fh-cal-day'];
                if (selected && sameDay(cellDate, selected)) {
                    classes.push('is-selected');
                }
                if (sameDay(cellDate, today)) {
                    classes.push('is-today');
                }
                cells += `<button type="button" class="${classes.join(' ')}" data-day="${d}">${d}</button>`;
            }

            popover.innerHTML = `
                <div class="fh-cal-header">
                    <button type="button" class="fh-cal-nav" data-nav="-1" aria-label="Previous month">&#8249;</button>
                    <span class="fh-cal-title">${MONTH_NAMES[month]} ${year}</span>
                    <button type="button" class="fh-cal-nav" data-nav="1" aria-label="Next month">&#8250;</button>
                </div>
                <div class="fh-cal-weekdays">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
                <div class="fh-cal-grid">${cells}</div>
                <div class="fh-cal-footer">
                    <button type="button" class="fh-cal-today">Today</button>
                    <button type="button" class="fh-cal-clear">Clear</button>
                </div>
            `;

            popover.querySelectorAll('.fh-cal-nav').forEach((btn) => {
                btn.addEventListener('click', () => {
                    viewDate = new Date(year, month + Number(btn.dataset.nav), 1);
                    render();
                });
            });
            popover.querySelectorAll('.fh-cal-day').forEach((btn) => {
                btn.addEventListener('click', () => {
                    setValue(new Date(year, month, Number(btn.dataset.day)));
                    close();
                });
            });
            popover.querySelector('.fh-cal-today').addEventListener('click', () => {
                const now = new Date();
                viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
                setValue(now);
                close();
            });
            popover.querySelector('.fh-cal-clear').addEventListener('click', () => {
                setValue(null);
                close();
            });
        }

        function open() {
            closeAll();
            render();
            popover.classList.remove('hidden');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function close() {
            popover.classList.add('hidden');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (popover.classList.contains('hidden')) {
                open();
            } else {
                close();
            }
        });
        popover.addEventListener('click', (e) => e.stopPropagation());

        if (selected) {
            textEl.textContent = formatDisplay(selected);
            textEl.classList.remove('fh-date-placeholder');
        } else {
            textEl.classList.add('fh-date-placeholder');
        }

        // A native form.reset() clears the hidden input's value directly
        // (bypassing setValue), so the displayed text and this closure's
        // own `selected` would otherwise go stale. The form fires its own
        // 'reset' event even when reset() is called programmatically, so
        // hook that instead of requiring the caller to know this exists.
        const form = hidden.closest('form');
        if (form) {
            form.addEventListener('reset', () => {
                setTimeout(() => setValue(null), 0);
            });
        }

        instances.push({ root, close });
    }

    function init(selector) {
        document.querySelectorAll(selector).forEach(attach);
        document.addEventListener('click', closeAll);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAll();
            }
        });
    }

    return { init };
})();
