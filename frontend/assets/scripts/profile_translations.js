(function () {
  if (typeof window === "undefined") return;

  window.profileTranslations = {
    vi: {
      metaProfileTitle: "SkyPlan - Hồ sơ",
      "profile.pageTitle": "Hồ sơ của bạn",
      "profile.pageSubtitle": "Cập nhật thông tin tài khoản để trải nghiệm tốt hơn",
      "profile.sidebar.account": "Tài khoản của tôi",
      "profile.sidebar.personal": "Thông tin cá nhân",
      "profile.account.title": "Tài khoản",
      "profile.account.memberId": "Mã số thành viên",
      "profile.account.tier": "Hạng thẻ",
      "profile.account.points": "Điểm tích luỹ",
      "profile.account.pointsUnit": "điểm",
      "profile.account.phone": "Số điện thoại",
      "profile.account.email": "Email",
      "profile.account.password": "Mật khẩu",
      "profile.account.changePw": "Đổi mật khẩu",
      "profile.personal.title": "Thông tin cá nhân",
      "profile.fullNameLabel": "Họ và tên",
      "profile.fullNamePlaceholder": "Nhập họ và tên",
      "profile.emailLabel": "Email",
      "profile.emailPlaceholder": "Nhập email",
      "profile.phoneLabel": "Số điện thoại",
      "profile.phonePlaceholder": "Nhập số điện thoại",
      "profile.dobLabel": "Ngày sinh",
      "profile.genderLabel": "Giới tính",
      "profile.genderSelect": "Chọn",
      "profile.genderMale": "Nam",
      "profile.genderFemale": "Nữ",
      "profile.genderOther": "Khác",
      "profile.saveBtn": "Lưu thay đổi",
      "profile.changePassword.title": "Đổi mật khẩu",
      "profile.changePassword.current": "Mật khẩu hiện tại",
      "profile.changePassword.new": "Mật khẩu mới",
      "profile.changePassword.confirm": "Xác nhận mật khẩu mới",
      "profile.changePassword.hint": "Tối thiểu 6 ký tự",
      "profile.changePassword.cancel": "Hủy",
      "profile.changePassword.save": "Lưu thay đổi",
      "profile.changePassword.success": "Đổi mật khẩu thành công!",
      successMessage: "Cập nhật thành công!",
      "error.requiredName": "Vui lòng nhập họ và tên",
      "error.nameMinLength": "Họ và tên phải có ít nhất 2 ký tự",
      "error.requiredEmail": "Vui lòng nhập email",
      "error.invalidEmail": "Email không hợp lệ",
      "error.requiredPhone": "Vui lòng nhập số điện thoại",
      "error.phoneFormat": "Số điện thoại phải có 10 số và bắt đầu bằng 0",
      "error.requiredDob": "Vui lòng nhập ngày sinh",
      "error.invalidDate": "Ngày sinh không hợp lệ",
      "error.requiredGender": "Vui lòng chọn giới tính"
    },
    en: {
      metaProfileTitle: "SkyPlan - Profile",
      "profile.pageTitle": "Your profile",
      "profile.pageSubtitle": "Update your account information for a better experience",
      "profile.sidebar.account": "My Account",
      "profile.sidebar.personal": "Personal Information",
      "profile.account.title": "Account",
      "profile.account.memberId": "Member ID",
      "profile.account.tier": "Tier",
      "profile.account.points": "Points",
      "profile.account.pointsUnit": "points",
      "profile.account.phone": "Phone",
      "profile.account.email": "Email",
      "profile.account.password": "Password",
      "profile.account.changePw": "Change Password",
      "profile.personal.title": "Personal Information",
      "profile.fullNameLabel": "Full name",
      "profile.fullNamePlaceholder": "Enter your full name",
      "profile.emailLabel": "Email",
      "profile.emailPlaceholder": "Enter your email",
      "profile.phoneLabel": "Phone number",
      "profile.phonePlaceholder": "Enter your phone number",
      "profile.dobLabel": "Date of birth",
      "profile.genderLabel": "Gender",
      "profile.genderSelect": "Select",
      "profile.genderMale": "Male",
      "profile.genderFemale": "Female",
      "profile.genderOther": "Other",
      "profile.saveBtn": "Save changes",
      "profile.changePassword.title": "Change Password",
      "profile.changePassword.current": "Current password",
      "profile.changePassword.new": "New password",
      "profile.changePassword.confirm": "Confirm new password",
      "profile.changePassword.hint": "Minimum 6 characters",
      "profile.changePassword.cancel": "Cancel",
      "profile.changePassword.save": "Save changes",
      "profile.changePassword.success": "Password changed successfully!",
      successMessage: "Updated successfully!",
      "error.requiredName": "Please enter your full name",
      "error.nameMinLength": "Full name must be at least 2 characters",
      "error.requiredEmail": "Please enter your email",
      "error.invalidEmail": "Invalid email address",
      "error.requiredPhone": "Please enter your phone number",
      "error.phoneFormat": "Phone number must be 10 digits and start with 0",
      "error.requiredDob": "Please enter your date of birth",
      "error.invalidDate": "Invalid date of birth",
      "error.requiredGender": "Please select your gender"
    }
  };

  window.applyProfileTranslations = function(lang) {
    const t = window.profileTranslations[lang] || window.profileTranslations.vi;
    
    if (t.metaProfileTitle) document.title = t.metaProfileTitle;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = t[key];
        } else if (el.tagName === 'OPTION') {
          el.textContent = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) el.placeholder = t[key];
    });
  };

  function initProfileLanguage() {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    document.documentElement.lang = lang;
    window.applyProfileTranslations(lang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileLanguage);
  } else {
    initProfileLanguage();
  }
})();

