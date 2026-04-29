const [Map, MapView, Graphic, GraphicsLayer] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/MapView.js",
  "@arcgis/core/Graphic.js",
  "@arcgis/core/layers/GraphicsLayer.js",
]);

const API_BASE = "/api/flights";
const isEmbedMode = new URLSearchParams(window.location.search).get("embed") === "1";
let languageController = null;
let currentLanguage = window.SkyPlanMapI18n.getStoredLanguage();

function t(key, params = {}) {
  if (languageController) {
    return languageController.t(key, params);
  }

  return window.SkyPlanMapI18n.translate(currentLanguage, key, params);
}

const map = new Map({
  basemap: "dark-gray-vector",
});

const view = new MapView({
  container: "viewDiv",
  map,
  center: [106.48330248953283, 17.36666754408967],
  zoom: 5,
  ui: {
    components: [],
  },
});
view.popupEnabled = true;
view.popup.autoOpenEnabled = false;

const flightLineLayer = new GraphicsLayer();
map.add(flightLineLayer);

const airports = [
  {
    province: "Cần Thơ",
    provinceEn: "Can Tho",
    airportName: "Sân bay quốc tế Cần Thơ",
    airportNameEn: "Can Tho International Airport",
    code: "VCA",
    longitude: 105.71215613805612,
    latitude: 10.080578158893125,
  },
  {
    province: "Đà Nẵng",
    provinceEn: "Da Nang",
    airportName: "Sân bay quốc tế Đà Nẵng",
    airportNameEn: "Da Nang International Airport",
    code: "DAD",
    longitude: 108.20255862950854,
    latitude: 16.057186550437873,
  },
  {
    province: "Đắk Lắk",
    provinceEn: "Dak Lak",
    airportName: "Sân bay Buôn Ma Thuột",
    airportNameEn: "Buon Ma Thuot Airport",
    code: "BMV",
    longitude: 108.11759875373512,
    latitude: 12.664602602825711,
  },
  {
    province: "Hà Nội",
    provinceEn: "Ha Noi",
    airportName: "Sân bay quốc tế Nội Bài",
    airportNameEn: "Noi Bai International Airport",
    code: "HAN",
    longitude: 105.80250522385172,
    latitude: 21.21790515241054,
  },
  {
    province: "Hải Phòng",
    provinceEn: "Hai Phong",
    airportName: "Sân bay quốc tế Cát Bi",
    airportNameEn: "Cat Bi International Airport",
    code: "HPH",
    longitude: 106.7230383536199,
    latitude: 20.81874904922658,
  },
  {
    province: "Huế",
    provinceEn: "Hue",
    airportName: "Sân bay quốc tế Phú Bài",
    airportNameEn: "Phu Bai International Airport",
    code: "HUI",
    longitude: 107.70022868129469,
    latitude: 16.397699835035812,
  },
  {
    province: "Khánh Hòa",
    provinceEn: "Khanh Hoa",
    airportName: "Sân bay quốc tế Cam Ranh",
    airportNameEn: "Cam Ranh International Airport",
    code: "CXR",
    longitude: 109.2183086167067,
    latitude: 11.998995276511584,
  },
  {
    province: "Lâm Đồng",
    provinceEn: "Lam Dong",
    airportName: "Sân bay quốc tế Liên Khương",
    airportNameEn: "Lien Khuong International Airport",
    code: "DLI",
    longitude: 108.36827223808027,
    latitude: 11.748778016880447,
  },
  {
    province: "Nghệ An",
    provinceEn: "Nghe An",
    airportName: "Sân bay Vinh",
    airportNameEn: "Vinh Airport",
    code: "VII",
    longitude: 105.66867610938448,
    latitude: 18.72767015118337,
  },
  {
    province: "TP.HCM",
    provinceEn: "Ho Chi Minh City",
    airportName: "Sân bay quốc tế Tân Sơn Nhất",
    airportNameEn: "Tan Son Nhat International Airport",
    code: "SGN",
    longitude: 106.65648227097381,
    latitude: 10.81704518887609,
  },
];

const airportByCode = Object.fromEntries(airports.map((airport) => [airport.code, airport]));

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateDDMMYYYY(dateValue) {
  return `${pad2(dateValue.getDate())}/${pad2(dateValue.getMonth() + 1)}/${dateValue.getFullYear()}`;
}

function getAirportProvince(airport) {
  if (!airport) return "";
  return currentLanguage === "en" ? (airport.provinceEn || airport.province || "") : (airport.province || "");
}

function getAirportName(airport) {
  if (!airport) return "";
  return currentLanguage === "en" ? (airport.airportNameEn || airport.airportName || "") : (airport.airportName || "");
}

const airportLayer = new GraphicsLayer();
map.add(airportLayer);

