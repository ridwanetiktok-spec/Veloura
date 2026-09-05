// ============================================
// Veloura Admin Dashboard JavaScript
// ============================================
// ============================================
// SUPABASE INIT - Clean version with env vars only
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
    
    // Method 2: Try window.__ENV (passed from HTML)
    if (!supabaseUrl && window.__ENV) {
        supabaseUrl = window.__ENV.VITE_SUPABASE_URL;
        supabaseKey = window.__ENV.VITE_SUPABASE_ANON_KEY;
        console.log('🔑 Using window.__ENV');
    }
    
    // Method 3: Try process.env (Node.js fallback)
    if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
        supabaseUrl = process.env.VITE_SUPABASE_URL;
        supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        console.log('🔑 Using process.env');
    }
    
    console.log('🔑 Supabase URL found:', !!supabaseUrl);
    console.log('🔑 Supabase Key found:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase environment variables not found!');
        console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
        showAdminToast('Supabase is not configured. Check your environment variables.', 'error');
        return null;
    }

    // Validate URL
    try {
        new URL(supabaseUrl);
    } catch (e) {
        console.error('❌ Invalid Supabase URL:', supabaseUrl);
        showAdminToast('Invalid Supabase URL format.', 'error');
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
        showAdminToast('Failed to load Supabase library.', 'error');
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



// ===== Data Loading =====
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
        loadAdminData().then(() => {
          initAdmin();
          showAdminToast('Welcome back, Admin!', 'success');
        }).catch(() => {});
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
        loadAdminData().then(() => {
          initAdmin();
          showAdminToast('Welcome back, Admin!', 'success');
        }).catch(() => {});
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

// ===== Navigation =====
function setupNavigation() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`).classList.add('active');
      document.getElementById('topbarTitle').textContent = link.querySelector('span').textContent;
    });
  });
}

// ===== Dashboard =====
function renderDashboard() {
  const totalProducts = adminProducts.length;
  const activeProducts = adminProducts.filter(p => p.status === 'Active').length;
  const lowStock = adminProducts.filter(p => p.stock < 10).length;
  const totalValue = adminProducts.reduce((sum, p) => sum + (p.salePrice || p.price) * p.stock, 0);
  const totalReviews = adminProducts.reduce((sum, p) => sum + (p.reviews || 0), 0);
  const avgRating = adminProducts.length > 0
    ? (adminProducts.reduce((sum, p) => sum + p.rating, 0) / adminProducts.length).toFixed(1)
    : '0';

  document.getElementById('statTotalProducts').textContent = totalProducts;
  document.getElementById('statActiveProducts').textContent = activeProducts;
  document.getElementById('statLowStock').textContent = lowStock;
  document.getElementById('statInventoryValue').textContent = `$${totalValue.toFixed(0)}`;
  document.getElementById('statTotalReviews').textContent = totalReviews;
  document.getElementById('statAvgRating').textContent = avgRating;

  // Products by category
  const catContainer = document.getElementById('dashCategories');
  if (catContainer) {
    const catCounts = {};
    adminProducts.forEach(p => {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    });
    catContainer.innerHTML = Object.entries(catCounts).map(([cat, count]) => {
      const maxCount = Math.max(...Object.values(catCounts));
      const pct = (count / maxCount * 100).toFixed(0);
      return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:0.9rem;font-weight:500">${cat}</span>
            <span style="font-size:0.85rem;color:var(--admin-text-light)">${count} products</span>
          </div>
          <div style="height:8px;background:var(--admin-bg);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--admin-accent),var(--admin-gold));border-radius:4px;transition:width 0.6s ease"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Low stock alerts
  const alertsContainer = document.getElementById('dashAlerts');
  if (alertsContainer) {
    const lowStockProducts = adminProducts.filter(p => p.stock < 10);
    if (lowStockProducts.length === 0) {
      alertsContainer.innerHTML = '<p style="color:var(--admin-success);font-size:0.9rem">✓ All products are well stocked!</p>';
    } else {
      alertsContainer.innerHTML = lowStockProducts.map(p => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--admin-border)">
          <img src="${p.image}" style="width:36px;height:36px;border-radius:6px;object-fit:cover">
          <div style="flex:1">
            <div style="font-size:0.88rem;font-weight:500">${p.name}</div>
            <div style="font-size:0.78rem;color:var(--admin-text-light)">SKU: ${p.sku}</div>
          </div>
          <span class="status-badge ${p.stock === 0 ? 'status-out' : 'status-low'}">${p.stock === 0 ? 'Out of Stock' : p.stock + ' left'}</span>
        </div>
      `).join('');
    }
  }

  // Recent products
  const recentContainer = document.getElementById('dashRecent');
  if (recentContainer) {
    const recent = [...adminProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    recentContainer.innerHTML = recent.map(p => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--admin-border)">
        <img src="${p.image}" style="width:36px;height:36px;border-radius:6px;object-fit:cover">
        <div style="flex:1">
          <div style="font-size:0.88rem;font-weight:500">${p.name}</div>
          <div style="font-size:0.78rem;color:var(--admin-text-light)">${p.category} · ${formatDate(p.createdAt)}</div>
        </div>
        <span style="font-size:0.88rem;font-weight:600;color:var(--admin-accent)">$${(p.salePrice || p.price).toFixed(2)}</span>
      </div>
    `).join('');
  }
}

// ===== Products Table =====
function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  const search = (document.getElementById('productSearch')?.value || '').toLowerCase();
  const filterCat = document.getElementById('productFilterCat')?.value || '';
  const filterStatus = document.getElementById('productFilterStatus')?.value || '';

  let filtered = adminProducts;

  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search) ||
      p.tags.some(t => t.toLowerCase().includes(search))
    );
  }
  if (filterCat) filtered = filtered.filter(p => p.category === filterCat);
  if (filterStatus) filtered = filtered.filter(p => p.status === filterStatus);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--admin-text-light)">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td class="checkbox-col"><input type="checkbox" class="row-check" value="${p.id}" onchange="toggleSelectProduct(${p.id}, this.checked)"></td>
      <td><img src="${p.image}" class="table-product-img" alt="${p.name}"></td>
      <td>
        <div style="font-weight:500">${p.name}</div>
        <div style="font-size:0.78rem;color:var(--admin-text-light)">${p.sku}</div>
      </td>
      <td>${p.category}</td>
      <td>
        ${p.salePrice ? `<span style="text-decoration:line-through;color:var(--admin-text-light);font-size:0.82rem">$${p.price.toFixed(2)}</span> ` : ''}
        <strong>$${(p.salePrice || p.price).toFixed(2)}</strong>
      </td>
      <td>
        <span class="status-badge ${p.stock === 0 ? 'status-out' : p.stock < 10 ? 'status-low' : 'status-active'}">
          ${p.stock}
        </span>
      </td>
      <td><span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span></td>
      <td>
        <button class="btn-icon btn-edit" onclick="editProduct(${p.id})" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-delete" onclick="deleteProduct(${p.id})" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  // Update category filter options
  const catFilter = document.getElementById('productFilterCat');
  if (catFilter && catFilter.options.length <= 1) {
    const cats = [...new Set(adminProducts.map(p => p.category))];
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

function toggleSelectProduct(id, checked) {
  if (checked) selectedProducts.add(id);
  else selectedProducts.delete(id);
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (selectedProducts.size > 0) {
    bar.classList.remove('hidden');
    document.getElementById('selectedCount').textContent = `${selectedProducts.size} selected`;
  } else {
    bar.classList.add('hidden');
  }
}

function selectAllProducts(checkbox) {
  const checks = document.querySelectorAll('.row-check');
  checks.forEach(cb => {
    cb.checked = checkbox.checked;
    toggleSelectProduct(parseInt(cb.value), checkbox.checked);
  });
}

async function bulkDelete() {
  if (!confirm(`Delete ${selectedProducts.size} products?`)) return;
  try {
    for (const id of selectedProducts) await dbDelete('products', id);
    await loadAdminData();
    selectedProducts.clear();
    updateBulkBar();
    renderProductsTable();
    renderDashboard();
    showAdminToast('Products deleted successfully', 'success');
  } catch (error) {
    showAdminToast(`Products deletion failed: ${error.message}`, 'error');
  }
}

async function bulkSetStatus(status) {
  try {
    for (const p of adminProducts.filter(product => selectedProducts.has(product.id))) {
      await dbUpdate('products', p.id, productRow({ ...p, status }));
    }
    await loadAdminData();
    selectedProducts.clear();
    updateBulkBar();
    renderProductsTable();
    renderDashboard();
    showAdminToast(`Products set to ${status}`, 'success');
  } catch (error) {
    showAdminToast(`Products update failed: ${error.message}`, 'error');
  }
}

// ===== Product Form =====
function renderProductForm() {
  const catSelect = document.getElementById('pfCategory');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">Select Category</option>' +
      adminCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

function updateSubcategories() {
  const catName = document.getElementById('pfCategory').value;
  const cat = adminCategories.find(c => c.name === catName);
  const subSelect = document.getElementById('pfSubcategory');
  if (cat && subSelect) {
    subSelect.innerHTML = '<option value="">Select Subcategory</option>' +
      cat.subcategories.map(s => `<option value="${s}">${s}</option>`).join('');
  } else if (subSelect) {
    subSelect.innerHTML = '<option value="">Select Subcategory</option>';
  }

  // Optional fields toggling
  const jFields = document.getElementById('pfJewelryFields');
  const nFields = document.getElementById('pfNailsFields');
  if (jFields) jFields.style.display = (catName === 'Jewelry') ? 'block' : 'none';
  if (nFields) nFields.style.display = (catName === 'Nails') ? 'block' : 'none';
}

async function generateProduct() {
  const get = id => document.getElementById(id).value;

  const product = {
    id: editingProductId || (adminProducts.length > 0 ? Math.max(...adminProducts.map(p => p.id)) + 1 : 1),
    name: get('pfName'),
    category: get('pfCategory'),
    subcategory: get('pfSubcategory'),
    price: parseFloat(get('pfPrice')) || 0,
    salePrice: get('pfSalePrice') ? parseFloat(get('pfSalePrice')) : null,
    sku: get('pfSKU'),
    stock: parseInt(get('pfStock')) || 0,
    image: get('pfImage'),
    gallery: get('pfGallery') ? get('pfGallery').split('\n').filter(u => u.trim()) : [],
    description: get('pfDescription'),
    shortDescription: get('pfShortDesc'),
    ingredients: get('pfIngredients'),
    benefits: get('pfBenefits'),
    usage: get('pfUsage'),
    tags: get('pfTags') ? get('pfTags').split(',').map(t => t.trim()).filter(t => t) : [],
    brand: get('pfBrand'),
    skinType: get('pfSkinType'),
    shades: get('pfShades') ? get('pfShades').split(',').map(s => s.trim()).filter(s => s) : [],
    material: get('pfMaterial') || undefined,
    color: get('pfCategory') === 'Jewelry' ? (get('pfJewelryColor') || undefined) : (get('pfCategory') === 'Nails' ? (get('pfNailColor') || undefined) : undefined),
    collection: get('pfCollection') || undefined,
    size: get('pfJewelrySize') || undefined,
    finish: get('pfFinish') || undefined,
    shape: get('pfShape') || undefined,
    length: get('pfLength') || undefined,
    badge: get('pfBadge') || null,
    status: get('pfStatus'),
    rating: editingProductId ? (adminProducts.find(p => p.id === editingProductId)?.rating || 0) : 5.0,
    reviews: editingProductId ? (adminProducts.find(p => p.id === editingProductId)?.reviews || 0) : 1,
    featured: document.getElementById('pfFeatured').checked,
    bestSeller: document.getElementById('pfBestSeller').checked,
    newArrival: document.getElementById('pfNewArrival').checked,
    trending: document.getElementById('pfTrending').checked,
    createdAt: editingProductId
      ? adminProducts.find(p => p.id === editingProductId)?.createdAt || new Date().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  };

  if (!product.name || !product.category) {
    showAdminToast('Please fill in at least Name and Category', 'error');
    return;
  }

  try {
    if (editingProductId) {
      await dbUpdate('products', product.id, productRow(product));
      await loadAdminData();
      editingProductId = null;
      document.getElementById('productFormTitle').textContent = 'Add New Product';
      document.getElementById('btnGenerateProduct').textContent = 'Generate Product';
      showAdminToast('Product updated successfully!', 'success');
    } else {
      await dbInsert('products', productRow(product));
      await loadAdminData();
      showAdminToast('Product added successfully!', 'success');
    }
    clearProductForm();
    renderProductsTable();
    renderDashboard();
  } catch (error) {
    showAdminToast(`Product save failed: ${error.message}`, 'error');
  }
}

function clearProductForm() {
  const ids = ['pfName','pfCategory','pfSubcategory','pfPrice','pfSalePrice','pfSKU','pfStock','pfImage','pfGallery','pfDescription','pfShortDesc','pfIngredients','pfBenefits','pfUsage','pfTags','pfBrand','pfSkinType','pfShades','pfBadge','pfMaterial','pfJewelryColor','pfCollection','pfJewelrySize','pfNailColor','pfFinish','pfShape','pfLength'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('pfStatus').value = 'Active';
  ['pfFeatured','pfBestSeller','pfNewArrival','pfTrending'].forEach(id => {
    document.getElementById(id).checked = false;
  });
  const jFields = document.getElementById('pfJewelryFields');
  const nFields = document.getElementById('pfNailsFields');
  if (jFields) jFields.style.display = 'none';
  if (nFields) nFields.style.display = 'none';
  editingProductId = null;
  document.getElementById('productFormTitle').textContent = 'Add New Product';
  document.getElementById('btnGenerateProduct').textContent = 'Generate Product';
}

function editProduct(id) {
  const p = adminProducts.find(prod => prod.id === id);
  if (!p) return;

  editingProductId = id;

  const set = (fieldId, value) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = value || '';
  };

  set('pfName', p.name);
  set('pfCategory', p.category);
  updateSubcategories();
  set('pfSubcategory', p.subcategory);
  set('pfPrice', p.price);
  set('pfSalePrice', p.salePrice);
  set('pfSKU', p.sku);
  set('pfStock', p.stock);
  set('pfImage', p.image);
  set('pfGallery', (p.gallery || []).join('\n'));
  set('pfDescription', p.description);
  set('pfShortDesc', p.shortDescription);
  set('pfIngredients', p.ingredients);
  set('pfBenefits', p.benefits);
  set('pfUsage', p.usage);
  set('pfTags', (p.tags || []).join(', '));
  set('pfBrand', p.brand);
  set('pfSkinType', p.skinType);
  set('pfShades', (p.shades || []).join(', '));
  set('pfBadge', p.badge);
  set('pfStatus', p.status);
  set('pfMaterial', p.material);
  if (p.category === 'Jewelry') set('pfJewelryColor', p.color);
  if (p.category === 'Nails') set('pfNailColor', p.color);
  set('pfCollection', p.collection);
  set('pfJewelrySize', p.size);
  set('pfFinish', p.finish);
  set('pfShape', p.shape);
  set('pfLength', p.length);

  document.getElementById('pfFeatured').checked = p.featured;
  document.getElementById('pfBestSeller').checked = p.bestSeller;
  document.getElementById('pfNewArrival').checked = p.newArrival;
  document.getElementById('pfTrending').checked = p.trending;

  document.getElementById('productFormTitle').textContent = `Edit: ${p.name}`;
  document.getElementById('btnGenerateProduct').textContent = 'Update Product';

  // Switch to form tab
  document.querySelector('[data-tab="add-product"]').click();

  // Scroll to form
  document.getElementById('productFormTitle').scrollIntoView({ behavior: 'smooth' });
}

function deleteProduct(id) {
  const p = adminProducts.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById('deleteModalBody').innerHTML = `
    <p>Are you sure you want to delete <strong>"${p.name}"</strong>?</p>
    <p style="color:var(--admin-text-light);font-size:0.85rem;margin-top:8px">This action cannot be undone.</p>
  `;
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    try {
      await dbDelete('products', id);
      await loadAdminData();
      renderProductsTable();
      renderDashboard();
      closeDeleteModal();
      showAdminToast('Product deleted successfully', 'success');
    } catch (error) {
      showAdminToast(`Product deletion failed: ${error.message}`, 'error');
    }
  };
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
}

// ===== Categories Manager =====
function renderCategoriesManager() {
  const container = document.getElementById('categoriesList');
  if (!container) return;

  container.innerHTML = adminCategories.map(cat => `
    <div style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--admin-border)">
      <img src="${cat.banner}" style="width:60px;height:44px;border-radius:8px;object-fit:cover">
      <div style="flex:1">
        <div style="font-weight:600">${cat.name}</div>
        <div style="font-size:0.82rem;color:var(--admin-text-light)">${cat.subcategories.join(', ')}</div>
      </div>
      <span style="font-size:0.82rem;color:var(--admin-text-light)">${adminProducts.filter(p => p.category === cat.name).length} products</span>
      <div class="toggle-switch ${cat.featured ? 'on' : ''}" onclick="toggleCategoryFeatured(${cat.id})"></div>
      <button class="btn-icon btn-edit" onclick="editCategory(${cat.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-icon btn-delete" onclick="deleteCategory(${cat.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `).join('');
}

