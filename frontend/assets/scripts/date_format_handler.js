/**
 * Global date format handler to ensure consistent date formatting across the site
 * This module handles date formatting and parsing for all pages that use date inputs
 */
(function() {
    // --- Utils ---
    const getLang = () => localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
    const pad2 = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const fmt = (iso, lang) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return lang === 'vi' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
    };
    const parseDDMMToISO = (s) => {
        const m = (s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return '';
        const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
        if (y < 1000 || mo < 1 || mo > 12 || d < 1) return '';
        const maxD = new Date(y, mo, 0).getDate();
        if (d > maxD) return '';
        return `${y}-${pad2(mo)}-${pad2(d)}`;
    };
    const parseMMDDToISO = (s) => {
        const m = (s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return '';
        const mo = Number(m[1]), d = Number(m[2]), y = Number(m[3]);
        if (y < 1000 || mo < 1 || mo > 12 || d < 1) return '';
        const maxD = new Date(y, mo, 0).getDate();
        if (d > maxD) return '';
        return `${y}-${pad2(mo)}-${pad2(d)}`;
    };
    
    // Cache today's date to avoid recalculation
    let TODAY_ISO = null;
    const getTodayISO = () => {
        // Always get the current date to prevent using outdated value
        // especially important for minimum date constraints
        const now = new Date();
        TODAY_ISO = toISO(now);
        return TODAY_ISO;
    };

    /**
     * Switch a date input to text display mode with localized date format
     * @param {HTMLInputElement} input - The date input element
     * @param {string} lang - Current language (vi or en)
     */
    function switchToTextDisplay(input, lang) {
        const iso = input.dataset.isoValue || input.value || '';
        if (iso) input.dataset.isoValue = iso;
        try { input.type = 'text'; } catch (e) { }
        input.value = fmt(input.dataset.isoValue, lang);
        input.placeholder = (lang === 'vi') ? 'dd/mm/yyyy' : 'mm/dd/yyyy';
    }

    /**
     * Switch a date input to native date picker mode
     * @param {HTMLInputElement} input - The date input element
     */
    function switchToDateInput(input) {
        const iso = input.dataset.isoValue || input.value || '';
        if (iso) input.dataset.isoValue = iso;
        try { input.type = 'date'; } catch (e) { }
        input.value = input.dataset.isoValue || '';
        input.placeholder = '';
    }

    /**
     * Ensure today's date is set and minimum dates are enforced
     * This also updates dates that are in the past to today
     */
    function ensureTodayAndMins() {
        const today = getTodayISO();
        
        // Process search.html elements
        const depSearch = document.getElementById('dep');
        const retSearch = document.getElementById('ret');
        if (depSearch && retSearch) {
            depSearch.min = today;
            
            // Check if departure date is in the past, if so, set to today
            let depISO = depSearch.dataset.isoValue || depSearch.value || today;
            if (depISO < today) {
                depISO = today;
                depSearch.dataset.isoValue = today;
                depSearch.value = today;
            }
            
            // ret.min always at least dep
            retSearch.min = depISO;
            let retISO = retSearch.dataset.isoValue || retSearch.value;
            
            // Check if return date is before departure date, if so, set to departure date
            if (retISO && retISO < depISO) {
                retSearch.dataset.isoValue = depISO;
                retSearch.value = depISO;
            }

            // defaults if empty
            if (!depSearch.value && !depSearch.dataset.isoValue) {
                depSearch.value = today;
                depSearch.dataset.isoValue = today;
            }
            if (!retSearch.value && !retSearch.dataset.isoValue) {
                const plus7 = new Date();
                plus7.setDate(plus7.getDate() + 7);
                const rISO = toISO(plus7);
                retSearch.value = rISO;
                retSearch.dataset.isoValue = rISO;
            }
            
            // Ensure isoValue is set even for inputs with predefined values in HTML
            if (depSearch.value && !depSearch.dataset.isoValue) depSearch.dataset.isoValue = depSearch.value;
            if (retSearch.value && !retSearch.dataset.isoValue) retSearch.dataset.isoValue = retSearch.value;
        }
        
        // Process index.html elements
        const depIndex = document.getElementById('departure');
        const retIndex = document.getElementById('return');
        if (depIndex && retIndex) {
            depIndex.min = today;
            
            // Check if departure date is in the past, if so, set to today
            let depISO = depIndex.dataset.isoValue || depIndex.value || today;
            if (depISO < today) {
                depISO = today;
                depIndex.dataset.isoValue = today;
                depIndex.value = today;
            }
            
            // ret.min always at least dep
            retIndex.min = depISO;
            let retISO = retIndex.dataset.isoValue || retIndex.value;
            
            // Check if return date is before departure date, if so, set to departure date
            if (retISO && retISO < depISO) {
                retIndex.dataset.isoValue = depISO;
                retIndex.value = depISO;
            }

            // defaults if empty
            if (!depIndex.value && !depIndex.dataset.isoValue) {
                depIndex.value = today;
                depIndex.dataset.isoValue = today;
            }
            if (!retIndex.value && !retIndex.dataset.isoValue) {
                const plus7 = new Date();
                plus7.setDate(plus7.getDate() + 7);
                const rISO = toISO(plus7);
                retIndex.value = rISO;
                retIndex.dataset.isoValue = rISO;
            }
            
            // Ensure isoValue is set even for inputs with predefined values in HTML
            if (depIndex.value && !depIndex.dataset.isoValue) depIndex.dataset.isoValue = depIndex.value;
            if (retIndex.value && !retIndex.dataset.isoValue) retIndex.dataset.isoValue = retIndex.value;
        }
    }

    /**
     * Set up event listeners for a date input
     * @param {HTMLInputElement} input - The date input element
     */
    function bindDateInput(input) {
        if (!input || input.dataset.boundDate === '1') return;
        
        input.addEventListener('focus', () => {
            // Always update the min date constraints before showing the picker
            const today = getTodayISO();
            
            // Update min date based on input type
            if (input.id === 'dep' || input.id === 'departure') {
                // Departure date can't be before today
                input.min = today;
            } else if (input.id === 'ret' || input.id === 'return') {
                // Return date can't be before departure date
                const depSearchEl = document.getElementById('dep');
                const depIndexEl = document.getElementById('departure');
                
                // Find the relevant departure element based on which page we're on
                const depEl = (depSearchEl && input.id === 'ret') ? depSearchEl : 
                             (depIndexEl && input.id === 'return') ? depIndexEl : null;
                             
                if (depEl) {
                    // Get departure date (use dataset or value, default to today)
                    const depDate = depEl.dataset.isoValue || depEl.value || today;
                    // Set minimum return date to departure date
                    input.min = depDate;
                } else {
                    // Fallback to today if departure element not found
                    input.min = today;
                }
            }
            
            // In VI mode show native picker for quick selection
            if (getLang() === 'vi') {
                switchToDateInput(input);
                try { if (typeof input.showPicker === 'function') input.showPicker(); } catch (e) { }
            }
        });input.addEventListener('blur', () => {
        const lang = getLang();
        const today = getTodayISO();
        
        // Get the current value
        if (input.type === 'date') {
            // user picked via date picker
            input.dataset.isoValue = input.value || input.dataset.isoValue || '';
        } else {
            // user typed; parse based on current language
            let iso;
            if (lang === 'vi') {
                iso = parseDDMMToISO(input.value) || input.dataset.isoValue;
            } else {
                // For English, support both MM/DD/YYYY format and direct entry of ISO format
                const isISOFormat = /^\d{4}-\d{2}-\d{2}$/.test(input.value);
                if (isISOFormat) {
                    iso = input.value;
                } else {
                    iso = parseMMDDToISO(input.value) || input.dataset.isoValue;
                }
            }
            input.dataset.isoValue = iso || input.dataset.isoValue || '';
        }
        
        // Ensure date is not in the past
        if (input.dataset.isoValue && input.dataset.isoValue < today) {
            input.dataset.isoValue = today;
        }
        
        // If this is a departure date field, update the corresponding return date minimum
        if (input.id === 'dep' || input.id === 'departure') {
            // Use our dedicated function to enforce return >= departure
            enforceReturnAfterDeparture();
        }
        
        // Render according to current language
        if (lang === 'vi') switchToTextDisplay(input, lang);
        else switchToDateInput(input);
    });
    
    // Add a change event listener to handle date picker changes directly
    input.addEventListener('change', () => {
        // Update ISO value
        input.dataset.isoValue = input.value || input.dataset.isoValue;
        
        // If departure date changed, update return date constraints
        if (input.id === 'dep' || input.id === 'departure') {
            enforceReturnAfterDeparture();
        }
    });
    
    // Mark this input as having its event handlers bound
    input.dataset.boundDate = '1';
    }

    /**
     * Update date input display based on current language
     * @param {string} lang - Current language (vi or en)
     */
    function updateDateInputsByLang(lang) {
        // Always get the current date first to ensure minimum constraints are enforced
        const today = getTodayISO();
        
        // First pass: Apply constraints and bind event handlers
        
        // Get date inputs by their IDs - handle both search.html and index.html elements
        const depSearch = document.getElementById('dep');
        const retSearch = document.getElementById('ret');
        const depIndex = document.getElementById('departure');
        const retIndex = document.getElementById('return');
        
        // Process search.html elements if they exist
        if (depSearch && retSearch) {
            // Set minimum dates and bind events
            depSearch.min = today;
            bindDateInput(depSearch);
            bindDateInput(retSearch);
            
            // Get the departure date value (ensure it's not in the past)
            let depSearchValue = depSearch.dataset.isoValue || depSearch.value || today;
            if (depSearchValue < today) {
                depSearchValue = today;
                depSearch.dataset.isoValue = today;
                depSearch.value = today;
            }
            
            // Ensure return is not before departure
            retSearch.min = depSearchValue;
            let retSearchValue = retSearch.dataset.isoValue || retSearch.value || '';
            if (retSearchValue && retSearchValue < depSearchValue) {
                retSearch.dataset.isoValue = depSearchValue;
                retSearch.value = depSearchValue;
            }
        }
        
        // Process index.html elements if they exist
        if (depIndex && retIndex) {
            // Set minimum dates and bind events
            depIndex.min = today;
            bindDateInput(depIndex);
            bindDateInput(retIndex);
            
            // Get the departure date value (ensure it's not in the past)
            let depIndexValue = depIndex.dataset.isoValue || depIndex.value || today;
            if (depIndexValue < today) {
                depIndexValue = today;
                depIndex.dataset.isoValue = today;
                depIndex.value = today;
            }
            
            // Ensure return is not before departure
            retIndex.min = depIndexValue;
            let retIndexValue = retIndex.dataset.isoValue || retIndex.value || '';
            if (retIndexValue && retIndexValue < depIndexValue) {
                retIndex.dataset.isoValue = depIndexValue;
                retIndex.value = depIndexValue;
            }
        }
        
        // Second pass: Apply visual formatting based on language
        
        // Format search.html elements
        if (depSearch && retSearch) {
            if (lang === 'vi') {
                switchToTextDisplay(depSearch, lang);
                switchToTextDisplay(retSearch, lang);
            } else {
                switchToDateInput(depSearch);
                switchToDateInput(retSearch);
            }
        }
        
        // Format index.html elements
        if (depIndex && retIndex) {
            if (lang === 'vi') {
                switchToTextDisplay(depIndex, lang);
                switchToTextDisplay(retIndex, lang);
            } else {
                switchToDateInput(depIndex);
                switchToDateInput(retIndex);
            }
        }
    }

    // Initialization that respects prefilled values (from URL/form)
    function initializeWithRealDate() {
        // Treat today's date as 2025-10-22 (per project context) but DO NOT overwrite existing values
        const realToday = new Date(2025, 9, 22); // Month is 0-indexed in JS Date
        TODAY_ISO = toISO(realToday);

        // Default return date suggestion (+7 days)
        const defaultReturn = new Date(realToday);
        defaultReturn.setDate(defaultReturn.getDate() + 7);
        const defaultReturnISO = toISO(defaultReturn);

        // Search page elements
        const depSearch = document.getElementById('dep');
        const retSearch = document.getElementById('ret');

        if (depSearch) {
            // Always set minimums
            depSearch.min = TODAY_ISO;

            // Respect an existing value/dataset set by the page (e.g., from URL params)
            const existingDep = depSearch.dataset.isoValue || depSearch.value || '';
            if (existingDep) {
                depSearch.dataset.isoValue = existingDep;
                depSearch.value = existingDep;
            } else {
                depSearch.dataset.isoValue = TODAY_ISO;
                depSearch.value = TODAY_ISO;
            }

            if (retSearch) {
                // Minimum return is at least departure
                const depISO = depSearch.dataset.isoValue || TODAY_ISO;
                retSearch.min = depISO;

                const existingRet = retSearch.dataset.isoValue || retSearch.value || '';
                if (existingRet) {
                    // Clamp if earlier than departure
                    const clamped = existingRet < depISO ? depISO : existingRet;
                    retSearch.dataset.isoValue = clamped;
                    retSearch.value = clamped;
                } else {
                    retSearch.dataset.isoValue = defaultReturnISO;
                    retSearch.value = defaultReturnISO;
                }
            }
        }

        // Index page elements
        const depIndex = document.getElementById('departure');
        const retIndex = document.getElementById('return');

        if (depIndex) {
            depIndex.min = TODAY_ISO;

            const existingDep = depIndex.dataset.isoValue || depIndex.value || '';
            if (existingDep) {
                depIndex.dataset.isoValue = existingDep;
                depIndex.value = existingDep;
            } else {
                depIndex.dataset.isoValue = TODAY_ISO;
                depIndex.value = TODAY_ISO;
            }

            if (retIndex) {
                const depISO = depIndex.dataset.isoValue || TODAY_ISO;
                retIndex.min = depISO;

                const existingRet = retIndex.dataset.isoValue || retIndex.value || '';
                if (existingRet) {
                    const clamped = existingRet < depISO ? depISO : existingRet;
                    retIndex.dataset.isoValue = clamped;
                    retIndex.value = clamped;
                } else {
                    retIndex.dataset.isoValue = defaultReturnISO;
                    retIndex.value = defaultReturnISO;
                }
            }
        }

        // Apply formatting/min constraints according to language
        updateDateInputsByLang(getLang());
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize with the real date instead of historical dates from 2023
        initializeWithRealDate();
        console.log('Date format handler initialized with current date (October 22, 2025)');
    });

    // React to language changes immediately
    document.addEventListener('languageChanged', (e) => {
        const lang = (e && e.detail && e.detail.lang) || getLang();
        updateDateInputsByLang(lang);
        console.log('Date formats updated for language:', lang);
    });

    /**
     * Enforce that return date is never before departure date
     * Call this whenever departure date changes
     */
    function enforceReturnAfterDeparture() {
        const today = getTodayISO();
        
        // Handle search.html elements
        const depSearch = document.getElementById('dep');
        const retSearch = document.getElementById('ret');
        if (depSearch && retSearch) {
            const depValue = depSearch.dataset.isoValue || depSearch.value || today;
            const retValue = retSearch.dataset.isoValue || retSearch.value;
            
            // Update min date for return
            retSearch.min = depValue;
            
            // If return date is before departure date, update it
            if (retValue && retValue < depValue) {
                retSearch.dataset.isoValue = depValue;
                retSearch.value = depValue;
                
                // Update display based on language
                const lang = getLang();
                if (lang === 'vi') {
                    switchToTextDisplay(retSearch, lang);
                }
            }
        }
        
        // Handle index.html elements
        const depIndex = document.getElementById('departure');
        const retIndex = document.getElementById('return');
        if (depIndex && retIndex) {
            const depValue = depIndex.dataset.isoValue || depIndex.value || today;
            const retValue = retIndex.dataset.isoValue || retIndex.value;
            
            // Update min date for return
            retIndex.min = depValue;
            
            // If return date is before departure date, update it
            if (retValue && retValue < depValue) {
                retIndex.dataset.isoValue = depValue;
                retIndex.value = depValue;
                
                // Update display based on language
                const lang = getLang();
                if (lang === 'vi') {
                    switchToTextDisplay(retIndex, lang);
                }
            }
        }
    }
    
    // Expose public methods for use in other scripts
    window.dateFormatHandler = {
        updateDateInputsByLang,
        ensureTodayAndMins,
        enforceReturnAfterDeparture,
        toISO,
        getTodayISO,
        formatDate: fmt,
        parseDDMMToISO,
        parseMMDDToISO,
        switchToTextDisplay,
        switchToDateInput
    };
})();