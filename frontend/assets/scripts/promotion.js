/* ========= DATA ========= */
const PROMO_ITEMS = [{
        id: 1,
        img: "assets/images/ưu đãi 1.png",
        title: "Noel 2025 Siêu ưu đãi",
        period: "8 Tháng 11 2025 - 24 Tháng 12 2025",
        condition: "Vé nội địa từ 599K",
        badge: "SẮP DIỄN RA",
        detail: {
            heroTitle: "Siêu ưu đãi Giáng sinh\nBay khắp Đông Nam Á",
            subtitle: "Săn vé chỉ từ 599.000đ",
            bullets: [
                { icon: "🎄", text: "Ưu đãi chào mùa Noel – số lượng có hạn" },
                { icon: "✈️", text: "Áp dụng cho các chuyến bay nội địa & khu vực Đông Nam Á" },
                { icon: "💳", text: "Thanh toán online để nhận thêm giảm giá 5%" }
            ],
            coupons: [
                { title: "Giảm 200K", desc: "Đơn từ 1 triệu", code: "NOEL200" }
            ]
        }
    },
    {
        id: 2,
        img: "assets/images/ưu đãi 2.jpg",
        title: "Sale Tết 2026",
        period: "16 Tháng 10 2025 - 1 Tháng 3 2026",
        condition: "Ưu đãi đến 1 Triệu",
        badge: "HOT",
        detail: {
            heroTitle: "Đón Tết an vui",
            subtitle: "Vé Tết giảm đến 1.000.000đ",
            bullets: [
                { icon: "🧧", text: "Áp dụng cho chuyến bay Tết 2026 – mọi chặng nội địa" },
                { icon: "🛫", text: "Hỗ trợ hoàn vé linh hoạt theo chính sách hãng" },
                { icon: "🎁", text: "Thêm quà tặng SkyPlan cho 1000 khách đầu tiên" }
            ],
            coupons: [
                { title: "Tết Sum Vầy", desc: "Giảm 500K cho vé Tết", code: "TET500" },
            ]
        }
    },
    {
        id: 3,
        img: "assets/images/ưu đãi 3.jpg",
        title: "Hè dần sang – Đặt vé ngay",
        period: "14 Tháng 7 2025 - 31 Tháng 12 2025",
        condition: "Giảm đến 50%",
        detail: {
            heroTitle: "Đặt sớm – Bay rẻ hơn",
            subtitle: "Tiết kiệm đến 50% vé khứ hồi",
            bullets: [
                { icon: "☀️", text: "Đặt vé trước 30 ngày để nhận ưu đãi cao nhất" },
                { icon: "🏝️", text: "Áp dụng cho chuyến bay nội địa & quốc tế" },
                { icon: "🧳", text: "Miễn phí 10kg hành lý ký gửi" }
            ],
            coupons: [
                { title: "Summer Deal", desc: "Giảm 10% tất cả vé mùa hè", code: "SUMMER10" }
            ]
        }
    },

    {
        id: 4,
        img: "assets/images/ưu đãi 4.jpg",
        title: "Vi vu tới Thành phố Hồ Chí Minh",
        period: "16 Tháng 10 2025 - 1 Tháng 3 2026",
        condition: "Ưu đãi đến 1 Triệu",
        detail: {
            heroTitle: "Chào mừng bạn đến\nTP.HỒ CHÍ MINH",
            subtitle: "Vé nội địa giá mềm",
            bullets: [
                { icon: "🛫", text: "Nhiều hãng – nhiều khung giờ" },
                { icon: "🎟️", text: "Giá hiển thị là giá cuối trước thanh toán" }
            ],
            coupons: [
                { title: "Nội địa HCM", desc: "Áp dụng chặng đến/đi TPHCM", code: "TPHCMDEAL" }
            ]
        }
    },
    {
        id: 5,
        img: "assets/images/ưu đãi 5.jpg",
        title: "Mua sớm giá tốt",
        period: "Từ nay đến 31 Tháng 12 2025",
        condition: "Giảm thêm 200K",
        detail: {
            heroTitle: "Mua sớm giá tốt",
            subtitle: "Giảm thêm 200K khi thanh toán online",
            bullets: [
                { icon: "🕒", text: "Đặt vé trước 45 ngày để nhận ưu đãi" },
                { icon: "🚀", text: "Chuyến bay nội địa mới được tham gia" }
            ],
            coupons: [
                { title: "EARLY200", desc: "Giảm 200K đơn từ 2 triệu", code: "EARLY200" }
            ]
        }
    },
    {
        id: 6,
        img: "assets/images/ưu đãi 6.png",
        title: "Ưu đãi khi thanh toán qua MoMo",
        period: "1 Tháng 11 2025 - 31 Tháng 1 2026",
        condition: "Giảm 100K khi sử dụng MoMo",
        detail: {
            heroTitle: "Thanh toán dễ dàng cùng MoMo",
            subtitle: "Giảm đến 100K cho mọi chuyến bay",
            bullets: [
                { icon: "💸", text: "Giảm trực tiếp khi thanh toán qua MoMo" },
                { icon: "🎟️", text: "Áp dụng cho cả vé nội địa" },
                { icon: "⚡", text: "Số lượng ưu đãi có hạn mỗi ngày" }
            ],
            coupons: [
                { title: "MoMo Giảm 100K", desc: "Giảm 100K cho đơn từ 1 triệu", code: "MOMO10" }
            ]
        }
    }
];

