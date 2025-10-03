// Form state
const formData = {
    lastname: '',
    firstname: '',
    cccd: '',
    dob: '',
    gender: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    customCity: '',
    nationality: 'Việt Nam',
    customNationality: '',
    notes: '',
    confirm: false
};

// DOM element references
const form = document.getElementById('passengerForm');
const citySelect = document.getElementById('city');
const customCityGroup = document.getElementById('customCity-group');
const cityGroup = document.getElementById('city-group');
const nationalitySelect = document.getElementById('nationality');
const customNationalityGroup = document.getElementById('customNationality-group');
const nationalityGroup = document.getElementById('nationality-group');
const notesTextarea = document.getElementById('notes');

// City dropdown change handler
citySelect.addEventListener('change', function(e) {
    const value = e.target.value;
    formData.city = value;
    
    if (value === 'Khác') {
        customCityGroup.style.display = 'block';
        cityGroup.classList.remove('full-width');
    } else {
        customCityGroup.style.display = 'none';
        cityGroup.classList.add('full-width');
        formData.customCity = '';
        document.getElementById('customCity').value = '';
        clearError('customCity');
    }
});

// Nationality dropdown change handler
nationalitySelect.addEventListener('change', function(e) {
    const value = e.target.value;
    formData.nationality = value;
    
    if (value === 'Khác') {
        customNationalityGroup.style.display = 'block';
        nationalityGroup.classList.remove('full-width');
    } else {
        customNationalityGroup.style.display = 'none';
        nationalityGroup.classList.add('full-width');
        formData.customNationality = '';
        document.getElementById('customNationality').value = '';
        clearError('customNationality');
    }
});

// Date input auto-formatting (MM/DD/YYYY)
document.getElementById('dob').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length >= 5) {
        value = value.slice(0, 5) + '/' + value.slice(5);
    }
    if (value.length > 10) {
        value = value.slice(0, 10);
    }
    
    e.target.value = value;
    formData.dob = value;
});

// Numeric-only handlers for phone and national ID
document.getElementById('phoneNumber').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
    formData.phoneNumber = e.target.value;
});

document.getElementById('cccd').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
    formData.cccd = e.target.value;
});

// Character counter for notes field (max 500)
notesTextarea.addEventListener('input', function(e) {
    let value = e.target.value;
    
    if (value.length > 500) {
        value = value.substring(0, 500);
        e.target.value = value;
    }
    
    formData.notes = value;
    updateCharCounter(value.length);
});

function updateCharCounter(count) {
    const counter = document.querySelector('.char-counter');
    counter.textContent = `${count}/500 ký tự`;
}

// Generic handler for other inputs/selects/textarea
const inputs = form.querySelectorAll('input:not(#dob):not(#phoneNumber):not(#cccd):not(#confirm), select:not(#city):not(#nationality), textarea');
inputs.forEach(input => {
    input.addEventListener('input', function(e) {
        formData[e.target.name] = e.target.value;
        clearError(e.target.name);
    });
});

// Confirm checkbox handler
document.getElementById('confirm').addEventListener('change', function(e) {
    formData.confirm = e.target.checked;
    clearError('confirm');
});

// Validation functions
function validateName(value, fieldName) {
    const vietnameseNameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
    
    if (!value.trim()) {
        return `Vui lòng nhập ${fieldName}`;
    } else if (!vietnameseNameRegex.test(value)) {
        return `${fieldName} không được chứa số hoặc ký tự đặc biệt`;
    } else if (value.trim().length < 2) {
        return `${fieldName} phải có ít nhất 2 ký tự`;
    }
    return '';
}