async function addCategory() {
  const name = document.getElementById('newCatName').value;
  const subs = document.getElementById('newCatSubs').value;
  const banner = document.getElementById('newCatBanner').value;

  if (!name) { showAdminToast('Category name is required', 'error'); return; }

  const newCat = {
    id: adminCategories.length > 0 ? Math.max(...adminCategories.map(c => c.id)) + 1 : 1,
    name: name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: '',
    banner: banner || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=80',
    subcategories: subs ? subs.split(',').map(s => s.trim()).filter(s => s) : [],
    featured: false,
    order: adminCategories.length + 1
  };

  try {
    await dbInsert('categories', categoryRow(newCat));
    await loadAdminData();
    renderCategoriesManager();
    renderProductForm();
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatSubs').value = '';
    document.getElementById('newCatBanner').value = '';
    showAdminToast('Category added successfully!', 'success');
  } catch (error) {
    showAdminToast(`Category creation failed: ${error.message}`, 'error');
  }
}

async function editCategory(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (!cat) return;

  const newName = prompt('Category name:', cat.name);
  if (newName === null) return;
  const newSubs = prompt('Subcategories (comma-separated):', cat.subcategories.join(', '));
  const newBanner = prompt('Banner image URL:', cat.banner);

  if (newName) cat.name = newName;
  if (newSubs !== null) cat.subcategories = newSubs.split(',').map(s => s.trim()).filter(s => s);
  if (newBanner) cat.banner = newBanner;

  try {
    await dbUpdate('categories', id, categoryRow(cat));
    await loadAdminData();
    renderCategoriesManager();
    renderProductForm();
    showAdminToast('Category updated successfully!', 'success');
  } catch (error) {
    showAdminToast(`Category update failed: ${error.message}`, 'error');
  }
}

