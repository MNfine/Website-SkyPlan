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

// Form submission
form.addEventListener("submit", function (e) {
  e.preventDefault();

  // Clear all previous errors
  clearAllErrors();

  // Validate form
  if (validateForm()) {
    // Show success toast notification
    if (typeof window.showToast === "function") {
      window.showToast(t("successMessage"), {
        type: "success",
        duration: 2000,
        dismissible: true,
      });
      
      // Redirect to extras page after 2 seconds
      setTimeout(() => {
        window.location.href = "extras.html";
      }, 2000);
    } else {
      alert(t("successMessage") + "\n\n" + t("successDetail"));
      // Redirect immediately if no toast
      window.location.href = "extras.html";
    }
  }
});

// Initialize defaults on page load
document.addEventListener("DOMContentLoaded", function () {
  // Set default nationality to Vietnam after a small delay to ensure datalist is ready
  setTimeout(() => {
    if (nationalityInput && !nationalityInput.value) {
      nationalityInput.value = "Việt Nam";
      formData.nationality = "Việt Nam";
    }
  }, 100);
});
