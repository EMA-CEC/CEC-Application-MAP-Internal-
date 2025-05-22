// Handles UI controls, panels, and toggle interactions

function setupControls() {
  const toggleBtn = document.getElementById('toggleBtn');
  const welcome = document.getElementById('welcome');

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = welcome.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? 'Open Info Panel' : 'Close Info Panel';
  });

  // Auto-collapse if screen is narrow (e.g., under 768px)
  if (window.innerWidth < 768) {
    welcome.classList.add('collapsed');
    toggleBtn.textContent = 'Open Info Panel';
  }
}

function setupLocationSearch() {
  const input = document.getElementById("locationSearchInput");
  const searchBtn = document.getElementById("locationSearchBtn");
  const clearBtn = document.getElementById("clearLocationSearchBtn");

  let searchMarker = null;

  async function searchMap() {
    const query = input.value.trim();
    if (!query) return;

    let searchedCEC = false;

    // Try to extract numeric part of CEC reference
    let numPart = null;
    const cecMatch = query.match(/^CEC\s*-?\s*(\d+)/i);
    if (cecMatch) {
      numPart = cecMatch[1];
    } else if (/^\d+$/.test(query)) {
      numPart = query;
    }

    // Check CEC data
    if (numPart && window.allCECData && Array.isArray(allCECData) && allCECData.length > 0) {
      const parsedNum = parseInt(numPart);
      const match = allCECData.find(row => parseInt(row["CEC Reference"]) === parsedNum);

      if (match) {
        const [lat, lon] = convertUTMToLatLon(match.Easting, match.Northing);
        if (searchMarker) map.removeLayer(searchMarker);
        searchMarker = L.circleMarker([lat, lon], {
          radius: 8,
          color: "#e11d48",
          fillColor: "#f43f5e",
          fillOpacity: 0.8,
          weight: 2
        }).addTo(map).bindPopup(`<strong>CEC Reference:</strong> ${match["CEC Reference"]}`).openPopup();

        map.setView([lat, lon], 16);
        searchedCEC = true;
        return;
      }
    }

    // Fallback: OpenStreetMap search
    if (!searchedCEC) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tt&limit=1`);
        const data = await res.json();
        if (data.length > 0) {
          const { lat, lon, display_name } = data[0];
          if (searchMarker) map.removeLayer(searchMarker);
          searchMarker = L.circleMarker([lat, lon], {
            radius: 8,
            color: "#e11d48",
            fillColor: "#f43f5e",
            fillOpacity: 0.8,
            weight: 2
          }).addTo(map).bindPopup(`<strong>${display_name}</strong>`).openPopup();
          map.setView([lat, lon], 16);
        } else {
          alert("No results found in Trinidad and Tobago.");
        }
      } catch (err) {
        alert("Error fetching location data.");
        console.error("OpenStreetMap error:", err);
      }
    }
  }

  searchBtn.addEventListener("click", searchMap);
  input.addEventListener("keydown", e => { if (e.key === "Enter") searchMap(); });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    if (searchMarker) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }
  });
}


document.getElementById("searchToggle").addEventListener("click", () => {
  const container = document.getElementById("searchContainer");
  container.classList.toggle("collapsed");
});
