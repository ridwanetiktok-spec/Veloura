// ============================================
// Veloura Admin Dashboard JavaScript
// ============================================
// ============================================
// SUPABASE INIT - Using environment variables only
// ============================================

function initSupabase() {
    if (window.supabaseClient) {
        console.log('✅ Supabase client already available');
        return window.supabaseClient;
    }

    console.log('🔄 Initializing Supabase client from environment...');
    
    let supabaseUrl, supabaseKey;
    
    // Method 1: Try import.meta.env (Vite)
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            console.log('🔑 Using import.meta.env');
        }
    } catch (e) {
        console.log('⚠️ import.meta.env not available');
    }
    
    // Method 2: Try window.__ENV (fallback)
    if (!supabaseUrl && window.__ENV) {
        supabaseUrl = window.__ENV.VITE_SUPABASE_URL;
        supabaseKey = window.__ENV.VITE_SUPABASE_ANON_KEY;
        console.log('🔑 Using window.__ENV');
    }
    
    console.log('🔑 Supabase URL found:', !!supabaseUrl);
    console.log('🔑 Supabase Key found:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase environment variables not found!');
        console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
        showAdminToast('Supabase is not configured. Check your environment variables.', 'error');
        return null;
    }

    // Validate URL format
    try {
        new URL(supabaseUrl);
    } catch (e) {
        console.error('❌ Invalid Supabase URL:', supabaseUrl);
        showAdminToast('Invalid Supabase URL format. Please check your .env file.', 'error');
        return null;
    }

    // Create Supabase client
    if (typeof window.supabase !== 'undefined') {
        try {
            window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log('✅ Supabase client initialized successfully');
            
            // Test the connection
            window.supabaseClient.auth.getSession().then(({ data, error }) => {
                if (error) {
                    console.warn('⚠️ Supabase connection test failed:', error.message);
                } else {
                    console.log('✅ Supabase connection successful');
                }
            });
            
            return window.supabaseClient;
        } catch (error) {
            console.error('❌ Failed to create Supabase client:', error);
            showAdminToast(`Failed to initialize Supabase: ${error.message}`, 'error');
            return null;
        }
    }

    // Dynamically load Supabase if not available
    console.log('📦 Loading Supabase library dynamically...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        if (typeof window.supabase !== 'undefined') {
            try {
                window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                console.log('✅ Supabase client loaded and initialized');
                if (typeof loadAdminData === 'function') {
                    loadAdminData();
                }
            } catch (error) {
                console.error('❌ Failed to create Supabase client:', error);
                showAdminToast(`Failed to initialize Supabase: ${error.message}`, 'error');
            }
        }
    };
    script.onerror = () => {
        console.error('❌ Failed to load Supabase library');
        showAdminToast('Failed to load Supabase library. Check your internet connection.', 'error');
    };
    document.head.appendChild(script);
    
    return null;
}

// Initialize Supabase
const supabaseClient = initSupabase();
window.supabaseClient = supabaseClient;

// ============================================
// REST OF YOUR ADMIN.JS CODE BELOW
// ============================================

// ===== Auth =====
let isAuthenticated = false;
let adminRealtimeChannel;

// ===== Data Store =====
let adminProducts = [];
let adminCategories = [];
let adminBanners = {};
let adminBlog = [];
let adminSettings = {};
let adminReviews = [];
let mediaLibrary = [];
let editingProductId = null;
let selectedProducts = new Set();