/* ========= STATE & REFS ========= */
let page = 1;
const PAGE_SIZE = 6;

const gridEl = document.getElementById("promo-grid");
const prevEl = document.getElementById("pg-prev");
const nextEl = document.getElementById("pg-next");
const numbersEl = document.getElementById("pg-numbers");

const detailEl = document.getElementById("promo-detail");
const dHero = document.getElementById("d-hero");
const dTitle = document.getElementById("d-title");
const dSubtitle = document.getElementById("d-subtitle");
const dBullets = document.getElementById("d-bullets");
const dCoupons = document.getElementById("d-coupons");
const dBack = document.getElementById("d-back");
const dGet = document.getElementById("d-get");
const dBook = document.getElementById("d-book");

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

/* ========= RENDER GRID ========= */
function card(p) {
    if (window.getLocalizedItem) p = window.getLocalizedItem(p);
    return `
<article class="card">
  <div class="media">
    <img loading="lazy" referrerpolicy="no-referrer" src="${p.img}" alt="${esc(p.title)}">
    ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
  </div>
  <div class="body">
    <h3 class="title">${esc(p.title)}</h3>
    <div class="meta">
      <div class="row"><span class="label">Thời gian khuyến mãi</span><span>${esc(p.period)}</span></div>
      <div class="row"><span class="label">Giao dịch tối thiểu</span><span>${esc(p.condition)}</span></div>
    </div>
    <div class="cta"><button class="btn" data-id="${p.id}">Xem khuyến mãi</button></div>
  </div>
</article>`;
}

function attachImgFallback(scope){
scope.querySelectorAll('.media img, .promo-hero img').forEach(img=>{
  img.addEventListener('error', ()=>{
    img.src = 'assets/images/placeholder-16x9.jpg'; 
  });
});
}

function renderGrid(){
const start = (page-1)*PAGE_SIZE;
const slice = PROMO_ITEMS.slice(start, start+PAGE_SIZE);
gridEl.innerHTML = slice.map(card).join("");
attachImgFallback(gridEl);
}

/* ========= PAGINATION ========= */
function renderPagination(){
const total = PROMO_ITEMS.length;
const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

prevEl.disabled = page<=1;
nextEl.disabled = page>=totalPages;

numbersEl.innerHTML = "";
for(let i=1;i<=totalPages;i++){
  const btn = document.createElement("button");
  btn.className = "pg-btn";
  btn.textContent = i;
  if(i===page) btn.setAttribute("aria-current","page");
  btn.onclick = ()=>{ page=i; renderAll(); };
  numbersEl.appendChild(btn);
}
}

function renderAll(){
    renderGrid();
    renderPagination();
    if (typeof applyPromotionI18n === "function") applyPromotionI18n(getLang());
  }
  

