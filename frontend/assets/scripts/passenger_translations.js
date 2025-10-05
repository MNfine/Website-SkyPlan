// assets/scripts/passenger_translations.js
(function () {
  if (typeof window === "undefined") return;

  // Passenger-specific i18n dictionary (independent from index translations)
  const P = {
    en: {
      title: "SkyPlan - Passenger Information",
      steps: ["Search","Select flight","Select fare","Passenger info","Add-on services","Payment"],
      passengerHeader: "PASSENGER INFORMATION",
      lbl: {
        lastname:"Last Name", firstname:"First Name", cccd:"National ID (CCCD/CMND)",
        dob:"Date of Birth", gender:"Gender", phone:"Phone Number", email:"Email",
        address:"Permanent Address", city:"City/Province", customCity:"Enter city/province",
        nationality:"Nationality", customNationality:"Enter your nationality", notes:"Notes"
      },
      ph: {
        lastname:"Enter last name", firstname:"Enter first name", cccd:"Enter ID number",
        dob:"MM/DD/YYYY", phone:"Enter phone number", email:"Enter email",
        address:"Enter your permanent address", customCity:"Enter your city/province",
        customNationality:"Enter your nationality", notes:"Enter notes (if any)"
      },
      gender: ["Select gender","Male","Female","Other"],
      cityDefault: "Select city/province",
      other: "Other",
      notesCounter: "Up to 500 characters",
      terms: "I agree to the terms",
      submit: "Confirm information"
    },
    vi: {
      title: "SkyPlan - Thông Tin Hành Khách",
      steps: ["Tìm kiếm","Chọn chuyến bay","Chọn giá","Thông tin khách hàng","Dịch vụ thêm","Thanh toán"],
      passengerHeader: "THÔNG TIN HÀNH KHÁCH",
      lbl: {
        lastname:"Họ", firstname:"Tên", cccd:"Số CCCD/CMND",
        dob:"Ngày sinh", gender:"Giới tính", phone:"Số điện thoại", email:"Email",
        address:"Địa chỉ thường trú", city:"Tỉnh/Thành phố", customCity:"Nhập tỉnh/thành phố",
        nationality:"Quốc tịch", customNationality:"Nhập quốc tịch của bạn", notes:"Ghi chú"
      },
      ph: {
        lastname:"Nhập họ", firstname:"Nhập tên", cccd:"Nhập số CCCD/CMND",
        dob:"DD/MM/YYYY", phone:"Nhập số điện thoại", email:"Nhập email",
        address:"Nhập địa chỉ thường trú", customCity:"Nhập tỉnh/thành phố của bạn",
        customNationality:"Nhập quốc tịch của bạn", notes:"Nhập ghi chú (nếu có)"
      },
      gender: ["Chọn giới tính","Nam","Nữ","Khác"],
      cityDefault: "Chọn tỉnh/thành phố",
      other: "Khác",
      notesCounter: "Tối đa 500 ký tự",
      terms: "Tôi đồng ý với điều khoản",
      submit: "Xác nhận thông tin"
    }
  };

  const q = (s) => document.querySelector(s);
  const get = (obj, key) => key.split('.').reduce((o,k)=> (o && o[k]!=null)?o[k]:undefined, obj);

  // Replace the label's leading text while preserving the required asterisk element
  function setLabelKeepStar(el, text){
    if (!el) return;
    let n = el.firstChild;
    while (n && n.nodeType===Node.TEXT_NODE && !n.nodeValue.trim()) n = n.nextSibling;
if (n && n.nodeType===Node.TEXT_NODE) n.nodeValue = text + " ";
    else el.insertBefore(document.createTextNode(text + " "), el.firstChild || null);
  }

  // Sync only the flag/icon and active state; keep the label from index_translations.js (EN/VI)
  function syncSelectedFlag(lang, srcOpt){
    const selected = document.querySelector('.selected-lang'); if (!selected) return;
    const src = srcOpt || document.querySelector(`.lang-option[data-lang="${lang}"]`); if (!src) return;

    // Copy icon (image-based or class-based), do NOT change label text
    const srcImg = src.querySelector('img');
    let dstIcon = selected.querySelector('img, .flag, .flag-icon, .fi, [class*="flag"]');

    if (srcImg) {
      if (!dstIcon || dstIcon.tagName!=="IMG"){
        const img=document.createElement('img');
        if (dstIcon) dstIcon.replaceWith(img); else selected.insertBefore(img, selected.firstChild||null);
        dstIcon=img;
      }
      dstIcon.src = srcImg.src;
      const alt = srcImg.getAttribute('alt'); if (alt) dstIcon.alt = alt;
    } else {
      const srcFlag = src.querySelector('.flag, .flag-icon, .fi, [class*="flag"]');
      if (!srcFlag) return;
      if (!dstIcon || dstIcon.tagName==="IMG"){
        const span=document.createElement('span');
        if (dstIcon) dstIcon.replaceWith(span); else selected.insertBefore(span, selected.firstChild||null);
        dstIcon=span;
      }
      dstIcon.className = srcFlag.className;
    }

    // Active state highlight in the dropdown
    document.querySelectorAll('.lang-option')
      .forEach(el => el.classList.toggle('active', el.getAttribute('data-lang')===lang));
  }

  // Apply i18n to all elements in passenger.html that use data-i18n
  function applyPassengerDataI18N(lang){
    const L = P[lang] || P.vi;

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      const val = get(L, key); if (val==null) return;

      // <title> and meta description
      if (el.tagName==='TITLE'){ document.title = String(val); return; }
      if (el.tagName==='META' && el.getAttribute('name')==='description'){ el.setAttribute('content', String(val)); return; }

      // Labels: keep required asterisk
      if (el.tagName==='LABEL'){ setLabelKeepStar(el, String(val)); return; }

      // Inputs/textarea: treat as placeholder when present, otherwise set value
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement){
        if (el.hasAttribute('placeholder')) el.setAttribute('placeholder', String(val));
        else el.value = String(val);
        return;
      }

      // Generic text nodes (span, option, buttons, etc.)
      el.textContent = String(val);
    });

    // Progress steps: ensure coverage even if not all steps have data-i18n
    const steps = document.querySelectorAll('.progress-step .step-label');
    steps.forEach((el,i)=>{ if (L.steps && L.steps[i]!=null) el.textContent = L.steps[i]; });