async function deleteCategory(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (!cat) return;
  if (!confirm(`Delete category "${cat.name}"?`)) return;

  try {
    await dbDelete('categories', id);
    await loadAdminData();
    renderCategoriesManager();
    renderProductForm();
    showAdminToast('Category deleted successfully', 'success');
  } catch (error) {
    showAdminToast(`Category deletion failed: ${error.message}`, 'error');
  }
}

async function toggleCategoryFeatured(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (cat) {
    cat.featured = !cat.featured;
    try {
      await dbUpdate('categories', id, categoryRow(cat));
      await loadAdminData();
      renderCategoriesManager();
    } catch (error) {
      showAdminToast(`Category update failed: ${error.message}`, 'error');
    }
  }
}

// ===== Banners Manager =====
function renderBannersManager() {
  // News banner
  const nb = adminBanners.newsBanner || {};
  document.getElementById('nbText').value = nb.text || '';
  document.getElementById('nbEnabled').checked = nb.enabled || false;

  // Promo banner
  const pb = adminBanners.promoBanner || {};
  document.getElementById('pbTitle').value = pb.title || '';
  document.getElementById('pbSubtitle').value = pb.subtitle || '';
  document.getElementById('pbButtonText').value = pb.buttonText || '';
  document.getElementById('pbButtonLink').value = pb.buttonLink || '';
  document.getElementById('pbBgImage').value = pb.backgroundImage || '';
  document.getElementById('pbStartDate').value = pb.startDate || '';
  document.getElementById('pbEndDate').value = pb.endDate || '';
  document.getElementById('pbEnabled').checked = pb.enabled || false;
}