function validateForm() {
    let isValid = true;
    const errors = {};
    
    // Validate last name
    const lastnameError = validateName(formData.lastname, 'Họ');
    if (lastnameError) {
        errors.lastname = lastnameError;
        isValid = false;
    }
    
    // Validate first name
    const firstnameError = validateName(formData.firstname, 'Tên');
    if (firstnameError) {
        errors.firstname = firstnameError;
        isValid = false;
    }
    
    // Validate national ID (CCCD/CMND)
    if (!formData.cccd) {
        errors.cccd = 'Vui lòng nhập số CCCD/CMND';
        isValid = false;
    } else if (formData.cccd.length !== 12 && formData.cccd.length !== 9) {
        errors.cccd = 'Số CCCD phải có 12 số hoặc CMND có 9 số';
        isValid = false;
    }
    
    // Validate date of birth
    if (!formData.dob) {
        errors.dob = 'Vui lòng nhập ngày sinh';
        isValid = false;
    } else {
        const parts = formData.dob.split('/');
        if (parts.length !== 3) {
            errors.dob = 'Định dạng ngày sinh: mm/dd/yyyy';
            isValid = false;
        } else {
            const month = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            if (month < 1 || month > 12) {
                errors.dob = 'Tháng không hợp lệ (1-12)';
                isValid = false;
            } else if (day < 1 || day > 31) {
                errors.dob = 'Ngày không hợp lệ (1-31)';
                isValid = false;
            } else if (year < 1900 || year > new Date().getFullYear()) {
                errors.dob = 'Năm không hợp lệ';
                isValid = false;
            } else {
                const age = new Date().getFullYear() - year;
                if (age < 1) {
                    errors.dob = 'Hành khách phải từ 1 tuổi trở lên';
                    isValid = false;
                }
            }
        }
    }
    
    // Validate gender
    if (!formData.gender) {
        errors.gender = 'Vui lòng chọn giới tính';
        isValid = false;
    }
    
    // Validate phone number
    if (!formData.phoneNumber) {
        errors.phoneNumber = 'Vui lòng nhập số điện thoại';
        isValid = false;
    } else if (formData.phoneNumber.length !== 10 || !formData.phoneNumber.startsWith('0')) {
        errors.phoneNumber = 'Số điện thoại phải có 10 số và bắt đầu bằng 0';
        isValid = false;
    }
    
    // Validate email
    if (!formData.email) {
        errors.email = 'Vui lòng nhập email';
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Email không đúng định dạng';
        isValid = false;
    }
    
    // Validate address
    if (!formData.address.trim()) {
        errors.address = 'Vui lòng nhập địa chỉ thường trú';
        isValid = false;
    }
    
    // Validate city
    if (!formData.city) {
        errors.city = 'Vui lòng chọn tỉnh/thành phố';
        isValid = false;
    }
    
    // Validate custom city
    if (formData.city === 'Khác' && !formData.customCity.trim()) {
        errors.customCity = 'Vui lòng nhập tỉnh/thành phố của bạn';
        isValid = false;
    }
    
    // Validate nationality
    if (!formData.nationality) {
        errors.nationality = 'Vui lòng chọn quốc tịch';
        isValid = false;
    }
    
    // Validate custom nationality
    if (formData.nationality === 'Khác' && !formData.customNationality.trim()) {
        errors.customNationality = 'Vui lòng nhập quốc tịch của bạn';
        isValid = false;
    }
    
    // Validate confirmation checkbox
    if (!formData.confirm) {
        errors.confirm = 'Vui lòng xác nhận thông tin';
        isValid = false;
    }
    
    // Display errors
    Object.keys(errors).forEach(key => showError(key, errors[key]));
    
    return isValid;
}

function showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = document.getElementById(fieldName);
    
    if (errorElement) {
        errorElement.textContent = message;
    }
    
    if (inputElement) {
        inputElement.classList.add('error');
    }
}

function clearError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = document.getElementById(fieldName);
    
    if (errorElement) {
        errorElement.textContent = '';
    }
    
    if (inputElement) {
        inputElement.classList.remove('error');
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.textContent = '');
    
    const inputs = document.querySelectorAll('.error');
    inputs.forEach(input => input.classList.remove('error'));
}

// Form submission
form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Clear all previous errors
    clearAllErrors();
    
    // Validate form
    if (validateForm()) {
        console.log('Form Data:', formData);
        alert('Thông tin đã được xác nhận thành công!\n\nDữ liệu đã được ghi vào Console.');
    } else {
        alert('Vui lòng kiểm tra lại thông tin và điền đầy đủ các trường bắt buộc.');
    }
});

// Initialize defaults on page load
document.addEventListener('DOMContentLoaded', function() {
    nationalitySelect.value = 'Việt Nam';
    formData.nationality = 'Việt Nam';
});