// Live notes character counter
    const notes = q('#notes'), counter = q('.char-counter');
    if (notes && counter){
      const limit=500;
      const update=()=>{ counter.textContent = `${notes.value?notes.value.length:0}/${limit}`; };
      notes.removeEventListener('input', update);
      notes.addEventListener('input', update);
      update();
    } else if (counter && L.notesCounter) {
      counter.textContent = L.notesCounter;
    }

    // Terms & submit (defensive sync)
    const terms = q('.checkbox-text'); if (terms && L.terms) terms.textContent = L.terms;
    const btn = q('.btn-submit'); if (btn && L.submit) btn.textContent = L.submit;

    // Keep the label text (EN/VI) as rendered by index_translations; only sync the icon
    syncSelectedFlag(lang);
  }

  // Apply index translations first (if present), then passenger translations
  function applyAll(lang){
    document.documentElement.lang = lang;

    // Header/footer and any shared keys
    if (typeof window.applyTranslations === 'function') {
      window.applyTranslations(lang);
    }

    // Passenger-specific UI
    applyPassengerDataI18N(lang);
  }

  // Initialize and re-apply when header/footer are injected
  function init(){
    if (!localStorage.getItem('preferredLanguage')){
      try { localStorage.setItem('preferredLanguage','vi'); } catch {}
    }
    applyAll( (localStorage.getItem('preferredLanguage') || 'vi') );

    const debounce=(fn,ms=70)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms);} };
    const rerender = debounce(()=> applyAll(localStorage.getItem('preferredLanguage') || 'vi'));

    const head=document.getElementById('header-container');
    const foot=document.getElementById('footer-container');
    if (head) new MutationObserver(rerender).observe(head,{childList:true,subtree:true});
    if (foot) new MutationObserver(rerender).observe(foot,{childList:true,subtree:true});
  }

  // Language switch handler (header dropdown)
  document.addEventListener('click', (e)=>{
    const opt = e.target.closest('.lang-option'); if (!opt) return;
    const lang = opt.getAttribute('data-lang'); if (!lang) return;
    try { localStorage.setItem('preferredLanguage', lang); } catch {}
    applyAll(lang);
    syncSelectedFlag(lang, opt);
  });

  document.addEventListener('DOMContentLoaded', init);

  // Optional global export for manual use
  window.applyPassengerLang = applyAll;
})();