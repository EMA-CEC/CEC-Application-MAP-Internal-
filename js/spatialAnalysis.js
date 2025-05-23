// Manages drawing tools and spatial analysis logic

const analysisLayersToPreload = [
  "Caroni Swamp",
  "Aripo Savannas",
  "Forest Reserve",
  "Matura National Park",
  "Nariva Swamp",
  "Municipality",
  "Trinidad Watersheds",
  "Tobago Watersheds",
  "Ecological Susceptibility",
  "Geological Susceptibility",
  "Social Susceptibility",
  "Hydrogeology",
  "Trinidad TCPD Policy",
  "Tobago TCPD Policy"
];

// ✅ Preload layers AND prepare Leaflet layer for spatial checks
function preloadAnalysisLayers() {
  analysisLayersToPreload.forEach(async name => {
    const item = geojsonLayers.find(l => l.name === name);
    if (!item) return;

    const response = await fetch(item.url);
    const geojson = await response.json();
    item.preloadedData = geojson;
    item.loadedLayer = L.geoJSON(geojson); // For analysis
  });

  // Build lookup map
  geojsonLayers.byName = {};
  geojsonLayers.forEach(l => geojsonLayers.byName[l.name] = l);
}

// 🔘 UI Setup
function setupSpatialAnalysisUI() {
  document.getElementById("startSpatialAnalysisBtn").addEventListener("click", () => {
    document.getElementById("spatialAnalysisPanel").classList.remove("hidden");
    performSpatialAnalysis();
  });
}

function closeSpatialAnalysis() {
  document.getElementById("spatialAnalysisPanel").classList.add("hidden");
  document.getElementById("cecResultsBody").innerHTML = "";
  document.getElementById("receptorResultsBody").innerHTML = "";
  document.getElementById("otherInfoTableBody").innerHTML = "";
  document.getElementById("shapePropertiesOutput").innerHTML = "Select a shape to analyze.";
}

function performSpatialAnalysis() {
  if (!lastDrawnShape) {
    alert("Please draw a shape on the map before starting the spatial analysis.");
    return;
  }

  const userShape = lastDrawnShape;
  const geomType = userShape.geometry?.type;
  const coords = userShape.geometry?.coordinates;

  console.log("🟡 Raw lastDrawnShape:", lastDrawnShape);
  console.log("🧪 Geometry type:", geomType);
  console.log("🧪 Raw coordinates:", coords);

  if (!geomType || !coords || coords.length === 0 || (Array.isArray(coords[0]) && coords[0].length === 0)) {
    alert("Drawn shape is invalid or incomplete.");
    return;
  }

  try {
    const buffer500 = turf.buffer(userShape, 0.5, { units: "kilometers" });
    const buffer1000 = turf.buffer(userShape, 1, { units: "kilometers" });

    analyzeNearbyCECs(buffer500);
    analyzeSensitiveReceptors(buffer1000, userShape);
    analyzeOtherInfo(userShape);
    displayShapeProperties(userShape);
  } catch (err) {
    console.error("❌ Buffering failed:", err);
    alert("An error occurred while buffering the shape.");
  }
}

