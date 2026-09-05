// ============================================
// DELIVERY PAGE - Save & Redirect to Payment
// ============================================

// ============================================
// COUNTRY LIST (Alphabetical)
// ============================================

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
    "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas",
    "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize",
    "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
    "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon",
    "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China",
    "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
    "Czechia", "Democratic Republic of the Congo", "Denmark", "Djibouti",
    "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
    "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
    "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
    "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
    "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
    "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives",
    "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
    "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
    "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
    "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
    "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
    "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
    "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
    "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
    "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
    "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// ============================================
// SUPABASE SETUP
// ============================================

function initSupabase() {
    if (window.supabaseClient) {
        console.log('✅ Supabase client already available');
        return window.supabaseClient;
    }

    console.log('🔄 Initializing Supabase client...');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔑 Supabase URL found:', !!supabaseUrl);
    console.log('🔑 Supabase Key found:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase environment variables not found.');
        return null;
    }

    if (typeof window.supabase !== 'undefined') {
        window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized');
        return window.supabaseClient;
    }

    // Load Supabase library dynamically
    console.log('📦 Loading Supabase library...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        if (typeof window.supabase !== 'undefined') {
            window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log('✅ Supabase client loaded and initialized');
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
// DOM READY
// ============================================

document.addEventListener("DOMContentLoaded", function() {

    console.log('📄 Delivery page loaded');

    // ===== ELEMENTS =====
    const form = document.getElementById('deliveryForm');
    const continueBtn = document.getElementById('continueBtn');

    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const addressLine1 = document.getElementById('addressLine1');
    const addressLine2 = document.getElementById('addressLine2');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const zipCode = document.getElementById('zipCode');
    const countrySearch = document.getElementById('countrySearch');
    const countrySelect = document.getElementById('country');
    const deliveryNotes = document.getElementById('deliveryNotes');

    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const subtotalDisplay = document.getElementById('subtotalDisplay');
    const totalDueDisplay = document.getElementById('totalDueDisplay');

    const popupOverlay = document.getElementById('popup-overlay');
    const popupMessage = document.getElementById('popup-message');
    const popupClose = document.getElementById('popup-close');

    // ==========================================
    // POPULATE COUNTRIES
    // ==========================================

    function populateCountries() {
        // Populate select with all countries
        COUNTRIES.forEach(function(country) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            if (country === 'United States') {
                option.selected = true;
            }
            countrySelect.appendChild(option);
        });

        // Set search input placeholder
        countrySearch.placeholder = 'Search country...';
        
        // Set initial value
        countrySearch.value = 'United States';
    }

    populateCountries();

    // ==========================================
    // COUNTRY SEARCH
    // ==========================================

    countrySearch.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        // Show/hide options based on search
        const options = countrySelect.options;
        let hasMatch = false;
        
        for (let i = 0; i < options.length; i++) {
            const country = options[i].value.toLowerCase();
            if (country.includes(query)) {
                options[i].style.display = '';
                hasMatch = true;
            } else {
                options[i].style.display = 'none';
            }
        }
    });

    // When select changes, update search input
    countrySelect.addEventListener('change', function() {
        countrySearch.value = this.value;
        // Reset search filter
        const options = this.options;
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = '';
        }
    });

    // When clicking on search input, show all options
    countrySearch.addEventListener('focus', function() {
        const options = countrySelect.options;
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = '';
        }
        // Reset the search value to show all
        if (this.value.trim() === '') {
            // Keep as is
        }
    });

    // ==========================================
    // LOAD CART
    // ==========================================

    function loadCart() {
        const cart = JSON.parse(localStorage.getItem('luxbeauty_cart') || '[]');
        let products = JSON.parse(localStorage.getItem('luxbeauty_products') || '[]');

        console.log('🛒 Cart:', cart.length, 'items');

        if (products.length === 0 && window.products && window.products.length > 0) {
            products = window.products;
            localStorage.setItem('luxbeauty_products', JSON.stringify(products));
        }

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-secondary);">
                    <i class="fas fa-shopping-cart" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    Your cart is empty.
                    <br><br>
                    <a href="/" style="color:var(--veloura-rose-gold);text-decoration:none;">Continue Shopping →</a>
                </div>
            `;
            totalAmount.textContent = '$0.00';
            subtotalDisplay.textContent = '$0.00';
            totalDueDisplay.textContent = '$0.00';
            continueBtn.disabled = true;
            continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Payment';
            return;
        }

        if (products.length === 0) {
            cartItems.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-secondary);">
                    <i class="fas fa-spinner fa-spin" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    Loading your items...
                </div>
            `;
            setTimeout(loadCart, 1000);
            return;
        }

        let html = '';
        let total = 0;

        cart.forEach(function(item) {
            const product = products.find(function(p) {
                return String(p.id) === String(item.id);
            });

            if (product) {
                const price = product.salePrice || product.price;
                const itemTotal = price * item.qty;
                total += itemTotal;

                html += `
                    <div class="item">
                        <div class="item-img">
                            <img src="${product.image || 'logo/logo.png'}" alt="${product.name}">
                        </div>
                        <div class="item-details">
                            <div class="item-name">${product.name}</div>
                            <div class="item-qty">Qty ${item.qty}</div>
                        </div>
                        <div class="item-price">$${itemTotal.toFixed(2)}</div>
                    </div>
                `;
            }
        });

        cartItems.innerHTML = html;

        const formattedTotal = '$' + total.toFixed(2);
        totalAmount.textContent = formattedTotal;
        subtotalDisplay.textContent = formattedTotal;
        totalDueDisplay.textContent = formattedTotal;

        continueBtn.disabled = false;
        continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Payment';
    }

    loadCart();

    // ==========================================
    // POPUP
    // ==========================================

    function showPopup(message, isSuccess = false) {
        const icon = isSuccess ? '✅' : '❌';
        const title = isSuccess ? 'Success!' : 'Error';
        popupMessage.innerHTML = `
            <div class="icon ${isSuccess ? 'success' : 'error'}">${icon}</div>
            <h3>${title}</h3>
            <p>${message}</p>
            <button id="popupActionBtn">${isSuccess ? 'Continue to Payment' : 'OK'}</button>
        `;
        popupOverlay.classList.add('show');

        document.getElementById('popupActionBtn').addEventListener('click', function() {
            popupOverlay.classList.remove('show');
            if (isSuccess) {
                window.location.href = '/checkout';
            }
        });
    }

    popupClose.addEventListener('click', function() {
        popupOverlay.classList.remove('show');
    });

    // ==========================================
    // SAVE DELIVERY INFO
    // ==========================================

    async function saveDeliveryInfo(data) {
        console.log('📦 Saving delivery info to Supabase...');
        console.log('📝 Data:', data);

        const supabase = window.supabaseClient;

        if (!supabase) {
            console.warn('⚠️ Supabase not available, using demo mode');
            return { success: true, demo: true };
        }

        try {
            const { data: result, error } = await supabase
                .from('delivery_infos')
                .insert([data])
                .select();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw new Error(error.message);
            }

            console.log('✅ Delivery info saved!', result);
            return { success: true, data: result };
        } catch (err) {
            console.error('❌ Error:', err);
            throw err;
        }
    }

    // ==========================================
    // FORM SUBMIT
    // ==========================================

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        console.log('🔄 Form submitted!');

        // Get values
        const name = fullName.value.trim();
        const emailVal = email.value.trim();
        const phoneVal = phone.value.trim();
        const addr1 = addressLine1.value.trim();
        const addr2 = addressLine2.value.trim();
        const cityVal = city.value.trim();
        const stateVal = state.value.trim();
        const zipVal = zipCode.value.trim();
        const countryVal = countrySelect.value;
        const notes = deliveryNotes.value.trim();

        // ===== VALIDATION =====
        if (!name) {
            showPopup('Please enter your full name.');
            fullName.focus();
            return;
        }

        if (!emailVal || !emailVal.includes('@')) {
            showPopup('Please enter a valid email address.');
            email.focus();
            return;
        }

        if (!phoneVal || phoneVal.length < 7) {
            showPopup('Please enter a valid phone number.');
            phone.focus();
            return;
        }

        if (!addr1) {
            showPopup('Please enter your address.');
            addressLine1.focus();
            return;
        }

        if (!cityVal) {
            showPopup('Please enter your city.');
            city.focus();
            return;
        }

        if (!stateVal) {
            showPopup('Please enter your state/province.');
            state.focus();
            return;
        }

        if (!zipVal || zipVal.length < 3) {
            showPopup('Please enter a valid ZIP/postal code.');
            zipCode.focus();
            return;
        }

        // Check cart
        const cart = JSON.parse(localStorage.getItem('luxbeauty_cart') || '[]');
        if (cart.length === 0) {
            showPopup('Your cart is empty. Please add items first.');
            return;
        }

        // ===== DISABLE BUTTON =====
        continueBtn.disabled = true;
        continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Prepare data
            const deliveryData = {
                full_name: name,
                email: emailVal,
                phone: phoneVal,
                address_line1: addr1,
                address_line2: addr2 || null,
                city: cityVal,
                state: stateVal,
                zip_code: zipVal,
                country: countryVal,
                delivery_notes: notes || null
            };

            // Save to Supabase
            const result = await saveDeliveryInfo(deliveryData);
            console.log('✅ Delivery info saved!', result);

            // Store in localStorage for payment page
            localStorage.setItem('delivery_infos', JSON.stringify(deliveryData));

            // Show success and redirect
            showPopup('Your delivery information has been saved successfully!', true);

        } catch (error) {
            console.error('❌ Error:', error);
            showPopup('Error saving delivery information: ' + error.message);
            
            continueBtn.disabled = false;
            continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Payment';
        }
    });

    // ==========================================
    // VALIDATION ON INPUT
    // ==========================================

    function validateForm() {
        const name = fullName.value.trim();
        const emailVal = email.value.trim();
        const phoneVal = phone.value.trim();
        const addr1 = addressLine1.value.trim();
        const cityVal = city.value.trim();
        const stateVal = state.value.trim();
        const zipVal = zipCode.value.trim();

        const isValid = (
            name.length > 0 &&
            emailVal.length > 0 &&
            emailVal.includes('@') &&
            phoneVal.length >= 7 &&
            addr1.length > 0 &&
            cityVal.length > 0 &&
            stateVal.length > 0 &&
            zipVal.length >= 3
        );

        continueBtn.disabled = !isValid;
        return isValid;
    }

    // Add listeners
    [fullName, email, phone, addressLine1, addressLine2, city, state, zipCode, deliveryNotes].forEach(function(input) {
        if (input) {
            input.addEventListener('input', validateForm);
            input.addEventListener('change', validateForm);
        }
    });

    // Initial validation
    setTimeout(validateForm, 100);

    console.log('✅ Delivery page ready!');
    console.log('🌍 Countries loaded:', COUNTRIES.length);
});