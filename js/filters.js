// Handles filters for date, status, activity, and keywords and UTM search

let utmSearchMarker = null;

function setDateConstraints() {
  const endDateInput = document.getElementById('endDate');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  endDateInput.setAttribute("max", todayStr);
}

function applyFilters() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const status = document.getElementById("statusSelect").value;
  const activity = document.getElementById("activitySelect").value;
  const keyword = document.getElementById("keywordInput").value.trim().toLowerCase();

  const filtered = allCECData.filter(item => {
    const rawDate = item["Receipt Date"];
    const itemDate = formatDateToComparable(rawDate);
    const afterStart = !startDate || itemDate >= startDate;
    const beforeEnd = !endDate || itemDate <= endDate;

    const statusMatch = !status || item["Application Determination"] === status;
    const activityMatch = !activity || new RegExp(`\\b${activity.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(item["Designated Activity"]);

    const searchFields = [
      "Applicant",
      "Applicant Acronym",
      "Applicant Address",
      "Activity Description",
      "Activity Location",
      "Officer Name",
      "Comment",
      "Keywords"
    ];

	const keywords = keyword.split(/\s+/); // Split on spaces

	const keywordMatch = !keyword || keywords.every(kw => {
	  return searchFields.some(field => {
		const value = (item[field] || "").toString().toLowerCase();
		return value.includes(kw);
	  });
	});

    return afterStart && beforeEnd && statusMatch && activityMatch && keywordMatch;
  });

  console.log(`✅ Filters applied. Showing ${filtered.length} of ${allCECData.length} records.`);
  renderCECData(filtered);
}

function clearFilters() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("statusSelect").value = "";
  document.getElementById("activitySelect").value = "";
  document.getElementById("keywordInput").value = "";

  renderCECData(allCECData);
}

function setupFilterToggle() {
  const toggleBtn = document.getElementById("toggleFilterBtn");
  const filterContainer = document.getElementById("filterContainer");

  toggleBtn.addEventListener("click", () => {
    const isCollapsed = filterContainer.classList.toggle("collapsed");
    toggleBtn.textContent = isCollapsed ? "Show Filters" : "Hide Filters";
  });
}

function setupUTMSearch() {
  const searchBtn = document.getElementById("utmSearchBtn");
  const clearBtn = document.getElementById("utmClearBtn");

  searchBtn.addEventListener("click", () => {
    const easting = parseFloat(document.getElementById("utmEasting").value);
    const northing = parseFloat(document.getElementById("utmNorthing").value);

    if (isNaN(easting) || isNaN(northing)) {
      alert("Please enter valid UTM Easting and Northing values.");
      return;
    }

    const [lat, lon] = convertUTMToLatLon(easting, northing);

    if (utmSearchMarker) {
      map.removeLayer(utmSearchMarker);
    }

    utmSearchMarker = L.circleMarker([lat, lon], {
      radius: 8,
      color: "#FF5722",
      fillColor: "#FF5722",
      fillOpacity: 0.8,
      weight: 2
    }).addTo(map).bindPopup(`<strong>UTM Search Result</strong><br>Easting: ${easting}<br>Northing: ${northing}`).openPopup();

    map.setView([lat, lon], 15);
  });

  clearBtn.addEventListener("click", () => {
    document.getElementById("utmEasting").value = "";
    document.getElementById("utmNorthing").value = "";

    if (utmSearchMarker) {
      map.removeLayer(utmSearchMarker);
      utmSearchMarker = null;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setDateConstraints();
  populateDASelect("activitySelect");
  document.getElementById("applyFiltersBtn").addEventListener("click", applyFilters);
  document.getElementById("clearFiltersBtn").addEventListener("click", clearFilters);
  setupFilterToggle();
  setupUTMSearch();
});