async function saveNewsBanner() {
  adminBanners.newsBanner = {
    enabled: document.getElementById('nbEnabled').checked,
    text: document.getElementById('nbText').value,
    location: 'top',
    schedule: { start: '2026-01-01', end: '2026-12-31' }
  };
  try {
    await dbSaveBanners(adminBanners);
    await loadAdminData();
    showAdminToast('News banner saved successfully!', 'success');
  } catch (error) {
    showAdminToast(`News banner save failed: ${error.message}`, 'error');
  }
}

async function savePromoBanner() {
  adminBanners.promoBanner = {
    enabled: document.getElementById('pbEnabled').checked,
    title: document.getElementById('pbTitle').value,
    subtitle: document.getElementById('pbSubtitle').value,
    buttonText: document.getElementById('pbButtonText').value,
    buttonLink: document.getElementById('pbButtonLink').value,
    backgroundImage: document.getElementById('pbBgImage').value,
    startDate: document.getElementById('pbStartDate').value,
    endDate: document.getElementById('pbEndDate').value
  };
  try {
    await dbSaveBanners(adminBanners);
    await loadAdminData();
    showAdminToast('Promo banner saved successfully!', 'success');
  } catch (error) {
    showAdminToast(`Promo banner save failed: ${error.message}`, 'error');
  }
}

// ===== Hero Manager =====
function renderHeroManager() {
  const container = document.getElementById('heroSlidesList');
  if (!container) return;

  const slides = (adminBanners.heroSlides || []).sort((a, b) => a.order - b.order);
  container.innerHTML = slides.map((slide, i) => `
    <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--admin-bg);border-radius:10px;margin-bottom:12px">
      <span style="font-size:1.2rem;font-weight:700;color:var(--admin-text-light);width:30px">${i + 1}</span>
      <img src="${slide.image}" style="width:80px;height:50px;border-radius:6px;object-fit:cover">
      <div style="flex:1">
        <div style="font-weight:600">${slide.headline}</div>
        <div style="font-size:0.82rem;color:var(--admin-text-light)">${slide.subheadline}</div>
      </div>
      <button class="btn-icon btn-edit" onclick="editHeroSlide(${slide.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-icon btn-delete" onclick="deleteHeroSlide(${slide.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `).join('');
}

