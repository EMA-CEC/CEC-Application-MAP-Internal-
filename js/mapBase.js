// Sets up the Leaflet map and base layers

let map;
let drawnItems = new L.FeatureGroup();
let lastDrawnShape = null;
let pendingLabelLayer = null;
let editHandler = null;
let editModeEnabled = false;
let majorRoadsLayer = null;
let majorRoadsLabels = null;
let majorRoadsData = null;

function initBaseMap() {
  map = L.map('map', {
    center: [10.6918, -61.2225],
    zoom: 9,
    zoomControl: true,
    maxZoom: 20
  });

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 20
  }).addTo(map);

  const google = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Google',
    maxZoom: 20
  });

  L.control.layers({
    "OpenStreetMap": osm,
    "Google Map": google
  }).addTo(map);

  L.control.scale({ position: 'bottomleft' }).addTo(map);

  // Initialize Draw Tools
  initDrawTools();
  
  // Fetch command for road layer
	fetch("https://raw.githubusercontent.com/MGunnesslal/leaflet-geojson-layers/refs/heads/main/Major%20Roads.geojson")
	  .then(res => res.json())
	  .then(data => {
		majorRoadsData = data;
		updateMajorRoadsVisibility();
	  });

	map.on("zoomend moveend", updateMajorRoadsVisibility);
	map.whenReady(updateMajorRoadsVisibility);

}

function initDrawTools() {
  drawnItems.addTo(map);

  const drawControl = new L.Control.Draw({
    draw: {
      polyline: false, // We'll define it manually
      circle: false,
      marker: true,
      polygon: {
        shapeOptions: {
          color: '#d62828',
          weight: 2,
          fillColor: '#fca5a5',
          fillOpacity: 0.5
        }
      },
      rectangle: {
        shapeOptions: {
          color: '#d62828',
          weight: 2,
          fillColor: '#fca5a5',
          fillOpacity: 0.5
        }
      }
    },
    edit: {
      featureGroup: drawnItems,
      edit: true,
      remove: true
    }
  });

  const pointDrawer = new L.Draw.Marker(map, drawControl.options.draw.marker);
  const polygonDrawer = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
  const rectangleDrawer = new L.Draw.Rectangle(map, drawControl.options.draw.rectangle);

  // Add polyline drawer
  const polylineDrawer = new L.Draw.Polyline(map, {
    shapeOptions: {
      color: '#0f172a',
      weight: 3
    }
  });

  document.getElementById("drawPointBtn").addEventListener("click", () => pointDrawer.enable());
  document.getElementById("drawPolygonBtn").addEventListener("click", () => polygonDrawer.enable());
  document.getElementById("drawRectangleBtn").addEventListener("click", () => rectangleDrawer.enable());
  document.getElementById("drawPolylineBtn").addEventListener("click", () => polylineDrawer.enable());

  // Toggle edit mode
  document.getElementById("editDrawBtn").addEventListener("click", () => {
    if (!editModeEnabled) {
      if (drawnItems.getLayers().length > 0) {
        editHandler = new L.EditToolbar.Edit(map, {
          featureGroup: drawnItems,
          selectedPathOptions: {
            maintainColor: true
          }
        });
        editHandler.enable();
        editModeEnabled = true;
        document.getElementById("editDrawBtn").textContent = "🚫 Exit Edit Mode";
      } else {
        alert("No shape to edit.");
      }
    } else {
      if (editHandler) {
        editHandler.disable();
      }
      editModeEnabled = false;
      document.getElementById("editDrawBtn").textContent = "✏️ Edit Drawing";
    }
  });

  document.getElementById("clearDrawBtn").addEventListener("click", () => {
    drawnItems.clearLayers();
    lastDrawnShape = null;
    console.log("🗑️ Drawing cleared");
  });

  document.getElementById("deleteSelectedBtn").addEventListener("click", () => {
    const selectedLayer = drawnItems.getLayers().find(layer => map.hasLayer(layer) && layer.editing?._enabled);

    if (!selectedLayer) {
      alert("Please select a shape to delete by enabling edit mode first.");
      return;
    }

    drawnItems.removeLayer(selectedLayer);
    console.log("❌ Shape deleted");

    const remaining = drawnItems.getLayers();
    if (remaining.length > 0) {
      const lastLayer = remaining[remaining.length - 1];
      lastDrawnShape = lastLayer.toGeoJSON();
      console.log("↩️ lastDrawnShape updated to:", lastDrawnShape);
    } else {
      lastDrawnShape = null;
      console.log("⚠️ No shapes left on map.");
    }
  });

  map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;

    if (layer instanceof L.Marker) {
      const yellowIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        shadowSize: [41, 41]
      });
      layer.setIcon(yellowIcon);
      layer.options.interactive = true;
    }

    pendingLabelLayer = layer;
    document.getElementById("shapeLabelInput").value = "";
    document.getElementById("labelModal").style.display = "block";
  });

  map.on('draw:edited', function () {
    const layer = drawnItems.getLayers()[0];
    lastDrawnShape = layer ? layer.toGeoJSON() : null;
    console.log("✏️ Shape edited:", lastDrawnShape);
  });

  // Modal: Save and Cancel
  document.getElementById("saveLabelBtn").addEventListener("click", () => {
    const label = document.getElementById("shapeLabelInput").value.trim();
    if (label && pendingLabelLayer) {
      pendingLabelLayer.bindPopup(`<strong>${label}</strong>`).openPopup();
      pendingLabelLayer._labelText = label;
    }

    drawnItems.addLayer(pendingLabelLayer);
    lastDrawnShape = pendingLabelLayer.toGeoJSON();
    pendingLabelLayer = null;
    document.getElementById("labelModal").style.display = "none";
  });

  document.getElementById("cancelLabelBtn").addEventListener("click", () => {
    pendingLabelLayer = null;
    document.getElementById("labelModal").style.display = "none";
  });
}

function updateMajorRoadsVisibility() {
  if (!map || !majorRoadsData) return;

  const currentZoom = map.getZoom();

  if (majorRoadsLayer) map.removeLayer(majorRoadsLayer);
  if (majorRoadsLabels) map.removeLayer(majorRoadsLabels);

  if (currentZoom >= 16) {
    const visibleBounds = map.getBounds();

    majorRoadsLayer = L.geoJSON(majorRoadsData, {
      filter: feature => visibleBounds.intersects(L.geoJSON(feature).getBounds()),
      style: () => ({
        color: "#ffffff",
        weight: currentZoom >= 18 ? 8 : currentZoom >= 16 ? 6 : 4,
        opacity: 0.5
      })
    }).addTo(map);

    // Add labels only at zoom 17+
    if (currentZoom >= 17) {
      majorRoadsLabels = L.layerGroup();
      L.geoJSON(majorRoadsData, {
        filter: feature => visibleBounds.intersects(L.geoJSON(feature).getBounds()),
        onEachFeature: (feature, layer) => {
          if (feature.properties.name) {
            const center = layer.getBounds().getCenter();
            const label = L.marker(center, {
              icon: L.divIcon({
                className: 'road-label',
                html: `<span>${feature.properties.name}</span>`,
                iconSize: null
              }),
              interactive: false
            });
            majorRoadsLabels.addLayer(label);
          }
        }
      });
      majorRoadsLabels.addTo(map);
    }
  }
}