// ===== Auth Functions =====
function initAuth() {
    const loginScreen = document.getElementById('loginScreen');
    const adminLayout = document.getElementById('adminLayout');

    // Check for existing session
    if (window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.warn('Session check error:', error.message);
                return;
            }
            
            isAuthenticated = Boolean(data.session);
            if (isAuthenticated) {
                loginScreen.classList.add('hidden');
                adminLayout.classList.add('active');
                initAdmin();
                showAdminToast('Welcome back, Admin!', 'success');
            }
        });
    }

    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        
        errorEl.style.display = 'none';
        
        if (!window.supabaseClient) {
            errorEl.textContent = 'Supabase is not configured. Please check your environment variables.';
            errorEl.style.display = 'block';
            return;
        }

        if (!email || !password) {
            errorEl.textContent = 'Please enter both email and password.';
            errorEl.style.display = 'block';
            return;
        }

        showAdminToast('Signing in...', 'info');
        
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ 
                email, 
                password 
            });
            
            if (error) {
                console.error('Login error:', error);
                errorEl.textContent = error.message || 'Invalid credentials. Please try again.';
                errorEl.style.display = 'block';
                showAdminToast('Sign in failed: ' + error.message, 'error');
                return;
            }
            
            if (data.session) {
                isAuthenticated = true;
                loginScreen.classList.add('hidden');
                adminLayout.classList.add('active');
                initAdmin();
                showAdminToast('Welcome back, Admin!', 'success');
                document.getElementById('loginForm').reset();
            } else {
                errorEl.textContent = 'No session created. Please try again.';
                errorEl.style.display = 'block';
            }
        } catch (error) {
            console.error('Login exception:', error);
            errorEl.textContent = 'An unexpected error occurred. Please try again.';
            errorEl.style.display = 'block';
            showAdminToast('Sign in failed: ' + error.message, 'error');
        }
    });

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            isAuthenticated = false;
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('adminLayout').classList.remove('active');
            document.getElementById('loginForm').reset();
            showAdminToast('Signed out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            showAdminToast('Logout failed: ' + error.message, 'error');
        }
    });
}

