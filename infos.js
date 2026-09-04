// ============================================================
// VELOURA NEWSLETTER ADMIN
// ============================================================
// Uses Node.js API: /api/emails
// Login requires: Email + Password
// ============================================================

const LOGIN_EMAIL = 'admin@veloura.com';    // Change this!
const LOGIN_PASSWORD = 'admin123';          // Change this!

let subscribers = [];
let isAuthenticated =
    sessionStorage.getItem('veloura_newsletter_auth') === 'true';

// ============================================================
// DOM
// ============================================================

const loginScreen = document.getElementById('loginScreen');
const adminLayout = document.getElementById('adminLayout');

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const searchInput = document.getElementById('searchInput');

const tableBody = document.getElementById('subscriberTableBody');
const listCaption = document.getElementById('listCaption');

const statTotal = document.getElementById('statTotal');
const statThisMonth = document.getElementById('statThisMonth');
const statLatest = document.getElementById('statLatest');

const toast = document.getElementById('toast');

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loginForm?.addEventListener('submit', handleLogin);
    logoutBtn?.addEventListener('click', handleLogout);
    refreshBtn?.addEventListener('click', loadSubscribers);
    copyAllBtn?.addEventListener('click', copyAllEmails);
    exportCsvBtn?.addEventListener('click', exportCsv);
    searchInput?.addEventListener('input', renderSubscribers);

    if (isAuthenticated) {
        showDashboard();
        loadSubscribers();
    } else {
        showLogin();
    }
});

// ============================================================
// LOGIN - Requires Email AND Password
// ============================================================

function handleLogin(event) {
    event.preventDefault();
    clearLoginError();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // Validate both email and password
    if (!email) {
        showLoginError('Please enter your email address.');
        return;
    }

    if (!password) {
        showLoginError('Please enter your password.');
        return;
    }

    // Check credentials
    if (email !== LOGIN_EMAIL || password !== LOGIN_PASSWORD) {
        showLoginError('Invalid email or password. Please try again.');
        return;
    }

    // Login successful
    isAuthenticated = true;
    sessionStorage.setItem('veloura_newsletter_auth', 'true');
    loginForm.reset();
    showDashboard();
    loadSubscribers();
    showToast('Welcome back, Admin!');
}

// ============================================================
// SHOW / HIDE
// ============================================================

function showLogin() {
    loginScreen.style.display = 'flex';
    adminLayout.classList.remove('active');
}

function showDashboard() {
    loginScreen.style.display = 'none';
    adminLayout.classList.add('active');
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function clearLoginError() {
    loginError.textContent = '';
    loginError.style.display = 'none';
}

// ============================================================
// LOGOUT
// ============================================================

function handleLogout() {
    isAuthenticated = false;
    subscribers = [];
    sessionStorage.removeItem('veloura_newsletter_auth');
    showLogin();
    showToast('Signed out successfully.');
}

// ============================================================
// API CALLS
// ============================================================

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// ============================================================
// LOAD SUBSCRIBERS
// ============================================================

async function loadSubscribers() {
    if (!isAuthenticated) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="loading-cell">
                Loading subscribers...
            </td>
        </tr>
    `;

    try {
        const data = await apiFetch('/api/emails');

        if (!data.success) {
            throw new Error(data.message || 'Failed to load subscribers');
        }

        subscribers = data.emails.map((email, index) => ({
            email,
            subscribedAt: null,
            order: index
        }));

        updateStats();
        renderSubscribers();
        showToast('Subscriber list refreshed.');

    } catch (error) {
        console.error('Newsletter load error:', error);
        subscribers = [];
        updateStats();

        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    Could not load subscribers: ${error.message}
                </td>
            </tr>
        `;

        listCaption.textContent = 'Unable to read subscriber file.';
    }
}

// ============================================================
// RENDER
// ============================================================

function renderSubscribers() {
    const query = (searchInput.value || '').trim().toLowerCase();

    const filtered = subscribers.filter(subscriber =>
        subscriber.email.toLowerCase().includes(query)
    );

    listCaption.textContent = query
        ? `${filtered.length} of ${subscribers.length} subscribers`
        : `${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    ${subscribers.length ? 'No matching emails found.' : 'No subscribers yet.'}
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered
        .map((subscriber, index) => {
            const realIndex = subscribers.indexOf(subscriber) + 1;
            return `
                <tr>
                    <td>${realIndex}</td>
                    <td class="email-cell">${escapeHtml(subscriber.email)}</td>
                    <td class="date-cell">
                        ${subscriber.subscribedAt ? formatDate(subscriber.subscribedAt) : '—'}
                    </td>
                    <td>
                        <div class="action-group">
                            <button class="row-btn" type="button" onclick="copyEmail('${escapeJs(subscriber.email)}')">
                                Copy
                            </button>
                            <button class="row-btn delete" type="button" onclick="deleteEmail('${escapeJs(subscriber.email)}')">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join('');
}

// ============================================================
// DELETE EMAIL
// ============================================================

async function deleteEmail(email) {
    if (!confirm(`Delete "${email}"?`)) return;

    try {
        const data = await apiFetch('/api/emails', {
            method: 'DELETE',
            body: JSON.stringify({ email })
        });

        if (data.success) {
            showToast('Email deleted successfully.');
            loadSubscribers();
        } else {
            showToast('Error: ' + data.message);
        }
    } catch (error) {
        showToast('Error deleting email.');
        console.error(error);
    }
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    statTotal.textContent = subscribers.length;
    statThisMonth.textContent = '—';
    statLatest.textContent = subscribers.length > 0 ? subscribers[0].email : '—';
}

// ============================================================
// COPY FUNCTIONS
// ============================================================

async function copyEmail(email) {
    try {
        await navigator.clipboard.writeText(email);
        showToast('Email copied.');
    } catch (error) {
        fallbackCopy(email);
    }
}

async function copyAllEmails() {
    if (!subscribers.length) {
        showToast('There are no subscriber emails to copy.');
        return;
    }

    const emails = subscribers.map(subscriber => subscriber.email).join('\n');

    try {
        await navigator.clipboard.writeText(emails);
        showToast(`${subscribers.length} emails copied.`);
    } catch (error) {
        fallbackCopy(emails);
    }
}

// ============================================================
// EXPORT CSV
// ============================================================

function exportCsv() {
    if (!subscribers.length) {
        showToast('No subscribers to export.');
        return;
    }

    const headers = 'Email,Subscribed Date\n';
    const rows = subscribers.map(s => 
        `${s.email},${s.subscribedAt || ''}`
    ).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.setAttribute('download', `subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('CSV exported successfully.');
}

// ============================================================
// FALLBACK COPY
// ============================================================

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showToast('Copied to clipboard.');
    } catch (error) {
        showToast('Unable to copy.');
    }

    textarea.remove();
}

// ============================================================
// HELPERS
// ============================================================

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJs(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ============================================================
// TOAST
// ============================================================

let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.copyEmail = copyEmail;
window.deleteEmail = deleteEmail;