/* ========= DETAIL ========= */
function openDetail(id){
    window._promoCurrentId = id;
    const base = PROMO_ITEMS.find(x=>x.id===id); if(!base) return;
    // GET TRANSLATED VERSION (EN) IF AVAILABLE
    const p = (window.getLocalizedItem ? window.getLocalizedItem(base) : base);
  
    dHero.src = p.img; dHero.alt = p.title;
    dTitle.innerHTML = esc(p.detail?.heroTitle || p.title).replace(/\n/g,"<br/>");
    dSubtitle.textContent = p.detail?.subtitle || p.condition || "";
  
    dBullets.innerHTML = (p.detail?.bullets||[])
      .map(b=>`<li><span class="emoji">${esc(b.icon||"•")}</span> ${esc(b.text||b)}</li>`)
      .join("");
  
    dCoupons.innerHTML = (p.detail?.coupons||[])
      .map(c=>`
        <div class="coupon-card">
          <div class="coupon-head">
            <div class="coupon-icon">✈️</div>
            <div>
              <div class="coupon-title">${esc(c.title)}</div>
              <div class="coupon-desc">${esc(c.desc||"")}</div>
            </div>
          </div>
          <div class="coupon-actions">
            <div class="coupon-code" data-code="${esc(c.code)}">${esc(c.code)}</div>
            <button class="coupon-copy" data-code="${esc(c.code)}">Copy</button>
          </div>
        </div>
      `).join("");
  
    dCoupons.querySelectorAll(".coupon-copy").forEach(btn=>{
      btn.onclick = async ()=>{
        const code = btn.dataset.code || "";
        try{
          if(navigator.clipboard && window.isSecureContext){
            await navigator.clipboard.writeText(code);
          }else{
            const ta = document.createElement("textarea");
            ta.value = code; ta.readOnly = true; ta.style.position="absolute"; ta.style.left="-9999px";
            document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
          }
          // === i18n for button state ===
          const lang = (typeof getLang === "function") ? getLang() : "vi";
          const copiedText = (window.ui?.[lang]?.copied) || (lang==="en"?"Copied!":"Đã sao chép!");
          btn.textContent = copiedText;
        }catch{
          btn.textContent = "Error";
        }finally{
          const lang = (typeof getLang === "function") ? getLang() : "vi";
          const copyText = (window.ui?.[lang]?.copy) || (lang==="en"?"Copy":"Sao chép");
          setTimeout(()=>btn.textContent = copyText, 1100);
        }
      };
    });
  
    document.querySelector(".promo-pagination").hidden = true;
    gridEl.hidden = true;
    detailEl.hidden = false;
  
    attachImgFallback(detailEl);
    window.scrollTo({top:detailEl.offsetTop-24, behavior:"smooth"});
  }  

function closeDetail(){
detailEl.hidden = true;
gridEl.hidden = false;
document.querySelector(".promo-pagination").hidden = false;
window.scrollTo({top:gridEl.offsetTop-16, behavior:"smooth"});
}

/* ========= INIT ========= */
document.addEventListener("DOMContentLoaded", ()=>{
renderAll();
prevEl.onclick = ()=>{ if(page>1){ page--; renderAll(); } };
nextEl.onclick = ()=>{
  const max = Math.ceil(PROMO_ITEMS.length / PAGE_SIZE);
  if(page < max){ page++; renderAll(); }
};
dBack.onclick = closeDetail;

// 2 CTA demo
if (dBook) dBook.onclick = () => {
    window.location.href = "index.html";
  };
if (typeof applyPromotionI18n === "function") applyPromotionI18n(getLang());
});

document.addEventListener('click', function (e) {
    const btn = e.target.closest('.promo .card .btn[data-id]');
    if (!btn) return;
    e.preventDefault();
    const id = +btn.dataset.id;
    if (!Number.isNaN(id)) openDetail(id);
  });

window.skyplanPromo = {
    rerender() {
      renderAll();
      if (!detailEl.hidden && typeof window._promoCurrentId === 'number') {
        openDetail(window._promoCurrentId); // reopen detail with new language
      }
    }
  };