// ===== Data Loading with Retry Logic =====
async function loadAdminData(retryCount = 0) {
    const MAX_RETRIES = 3;
    
    try {
        // Wait for Supabase client to be available
        let client = window.supabaseClient;
        
        // If client isn't ready, wait and retry
        if (!client) {
            if (retryCount < MAX_RETRIES) {
                console.warn(`⏳ Supabase client not ready, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return loadAdminData(retryCount + 1);
            }
            throw new Error('Supabase client not available after multiple retries');
        }

        console.log('🔄 Loading admin data from Supabase...');
        
        // Execute all queries in parallel
        const [pRes, cRes, bRes, blogRes, sRes, revRes, mediaRes] = await Promise.all([
            client.from('products').select('*').order('id'),
            client.from('categories').select('*').order('sort_order'),
            client.from('banners').select('type,data'),
            client.from('blog_posts').select('*').order('publish_date', { ascending: false }),
            client.from('settings').select('data').eq('id', 1).maybeSingle(),
            client.from('reviews').select('*').order('date', { ascending: false }),
            client.from('media_library').select('*').order('created_at', { ascending: false })
        ]);

        // Check for errors
        const errors = [pRes, cRes, bRes, blogRes, sRes, revRes]
            .filter(result => result.error)
            .map(result => result.error.message);
            
        if (errors.length > 0) {
            throw new Error(`Supabase queries failed: ${errors.join(', ')}`);
        }

        // Map data to frontend format
        adminProducts = (pRes.data || []).map(p => ({ 
            ...p, 
            salePrice: p.sale_price, 
            shortDescription: p.short_description, 
            skinType: p.skin_type, 
            bestSeller: p.best_seller, 
            newArrival: p.new_arrival, 
            createdAt: p.created_at 
        }));

        adminCategories = (cRes.data || []).map(c => ({ 
            ...c, 
            order: c.sort_order 
        }));

        adminBanners = (bRes.data || []).reduce((all, row) => ({ 
            ...all, 
            [row.type]: row.data 
        }), { heroSlides: [] });

        adminBlog = (blogRes.data || []).map(p => ({ 
            ...p, 
            coverImage: p.cover_image, 
            publishDate: p.publish_date 
        }));

        adminSettings = sRes.data?.data || {};
        adminReviews = (revRes.data || []).map(r => ({ 
            ...r, 
            productName: r.product_name 
        }));
        
        if (mediaRes.error) {
            console.warn(`Media library could not be loaded: ${mediaRes.error.message}`);
        }
        mediaLibrary = (mediaRes.data || []).map(m => ({ 
            ...m, 
            createdAt: m.created_at 
        }));

        // Set up realtime subscriptions
        subscribeToAdminRealtime();

        console.log('✅ Admin data loaded successfully!', {
            products: adminProducts.length,
            categories: adminCategories.length,
            blog: adminBlog.length,
            reviews: adminReviews.length,
            media: mediaLibrary.length
        });

        return;

    } catch (supabaseError) {
        console.error('❌ Error loading Supabase data:', supabaseError);
        
        // If we have a client but got an error, show toast
        if (window.supabaseClient) {
            showAdminToast(`Failed to load data: ${supabaseError.message}`, 'error');
        } else {
            showAdminToast('Supabase is not configured. Check your environment variables.', 'error');
        }

        // Set empty data to prevent UI errors
        adminProducts = [];
        adminCategories = [];
        adminBanners = { newsBanner: {}, promoBanner: {}, heroSlides: [] };
        adminBlog = [];
        adminSettings = {};
        adminReviews = [];
        mediaLibrary = [];
        
        // Re-throw for the calling function to handle
        throw supabaseError;
    }
}

function subscribeToAdminRealtime() {
    const client = window.supabaseClient;
    if (!client || adminRealtimeChannel) return;
    adminRealtimeChannel = client.channel('veloura-admin-data')
        .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
            await loadAdminData();
            if (isAuthenticated) initAdmin();
        })
        .subscribe();
}

function requireSupabase() {
    if (!window.supabaseClient) throw new Error('Supabase is not configured');
    return window.supabaseClient;
}

// ===== Database Helper Functions =====
function productRow(product) {
    const { id, salePrice, shortDescription, skinType, bestSeller, newArrival, createdAt, ...rest } = product;
    return { ...rest, sale_price: salePrice, short_description: shortDescription, skin_type: skinType, best_seller: bestSeller, new_arrival: newArrival, created_at: createdAt };
}

function categoryRow(category) {
    const { id, order, ...rest } = category;
    return { ...rest, sort_order: order };
}

function blogRow(post) {
    const { id, coverImage, publishDate, ...rest } = post;
    return { ...rest, cover_image: coverImage, publish_date: publishDate };
}

function reviewRow(review) {
    const { id, productName, ...rest } = review;
    return { ...rest, product_name: productName };
}

async function dbInsert(table, row) {
    const { id, ...insertRow } = row;
    const { error } = await requireSupabase().from(table).insert(insertRow);
    if (error) throw error;
}

async function dbUpdate(table, id, row) {
    const { id: ignoredId, ...updateRow } = row;
    const { error } = await requireSupabase().from(table).update(updateRow).eq('id', id);
    if (error) throw error;
}

async function dbDelete(table, id) {
    const { error } = await requireSupabase().from(table).delete().eq('id', id);
    if (error) throw error;
}

async function dbSaveSingleton(table, data) {
    const { error } = await requireSupabase().from(table).upsert({ id: 1, data }, { onConflict: 'id' });
    if (error) throw error;
}

async function dbSaveBanners(banners) {
    const client = requireSupabase();
    const rows = ['newsBanner', 'promoBanner', 'heroSlides'].map(type => ({
        type,
        data: banners[type] || (type === 'heroSlides' ? [] : {})
    }));
    const { error } = await client.from('banners').upsert(rows, { onConflict: 'type' });
    if (error) throw error;
}

// ===== Initialize Admin =====
function initAdmin() {
    renderDashboard();
    renderProductsTable();
    renderProductForm();
    renderCategoriesManager();
    renderBannersManager();
    renderHeroManager();
    renderFeaturedManager();
    renderMediaLibrary();
    renderBlogManager();
    renderReviewsManager();
    renderPromotionsManager();
    renderSettingsManager();
    setupNavigation();
}

// ============================================
// ALL YOUR OTHER FUNCTIONS GO HERE
// (renderDashboard, renderProductsTable, etc.)
// ============================================

// ===== Utility =====
function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showAdminToast(message, type = 'info') {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===== Tabs =====
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminData();
    initAuth();
});