const airportGraphics = airports.flatMap((airport) => {
  const point = {
    type: "point",
    longitude: airport.longitude,
    latitude: airport.latitude,
  };

  const glowGraphic = new Graphic({
    geometry: point,
    symbol: {
      type: "simple-marker",
      style: "circle",
      size: 13,
      color: [180, 220, 255, 0.25],
      outline: {
        color: [180, 220, 255, 0],
        width: 0,
      },
    },
  });

  const dotGraphic = new Graphic({
    geometry: point,
    symbol: {
      type: "simple-marker",
      style: "circle",
      size: 6,
      color: [210, 235, 255, 0.95],
      outline: {
        color: [255, 255, 255, 0.95],
        width: 0.8,
      },
    },
    attributes: {
      province: airport.province,
      airportName: airport.airportName,
      code: airport.code,
    },
    popupTemplate: {
      title: "{airportName} ({code})",
      content: "<b>Tỉnh/Thành phố:</b> {province}<br><b>Mã sân bay:</b> {code}",
    },
  });

  return [glowGraphic, dotGraphic];
});

airportLayer.addMany(airportGraphics);

const sidebarTitle = document.getElementById("sidebarTitle");
const flightCount = document.getElementById("flightCount");
const flightList = document.getElementById("flightList");
const dateFilter = document.getElementById("dateFilter");
const sidebar = document.getElementById("sidebar");
const backButton = document.getElementById("mapBackButton");
const languageSwitcher = document.getElementById("mapLanguageSwitcher");
const languageLabel = document.getElementById("mapLanguageLabel");
const languageSelect = document.getElementById("mapLanguageSelect");
const languageOptionVi = document.getElementById("mapLanguageOptionVi");
const languageOptionEn = document.getElementById("mapLanguageOptionEn");

languageController = window.SkyPlanMapI18n.initMapInteractLanguage({
  backButton,
  sidebarTitle,
  dateFilter,
  languageSwitcher,
  languageLabel,
  languageSelect,
  languageOptionVi,
  languageOptionEn,
  hideInEmbed: isEmbedMode,
  onLanguageChange: (nextLanguage) => {
    currentLanguage = nextLanguage;
    if (selectedOriginCode) {
      refreshSelectionUI();
    }
  },
});
currentLanguage = languageController.getLanguage();

function toKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c);
}

function fmtPrice(value) {
  const numeric = Number(value || 0);
  const locale = currentLanguage === "en" ? "en-US" : "vi-VN";
  return `${new Intl.NumberFormat(locale).format(numeric)} VND`;
}

function fmtDateTime(isoLike) {
  if (!isoLike) return "--:-- --/--/----";
  const dateTime = new Date(isoLike);
  if (Number.isNaN(dateTime.getTime())) return "--:-- --/--/----";
  const locale = currentLanguage === "en" ? "en-GB" : "vi-VN";
  const time = dateTime.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = formatDateDDMMYYYY(dateTime);
  return `${time} ${date}`;
}