function analyzeNearbyCECs(buffer) {
  const container = document.getElementById("cecResultsBody");
  const warning = document.getElementById("cecWarning");

  container.innerHTML = "";
  warning.style.display = "none";

  if (!allCECData || allCECData.length === 0) {
    warning.style.display = "block";
    return;
  }

  let count = 0;

  allCECData.forEach(item => {
    const easting = parseFloat(item["Easting"]);
    const northing = parseFloat(item["Northing"]);
    if (isNaN(easting) || isNaN(northing)) return;

    const [lat, lon] = convertUTMToLatLon(easting, northing);
    const point = turf.point([lon, lat]);

    if (turf.booleanPointInPolygon(point, buffer)) {
      count++;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item["CEC Reference"] || "N/A"}</td>
        <td>${item["Year"] || "N/A"}</td>
        <td>${item["Application Determination"] || "Pending"}</td>
      `;
      container.appendChild(row);
    }
  });

  if (count === 0) {
    container.innerHTML = `<tr><td colspan="3">No CEC Applications found within 500m.</td></tr>`;
  }
}

function analyzeSensitiveReceptors(buffer, shape) {
  const container = document.getElementById("receptorResultsBody");
  container.innerHTML = "";

  const receptors = [
    "Aripo Savannas", "Caroni Swamp", "Forest Reserve", "Matura National Park", "Nariva Swamp"
  ];

  let found = 0;

  receptors.forEach(name => {
    const layer = geojsonLayers.byName?.[name]?.loadedLayer;
    if (!layer) return;

    layer.eachLayer(l => {
      const feature = l.toGeoJSON();
      if (!feature.geometry) return;

const intersects = turf.booleanIntersects(shape, feature);
let distance = "within boundaries";

if (!intersects && turf.booleanIntersects(buffer, feature)) {
  try {
    const featureBoundary = turf.polygonToLine(feature);

    if (shape.geometry.type === "Point") {
      const d = turf.pointToLineDistance(shape, featureBoundary, { units: "kilometers" });
      distance = Math.round(d * 1000) + " m";
    } else if (shape.geometry.type === "LineString") {
      const shapePoints = turf.explode(shape);
      let minDist = Infinity;
      shapePoints.features.forEach(p => {
        const d = turf.pointToLineDistance(p, featureBoundary, { units: "kilometers" });
        if (d < minDist) minDist = d;
      });
      distance = Math.round(minDist * 1000) + " m";
    } else if (shape.geometry.type === "Polygon" || shape.geometry.type === "MultiPolygon") {
      const shapeBoundary = turf.polygonToLine(shape);
      const shapePoints = turf.explode(shapeBoundary);
      const featurePoints = turf.explode(featureBoundary);
      let minDist = Infinity;
      shapePoints.features.forEach(p1 => {
        featurePoints.features.forEach(p2 => {
          const d = turf.distance(p1, p2, { units: "kilometers" });
          if (d < minDist) minDist = d;
        });
      });
      distance = Math.round(minDist * 1000) + " m";
    } else {
      distance = "Unsupported geometry";
    }
  } catch (err) {
    console.error("❌ Distance calculation error:", err);
    distance = "Error";
  }
}

      if (intersects || turf.booleanIntersects(buffer, feature)) {
        let label = name;
        if (name === "Forest Reserve") {
          const subname = feature.properties?.NAME;
          if (subname && subname !== "null") label = `Forest Reserve - ${subname}`;
        }
        const row = document.createElement("tr");
        row.innerHTML = `<td>${label}</td><td>${distance}</td>`;
        container.appendChild(row);
        found++;
      }
    });
  });

  if (found === 0) {
    container.innerHTML = `<tr><td colspan="2">No sensitive receptors found within 1 km.</td></tr>`;
  }
}

// Layers and labels for Other Info table
const intersectLayers = [
  { name: "Municipality", layers: ["Municipality"], labelField: "NAME_1" },
  { name: "Watershed", layers: ["Trinidad Watersheds", "Tobago Watersheds"], labelField: { "Trinidad Watersheds": "NAME", "Tobago Watersheds": "WATERSHED" } },
  { name: "Ecological Susceptibility", layers: ["Ecological Susceptibility"], labelField: "Class" },
  { name: "Geological Susceptibility", layers: ["Geological Susceptibility"], labelField: "Class" },
  { name: "Hydrogeology", layers: ["Hydrogeology"], labelField: "ATTRIB" },
  { name: "Social Susceptibility", layers: ["Social Susceptibility"], labelField: "Class" },
  { name: "TCPD Policy", layers: ["Trinidad TCPD Policy", "Tobago TCPD Policy"], labelField: "Class_Name" }
];

function analyzeOtherInfo(shape) {
  const tbody = document.getElementById("otherInfoTableBody");
  tbody.innerHTML = "";

  intersectLayers.forEach(group => {
    const results = new Set();

    group.layers.forEach(layerName => {
      const layer = geojsonLayers.byName?.[layerName]?.loadedLayer;
      if (!layer) return;

      const labelField = typeof group.labelField === "string"
        ? group.labelField
        : group.labelField[layerName];

      layer.eachLayer(l => {
        const feature = l.toGeoJSON();
        if (turf.booleanIntersects(shape, feature)) {
          const val = feature.properties?.[labelField];
          if (val && val !== "null") results.add(val);
        }
      });
    });

    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${group.name}</strong></td><td>${Array.from(results).join(", ") || "None"}</td>`;
    tbody.appendChild(row);
  });
}

function displayShapeProperties(shape) {
  const output = document.getElementById("shapePropertiesOutput");
  if (!output) return;

  let html = "";
  const geom = shape?.geometry;

  if (!geom || !geom.coordinates) {
    output.innerHTML = "Invalid shape.";
    return;
  }

  const type = geom.type;
  const turfGeom = turf.feature(geom);

  try {
    if (type === "Point") {
      const [lon, lat] = geom.coordinates;

      // ✅ Convert lat/lon to UTM 32620
      const { easting, northing } = convertLatLonToUTM(lat, lon);  // ← Use your existing function
      html = `<strong>Easting:</strong> ${easting.toFixed(2)}<br><strong>Northing:</strong> ${northing.toFixed(2)}`;
    }
    else if (type === "LineString") {
      const length = turf.length(turfGeom, { units: "meters" });
      html = `<strong>Length:</strong> ${length.toFixed(2)} m`;
    }
    else if (type === "Polygon") {
      const area = turf.area(turfGeom); // m²
      const perimeter = turf.length(turf.polygonToLine(turfGeom), { units: "meters" });
      html = `
        <strong>Area:</strong> ${area.toFixed(2)} m² (${(area / 10000).toFixed(2)} ha)<br>
        <strong>Perimeter:</strong> ${perimeter.toFixed(2)} m
      `;
    } else {
      html = "Unsupported geometry type.";
    }
  } catch (err) {
    console.error("❌ Shape property calculation failed:", err);
    html = "Failed to calculate shape properties.";
  }

  output.innerHTML = html;
}