async function addHeroSlide() {
  const newSlide = {
    id: Date.now(),
    image: document.getElementById('hsImage').value || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&q=80',
    headline: document.getElementById('hsHeadline').value || 'New Slide',
    subheadline: document.getElementById('hsSubheadline').value || '',
    buttonText: document.getElementById('hsButtonText').value || 'Shop Now',
    buttonLink: document.getElementById('hsButtonLink').value || '#shop',
    order: (adminBanners.heroSlides || []).length + 1
  };

  if (!adminBanners.heroSlides) adminBanners.heroSlides = [];
  adminBanners.heroSlides.push(newSlide);

  try {
    await dbSaveBanners(adminBanners);
    await loadAdminData();
    renderHeroManager();
    ['hsImage','hsHeadline','hsSubheadline','hsButtonText','hsButtonLink'].forEach(id => {
      document.getElementById(id).value = '';
    });
    showAdminToast('Hero slide added successfully!', 'success');
  } catch (error) {
    showAdminToast(`Hero slide save failed: ${error.message}`, 'error');
  }
}

async function editHeroSlide(id) {
  const slide = adminBanners.heroSlides?.find(s => s.id === id);
  if (!slide) return;

  const headline = prompt('Headline:', slide.headline);
  if (headline === null) return;
  const sub = prompt('Subheadline:', slide.subheadline);
  const img = prompt('Image URL:', slide.image);
  const btn = prompt('Button text:', slide.buttonText);
  const link = prompt('Button link:', slide.buttonLink);

  if (headline) slide.headline = headline;
  if (sub !== null) slide.subheadline = sub;
  if (img) slide.image = img;
  if (btn) slide.buttonText = btn;
  if (link) slide.buttonLink = link;

  try {
    await dbSaveBanners(adminBanners);
    await loadAdminData();
    renderHeroManager();
    showAdminToast('Slide updated successfully!', 'success');
  } catch (error) {
    showAdminToast(`Hero slide update failed: ${error.message}`, 'error');
  }
}

async function deleteHeroSlide(id) {
  if (!confirm('Delete this hero slide?')) return;
  adminBanners.heroSlides = adminBanners.heroSlides.filter(s => s.id !== id);
  try {
    await dbSaveBanners(adminBanners);
    await loadAdminData();
    renderHeroManager();
    showAdminToast('Slide deleted successfully', 'success');
  } catch (error) {
    showAdminToast(`Hero slide deletion failed: ${error.message}`, 'error');
  }
}

// ===== Featured Content Manager =====
function renderFeaturedManager() {
  const container = document.getElementById('featuredProductsList');
  if (!container) return;

  container.innerHTML = adminProducts.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--admin-border)">
      <img src="${p.image}" style="width:40px;height:40px;border-radius:6px;object-fit:cover">
      <div style="flex:1">
        <div style="font-size:0.88rem;font-weight:500">${p.name}</div>
        <div style="font-size:0.78rem;color:var(--admin-text-light)">${p.category}</div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer">
        <input type="checkbox" ${p.featured ? 'checked' : ''} onchange="toggleProductFlag(${p.id}, 'featured', this.checked)"> Featured
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer">
        <input type="checkbox" ${p.bestSeller ? 'checked' : ''} onchange="toggleProductFlag(${p.id}, 'bestSeller', this.checked)"> Best Seller
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer">
        <input type="checkbox" ${p.newArrival ? 'checked' : ''} onchange="toggleProductFlag(${p.id}, 'newArrival', this.checked)"> New
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer">
        <input type="checkbox" ${p.trending ? 'checked' : ''} onchange="toggleProductFlag(${p.id}, 'trending', this.checked)"> Trending
      </label>
    </div>
  `).join('');
}

async function toggleProductFlag(id, flag, value) {
  const p = adminProducts.find(prod => prod.id === id);
  if (p) {
    p[flag] = value;
    try {
      await dbUpdate('products', id, productRow(p));
      await loadAdminData();
    } catch (error) {
      showAdminToast(`Product update failed: ${error.message}`, 'error');
    }
  }
}

// ===== Media Library =====
function renderMediaLibrary() {
  const container = document.getElementById('mediaGrid');
  if (!container) return;

  const filter = document.getElementById('mediaSearch')?.value?.toLowerCase() || '';
  const folderFilter = document.getElementById('mediaFolderFilter')?.value || '';

  let filtered = mediaLibrary;

  // Search filter
  if (filter) {
    filtered = filtered.filter(m => m.name.toLowerCase().includes(filter));
  }

  // Folder filter
  if (folderFilter) {
    filtered = filtered.filter(m => m.folder === folderFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px;text-align:center;color:var(--admin-text-light)">
        <p style="font-size:1.1rem">📷 No media found</p>
        <p style="font-size:0.9rem;margin-top:8px">Add images using the form above or try a different search.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(m => `
    <div class="media-item" data-id="${m.id}">
      <div class="media-image-wrap">
        <img src="${m.url}" alt="${m.name}" loading="lazy" onclick="selectMedia('${m.url}')">
        <div class="media-actions-overlay">
          <button class="media-action-btn" onclick="selectMedia('${m.url}')" title="Copy URL">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="media-action-btn" onclick="replaceMediaItem(${m.id})" title="Replace">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <button class="media-action-btn media-action-delete" onclick="deleteMediaItem(${m.id})" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
        <span class="media-folder-badge">${m.folder || 'general'}</span>
      </div>
      <div class="media-item-name" title="${m.name}">${m.name}</div>
      <div class="media-item-date">${formatDate(m.createdAt)}</div>
    </div>
  `).join('');

  // Update folder filter options if they don't exist
  updateFolderFilter();
}

// Update folder filter dropdown
function updateFolderFilter() {
  const folderFilter = document.getElementById('mediaFolderFilter');
  if (!folderFilter) return;

  const folders = [...new Set(mediaLibrary.map(m => m.folder || 'general'))];
  const currentValue = folderFilter.value;
  
  // Only update if options have changed
  if (folderFilter.options.length - 1 !== folders.length) {
    folderFilter.innerHTML = '<option value="">All Folders</option>' +
      folders.map(f => `<option value="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</option>`).join('');
    folderFilter.value = currentValue;
  }
}

