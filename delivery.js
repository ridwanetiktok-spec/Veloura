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
            // Filter: countries that START WITH the query
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
            const flag = getCountryFlag(country);
            html += `
                <div class="country-dropdown-item ${isSelected ? 'selected' : ''}" data-country="${country}">
                    <span class="country-flag">${flag}</span>
                    <span class="country-name">${country}</span>
                    <span class="country-check">✓</span>
                </div>
            `;
        });

        countryList.innerHTML = html;

        // Click handler for each country
        countryList.querySelectorAll('.country-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
                const country = this.dataset.country;
                selectCountry(country);
                closeDropdown();
            });
        });
    }

    function getCountryFlag(country) {
        // Simple emoji flags for common countries
        const flags = {
            'United States': '🇺🇸',
            'United Kingdom': '🇬🇧',
            'Canada': '🇨🇦',
            'Australia': '🇦🇺',
            'New Zealand': '🇳🇿',
            'France': '🇫🇷',
            'Germany': '🇩🇪',
            'Italy': '🇮🇹',
            'Spain': '🇪🇸',
            'Portugal': '🇵🇹',
            'Netherlands': '🇳🇱',
            'Belgium': '🇧🇪',
            'Switzerland': '🇨🇭',
            'Austria': '🇦🇹',
            'Sweden': '🇸🇪',
            'Norway': '🇳🇴',
            'Denmark': '🇩🇰',
            'Finland': '🇫🇮',
            'Ireland': '🇮🇪',
            'Greece': '🇬🇷',
            'Poland': '🇵🇱',
            'Czechia': '🇨🇿',
            'Ukraine': '🇺🇦',
            'Russia': '🇷🇺',
            'Turkey': '🇹🇷',
            'China': '🇨🇳',
            'Japan': '🇯🇵',
            'South Korea': '🇰🇷',
            'India': '🇮🇳',
            'Brazil': '🇧🇷',
            'Argentina': '🇦🇷',
            'Mexico': '🇲🇽',
            'Chile': '🇨🇱',
            'Colombia': '🇨🇴',
            'Peru': '🇵🇪',
            'Venezuela': '🇻🇪',
            'Cuba': '🇨🇺',
            'Morocco': '🇲🇦',
            'Algeria': '🇩🇿',
            'Tunisia': '🇹🇳',
            'Egypt': '🇪🇬',
            'South Africa': '🇿🇦',
            'Nigeria': '🇳🇬',
            'Kenya': '🇰🇪',
            'Ethiopia': '🇪🇹',
            'United Arab Emirates': '🇦🇪',
            'Saudi Arabia': '🇸🇦',
            'Qatar': '🇶🇦',
            'Kuwait': '🇰🇼',
            'Israel': '🇮🇱',
            'Jordan': '🇯🇴',
            'Lebanon': '🇱🇧',
            'Iran': '🇮🇷',
            'Iraq': '🇮🇶',
            'Pakistan': '🇵🇰',
            'Bangladesh': '🇧🇩',
            'Indonesia': '🇮🇩',
            'Malaysia': '🇲🇾',
            'Singapore': '🇸🇬',
            'Thailand': '🇹🇭',
            'Vietnam': '🇻🇳',
            'Philippines': '🇵🇭',
            'Jamaica': '🇯🇲',
            'Dominican Republic': '🇩🇴',
            'Haiti': '🇭🇹',
            'Bahamas': '🇧🇸',
            'Costa Rica': '🇨🇷',
            'Panama': '🇵🇦',
            'Guatemala': '🇬🇹',
            'Bolivia': '🇧🇴',
            'Ecuador': '🇪🇨',
            'Uruguay': '🇺🇾',
            'Paraguay': '🇵🇾',
            'Malta': '🇲🇹',
        };
        return flags[country] || '🌍';
    }

    function selectCountry(country) {
        selectedCountry = country;
        countrySearch.value = country;
        countryHidden.value = country;
        renderCountryList('');
        closeDropdown();
        // Trigger validation
        validateForm();
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
        const countryVal = countryHidden.value;
        const notes = deliveryNotes.value.trim();

        // ===== VALIDATION =====
        if (!name) {
            showErrorPopup('Please enter your full name.');
            fullName.focus();
            return;
        }

        if (!emailVal || !emailVal.includes('@')) {
            showErrorPopup('Please enter a valid email address.');
            email.focus();
            return;
        }

        if (!phoneVal || phoneVal.length < 7) {
            showErrorPopup('Please enter a valid phone number.');
            phone.focus();
            return;
        }

        if (!addr1) {
            showErrorPopup('Please enter your address.');
            addressLine1.focus();
            return;
        }

        if (!cityVal) {
            showErrorPopup('Please enter your city.');
            city.focus();
            return;
        }

        if (!stateVal) {
            showErrorPopup('Please enter your state/province.');
            state.focus();
            return;
        }

        if (!zipVal || zipVal.length < 3) {
            showErrorPopup('Please enter a valid ZIP/postal code.');
            zipCode.focus();
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

            // ✅ DIRECT REDIRECT - No popup, instant redirect
            window.location.href = '/checkout';

        } catch (error) {
            console.error('❌ Error:', error);
            showErrorPopup('Error saving delivery information: ' + error.message);
            
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

    // Initialize country dropdown with default
    renderCountryList('');
    countrySearch.value = 'United States';
    countryHidden.value = 'United States';

    // Initial validation
    setTimeout(validateForm, 100);

    console.log('✅ Delivery page ready!');
    console.log('🌍 Countries loaded:', COUNTRIES.length);
});