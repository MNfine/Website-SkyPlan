// Form state
const formData = {
  lastname: "",
  firstname: "",
  cccd: "",
  dob: "",
  gender: "",
  phoneNumber: "",
  email: "",
  address: "",
  city: "",
  nationality: "Việt Nam",
  notes: "",
  confirm: false,
};

// DOM element references
const form = document.getElementById("passengerForm");
const cityInput = document.getElementById("city");
const cityCustomInput = document.getElementById("city-custom");
const nationalityInput = document.getElementById("nationality");
const nationalityCustomInput = document.getElementById("nationality-custom");
const notesTextarea = document.getElementById("notes");

// Toggle custom input for city
cityInput.addEventListener("change", function () {
  if (this.value === "other") {
    cityCustomInput.style.display = "block";
    formData.city = cityCustomInput.value;
  } else {
    cityCustomInput.style.display = "none";
    formData.city = this.value;
  }
  clearError("city");
});

// Update formData when typing in custom city input
cityCustomInput.addEventListener("input", function () {
  formData.city = this.value;
  clearError("city");
});

// Toggle custom input for nationality
nationalityInput.addEventListener("change", function () {
  if (this.value === "other") {
    nationalityCustomInput.style.display = "block";
    formData.nationality = nationalityCustomInput.value;
  } else {
    nationalityCustomInput.style.display = "none";
    formData.nationality = this.value;
  }
  clearError("nationality");
});

// Update formData when typing in custom nationality input
nationalityCustomInput.addEventListener("input", function () {
  formData.nationality = this.value;
  clearError("nationality");
});

// Date input auto-formatting (DD/MM/YYYY)
document.getElementById("dob").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");

  if (value.length >= 2) {
    value = value.slice(0, 2) + "/" + value.slice(2);
  }
  if (value.length >= 5) {
    value = value.slice(0, 5) + "/" + value.slice(5);
  }
  if (value.length > 10) {
    value = value.slice(0, 10);
  }

  e.target.value = value;
  formData.dob = value;
});

// Numeric-only handlers for phone and national ID
document.getElementById("phoneNumber").addEventListener("input", function (e) {
  e.target.value = e.target.value.replace(/\D/g, "");
  formData.phoneNumber = e.target.value;
});

document.getElementById("cccd").addEventListener("input", function (e) {
  e.target.value = e.target.value.replace(/\D/g, "");
  formData.cccd = e.target.value;
});

// Character counter for notes field (max 500)
notesTextarea.addEventListener("input", function (e) {
  let value = e.target.value;

  if (value.length > 500) {
    value = value.substring(0, 500);
    e.target.value = value;
  }

  formData.notes = value;
  updateCharCounter(value.length);
});

function updateCharCounter(count) {
  const counter = document.querySelector(".char-counter");
  if (counter) {
    const template = t("err.charCounter") || "{count}/500";
    counter.textContent = template.replace("{count}", count);
  }
}

// Generic handler for other inputs/selects/textarea
const inputs = form.querySelectorAll(
  "input:not(#dob):not(#phoneNumber):not(#cccd):not(#city):not(#city-custom):not(#nationality):not(#nationality-custom):not(#confirm), select:not(#city):not(#nationality), textarea"
);
inputs.forEach((input) => {
  input.addEventListener("input", function (e) {
    formData[e.target.name] = e.target.value;
    clearError(e.target.name);
  });
});

// Confirm checkbox handler
document.getElementById("confirm").addEventListener("change", function (e) {
  formData.confirm = e.target.checked;
  clearError("confirm");
});

// Get translation helper
function t(key) {
  const lang = window.getCurrentLang ? window.getCurrentLang() : "vi";
  const translations = window.passengerTranslations || {};
  const keys = key.split(".");
  let value = translations[lang];
  for (const k of keys) {
    if (value && value[k] !== undefined) {
      value = value[k];
    } else {
      return key;
    }
  }
  return value;
}

// Name validation helper
function validateName(value, fieldName) {
  const vietnameseNameRegex =
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;

  if (!value.trim()) {
    return `${t("err.required")} ${fieldName}`;
  } else if (!vietnameseNameRegex.test(value)) {
    return `${fieldName} ${t("err.nameNoSpecialChars")}`;
  } else if (value.trim().length < 2) {
    return `${fieldName} ${t("err.nameMinLength")}`;
  }
  return "";
}

