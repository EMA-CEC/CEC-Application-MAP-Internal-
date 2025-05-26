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
    const activityMatch = !activity || new RegExp(`(^|[^a-zA-Z0-9])${activity.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(?=$|[^a-zA-Z0-9])`).test(item["Designated Activity"]);

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
  setupCECSearchInFilter();
  setupOSMLocationSearch();
});

function setupCECSearchInFilter() {
  const input = document.getElementById("cecRefInput");
  const searchBtn = document.getElementById("cecSearchBtn");
  const clearBtn = document.getElementById("cecClearBtn");

  let cecSearchMarker = null;

  function performSearch() {
    const query = input.value.trim();
    if (!query || !window.allCECData) return;

    let numPart = null;
    const cecMatch = query.match(/^CEC\s*-?\s*(\d+)/i);
    if (cecMatch) {
      numPart = cecMatch[1];
    } else if (/^\d+$/.test(query)) {
      numPart = query;
    }

    if (!numPart) return;

    const parsedNum = parseInt(numPart);
    const match = allCECData.find(row => parseInt(row["CEC Reference"]) === parsedNum);

    if (match) {
      const [lat, lon] = convertUTMToLatLon(match.Easting, match.Northing);
      if (cecSearchMarker) map.removeLayer(cecSearchMarker);

      cecSearchMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: "#e11d48",
        fillColor: "#f43f5e",
        fillOpacity: 0.8,
        weight: 2
      }).addTo(map).bindPopup(`<strong>CEC Reference:</strong> ${match["CEC Reference"]}`).openPopup();

      map.setView([lat, lon], 16);
    } else {
      alert("No matching CEC Reference found.");
    }
  }

  searchBtn.addEventListener("click", performSearch);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") performSearch();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    if (cecSearchMarker) {
      map.removeLayer(cecSearchMarker);
      cecSearchMarker = null;
    }
  });
}

function setupOSMLocationSearch() {
  const input = document.getElementById("osmSearchInput");
  const suggestions = document.getElementById("osmSuggestions");
  const clearBtn = document.getElementById("osmClearBtn");

  let searchMarker = null;
  let timeout = null;

  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      suggestions.innerHTML = "";
      return;
    }

    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=tt&q=${encodeURIComponent(query)}&limit=5`);
      const results = await res.json();

      suggestions.innerHTML = "";
      results.forEach(place => {
        const li = document.createElement("li");
        li.textContent = place.display_name;
        li.addEventListener("click", () => {
          input.value = place.display_name;
          suggestions.innerHTML = "";

          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);

          if (searchMarker) map.removeLayer(searchMarker);

          searchMarker = L.circle([lat, lon], {
            radius: 15,
            color: "#e11d48",
            fillColor: "#f43f5e",
            fillOpacity: 0.5,
            weight: 2
          }).addTo(map).bindPopup(`<strong>${place.display_name}</strong>`).openPopup();

          map.setView([lat, lon], 16);
        });
        suggestions.appendChild(li);
      });
    }, 300);
  });

	input.addEventListener("keydown", (e) => {
	  if (e.key === "Enter") {
		e.preventDefault();
		const firstSuggestion = suggestions.querySelector("li");
		if (firstSuggestion) {
		  firstSuggestion.click();
		}
	  }
	});

  clearBtn.addEventListener("click", () => {
    input.value = "";
    suggestions.innerHTML = "";
    if (searchMarker) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }
  });

  // Hide suggestions when focus is lost
  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggestions.innerHTML = "";
    }, 200);
  });
}