function fmtDateHeader(dateInput) {
  if (!dateInput) {
    return t("allDepartureTimes");
  }

  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateInput;

  if (currentLanguage === "en") {
    return formatDateDDMMYYYY(date);
  }

  const locale = currentLanguage === "en" ? "en-US" : "vi-VN";
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

function isCurrentOrFutureFlight(flight) {
  const departureIso = flight?.departure_time;
  if (!departureIso) return false;
  const departureDate = new Date(departureIso);
  if (Number.isNaN(departureDate.getTime())) return false;
  return departureDate.getTime() >= Date.now();
}

function buildFareUrl(originCode, flight) {
  const destinationCode = flight.arrival_airport || "";
  const params = new URLSearchParams({
    trip_type: "one-way",
    outbound_flight_id: flight.flight_id ? String(flight.flight_id) : flight.id ? String(flight.id) : "",
    outbound_flight_number: flight.flight_number || "",
    outbound_departure_airport: originCode || "",
    outbound_arrival_airport: destinationCode,
    outbound_departure_time: flight.departure_time || "",
    outbound_arrival_time: flight.arrival_time || "",
    outbound_price: flight.price ? String(flight.price) : "",
  });

  return `fare.html?${params.toString()}`;
}

function navigateToFare(originCode, flight) {
  window.location.href = buildFareUrl(originCode, flight);
}

function renderFlights(originCode, destinationCode, flights) {
  const dateText = fmtDateHeader(dateFilter.value);
  const titleBase = destinationCode
    ? t("flightsFromTo", { origin: originCode, destination: destinationCode })
    : t("flightsFrom", { origin: originCode });
  sidebarTitle.textContent = dateFilter.value
    ? `${titleBase}${t("flightsOn", { date: dateText })}`
    : `${titleBase} (${dateText})`;
  flightCount.textContent = flights.length === 1
    ? t("flightsCountOne")
    : t("flightsCount", { count: flights.length });
  flightList.innerHTML = "";

  if (!flights.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = destinationCode
      ? t("noRouteFlights")
      : (dateFilter.value ? t("noAirportDateFlights") : t("noAirportFlights"));
    flightList.appendChild(empty);
    return;
  }

  flights.forEach((flight) => {
    const arrivalCode = flight.arrival_airport;
    const destinationAirport = airportByCode[arrivalCode];
    const originAirport = airportByCode[originCode];

    const destinationLabel = destinationAirport
      ? `${arrivalCode} ${getAirportProvince(destinationAirport)}`
      : arrivalCode;

    const distanceKm = destinationAirport && originAirport
      ? toKm(originAirport.latitude, originAirport.longitude, destinationAirport.latitude, destinationAirport.longitude)
      : null;

    const card = document.createElement("article");
    card.className = "flight-card";

    card.innerHTML = `
      <div class="flight-top">
        <div class="route-code">${destinationLabel}</div>
        <div class="distance">${distanceKm ? `${distanceKm} km` : "-"}</div>
      </div>
      <div class="flight-line">${flight.flight_number} · ${flight.airline_name || flight.airline || t("unknownAirline")}</div>
      <div class="flight-sub">
        <span>${originCode} ${fmtDateTime(flight.departure_time)} → ${arrivalCode} ${fmtDateTime(flight.arrival_time)}</span>
        <span>${fmtPrice(flight.price)}</span>
      </div>
    `;

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", t("openFareAria", { flightNumber: flight.flight_number || "" }).trim());
    card.addEventListener("click", () => navigateToFare(originCode, flight));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigateToFare(originCode, flight);
      }
    });

    flightList.appendChild(card);
  });
}

function drawDestinationLines(originCode, destinationCode, flights) {
  flightLineLayer.removeAll();
  const origin = airportByCode[originCode];
  if (!origin) return;

  const uniqueDestinations = Array.from(new Set(flights.map((flight) => flight.arrival_airport)))
    .filter((code) => code !== originCode)
    .filter((code) => !destinationCode || code === destinationCode);

  const lines = uniqueDestinations
    .map((arrivalCode) => {
      const destination = airportByCode[arrivalCode];
      if (!destination) return null;
      return new Graphic({
        geometry: {
          type: "polyline",
          paths: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        },
        symbol: {
          type: "simple-line",
          color: [56, 189, 248, 0.9],
          width: 1.5,
        },
      });
    })
    .filter(Boolean);

  if (lines.length) {
    flightLineLayer.addMany(lines);
  }
}

async function loadFlightsForSelection(originCode, destinationCode) {
  const params = new URLSearchParams({ from: originCode });
  if (destinationCode) {
    params.set("to", destinationCode);
  }
  if (dateFilter.value) {
    params.set("date", dateFilter.value);
  }

  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    const payload = await response.json();
    const flightsRaw = Array.isArray(payload?.flights) ? payload.flights : [];
    const flights = flightsRaw.filter(isCurrentOrFutureFlight);
    renderFlights(originCode, destinationCode, flights);
    drawDestinationLines(originCode, destinationCode, flights);
  } catch (error) {
    console.error("Failed to load flights:", error);
    renderFlights(originCode, destinationCode, []);
    drawDestinationLines(originCode, destinationCode, []);
  }
}

let selectedOriginCode = null;
let selectedDestinationCode = null;
let hoveredAirportCode = null;
let selectionPulseFrame = null;
let selectionPulsePhase = 0;

function showSidebar() {
  sidebar.classList.remove("hidden");
}

function hideSidebar() {
  sidebar.classList.add("hidden");
}

function clearAirportSelection() {
  selectedOriginCode = null;
  selectedDestinationCode = null;
  stopSelectionPulse();
  highlightAirport(null, null);
  flightLineLayer.removeAll();
  hideSidebar();

  try {
    view.popup.close();
  } catch (_) {
    // ignore
  }

  try {
    view.closePopup();
  } catch (_) {
    // ignore
  }
}

function stopSelectionPulse() {
  if (selectionPulseFrame) {
    cancelAnimationFrame(selectionPulseFrame);
    selectionPulseFrame = null;
  }
  selectionPulsePhase = 0;
}

