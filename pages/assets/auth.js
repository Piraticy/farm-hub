// Lightweight, client-side-only session + permissions model.
//
// IMPORTANT: This site has no backend and no passwords — everything here
// lives in this browser's localStorage. It is enough to demo role-based
// access (an admin who can grant specific staff members access to specific
// sections), but it is NOT real security: anyone with devtools access to
// this browser can edit localStorage directly and grant themselves admin.
// Treat it as a placeholder until a real backend/auth exists.

const FarmHubAuth = (function () {
    const SESSION_KEY = 'farmhub_session';
    const EMPLOYEES_KEY = 'farmhub_employees';

    const FEATURES = [
        { key: 'crops', label: 'Crops', page: 'crops.html' },
        { key: 'animals', label: 'Animals', page: 'animals.html' },
        { key: 'employees', label: 'Employees', page: 'employees.html' },
        { key: 'customers', label: 'Customers', page: 'customers.html' },
        { key: 'finances', label: 'Finances', page: 'finances.html' },
        { key: 'inventory', label: 'Inventory', page: 'inventory.html' }
    ];

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    function setSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function loadEmployees() {
        try {
            return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveEmployees(employees) {
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    }

    function getCurrentEmployee(session) {
        session = session || getSession();
        if (!session || session.role !== 'staff') {
            return null;
        }
        return loadEmployees().find((e) => e.id === session.employeeId) || null;
    }

    // Admin can access everything. Staff can access only the features
    // explicitly granted on their employee record.
    function hasFeature(featureKey, session) {
        session = session || getSession();
        if (!session) {
            return false;
        }
        if (session.role === 'admin') {
            return true;
        }
        const employee = getCurrentEmployee(session);
        return !!(employee && Array.isArray(employee.permissions) && employee.permissions.includes(featureKey));
    }

    // Only an admin session may change what features a staff member has.
    // Every write path funnels through here so this rule can't be skipped
    // by calling a different function.
    function setEmployeePermissions(employeeId, permissions) {
        const session = getSession();
        if (!session || session.role !== 'admin') {
            console.error('Only an admin can change staff permissions.');
            return false;
        }
        const employees = loadEmployees();
        const idx = employees.findIndex((e) => e.id === employeeId);
        if (idx === -1) {
            return false;
        }
        employees[idx] = { ...employees[idx], permissions: permissions.slice() };
        saveEmployees(employees);
        return true;
    }

    function displayName(session) {
        session = session || getSession();
        if (!session) {
            return '';
        }
        if (session.role === 'admin') {
            return 'Admin';
        }
        const employee = getCurrentEmployee(session);
        return employee ? employee.name : 'Staff';
    }

    // Renders the "logged in as ... / Log out" strip and enforces the
    // current page's access, hiding nav links / dashboard cards for
    // features the current user can't reach.
    function renderAuthBar() {
        const session = getSession();
        const bar = document.createElement('div');
        bar.id = 'authBar';
        bar.className = 'auth-bar';

        const who = document.createElement('span');
        who.textContent = session
            ? `Logged in as ${displayName(session)}${session.role === 'admin' ? ' (Admin)' : ''}`
            : '';
        bar.appendChild(who);

        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.className = 'auth-bar-logout';
        logoutBtn.textContent = 'Log out';
        logoutBtn.addEventListener('click', () => {
            clearSession();
            window.location.href = 'login.html';
        });
        bar.appendChild(logoutBtn);

        document.body.insertBefore(bar, document.body.firstChild);
    }

    function applyFeatureVisibility(session) {
        document.querySelectorAll('[data-feature]').forEach((el) => {
            const feature = el.getAttribute('data-feature');
            if (!hasFeature(feature, session)) {
                el.classList.add('hidden');
            }
        });
    }

    // Call this once, near the top of every gated page, before the body
    // is otherwise rendered/interacted with. Never call this from
    // login.html itself — it always redirects when there's no session.
    function guardPage(pageFeature) {
        const session = getSession();

        if (!session) {
            window.location.replace('login.html');
            return;
        }

        if (pageFeature && !hasFeature(pageFeature, session)) {
            window.location.replace('index.html');
            return;
        }

        document.addEventListener('DOMContentLoaded', () => {
            renderAuthBar();
            applyFeatureVisibility(session);
        });
    }

    return {
        FEATURES,
        getSession,
        setSession,
        clearSession,
        loadEmployees,
        saveEmployees,
        getCurrentEmployee,
        hasFeature,
        setEmployeePermissions,
        displayName,
        guardPage
    };
})();