// Form validation
function validateForm() {
  let isValid = true;
  const errors = {};

  // Validate last name
  const lastnameError = validateName(formData.lastname, t("lbl.lastname"));
  if (lastnameError) {
    errors.lastname = lastnameError;
    isValid = false;
  }

  // Validate first name
  const firstnameError = validateName(formData.firstname, t("lbl.firstname"));
  if (firstnameError) {
    errors.firstname = firstnameError;
    isValid = false;
  }

  // Validate national ID (CCCD/CMND)
  if (!formData.cccd) {
    errors.cccd = t("err.cccdRequired");
    isValid = false;
  } else if (formData.cccd.length !== 12 && formData.cccd.length !== 9) {
    errors.cccd = t("err.cccdInvalid");
    isValid = false;
  }

  // Validate date of birth (DD/MM/YYYY format)
  if (!formData.dob) {
    errors.dob = t("err.dobRequired");
    isValid = false;
  } else {
    const parts = formData.dob.split("/");
    if (parts.length !== 3) {
      errors.dob = t("err.dobFormat");
      isValid = false;
    } else {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);

      if (day < 1 || day > 31) {
        errors.dob = t("err.dobDay");
        isValid = false;
      } else if (month < 1 || month > 12) {
        errors.dob = t("err.dobMonth");
        isValid = false;
      } else if (year < 1900 || year > new Date().getFullYear()) {
        errors.dob = t("err.dobYear");
        isValid = false;
      } else {
        const age = new Date().getFullYear() - year;
        if (age < 1) {
          errors.dob = t("err.dobAge");
          isValid = false;
        }
      }
    }
  }

  // Validate gender
  if (!formData.gender) {
    errors.gender = t("err.genderRequired");
    isValid = false;
  }

  // Validate phone number
  if (!formData.phoneNumber) {
    errors.phoneNumber = t("err.phoneRequired");
    isValid = false;
  } else if (
    formData.phoneNumber.length !== 10 ||
    !formData.phoneNumber.startsWith("0")
  ) {
    errors.phoneNumber = t("err.phoneInvalid");
    isValid = false;
  }

  // Validate email
  if (!formData.email) {
    errors.email = t("err.emailRequired");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = t("err.emailInvalid");
    isValid = false;
  }

  // Validate address
  if (!formData.address.trim()) {
    errors.address = t("err.addressRequired");
    isValid = false;
  }

  // Validate city (dropdown or custom input)
  const cityValue =
    cityInput.value === "other" ? cityCustomInput.value : cityInput.value;
  if (!cityValue || !cityValue.trim()) {
    errors.city = t("err.cityRequired");
    isValid = false;
  } else {
    formData.city = cityValue;
  }

  // Validate nationality (dropdown or custom input)
  const nationalityValue =
    nationalityInput.value === "other"
      ? nationalityCustomInput.value
      : nationalityInput.value;
  if (!nationalityValue || !nationalityValue.trim()) {
    errors.nationality = t("err.nationalityRequired");
    isValid = false;
  } else {
    formData.nationality = nationalityValue;
  }

  // Display errors for all fields except confirm checkbox
  Object.keys(errors).forEach((key) => {
    if (key !== "confirm") {
      showError(key, errors[key]);
    }
  });

  // Only show confirm checkbox error if all other fields are valid
  if (isValid && !formData.confirm) {
    showError("confirm", t("err.confirmRequired"));
    isValid = false;
  }

  return isValid;
}

function showError(fieldName, message) {
  const errorElement = document.getElementById(`${fieldName}-error`);
  const inputElement = document.getElementById(fieldName);

  if (errorElement) {
    errorElement.textContent = message;
  }

  if (inputElement) {
    inputElement.classList.add("error");
  }
}

function clearError(fieldName) {
  const errorElement = document.getElementById(`${fieldName}-error`);
  const inputElement = document.getElementById(fieldName);

  if (errorElement) {
    errorElement.textContent = "";
  }

  if (inputElement) {
    inputElement.classList.remove("error");
  }
}

function clearAllErrors() {
  const errorElements = document.querySelectorAll(".error-message");
  errorElements.forEach((el) => (el.textContent = ""));

  const inputs = document.querySelectorAll(".error");
  inputs.forEach((input) => input.classList.remove("error"));
}

// Get auth token for Bearer authorization (using AuthState)
function getAuthToken() {
  if (typeof window.AuthState !== 'undefined') {
    return window.AuthState.getToken();
  }
  
  // Fallback if AuthState not loaded
  try {
    const keys = ['authToken', 'accessToken', 'token', 'jwt'];
    for (const key of keys) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token) return token;
    }
  } catch {}
  
  return null;
}

// Convert DD/MM/YYYY to MM/DD/YYYY for backend
function convertDateForBackend(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return ddmmyyyy;
  return `${parts[1]}/${parts[0]}/${parts[2]}`;
}

