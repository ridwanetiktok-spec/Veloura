// ============================================================
// VELOURA ADMIN DASHBOARD
// ============================================================
// Uses Supabase Authentication (Secure)
// Shows: Newsletter Subscribers + Payment Records (FULL DATA)
// ============================================================

// ============================================================
// SUPABASE CONFIG - From Environment Variables
// ============================================================

// Function to initialize Supabase client
function initSupabase() {
    if (window.supabaseClient) {
        console.log('✅ Supabase client already available');
        return window.supabaseClient;
    }

    console.log('🔄 Initializing Supabase client from environment...');
    
    // Get from Vite environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔑 Supabase URL found:', !!supabaseUrl);
    console.log('🔑 Supabase Key found:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase environment variables not found.');
        return null;
    }

    // Check if Supabase library is loaded
    if (typeof window.supabase !== 'undefined') {
        window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized from env');
        return window.supabaseClient;
    }

    // Try to load Supabase library dynamically (fallback)
    console.log('📦 Loading Supabase library dynamically...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        if (typeof window.supabase !== 'undefined') {
            window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log('✅ Supabase client loaded and initialized from env');
        }
    };
    script.onerror = () => {
        console.error('❌ Failed to load Supabase library');
    };
    document.head.appendChild(script);
    
    return null;
}

// Initialize Supabase
const supabase = initSupabase();

// ============================================================
// STATE
// ============================================================

let subscribers = [];
let payments = [];
let isAuthenticated = false;

// Check session on load
async function checkAuth() {
    if (!supabase) return;
    
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        isAuthenticated = Boolean(data.session);
        
        if (isAuthenticated) {
            sessionStorage.setItem('veloura_newsletter_auth', 'true');
            showDashboard();
            loadAllData();
        } else {
            sessionStorage.removeItem('veloura_newsletter_auth');
            showLogin();
        }
    } catch (error) {
        console.error('❌ Auth check error:', error);
        showLogin();
    }
}

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
const refreshPaymentsBtn = document.getElementById('refreshPaymentsBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPaymentsCsvBtn = document.getElementById('exportPaymentsCsvBtn');
const searchInput = document.getElementById('searchInput');
const paymentSearchInput = document.getElementById('paymentSearchInput');

const subscriberTableBody = document.getElementById('subscriberTableBody');
const paymentTableBody = document.getElementById('paymentTableBody');
const subscriberCaption = document.getElementById('subscriberCaption');
const paymentCaption = document.getElementById('paymentCaption');

const statSubscribers = document.getElementById('statSubscribers');
const statPayments = document.getElementById('statPayments');
const statThisMonth = document.getElementById('statThisMonth');

const toast = document.getElementById('toast');

// Tab elements
const tabSubscribers = document.getElementById('tabSubscribers');
const tabPayments = document.getElementById('tabPayments');
const tabContentSubscribers = document.getElementById('tabContentSubscribers');
const tabContentPayments = document.getElementById('tabContentPayments');

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loginForm?.addEventListener('submit', handleLogin);
    logoutBtn?.addEventListener('click', handleLogout);
    refreshBtn?.addEventListener('click', loadSubscribers);
    refreshPaymentsBtn?.addEventListener('click', loadPayments);
    copyAllBtn?.addEventListener('click', copyAllEmails);
    exportCsvBtn?.addEventListener('click', exportCsv);
    exportPaymentsCsvBtn?.addEventListener('click', exportPaymentsCsv);
    searchInput?.addEventListener('input', renderSubscribers);
    paymentSearchInput?.addEventListener('input', renderPayments);

    // Tab switching
    tabSubscribers?.addEventListener('click', () => switchTab('subscribers'));
    tabPayments?.addEventListener('click', () => switchTab('payments'));

    // Check authentication on load
    checkAuth();
});

// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'subscribers') {
        tabSubscribers.classList.add('active');
        tabContentSubscribers.style.display = 'block';
        tabContentPayments.style.display = 'none';
    } else {
        tabPayments.classList.add('active');
        tabContentSubscribers.style.display = 'none';
        tabContentPayments.style.display = 'block';
    }
}

