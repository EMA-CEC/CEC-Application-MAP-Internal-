// Handles NSL analysis including DA selection and risk assessment

function setupNSLAnalysis() {
  document.getElementById("daSelectionBtn").addEventListener("click", () => {
    document.getElementById("daSelectionModal").style.display = "block";
  });

  document.getElementById("closeDASelectionModal").addEventListener("click", () => {
    document.getElementById("daSelectionModal").style.display = "none";
  });

  document.getElementById("riskAssessmentBtn").addEventListener("click", () => {
    document.getElementById("riskAssessmentModal").style.display = "block";
  });

  document.getElementById("closeRiskModal").addEventListener("click", () => {
    document.getElementById("riskAssessmentModal").style.display = "none";
  });
}
