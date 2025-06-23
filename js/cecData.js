// Fetches and displays CEC application data as markers and heatmap

let markers, heatLayer, currentView = "cluster";
window.allCECData = []; // Store original dataset and expose globally
window.filteredCECData = []; // filtered results for Spatial analysis CEC list


// Load and display CEC Applications
function loadCECData() {
  fetch("https://script.google.com/macros/s/AKfycbxLJ-OB_FnZRwx8BC_KmVt66KPsSb4Vfqmxl97yghxE1n51ywWeKahIsLxYtWGE8OEO/exec")
    .then(res => res.json())
    .then(data => {
      allCECData = data;
	  filteredCECData = data.slice();

      // Populate dropdowns with unique values (from sheet)
      const statuses = [...new Set(data.map(item => item["Application Determination"]).filter(Boolean))].sort();
      const activities = [...new Set(data.map(item => item["Designated Activity"]).filter(Boolean))].sort();

      populateDropdown("statusSelect", statuses);

      const heatPoints = [];

      // Cluster group with custom icons
      markers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
          const count = cluster.getChildCount();
          let className = 'marker-cluster-small';

          if (count > 50) {
            className = 'marker-cluster-large';
          } else if (count > 20) {
            className = 'marker-cluster-medium';
          }

          return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster ${className}`,
            iconSize: L.point(40, 40)
          });
        }
      });

      data.forEach(item => {
        const [lat, lon] = convertUTMToLatLon(item.Easting, item.Northing);

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

      heatLayer = L.heatLayer(heatPoints, { radius: 20, blur: 15, maxZoom: 17 });

      map.addLayer(markers); // Show clusters by default

      // Enable filter + toggle UI
      document.getElementById("dataViewToggle").classList.remove("disabled");
      document.getElementById("filterContainer").classList.remove("disabled");
    });
}

// Toggle between cluster, heatmap, or hide view
function switchDataView(mode) {
  // Remove both layers before switching view
  if (map.hasLayer(markers)) map.removeLayer(markers);
  if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);

  // Set current view mode
  currentView = mode;

  // Re-render based on the current full dataset
  renderCECData(allCECData);
}

function renderCECData(data) {
  if (markers) map.removeLayer(markers);
  if (heatLayer) map.removeLayer(heatLayer);

  markers = L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      let className = 'marker-cluster-small';
      if (count > 50) className = 'marker-cluster-large';
      else if (count > 20) className = 'marker-cluster-medium';

      return L.divIcon({
        html: `<div><span>${count}</span></div>`,
        className: `marker-cluster ${className}`,
        iconSize: L.point(40, 40)
      });
    }
  });

  const heatPoints = [];

  data.forEach(item => {
    const [lat, lon] = convertUTMToLatLon(item.Easting, item.Northing);

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

  heatLayer = L.heatLayer(heatPoints, { radius: 20, blur: 15, maxZoom: 17 });

  if (currentView === "cluster") {
    map.addLayer(markers);
  } else if (currentView === "heatmap") {
    map.addLayer(heatLayer);
  }

  // Update filter stats
  document.getElementById("filterStats").innerText = `Showing ${data.length} application(s)`;
}