async function addMedia() {
  const url = document.getElementById('newMediaUrl').value;
  const name = document.getElementById('newMediaName').value || 'Untitled';
  const folder = document.getElementById('newMediaFolder').value || 'general';

  if (!url) { showAdminToast('Image URL is required', 'error'); return; }

  const media = {
    url: url,
    name: name,
    type: 'image',
    folder: folder,
    created_at: new Date().toISOString()
  };

  try {
    await dbInsert('media_library', media);
    await loadAdminData();
    renderMediaLibrary();
    document.getElementById('newMediaUrl').value = '';
    document.getElementById('newMediaName').value = '';
    showAdminToast('Media added successfully!', 'success');
  } catch (error) {
    showAdminToast(`Media save failed: ${error.message}`, 'error');
  }
}

function selectMedia(url) {
  navigator.clipboard.writeText(url).then(() => {
    showAdminToast('Image URL copied!', 'success');
  });
}

// Delete media item
async function deleteMediaItem(id) {
  const mediaItem = mediaLibrary.find(m => m.id === id);
  if (!mediaItem) {
    showAdminToast('Media item not found', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to delete "${mediaItem.name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    await dbDelete('media_library', id);
    await loadAdminData();
    renderMediaLibrary();
    showAdminToast(`"${mediaItem.name}" deleted successfully!`, 'success');
  } catch (error) {
    showAdminToast(`Failed to delete media: ${error.message}`, 'error');
  }
}

// Replace media item (update URL and/or name)
async function replaceMediaItem(id) {
  const mediaItem = mediaLibrary.find(m => m.id === id);
  if (!mediaItem) {
    showAdminToast('Media item not found', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'admin-modal-overlay open';
  modal.id = 'replaceMediaModal';
  modal.innerHTML = `
    <div class="admin-modal" style="max-width:500px">
      <div class="admin-modal-header">
        <h3>Replace Media</h3>
        <button class="admin-modal-close" onclick="closeReplaceMediaModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="admin-modal-body">
        <div style="margin-bottom:20px">
          <div style="font-weight:600;margin-bottom:8px">Current Image:</div>
          <img src="${mediaItem.url}" alt="${mediaItem.name}" style="max-width:100%;max-height:150px;border-radius:8px;object-fit:cover">
        </div>
        <div class="form-group">
          <label>New Image URL</label>
          <input type="url" id="replaceMediaUrl" value="${mediaItem.url}" placeholder="https://example.com/new-image.jpg">
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>New Name</label>
          <input type="text" id="replaceMediaName" value="${mediaItem.name}" placeholder="Image name">
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Folder</label>
          <select id="replaceMediaFolder">
            <option value="products" ${mediaItem.folder === 'products' ? 'selected' : ''}>Products</option>
            <option value="banners" ${mediaItem.folder === 'banners' ? 'selected' : ''}>Banners</option>
            <option value="hero" ${mediaItem.folder === 'hero' ? 'selected' : ''}>Hero</option>
            <option value="blog" ${mediaItem.folder === 'blog' ? 'selected' : ''}>Blog</option>
            <option value="general" ${mediaItem.folder === 'general' ? 'selected' : ''}>General</option>
          </select>
        </div>
      </div>
      <div class="admin-modal-footer">
        <button class="btn btn-secondary" onclick="closeReplaceMediaModal()">Cancel</button>
        <button class="btn btn-primary" id="confirmReplaceBtn">Save Changes</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('confirmReplaceBtn').addEventListener('click', async () => {
    const newUrl = document.getElementById('replaceMediaUrl').value.trim();
    const newName = document.getElementById('replaceMediaName').value.trim() || 'Untitled';
    const newFolder = document.getElementById('replaceMediaFolder').value;

    if (!newUrl) {
      showAdminToast('Image URL is required', 'error');
      return;
    }

    try {
      const updatedMedia = {
        url: newUrl,
        name: newName,
        type: 'image',
        folder: newFolder
      };

      await dbUpdate('media_library', id, updatedMedia);
      await loadAdminData();
      renderMediaLibrary();
      closeReplaceMediaModal();
      showAdminToast(`"${newName}" updated successfully!`, 'success');
    } catch (error) {
      showAdminToast(`Failed to update media: ${error.message}`, 'error');
    }
  });
}

function closeReplaceMediaModal() {
  const modal = document.getElementById('replaceMediaModal');
  if (modal) modal.remove();
}

// ===== Blog Manager =====
function renderBlogManager() {
  const container = document.getElementById('blogPostsList');
  if (!container) return;

  container.innerHTML = adminBlog.map(post => `
    <div style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--admin-border)">
      <img src="${post.coverImage}" style="width:60px;height:44px;border-radius:8px;object-fit:cover">
      <div style="flex:1">
        <div style="font-weight:600">${post.title}</div>
        <div style="font-size:0.82rem;color:var(--admin-text-light)">${post.author} · ${formatDate(post.publishDate)} · ${post.category}</div>
      </div>
      <span class="status-badge ${post.status === 'published' ? 'status-active' : 'status-draft'}">${post.status}</span>
      <button class="btn-icon btn-edit" onclick="editBlogPost(${post.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-icon btn-delete" onclick="deleteBlogPost(${post.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `).join('');
}

async function addBlogPost() {
  const title = document.getElementById('bpTitle').value;
  const content = document.getElementById('bpContent').value;
  const coverImage = document.getElementById('bpCoverImage').value;
  const author = document.getElementById('bpAuthor').value;
  const category = document.getElementById('bpCategory').value;

  if (!title || !content) { showAdminToast('Title and content are required', 'error'); return; }

  const newPost = {
    id: adminBlog.length > 0 ? Math.max(...adminBlog.map(b => b.id)) + 1 : 1,
    title: title,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    content: content,
    author: author || 'Admin',
    publishDate: new Date().toISOString().split('T')[0],
    category: category || 'Beauty',
    tags: [],
    status: 'published'
  };

  try {
    await dbInsert('blog_posts', blogRow(newPost));
    await loadAdminData();
    renderBlogManager();
    ['bpTitle','bpContent','bpCoverImage','bpAuthor','bpCategory'].forEach(id => {
      document.getElementById(id).value = '';
    });
    showAdminToast('Blog post created successfully!', 'success');
  } catch (error) {
    showAdminToast(`Blog post creation failed: ${error.message}`, 'error');
  }
}

async function editBlogPost(id) {
  const post = adminBlog.find(b => b.id === id);
  if (!post) return;

  const title = prompt('Title:', post.title);
  if (title === null) return;
  const author = prompt('Author:', post.author);
  const category = prompt('Category:', post.category);
  const status = prompt('Status (published/draft):', post.status);

  if (title) post.title = title;
  if (author) post.author = author;
  if (category) post.category = category;
  if (status) post.status = status;

  try {
    await dbUpdate('blog_posts', id, blogRow(post));
    await loadAdminData();
    renderBlogManager();
    showAdminToast('Post updated successfully!', 'success');
  } catch (error) {
    showAdminToast(`Blog post update failed: ${error.message}`, 'error');
  }
}

async function deleteBlogPost(id) {
  if (!confirm('Delete this blog post?')) return;
  try {
    await dbDelete('blog_posts', id);
    await loadAdminData();
    renderBlogManager();
    showAdminToast('Post deleted successfully', 'success');
  } catch (error) {
    showAdminToast(`Blog post deletion failed: ${error.message}`, 'error');
  }
}

// ===== Reviews Manager =====
function renderReviewsManager() {
  const productSelect = document.getElementById('revProductSelect');
  if (productSelect && adminProducts.length > 0) {
    productSelect.innerHTML = '<option value="">-- General Store Review --</option>' +
      adminProducts.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  }

  const container = document.getElementById('reviewsList');
  if (!container) return;

  if (!adminReviews || adminReviews.length === 0) {
    container.innerHTML = '<p style="padding:16px;color:var(--admin-text-light)">No customer reviews created yet.</p>';
    return;
  }

  container.innerHTML = adminReviews.map((r, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px solid var(--admin-border)">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <strong style="font-size:0.95rem;color:var(--admin-text)">${r.author}</strong>
          <span style="font-size:0.75rem;padding:2px 8px;border-radius:12px;background:rgba(248,92,125,0.1);color:var(--blush-600);font-weight:600">${r.subtitle || 'Verified Buyer'}</span>
          <span style="font-size:0.85rem;color:var(--gold-500)">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</span>
        </div>
        <p style="font-size:0.88rem;color:var(--admin-text-light);margin-bottom:6px;font-style:italic">"${r.text}"</p>
        <div style="font-size:0.78rem;color:var(--admin-text-muted)">
          ${r.productName ? `Associated Product: <strong>${r.productName}</strong> · ` : ''}Date: ${r.date || 'Recent'}
        </div>
      </div>
      <button class="btn btn-sm btn-delete" onclick="deleteAdminReview(${r.id})">Delete</button>
    </div>
  `).join('');
}

async function addAdminReview() {
  const author = document.getElementById('revAuthor').value.trim();
  const subtitle = document.getElementById('revSubtitle').value.trim() || 'Verified Buyer';
  const rating = parseInt(document.getElementById('revRating').value) || 5;
  const productName = document.getElementById('revProductSelect').value;
  const text = document.getElementById('revText').value.trim();

  if (!author || !text) {
    showAdminToast('Please fill in Author Name and Review Text', 'error');
    return;
  }

  const initials = author.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const today = new Date().toISOString().split('T')[0];

  const newReview = {
    author,
    initials,
    subtitle,
    rating,
    text,
    product_name: productName || undefined,
    date: today
  };

  try {
    await dbInsert('reviews', newReview);
    await loadAdminData();
    renderReviewsManager();
    document.getElementById('revAuthor').value = '';
    document.getElementById('revText').value = '';
    showAdminToast('New review added! It is now live in "Loved by Thousands".', 'success');
  } catch (error) {
    showAdminToast(`Review creation failed: ${error.message}`, 'error');
  }
}

async function deleteAdminReview(id) {
  if (!confirm('Are you sure you want to delete this review?')) return;
  try {
    await dbDelete('reviews', id);
    await loadAdminData();
    renderReviewsManager();
    showAdminToast('Review deleted successfully', 'success');
  } catch (error) {
    showAdminToast(`Review deletion failed: ${error.message}`, 'error');
  }
}

// ===== Promotions Manager =====
function renderPromotionsManager() {
  const container = document.getElementById('promoCodesList');
  if (!container) return;

  const codes = adminSettings.promotions?.discountCodes || [];
  container.innerHTML = codes.map(code => `
    <div style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--admin-border)">
      <div style="background:var(--admin-bg);padding:8px 16px;border-radius:8px;font-family:monospace;font-weight:700;color:var(--admin-accent)">${code.code}</div>
      <div style="flex:1">
        <div style="font-weight:500">${code.type === 'percentage' ? code.value + '% off' : code.type === 'freeshipping' ? 'Free Shipping' : '$' + code.value + ' off'}</div>
        <div style="font-size:0.82rem;color:var(--admin-text-light)">Min order: $${code.minOrder} · Expires: ${formatDate(code.expires)}</div>
      </div>
      <div class="toggle-switch ${code.active ? 'on' : ''}" onclick="togglePromoCode('${code.code}')"></div>
    </div>
  `).join('');
}

async function addPromoCode() {
  const code = document.getElementById('pcCode').value.toUpperCase();
  const type = document.getElementById('pcType').value;
  const value = parseFloat(document.getElementById('pcValue').value) || 0;
  const minOrder = parseFloat(document.getElementById('pcMinOrder').value) || 0;
  const expires = document.getElementById('pcExpires').value;

  if (!code) { showAdminToast('Code is required', 'error'); return; }

  if (!adminSettings.promotions) adminSettings.promotions = { discountCodes: [] };
  adminSettings.promotions.discountCodes.push({
    code, type, value, minOrder,
    expires: expires || '2026-12-31',
    active: true
  });

  try {
    await dbSaveSingleton('settings', adminSettings);
    await loadAdminData();
    renderPromotionsManager();
    ['pcCode','pcValue','pcMinOrder','pcExpires'].forEach(id => {
      document.getElementById(id).value = '';
    });
    showAdminToast('Promo code added successfully!', 'success');
  } catch (error) {
    showAdminToast(`Promo code save failed: ${error.message}`, 'error');
  }
}

async function togglePromoCode(code) {
  const promo = adminSettings.promotions?.discountCodes?.find(c => c.code === code);
  if (promo) {
    promo.active = !promo.active;
    try {
      await dbSaveSingleton('settings', adminSettings);
      await loadAdminData();
      renderPromotionsManager();
    } catch (error) {
      showAdminToast(`Promo code update failed: ${error.message}`, 'error');
    }
  }
}

// ===== Settings Manager =====
function renderSettingsManager() {
  document.getElementById('setSiteName').value = adminSettings.siteName || '';
  document.getElementById('setTagline').value = adminSettings.tagline || '';
  document.getElementById('setEmail').value = adminSettings.contact?.email || '';
  document.getElementById('setPhone').value = adminSettings.contact?.phone || '';
  document.getElementById('setAddress').value = adminSettings.contact?.address || '';
  document.getElementById('setReddit').value = adminSettings.socialMedia?.reddit || '';
  document.getElementById('setPinterest').value = adminSettings.socialMedia?.pinterest || '';
  document.getElementById('setSeoTitle').value = adminSettings.seo?.title || '';
  document.getElementById('setSeoDesc').value = adminSettings.seo?.description || '';
}

async function saveSettings() {
  adminSettings.siteName = document.getElementById('setSiteName').value;
  adminSettings.tagline = document.getElementById('setTagline').value;
  
  adminSettings.contact = {
    email: document.getElementById('setEmail').value,
    phone: document.getElementById('setPhone').value,
    address: document.getElementById('setAddress').value
  };
  
  adminSettings.socialMedia = {
    reddit: document.getElementById('setReddit').value,
    pinterest: document.getElementById('setPinterest').value
  };
  
  adminSettings.seo = {
    title: document.getElementById('setSeoTitle').value,
    description: document.getElementById('setSeoDesc').value,
    keywords: adminSettings.seo?.keywords || ''
  };

  try {
    await dbSaveSingleton('settings', adminSettings);
    await loadAdminData();
    showAdminToast('Settings saved successfully!', 'success');
  } catch (error) {
    showAdminToast(`Settings save failed: ${error.message}`, 'error');
  }
}

// ===== Footer =====
function renderFooter() {
  const sm = settings.socialMedia || {};

  const socialContainer = document.getElementById('socialLinks');

  if (socialContainer) {
    const icons = {
      reddit: '<i class="fa-brands fa-reddit-alien"></i>',
      pinterest: '<i class="fa-brands fa-pinterest"></i>'
    };

    const platforms = ['reddit', 'pinterest'];
    
    socialContainer.innerHTML = platforms
      .map(platform => {
        const url = sm[platform];
        if (url && url.trim() !== '') {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" title="${platform.charAt(0).toUpperCase() + platform.slice(1)}">${icons[platform]}</a>`;
        }
        return '';
      })
      .filter(html => html !== '')
      .join('');
  }

  const contactEl = document.getElementById('footerContact');
  if (contactEl && settings.contact) {
    contactEl.innerHTML = `
      <li>${settings.contact.email || ''}</li>
      <li>${settings.contact.phone || ''}</li>
      <li style="line-height:1.5">${settings.contact.address || ''}</li>
    `;
  }
}

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