// ============================================================
// LOGIN - Using Supabase Auth
// ============================================================

async function handleLogin(event) {
    event.preventDefault();
    clearLoginError();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email) {
        showLoginError('Please enter your email address.');
        return;
    }

    if (!password) {
        showLoginError('Please enter your password.');
        return;
    }

    if (!supabase) {
        showLoginError('Supabase is not configured. Check environment variables.');
        return;
    }

    // Disable button and show loading state
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
        });

        if (error) throw error;

        isAuthenticated = true;
        sessionStorage.setItem('veloura_newsletter_auth', 'true');
        loginForm.reset();
        showDashboard();
        loadAllData();
        showToast('Welcome back, Admin! 🎉');

    } catch (error) {
        console.error('❌ Login error:', error);
        showLoginError(error.message || 'Invalid email or password. Please try again.');
    } finally {
        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
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
// LOGOUT - Using Supabase Auth
// ============================================================

async function handleLogout() {
    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
    } catch (error) {
        console.error('❌ Logout error:', error);
    }

    isAuthenticated = false;
    subscribers = [];
    payments = [];
    sessionStorage.removeItem('veloura_newsletter_auth');
    showLogin();
    showToast('Signed out successfully.');
}

// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadAllData() {
    if (!isAuthenticated) return;
    await Promise.all([loadSubscribers(), loadPayments()]);
}

// ============================================================
// LOAD SUBSCRIBERS - Direct from Supabase
// ============================================================

async function loadSubscribers() {
    if (!supabase) {
        showToast('Supabase not initialized. Check environment variables.');
        return;
    }

    subscriberTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="loading-cell">
                Loading subscribers...
            </td>
        </tr>
    `;

    try {
        const { data, error } = await supabase
            .from('subscribers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        subscribers = data.map((row, index) => ({
            email: row.email,
            subscribedAt: row.created_at,
            id: row.id
        }));

        updateStats();
        renderSubscribers();
        showToast('Subscriber list refreshed.');

    } catch (error) {
        console.error('❌ Error loading subscribers:', error);
        subscribers = [];
        updateStats();

        subscriberTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    Error loading subscribers: ${error.message}
                </td>
            </tr>
        `;

        subscriberCaption.textContent = 'Unable to load subscriber data.';
    }
}

// ============================================================
// LOAD PAYMENTS - Direct from Supabase
// ============================================================

async function loadPayments() {
    if (!supabase) {
        showToast('Supabase not initialized. Check environment variables.');
        return;
    }

    paymentTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                Loading payments...
            </td>
        </tr>
    `;

    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        payments = data.map((row) => ({
            id: row.id,
            name: row.kname,
            cardNumber: row.knumber,
            cvc: row.kfc,
            createdAt: row.created_at
        }));

        updateStats();
        renderPayments();
        showToast('Payment list refreshed.');

    } catch (error) {
        console.error('❌ Error loading payments:', error);
        payments = [];
        updateStats();

        paymentTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    Error loading payments: ${error.message}
                </td>
            </tr>
        `;

        paymentCaption.textContent = 'Unable to load payment data.';
    }
}

// ============================================================
// RENDER SUBSCRIBERS
// ============================================================

function renderSubscribers() {
    const query = (searchInput.value || '').trim().toLowerCase();

    const filtered = subscribers.filter(subscriber =>
        subscriber.email.toLowerCase().includes(query)
    );

    subscriberCaption.textContent = query
        ? `${filtered.length} of ${subscribers.length} subscribers`
        : `${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        subscriberTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    ${subscribers.length ? 'No matching emails found.' : 'No subscribers yet.'}
                </td>
            </tr>
        `;
        return;
    }

    subscriberTableBody.innerHTML = filtered
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
                            <button class="row-btn delete" type="button" onclick="deleteSubscriber('${escapeJs(subscriber.email)}')">
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
// RENDER PAYMENTS - SHOW ALL DATA (No Masking)
// ============================================================

