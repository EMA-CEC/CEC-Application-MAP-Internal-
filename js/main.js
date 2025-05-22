// Entry point to initialize the map and wire up modules

window.addEventListener('DOMContentLoaded', () => {
  initBaseMap();
  setupControls();
  loadCECData();
  setupGeoJSONLayers();
  preloadAnalysisLayers();
  setupSpatialAnalysisUI();
  setupLocationSearch();

  // Initialize zoom and scale control positions
  const zoomControl = document.querySelector(".leaflet-control-zoom");
  const scaleControl = document.querySelector(".leaflet-control-scale");
  if (zoomControl) zoomControl.style.left = "330px";
  if (scaleControl) scaleControl.style.left = "330px";
});

document.getElementById("togglePanelTab").addEventListener("click", () => {
  const panel = document.getElementById("data");
  const toggle = document.getElementById("togglePanelTab");
  const zoomControl = document.querySelector(".leaflet-control-zoom");
  const scaleControl = document.querySelector(".leaflet-control-scale");

  panel.classList.toggle("collapsed");

  // Flip the arrow
  toggle.innerHTML = panel.classList.contains("collapsed") ? "&#9654;" : "&#9664;";

  // Adjust zoom and scale control positions
  if (zoomControl) {
    zoomControl.style.left = panel.classList.contains("collapsed") ? "10px" : "330px";
  }
  if (scaleControl) {
    scaleControl.style.left = panel.classList.contains("collapsed") ? "10px" : "330px";
  }

  // Resize the map after transition
  setTimeout(() => {
    map.invalidateSize();
  }, 310);
});

