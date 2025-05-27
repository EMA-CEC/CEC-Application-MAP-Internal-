// Entry point to initialize the map and wire up modules

window.addEventListener('DOMContentLoaded', () => {
  initBaseMap();
  setupControls();
  loadCECData();
  setupGeoJSONLayers();
  preloadAnalysisLayers();
  setupSpatialAnalysisUI();

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

document.addEventListener("DOMContentLoaded", () => {
  // NSL Read Me
  document.getElementById("nslReadMeBtn").addEventListener("click", () => {
    window.open("https://drive.google.com/file/d/1a61Tte8xPK8YM4FgRKFaeqsfwEoMgs3N/view", "_blank");
  });

  // DA Selection Panel
  document.getElementById("nslDASelectionBtn").addEventListener("click", openDAPanel);


  // Risk Assessment Panel
  document.getElementById("nslRiskAssessmentBtn").addEventListener("click", openRiskPanel);


  // Model Output Panel
  document.getElementById("nslModelOutputBtn").addEventListener("click", () => {
    if (window.nslData?.riskRatings?.length) {
      openModelOutputPanel(); 
    } else {
    alert("Please complete the Risk Assessment and click Confirm & Continue before accessing the Model Output.");
    }
  });
  
  document.getElementById("downloadModelOutputBtn").addEventListener("click", downloadModelOutput); 
});