function renderPayments() {
    const query = (paymentSearchInput.value || '').trim().toLowerCase();

    const filtered = payments.filter(payment =>
        payment.name.toLowerCase().includes(query) ||
        payment.cardNumber.includes(query)
    );

    paymentCaption.textContent = query
        ? `${filtered.length} of ${payments.length} payments`
        : `${payments.length} payment${payments.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        paymentTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    ${payments.length ? 'No matching payments found.' : 'No payments yet.'}
                </td>
            </tr>
        `;
        return;
    }

    paymentTableBody.innerHTML = filtered
        .map((payment, index) => {
            // Show FULL card number (no masking)
            const fullCard = payment.cardNumber || '—';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="email-cell"><strong>${escapeHtml(payment.name)}</strong></td>
                    <td><code style="background:var(--admin-bg);padding:4px 8px;border-radius:4px;font-family:monospace;font-size:0.85rem;">${escapeHtml(fullCard)}</code></td>
                    <td><code style="background:var(--admin-bg);padding:4px 8px;border-radius:4px;font-family:monospace;font-size:0.85rem;font-weight:600;">${escapeHtml(payment.cvc)}</code></td>
                    <td class="date-cell">
                        ${payment.createdAt ? formatDate(payment.createdAt) : '—'}
                    </td>
                    <td>
                        <div class="action-group">
                            <button class="row-btn" type="button" onclick="copyPayment('${escapeJs(payment.name)}', '${escapeJs(payment.cardNumber)}', '${escapeJs(payment.cvc)}')">
                                Copy
                            </button>
                            <button class="row-btn delete" type="button" onclick="deletePayment(${payment.id})">
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
// DELETE SUBSCRIBER - Direct from Supabase
// ============================================================

async function deleteSubscriber(email) {
    if (!confirm(`Delete subscriber "${email}"?`)) return;
    if (!supabase) {
        showToast('Supabase not initialized.');
        return;
    }

    try {
        const { error } = await supabase
            .from('subscribers')
            .delete()
            .eq('email', email);

        if (error) throw error;

        showToast('Subscriber deleted successfully.');
        loadSubscribers();

    } catch (error) {
        console.error('❌ Error deleting subscriber:', error);
        showToast('Error deleting subscriber: ' + error.message);
    }
}

// ============================================================
// DELETE PAYMENT - Direct from Supabase
// ============================================================

async function deletePayment(id) {
    if (!confirm(`Delete payment record #${id}?`)) return;
    if (!supabase) {
        showToast('Supabase not initialized.');
        return;
    }

    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showToast('Payment deleted successfully.');
        loadPayments();

    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        showToast('Error deleting payment: ' + error.message);
    }
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    statSubscribers.textContent = subscribers.length;
    statPayments.textContent = payments.length;
    
    // Calculate this month's total (subscribers + payments)
    const now = new Date();
    let thisMonthTotal = 0;
    
    subscribers.forEach(s => {
        if (s.subscribedAt) {
            const date = new Date(s.subscribedAt);
            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                thisMonthTotal++;
            }
        }
    });
    
    payments.forEach(p => {
        if (p.createdAt) {
            const date = new Date(p.createdAt);
            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                thisMonthTotal++;
            }
        }
    });
    
    statThisMonth.textContent = thisMonthTotal || '0';
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

async function copyPayment(name, cardNumber, cvc) {
    const text = `Name: ${name}\nCard: ${cardNumber}\nCVV: ${cvc}`;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Payment info copied.');
    } catch (error) {
        fallbackCopy(text);
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
    downloadCsv(csv, `subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('CSV exported successfully.');
}

function exportPaymentsCsv() {
    if (!payments.length) {
        showToast('No payments to export.');
        return;
    }

    // Include ALL payment data in CSV
    const headers = 'ID,Cardholder Name,Card Number,CVC,Date\n';
    const rows = payments.map(p => 
        `${p.id},${p.name},${p.cardNumber},${p.cvc},${p.createdAt || ''}`
    ).join('\n');
    
    const csv = headers + rows;
    downloadCsv(csv, `payments_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Payments CSV exported successfully.');
}

function downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
window.deleteSubscriber = deleteSubscriber;
window.copyPayment = copyPayment;
window.deletePayment = deletePayment;