function startSelectionPulse() {
  stopSelectionPulse();

  const run = () => {
    if (!selectedOriginCode) return;

    const selectedGraphic = airportLayer.graphics.find((graphic) => graphic.attributes && graphic.attributes.code === selectedOriginCode);
    if (!selectedGraphic) return;

    selectionPulsePhase += 0.1;
    const pulse = (Math.sin(selectionPulsePhase) + 1) / 2;
    const markerSize = 10 + pulse * 5;
    const markerAlpha = 0.75 + pulse * 0.25;

    selectedGraphic.symbol = {
      type: "simple-marker",
      style: "circle",
      size: markerSize,
      color: [14, 165, 233, markerAlpha],
      outline: {
        color: [255, 255, 255, 0.95],
        width: 1.2 + pulse * 1.1,
      },
    };

    selectionPulseFrame = requestAnimationFrame(run);
  };

  selectionPulseFrame = requestAnimationFrame(run);
}

function highlightAirport(originCode, destinationCode) {
  airportLayer.graphics.forEach((graphic) => {
    const isDot = graphic.attributes && graphic.attributes.code;
    if (!isDot) return;

    const airportCode = graphic.attributes.code;
    const isOrigin = airportCode === originCode;
    const isDestination = airportCode === destinationCode;

    if (isOrigin) {
      graphic.symbol = {
        type: "simple-marker",
        style: "circle",
        size: 10,
        color: [14, 165, 233, 1],
        outline: {
          color: [255, 255, 255, 0.95],
          width: 1.4,
        },
      };
      return;
    }

    if (isDestination) {
      graphic.symbol = {
        type: "simple-marker",
        style: "circle",
        size: 9,
        color: [251, 191, 36, 0.95],
        outline: {
          color: [255, 255, 255, 0.95],
          width: 1.2,
        },
      };
      return;
    }

    graphic.symbol = {
      type: "simple-marker",
      style: "circle",
      size: 6,
      color: [210, 235, 255, 0.95],
      outline: {
        color: [255, 255, 255, 0.95],
        width: 0.8,
      },
    };
  });
}

async function refreshSelectionUI() {
  if (!selectedOriginCode) {
    clearAirportSelection();
    return;
  }

  highlightAirport(selectedOriginCode, selectedDestinationCode);
  startSelectionPulse();
  showSidebar();
  await loadFlightsForSelection(selectedOriginCode, selectedDestinationCode);
}

async function handleAirportSelection(code) {
  if (!selectedOriginCode) {
    selectedOriginCode = code;
    selectedDestinationCode = null;
    await refreshSelectionUI();
    return;
  }

  if (!selectedDestinationCode) {
    if (code !== selectedOriginCode) {
      selectedDestinationCode = code;
    }
    await refreshSelectionUI();
    return;
  }

  if (code === selectedOriginCode || code === selectedDestinationCode) {
    selectedDestinationCode = null;
  } else {
    selectedDestinationCode = code;
  }

  await refreshSelectionUI();
}

await view.when();
await view.goTo(airportLayer.graphics.toArray(), {
  padding: {
    top: 40,
    right: 460,
    bottom: 40,
    left: 40,
  },
});

view.on("click", async (event) => {
  const result = await view.hitTest(event);
  const hit = result.results.find((item) => item?.graphic?.layer === airportLayer && item?.graphic?.attributes?.code);
  if (!hit) {
    clearAirportSelection();
    return;
  }
  const code = hit.graphic.attributes.code;
  await handleAirportSelection(code);
});

view.on("pointer-move", async (event) => {
  const result = await view.hitTest(event);
  const hit = result.results.find((item) => item?.graphic?.layer === airportLayer && item?.graphic?.attributes?.code);

  if (!hit) {
    hoveredAirportCode = null;
    try {
      view.closePopup();
    } catch (_) {
      // ignore
    }
    return;
  }

  const attributes = hit.graphic.attributes || {};
  const code = attributes.code;
  if (!code || code === hoveredAirportCode) return;

  const airport = airportByCode[code];
  const airportName = getAirportName(airport) || attributes.airportName || t("airportLabel");
  const provinceName = getAirportProvince(airport) || attributes.province || "-";

  hoveredAirportCode = code;
  view.openPopup({
    location: hit.graphic.geometry,
    title: `${airportName} (${code})`,
    content: `<b>${t("provinceLabel")}:</b> ${provinceName}<br><b>${t("airportCodeLabel")}:</b> ${code}`,
  });
});

document.addEventListener("click", (event) => {
  const clickedInsideSidebar = sidebar.contains(event.target);
  if (clickedInsideSidebar) return;

  const clickedInsideLanguageSwitcher = languageSwitcher && languageSwitcher.contains(event.target);
  if (clickedInsideLanguageSwitcher) return;

  const clickedInsideMap = view.container.contains(event.target);
  if (!clickedInsideMap) {
    clearAirportSelection();
  }
});

dateFilter.addEventListener("change", () => {
  if (!selectedOriginCode) return;
  refreshSelectionUI();
});

hideSidebar();
