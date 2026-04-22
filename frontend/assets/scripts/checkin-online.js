document.addEventListener("DOMContentLoaded", async () => {
  if (typeof loadHeaderFooter === "function") {
    await loadHeaderFooter();
  }
  initCheckinOnline();
});

function initCheckinOnline() {
  const form = document.getElementById("checkinForm");
  const bookingCodeInput = document.getElementById("bookingCode");
  const fullNameInput = document.getElementById("fullName");
  const confirmCodeInput = document.getElementById("confirmCode");

  const codeDisplay = document.getElementById("codeDisplay");
  const refreshCodeBtn = document.getElementById("refreshCodeBtn");

  const errorBox = document.getElementById("checkinError");
  const resultCard = document.getElementById("flightResult");
  const resultCode = document.getElementById("resultCode");
  const resultName = document.getElementById("resultName");
  const resultFlightNumber = document.getElementById("resultFlightNumber");
  const resultRoute = document.getElementById("resultRoute");
  const resultDeparture = document.getElementById("resultDeparture");
  const resultSeat = document.getElementById("resultSeat");

  const completeBtn = document.getElementById("completeBtn");
  const successMessage = document.getElementById("successMessage");
  const submitBtn = form?.querySelector(".btn-primary-action");

  let generatedCode = generateConfirmCode();
  codeDisplay.textContent = generatedCode;

  refreshCodeBtn?.addEventListener("click", () => {
    generatedCode = generateConfirmCode();
    codeDisplay.textContent = generatedCode;
    confirmCodeInput.value = "";
    hideError(errorBox);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError(errorBox);
    resultCard.hidden = true;
    successMessage.hidden = true;
    completeBtn.disabled = true;

    const bookingCode = (bookingCodeInput?.value || "").trim().toUpperCase();
    const fullName = normalizeSpaces((fullNameInput?.value || "").trim());
    const confirmCode = (confirmCodeInput?.value || "").trim().toUpperCase();

    if (!bookingCode || bookingCode.length < 6) {
      showError(errorBox, "Vui lòng nhập mã đặt chỗ hợp lệ (tối thiểu 6 ký tự).");
      return;
    }

    if (!isValidVietnameseNoAccentName(fullName)) {
      showError(
        errorBox,
        "Họ và tên cần viết in hoa chữ cái đầu, không dấu (ví dụ: NGUYEN VAN A)."
      );
      return;
    }

    if (confirmCode !== generatedCode) {
      showError(errorBox, "Mã xác nhận không đúng. Vui lòng kiểm tra lại.");
      return;
    }

    const originalSubmitLabel = submitBtn?.textContent || "Xem chuyến bay";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang tra cứu...";
    }

    try {
      const response = await fetch("/api/bookings/checkin/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_code: bookingCode,
          full_name: fullName,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Không thể tra cứu thông tin check-in.");
      }

      renderCheckinResult(payload, {
        resultCode,
        resultName,
        resultFlightNumber,
        resultRoute,
        resultDeparture,
        resultSeat,
      });

      resultCard.hidden = false;
      completeBtn.disabled = false;
      completeBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      showError(errorBox, error?.message || "Không thể tra cứu thông tin check-in.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalSubmitLabel;
      }
    }
  });

  completeBtn?.addEventListener("click", () => {
    successMessage.hidden = false;
    completeBtn.disabled = true;
  });
}

function generateConfirmCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeSpaces(input) {
  return input.replace(/\s+/g, " ");
}

function formatDateTime(isoValue) {
  if (!isoValue) return "-";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function renderCheckinResult(payload, refs) {
  const booking = payload?.booking || {};
  const passenger = payload?.passenger || {};
  const flight = payload?.flight || {};

  refs.resultCode.textContent = booking.booking_code || "-";
  refs.resultName.textContent = passenger.full_name || "-";
  refs.resultFlightNumber.textContent = flight.flight_number || "-";
  refs.resultRoute.textContent = flight.route || "-";
  refs.resultDeparture.textContent = formatDateTime(flight.departure_time);
  refs.resultSeat.textContent = passenger.seat_number || "Chưa chọn";
}

function isValidVietnameseNoAccentName(name) {
  const noAccentPattern = /^[A-Z][A-Z ]*[A-Z]$/;
  return noAccentPattern.test(name) && !/[À-ỹà-ỹ]/.test(name);
}

function showError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

function hideError(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = "";
}
