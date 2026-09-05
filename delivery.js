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
    const countryList = document.getElementById('countryList');
    const countryHidden = document.getElementById('country');
    const deliveryNotes = document.getElementById('deliveryNotes');

    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const subtotalDisplay = document.getElementById('subtotalDisplay');
    const totalDueDisplay = document.getElementById('totalDueDisplay');

    const popupOverlay = document.getElementById('popup-overlay');
    const popupMessage = document.getElementById('popup-message');
    const popupClose = document.getElementById('popup-close');

    let selectedCountry = 'United States';

    // ==========================================
    // LUXURY COUNTRY DROPDOWN
    // ==========================================

    function renderCountryList(filter = '') {
        const query = filter.toLowerCase().trim();
        let filteredCountries = COUNTRIES;

        if (query) {
            filteredCountries = COUNTRIES.filter(function(country) {
                return country.toLowerCase().startsWith(query);
            });
        }

        if (filteredCountries.length === 0) {
            countryList.innerHTML = `
                <div class="country-dropdown-empty">
                    <i class="fas fa-search" style="display:block;font-size:20px;margin-bottom:6px;opacity:0.5;"></i>
                    No countries found
                </div>
            `;
            return;
        }

        let html = '';
        filteredCountries.forEach(function(country) {
            const isSelected = (country === selectedCountry);
            html += `
                <div class="country-dropdown-item ${isSelected ? 'selected' : ''}" data-country="${country}">
                    <span class="country-name">${country}</span>
                    <span class="country-check">✓</span>
                </div>
            `;
        });

        countryList.innerHTML = html;

        countryList.querySelectorAll('.country-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
                const country = this.dataset.country;
                selectCountry(country);
                closeDropdown();
            });
        });
    }


    function selectCountry(country) {
        selectedCountry = country;
        countrySearch.value = country;
        countryHidden.value = country;
        renderCountryList('');
        closeDropdown();
        // Re-format country-dependent fields
        formatPhoneInput();
        formatZipInput();
        if (phone.classList.contains('invalid')) validatePhoneField();
        if (zipCode.classList.contains('invalid')) validateZipField();
    }

    function openDropdown() {
        const dropdown = document.querySelector('.country-dropdown');
        dropdown.classList.add('open');
        renderCountryList(countrySearch.value);
    }

    function closeDropdown() {
        const dropdown = document.querySelector('.country-dropdown');
        dropdown.classList.remove('open');
    }

    function toggleDropdown() {
        const dropdown = document.querySelector('.country-dropdown');
        if (dropdown.classList.contains('open')) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    // Search input events
    countrySearch.addEventListener('input', function() {
        const query = this.value;
        const dropdown = document.querySelector('.country-dropdown');
        
        if (query.length > 0) {
            dropdown.classList.add('open');
            renderCountryList(query);
        } else {
            renderCountryList('');
            // Keep dropdown open if it was open
            if (dropdown.classList.contains('open')) {
                renderCountryList('');
            }
        }
    });

    countrySearch.addEventListener('focus', function() {
        openDropdown();
    });

    countrySearch.addEventListener('blur', function() {
        // Delay close to allow click on dropdown item
        setTimeout(function() {
            closeDropdown();
        }, 200);
    });

    // Keyboard support
    countrySearch.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDropdown();
            this.blur();
        }
        if (e.key === 'Enter') {
            const selected = document.querySelector('.country-dropdown-item.selected');
            if (selected) {
                selectCountry(selected.dataset.country);
            } else {
                const first = document.querySelector('.country-dropdown-item');
                if (first) {
                    selectCountry(first.dataset.country);
                }
            }
            closeDropdown();
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = document.querySelectorAll('.country-dropdown-item');
            if (items.length > 0) {
                let currentIdx = -1;
                items.forEach(function(item, idx) {
                    if (item.classList.contains('selected')) {
                        currentIdx = idx;
                    }
                });
                const nextIdx = (currentIdx + 1) % items.length;
                items.forEach(function(item) { item.classList.remove('selected'); });
                items[nextIdx].classList.add('selected');
                items[nextIdx].scrollIntoView({ block: 'nearest' });
            }
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const items = document.querySelectorAll('.country-dropdown-item');
            if (items.length > 0) {
                let currentIdx = 0;
                items.forEach(function(item, idx) {
                    if (item.classList.contains('selected')) {
                        currentIdx = idx;
                    }
                });
                const prevIdx = (currentIdx - 1 + items.length) % items.length;
                items.forEach(function(item) { item.classList.remove('selected'); });
                items[prevIdx].classList.add('selected');
                items[prevIdx].scrollIntoView({ block: 'nearest' });
            }
        }
    });

    // Click outside to close
    document.addEventListener('click', function(e) {
        const wrapper = document.querySelector('.country-select-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            closeDropdown();
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
    // INLINE VALIDATION HELPERS
    // ==========================================

    function setFieldError(input, errorId, message) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
        input.classList.add('invalid');
        input.setAttribute('aria-invalid', 'true');
        if (input.getAttribute('aria-describedby') !== errorId) {
            input.setAttribute('aria-describedby', errorId);
        }
    }

    function clearFieldError(input, errorId) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('show');
        }
        input.classList.remove('invalid');
        input.setAttribute('aria-invalid', 'false');
    }

    // ==========================================
    // PHONE AUTO-FORMATTING
    // ==========================================

    function formatPhoneInput() {
        const country = countryHidden.value || 'United States';
        const raw = phone.value;

        if (country === 'United States') {
            let digits = raw.replace(/\D/g, '');
            // Normalize an 11-digit "1" prefixed US number (country code) to national
            if (digits.length === 11 && digits.charAt(0) === '1') {
                digits = digits.slice(1);
            }
            digits = digits.slice(0, 10);

            let formatted = '';
            if (digits.length > 0) {
                formatted = '+1';
                if (digits.length > 0) formatted += ' (';
                if (digits.length <= 3) {
                    formatted += digits;
                } else {
                    formatted += digits.slice(0, 3) + ') ';
                }
                if (digits.length > 3 && digits.length <= 6) {
                    formatted += digits.slice(3);
                } else if (digits.length > 6) {
                    formatted += digits.slice(3, 6) + '-' + digits.slice(6);
                }
            }
            if (phone.value !== formatted) phone.value = formatted;
        } else {
            // International: keep allowed characters, cap at 15 digits
            let cleaned = '';
            let digitCount = 0;
            for (let i = 0; i < raw.length; i++) {
                const ch = raw.charAt(i);
                if (/[0-9]/.test(ch)) {
                    if (digitCount < 15) {
                        cleaned += ch;
                        digitCount++;
                    }
                } else if (/[\s()+*#.-]/.test(ch)) {
                    cleaned += ch;
                }
            }
            if (phone.value !== cleaned) phone.value = cleaned;
        }
    }

    // ==========================================
    // ZIP CODE FORMATTING
    // ==========================================

    function formatZipInput() {
        const country = countryHidden.value || 'United States';

        if (country === 'United States') {
            const digits = zipCode.value.replace(/\D/g, '').slice(0, 9);
            let formatted = digits;
            if (digits.length > 5) {
                formatted = digits.slice(0, 5) + '-' + digits.slice(5);
            }
            if (zipCode.value !== formatted) zipCode.value = formatted;
        } else {
            const cleaned = zipCode.value.replace(/[^A-Za-z0-9\s-]/g, '').slice(0, 10);
            if (zipCode.value !== cleaned) zipCode.value = cleaned;
        }
    }

    function sanitizeAlphaInput(input, allowApostrophe) {
        const pattern = allowApostrophe ? /[^A-Za-z\s'-]/g : /[^A-Za-z\s-]/g;
        const cleaned = input.value.replace(pattern, '');
        if (input.value !== cleaned) input.value = cleaned;
    }

    // ==========================================
    // FIELD VALIDATORS
    // ==========================================

    const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function validateNameField() {
        const value = fullName.value.trim();
        if (!value) {
            setFieldError(fullName, 'fullName-error', 'Please enter your full name.');
            return false;
        }
        if (!/^[A-Za-z\s'-]+$/.test(value) || value.length < 2) {
            setFieldError(fullName, 'fullName-error', 'Names may only contain letters, spaces, hyphens, and apostrophes.');
            return false;
        }
        clearFieldError(fullName, 'fullName-error');
        return true;
    }

    function validateEmailField() {
        const value = email.value.trim();
        if (!value) {
            setFieldError(email, 'email-error', 'Please enter your email address.');
            return false;
        }
        if (!VALID_EMAIL.test(value)) {
            setFieldError(email, 'email-error', 'Please enter a valid email address.');
            return false;
        }
        clearFieldError(email, 'email-error');
        return true;
    }

    function validatePhoneField() {
        const value = phone.value.trim();
        const digits = value.replace(/\D/g, '');
        if (!value) {
            setFieldError(phone, 'phone-error', 'Please enter your phone number.');
            return false;
        }
        if (/[^\d\s()+-]/.test(value)) {
            setFieldError(phone, 'phone-error', 'Phone numbers may only contain digits, spaces, parentheses, and hyphens.');
            return false;
        }
        if (digits.length < 7 || digits.length > 15) {
            setFieldError(phone, 'phone-error', 'Please enter a valid phone number (7-15 digits).');
            return false;
        }
        clearFieldError(phone, 'phone-error');
        return true;
    }

    function validateAddress1Field() {
        const value = addressLine1.value.trim();
        if (!value || value.length < 3) {
            setFieldError(addressLine1, 'addressLine1-error', 'Please enter your street address.');
            return false;
        }
        clearFieldError(addressLine1, 'addressLine1-error');
        return true;
    }

    function validateCityField() {
        const value = city.value.trim();
        if (!value) {
            setFieldError(city, 'city-error', 'Please enter your city.');
            return false;
        }
        if (!/^[A-Za-z\s'-]+$/.test(value) || value.length < 2) {
            setFieldError(city, 'city-error', 'City names may only contain letters, spaces, hyphens, and apostrophes.');
            return false;
        }
        clearFieldError(city, 'city-error');
        return true;
    }

    function validateStateField() {
        const value = state.value.trim();
        if (!value) {
            setFieldError(state, 'state-error', 'Please enter your state/province.');
            return false;
        }
        if (!/^[A-Za-z\s-]+$/.test(value) || value.length < 2) {
            setFieldError(state, 'state-error', 'State/province may only contain letters, spaces, and hyphens.');
            return false;
        }
        clearFieldError(state, 'state-error');
        return true;
    }

    function validateZipField() {
        const country = countryHidden.value || 'United States';
        const value = zipCode.value.trim();

        if (!value) {
            setFieldError(zipCode, 'zipCode-error', 'Please enter your ZIP/postal code.');
            return false;
        }

        if (country === 'United States') {
            if (!/^\d{5}(-\d{4})?$/.test(value)) {
                setFieldError(zipCode, 'zipCode-error', 'Enter a 5-digit ZIP code (e.g. 90210) or ZIP+4.');
                return false;
            }
        } else {
            if (value.length < 3 || !/^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}$/.test(value)) {
                setFieldError(zipCode, 'zipCode-error', 'Enter a valid postal code (3-10 characters).');
                return false;
            }
        }

        clearFieldError(zipCode, 'zipCode-error');
        return true;
    }

    function validateForm() {
        return [
            validateNameField(),
            validateEmailField(),
            validatePhoneField(),
            validateAddress1Field(),
            validateCityField(),
            validateStateField(),
            validateZipField()
        ].every(Boolean);
    }

    function focusFirstInvalid() {
        const el = document.querySelector('.delivery-form-wrapper input.invalid');
        if (el) el.focus();
    }

    // Wire sanitization + live/blur validation to each field
    const fieldValidators = {
        fullName: validateNameField,
        email: validateEmailField,
        phone: validatePhoneField,
        addressLine1: validateAddress1Field,
        city: validateCityField,
        state: validateStateField,
        zipCode: validateZipField
    };

    Object.keys(fieldValidators).forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', function() {
            if (id === 'phone') {
                formatPhoneInput();
            } else if (id === 'zipCode') {
                formatZipInput();
            } else if (id === 'fullName' || id === 'city') {
                sanitizeAlphaInput(el, true);
            } else if (id === 'state') {
                sanitizeAlphaInput(el, false);
            }

            // Live-clear an error once the field becomes valid
            if (el.classList.contains('invalid')) {
                fieldValidators[id]();
            }
        });

        el.addEventListener('blur', function() {
            fieldValidators[id]();
        });
    });

    // ==========================================
    // SHOW ERROR POPUP (Only for errors)
    // ==========================================

    function showErrorPopup(message) {
        popupMessage.innerHTML = `
            <div class="icon error">❌</div>
            <h3>Error</h3>
            <p>${message}</p>
            <button id="popupActionBtn">OK</button>
        `;
        popupOverlay.classList.add('show');

        document.getElementById('popupActionBtn').addEventListener('click', function() {
            popupOverlay.classList.remove('show');
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
    // FORM SUBMIT - DIRECT REDIRECT (No Success Popup)
    // ==========================================

    async function handleSubmit() {
        if (continueBtn.disabled || continueBtn.dataset.processing === 'true') {
            console.log('⏳ Already processing');
            return;
        }

        console.log('🔄 Form submitted!');

        // Show inline errors and stop if any field is invalid
        if (!validateForm()) {
            focusFirstInvalid();
            return;
        }

        // Check cart
        const cart = JSON.parse(localStorage.getItem('luxbeauty_cart') || '[]');
        if (cart.length === 0) {
            showErrorPopup('Your cart is empty. Please add items first.');
            return;
        }

        // ===== DISABLE BUTTON =====
        continueBtn.disabled = true;
        continueBtn.dataset.processing = 'true';
        continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Prepare data (all values trimmed on submission)
            const deliveryData = {
                full_name: fullName.value.trim(),
                email: email.value.trim(),
                phone: phone.value.trim(),
                address_line1: addressLine1.value.trim(),
                address_line2: addressLine2.value.trim() || null,
                city: city.value.trim(),
                state: state.value.trim(),
                zip_code: zipCode.value.trim(),
                country: countryHidden.value,
                delivery_notes: deliveryNotes.value.trim() || null
            };

            // Save to Supabase
            const result = await saveDeliveryInfo(deliveryData);
            console.log('✅ Delivery info saved!', result);

            // Store in localStorage for payment page
            localStorage.setItem('delivery_infos', JSON.stringify(deliveryData));

            // ✅ DIRECT REDIRECT - No popup, instant redirect
            window.location.href = '/checkout';

        } catch (error) {
            console.error('❌ Error:', error);
            showErrorPopup('Error saving delivery information: ' + error.message);

            continueBtn.disabled = false;
            delete continueBtn.dataset.processing;
            continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Payment';
        }
    }

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        handleSubmit();
    });

    continueBtn.addEventListener('click', function(event) {
        event.preventDefault();
        handleSubmit();
    });

    // Ensure the button responds to touch on mobile devices
    continueBtn.addEventListener('touchend', function(event) {
        event.preventDefault();
        handleSubmit();
    }, { passive: false });

    // ==========================================
    // VALIDATION SETUP (handlers wired above)
    // ==========================================

    // Initialize country dropdown with default
    renderCountryList('');
    countrySearch.value = 'United States';
    countryHidden.value = 'United States';

    console.log('✅ Delivery page ready!');
    console.log('🌍 Countries loaded:', COUNTRIES.length);
});