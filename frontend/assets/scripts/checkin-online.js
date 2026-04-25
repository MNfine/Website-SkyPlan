document.addEventListener("DOMContentLoaded", async () => {
  if (typeof loadHeaderFooter === "function") {
    await loadHeaderFooter();
  }

  if (window.CheckinOnlineI18n && typeof window.CheckinOnlineI18n.applyTranslations === "function") {
    window.CheckinOnlineI18n.applyTranslations(window.CheckinOnlineI18n.getLanguage());
  }

  initCheckinOnline();
});

function getCheckinLanguage() {
  if (window.CheckinOnlineI18n && typeof window.CheckinOnlineI18n.getLanguage === "function") {
    return window.CheckinOnlineI18n.getLanguage();
  }

  if (typeof window.getPersistedLanguage === "function") {
    return window.getPersistedLanguage() === "en" ? "en" : "vi";
  }

  const languageRaw = (localStorage.getItem("language") || "").toLowerCase();
  if (languageRaw === "en" || languageRaw === "vi") return languageRaw;

  const preferredRaw = (localStorage.getItem("preferredLanguage") || "").toLowerCase();
  if (preferredRaw === "en" || preferredRaw === "vi") return preferredRaw;

  return (document.documentElement.lang || "vi").toLowerCase() === "en" ? "en" : "vi";
}

function tCheckin(key) {
  if (window.CheckinOnlineI18n && typeof window.CheckinOnlineI18n.t === "function") {
    return window.CheckinOnlineI18n.t(key, getCheckinLanguage());
  }

  return key;
}

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

  let lastLookupPayload = null;

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
      showError(errorBox, tCheckin("errorBookingCode"));
      return;
    }

    if (!isValidVietnameseNoAccentName(fullName)) {
      showError(errorBox, tCheckin("errorFullName"));
      return;
    }

    if (confirmCode !== generatedCode) {
      showError(errorBox, tCheckin("errorConfirmCode"));
      return;
    }

    const originalSubmitLabel = submitBtn?.textContent || tCheckin("submitButton");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = tCheckin("submitLoading");
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
        throw new Error(payload?.message || tCheckin("errorLookup"));
      }

      renderCheckinResult(payload, {
        resultCode,
        resultName,
        resultFlightNumber,
        resultRoute,
        resultDeparture,
        resultSeat,
      });

      lastLookupPayload = payload;

      resultCard.hidden = false;
      if (!payload?.passenger?.ticket_code) {
        completeBtn.disabled = true;
        showError(errorBox, payload?.checkin_message || tCheckin("errorTicketNotIssued"));
      } else {
        completeBtn.disabled = false;
      }
      completeBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      showError(errorBox, error?.message || tCheckin("errorLookup"));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalSubmitLabel;
      }
    }
  });

  completeBtn?.addEventListener("click", async () => {
    const ticketCode = lastLookupPayload?.passenger?.ticket_code;
    if (!ticketCode) {
      showError(errorBox, lastLookupPayload?.checkin_message || tCheckin("errorTicketNotIssued"));
      return;
    }

    completeBtn.disabled = true;
    completeBtn.textContent = tCheckin("submitLoading");

    try {
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticketCode)}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || tCheckin("errorLookup"));
      }

      successMessage.hidden = false;
      successMessage.textContent = payload.email_sent
        ? "Check-in online thành công! Email xác nhận đã được gửi cho bạn."
        : "Check-in online thành công! Hệ thống chưa gửi được email xác nhận, vui lòng kiểm tra lại sau.";
    } catch (error) {
      showError(errorBox, error?.message || tCheckin("errorLookup"));
      completeBtn.disabled = false;
    } finally {
      completeBtn.textContent = tCheckin("completeButton");
    }
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
  const locale = getCheckinLanguage() === "en" ? "en-GB" : "vi-VN";
  return new Intl.DateTimeFormat(locale, {
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
  refs.resultSeat.textContent = passenger.seat_number || tCheckin("seatNotSelected");
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