// Submit passenger data to backend API or localStorage for guest checkout
async function submitPassengerData() {
  const token = getAuthToken();
  
  // If no token, save to localStorage for guest checkout
  if (!token) {
    console.log('No auth token - saving passenger data to localStorage for guest checkout');
    try {
      const guestPassengerData = {
        lastname: formData.lastname,
        firstname: formData.firstname,
        cccd: formData.cccd,
        dob: convertDateForBackend(formData.dob),
        gender: formData.gender,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        address: formData.address,
        city: formData.city === 'other' ? (cityCustomInput.value || '') : formData.city,
        nationality: formData.nationality === 'other' ? (nationalityCustomInput.value || '') : formData.nationality,
        notes: formData.notes || undefined
      };
      
      localStorage.setItem('skyplan_passenger_data', JSON.stringify(guestPassengerData));
      localStorage.setItem('currentPassenger', JSON.stringify(guestPassengerData));
      
      if (typeof window.showToast === 'function') {
        window.showToast('Passenger information saved successfully!', { type: 'success', duration: 2000 });
      }
      
      return true; // Success for guest checkout
    } catch (error) {
      console.error('Error saving passenger data to localStorage:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Failed to save passenger information', { type: 'error', duration: 3000 });
      } else {
        alert('Failed to save passenger information');
      }
      return false;
    }
  }

  // Prepare data for backend API
  const payload = {
    lastname: formData.lastname,
    firstname: formData.firstname,
    cccd: formData.cccd,
    dob: convertDateForBackend(formData.dob), // Convert DD/MM/YYYY -> MM/DD/YYYY
    gender: formData.gender,
    phoneNumber: formData.phoneNumber,
    email: formData.email,
    address: formData.address,
    city: formData.city === 'other' ? (cityCustomInput.value || '') : formData.city,
    nationality: formData.nationality === 'other' ? (nationalityCustomInput.value || '') : formData.nationality,
    notes: formData.notes || undefined
  };

  // Add custom fields if applicable
  if (formData.city === 'other') {
    payload.customCity = cityCustomInput.value || '';
  }
  if (formData.nationality === 'other') {
    payload.customNationality = nationalityCustomInput.value || '';
  }

  // Prepare headers - only include Authorization if token exists
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log('Submitting passenger data to API:', { headers, payload });
    const response = await fetch('/api/bookings/passenger', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    let result = {};
    try {
      result = await response.json();
    } catch {}
    
    console.log('API Response:', { status: response.status, result });

    if (!response.ok || result.success === false) {
      // If unauthorized but we have token, try guest fallback
      if (response.status === 401) {
        console.log('API returned 401 - falling back to localStorage guest checkout');
        try {
          const guestPassengerData = {
            lastname: formData.lastname,
            firstname: formData.firstname,
            cccd: formData.cccd,
            dob: convertDateForBackend(formData.dob),
            gender: formData.gender,
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            address: formData.address,
            city: formData.city === 'other' ? (cityCustomInput.value || '') : formData.city,
            nationality: formData.nationality === 'other' ? (nationalityCustomInput.value || '') : formData.nationality,
            notes: formData.notes || undefined
          };
          
          localStorage.setItem('skyplan_passenger_data', JSON.stringify(guestPassengerData));
          localStorage.setItem('currentPassenger', JSON.stringify(guestPassengerData));
          
          if (typeof window.showToast === 'function') {
            window.showToast('Passenger information saved successfully!', { type: 'success', duration: 2000 });
          }
          
          return true; // Success with fallback
        } catch (fallbackError) {
          console.error('Fallback localStorage save failed:', fallbackError);
        }
      }
      
      const errorMsg = result.message || 'Request failed';
      if (typeof window.showToast === 'function') {
        window.showToast(errorMsg, { type: 'error', duration: 3000 });
      } else {
        alert(`Error: ${errorMsg}`);
      }
      return false;
    }

    // Success - save passenger data to localStorage for next steps
    try {
      localStorage.setItem('currentPassenger', JSON.stringify(result.passenger || payload));
      localStorage.setItem('skyplan_passenger_data', JSON.stringify(result.passenger || payload));
    } catch {}

    // Show success message
    const successMsg = t('successMessage') || 'Passenger information saved successfully!';
    if (typeof window.showToast === 'function') {
      window.showToast(successMsg, { type: 'success', duration: 2000 });
    } else {
      alert(successMsg);
    }

    return true;
  } catch (error) {
    const errorMsg = error.message || 'Network error occurred';
    if (typeof window.showToast === 'function') {
      window.showToast(errorMsg, { type: 'error', duration: 3000 });
    } else {
      alert(`Error: ${errorMsg}`);
    }
    return false;
  }
}

// Form submission
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Clear all previous errors
  clearAllErrors();

  // Validate form
  if (validateForm()) {
    // Submit to backend API
    const success = await submitPassengerData();
    
    if (success) {
      // Redirect to extras page after successful submission
      setTimeout(() => {
        const currentParams = new URLSearchParams(window.location.search);
        window.location.href = "extras.html?" + currentParams.toString();
      }, 1500);
    }
  }
});

// Check authentication and initialize page
document.addEventListener("DOMContentLoaded", function () {
  // Guest checkout is supported - no authentication required
  // if (typeof window.AuthState !== 'undefined') {
  //   if (!window.AuthState.requireAuth()) {
  //     return; // Will redirect to login if not authenticated
  //   }
  // }
  // Set default nationality to Vietnam after a small delay to ensure datalist is ready
  setTimeout(() => {
    if (nationalityInput && !nationalityInput.value) {
      nationalityInput.value = "Việt Nam";
      formData.nationality = "Việt Nam";
    }
  }, 100);
});