// ============================================
// EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE
// ============================================

// Make ALL functions globally accessible for inline onclick handlers
window.addMedia = addMedia;
window.selectMedia = selectMedia;
window.deleteMediaItem = deleteMediaItem;
window.replaceMediaItem = replaceMediaItem;
window.closeReplaceMediaModal = closeReplaceMediaModal;
window.renderMediaLibrary = renderMediaLibrary;
window.updateFolderFilter = updateFolderFilter;

// Settings
window.saveSettings = saveSettings;
window.renderSettingsManager = renderSettingsManager;

// Products
window.generateProduct = generateProduct;
window.clearProductForm = clearProductForm;
window.updateSubcategories = updateSubcategories;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeDeleteModal = closeDeleteModal;
window.toggleSelectProduct = toggleSelectProduct;
window.selectAllProducts = selectAllProducts;
window.bulkDelete = bulkDelete;
window.bulkSetStatus = bulkSetStatus;
window.renderProductsTable = renderProductsTable;

// Categories
window.addCategory = addCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleCategoryFeatured = toggleCategoryFeatured;

// Banners
window.saveNewsBanner = saveNewsBanner;
window.savePromoBanner = savePromoBanner;
window.addHeroSlide = addHeroSlide;
window.editHeroSlide = editHeroSlide;
window.deleteHeroSlide = deleteHeroSlide;

// Featured
window.toggleProductFlag = toggleProductFlag;

// Blog
window.addBlogPost = addBlogPost;
window.editBlogPost = editBlogPost;
window.deleteBlogPost = deleteBlogPost;

// Reviews
window.addAdminReview = addAdminReview;
window.deleteAdminReview = deleteAdminReview;

// Promotions
window.addPromoCode = addPromoCode;
window.togglePromoCode = togglePromoCode;

// Tabs
window.switchTab = switchTab;

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});