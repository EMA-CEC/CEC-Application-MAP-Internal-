// Fetches and displays CEC application data as markers and heatmap

let markers, heatLayer;
let currentView = "cluster";

window.allCECData = [];      // Store original dataset and expose globally
window.filteredCECData = []; // Filtered results for spatial analysis CEC list

// Load and display CEC Applications from published CSV
function loadCECData() {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBy94L3h3BDlk7wBSQH1eDTFIcBB6zPyyHLhbgc3PQWk-Xg7K30H9WXvRNnusAFx3vODUoO3z1pxjV/pub?gid=0&single=true&output=csv";

  // Cache-busting: always get fresh CSV on page reload
  const urlWithBust = `${CSV_URL}&t=${Date.now()}`;

  fetch(urlWithBust, { cache: "no-store" })
    .then((res) => res.text())
    .then((csvText) => {
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      let data = parsed.data;

      // Convert numeric fields (Easting/Northing) from string → number
      // and null out bad values so we can safely skip them later.
      data = data.map((row) => {
        const rawE = row.Easting;
        const rawN = row.Northing;

        const e = parseFloat(rawE);
        const n = parseFloat(rawN);

        return {
          ...row,
          Easting: Number.isFinite(e) ? e : null,
          Northing: Number.isFinite(n) ? n : null,
        };
      });

      // Store globally for filters + spatial analysis
      allCECData = data;
      filteredCECData = data.slice();

      // Populate Status dropdown (Activity dropdown is handled in filters.js via populateDASelect)
      const statuses = [
        ...new Set(
          data
            .map((item) => item["Application Determination"])
            .filter(Boolean)
        ),
      ].sort();

      populateDropdown("statusSelect", statuses);

      // Render markers + heatmap using existing logic
      renderCECData(allCECData);

      // Enable UI controls (same behaviour as before)
      const dataViewToggle = document.getElementById("dataViewToggle");
      const filterContainer = document.getElementById("filterContainer");

      if (dataViewToggle) dataViewToggle.classList.remove("disabled");
      if (filterContainer) filterContainer.classList.remove("disabled");
    })
    .catch((err) => {
      console.error("Error loading CEC data from CSV:", err);
    });
}

// Toggle between cluster, heatmap, or hide view
function switchDataView(mode) {
  // Remove both layers before switching view
  if (markers && map.hasLayer(markers)) map.removeLayer(markers);
  if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);

  // Set current view mode
  currentView = mode;

  // Re-render based on the current full dataset
  renderCECData(allCECData);
}

function renderCECData(data) {
  // Clear existing layers
  if (markers && map.hasLayer(markers)) map.removeLayer(markers);
  if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);

  markers = L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      let className = "marker-cluster-small";
      if (count > 50) className = "marker-cluster-large";
      else if (count > 20) className = "marker-cluster-medium";

      return L.divIcon({
        html: `<div><span>${count}</span></div>`,
        className: `marker-cluster ${className}`,
        iconSize: L.point(40, 40),
      });
    },
  });

  const heatPoints = [];
  let validCoordCount = 0;

  data.forEach((item) => {
    // Use sanitized numeric values from loadCECData
    const e = item.Easting;
    const n = item.Northing;

    // 🚧 Skip rows that don't have valid numeric coordinates
    if (!Number.isFinite(e) || !Number.isFinite(n)) {
      // Optional debug:
      // console.warn("Skipping row with invalid coords:", item["CEC Reference"], item.Easting, item.Northing);
      return;
    }

    let lat, lon;
    try {
      [lat, lon] = convertUTMToLatLon(e, n);
    } catch (err) {
      console.warn("Skipping row due to conversion error:", item["CEC Reference"], err);
      return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    validCoordCount++;

    const popupContent = `
      <div class="popup-field"><strong>CEC Ref:</strong> ${item["CEC Reference"]}</div>
      <div class="popup-field"><strong>Year:</strong> ${item["Year"]}</div>
      <div class="popup-field"><strong>Applicant:</strong> ${item["Applicant"]}</div>
      <div class="popup-field"><strong>Processing Officer:</strong> ${item["Officer Name"]}</div>
      <div class="popup-field"><strong>Designated Activity:</strong> ${item["Designated Activity"]}</div>
      <div class="popup-field"><strong>Description:</strong> ${item["Activity Description"]}</div>
      <div class="popup-field"><strong>Location:</strong> ${item["Activity Location"]}</div>
      <div class="popup-field"><strong>Easting:</strong> ${item["Easting"]}</div>
      <div class="popup-field"><strong>Northing:</strong> ${item["Northing"]}</div>
      <div class="popup-field"><strong>Status:</strong> ${getStatusBadge(item["Application Determination"])}</div>
      <div class="popup-field"><strong>Determination Date:</strong> ${formatDateOnly(item["Determination Date"])}</div>
      <div class="popup-field"><strong>Comment:</strong> ${item["Comment"] || "N/A"}</div>
    `;

    const marker = L.marker([lat, lon]).bindPopup(popupContent);
    markers.addLayer(marker);
    heatPoints.push([lat, lon, 0.6]);
  });

  // Create heat layer even if empty (no harm)
  heatLayer = L.heatLayer(heatPoints, { radius: 20, blur: 15, maxZoom: 17 });

  // Add appropriate layer based on current view
  if (currentView === "cluster") {
    map.addLayer(markers);
  } else if (currentView === "heatmap") {
    map.addLayer(heatLayer);
  }

  // Update filter stats
  const statsEl = document.getElementById("filterStats");
  if (statsEl) {
    // If you want the previous behaviour, just show data.length
    if (validCoordCount === data.length) {
      statsEl.innerText = `Showing ${data.length} application(s)`;
    } else {
      statsEl.innerText = `Showing ${data.length} application(s) (${validCoordCount} with map coordinates)`;
    }
  }
}
