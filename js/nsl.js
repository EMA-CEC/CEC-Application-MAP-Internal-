// Handles NSL analysis including DA selection and risk assessment

function openNSLPanel(panelKey) {
  const panels = [
    "daSelectionPanel",
    "riskAssessmentPanel",
    "modelOutputPanel"
  ];

  panels.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === panelKey + "Panel") ? "flex" : "none";
  });
}

function openDAPanel() {
  openNSLPanel("daSelection");
  populateDATable();
}

function closeDAPanel() {
  document.getElementById("daSelectionPanel").style.display = "none";
}

function clearDASelection() {
  document.getElementById("projectTitle").value = "";
  document.getElementById("cecNumber").value = "";
  const selects = document.querySelectorAll("#daTableBody select");
  selects.forEach(sel => sel.value = "No");
}

function confirmDASelection() {
  const projectTitle = document.getElementById("projectTitle").value;
  const cecNumber = document.getElementById("cecNumber").value;
  const selections = [];

  const rows = document.querySelectorAll("#daTableBody tr");
  rows.forEach(row => {
    const code = row.dataset.code;
    const description = row.querySelector(".desc").textContent;
    const selection = row.querySelector("select").value;
    selections.push({ code, description, selection });
  });

  const selectedActivities = selections.filter(s => s.selection === "Yes");

  window.nslData = { projectTitle, cecNumber, selectedActivities };

  openRiskPanel();
}

function populateDATable() {
  const tbody = document.getElementById("daTableBody");
  tbody.innerHTML = "";

  designatedActivities.forEach(da => {
    const row = document.createElement("tr");
    row.dataset.code = da.code;

    row.innerHTML = `
      <td>${da.code}</td>
      <td class="desc">${da.description}</td>
      <td>
        <select>
          <option>No</option>
          <option>Yes</option>
        </select>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function openRiskPanel() {
  if (!window.nslData || !window.nslData.selectedActivities?.length) {
    alert("No DA Selection data found. Please complete the Designated Activity Selection first.");
    return;
  }

  const titleDisplay = document.getElementById("riskProjectTitle");
  const cecInput = document.getElementById("riskCecNumber");
  const tbody = document.getElementById("riskTableBody");

  titleDisplay.textContent = window.nslData.projectTitle || "";
  cecInput.value = window.nslData.cecNumber || "";

  tbody.innerHTML = "";

  const riskOptions = ["N/A", "Very Low", "Low", "Moderate", "High", "Very High"];

  window.nslData.selectedActivities.forEach(activity => {
    const code = activity.code;
	const risk = riskDefinitions[code] || {};
	const natureText = risk.NatureDefinition || "No guidance available.";
	const scaleText = risk.ScaleDefinition || "No guidance available.";
	const locationText = risk.LocationDefinition || "No guidance available.";


    const row = document.createElement("tr");

	row.innerHTML = `
	  <td>${code}</td>
	  <td><select>${riskOptions.map(opt => `<option>${opt}</option>`).join("")}</select></td>
	  <td><select>${riskOptions.map(opt => `<option>${opt}</option>`).join("")}</select></td>
	  <td><select>${riskOptions.map(opt => `<option>${opt}</option>`).join("")}</select></td>
	  <td class="guidance" colspan="1">${natureText}</td>
	  <td class="guidance"colspan="1">${scaleText}</td>
	  <td class="guidance"colspan="1">${locationText}</td>
	`;


    tbody.appendChild(row);
  });

  openNSLPanel("riskAssessment");
}

function closeRiskPanel() {
  document.getElementById("riskAssessmentPanel").style.display = "none";
}

function confirmRiskAssessment() {
  const rows = document.querySelectorAll("#riskTableBody tr");

  const riskSelections = Array.from(rows).map(row => {
    const code = row.cells[0].textContent;
    const nature = row.cells[1].querySelector("select").value;
    const scale = row.cells[2].querySelector("select").value;
    const location = row.cells[3].querySelector("select").value;
    return { code, nature, scale, location };
  });

  // Store in nslData
  window.nslData.riskRatings = riskSelections;

  openModelOutputPanel();
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function openModelOutputPanel() {
    ["daSelectionPanel", "riskAssessmentPanel", "modelOutputPanel"].forEach(id => {
	  const panel = document.getElementById(id);
      if (panel) panel.style.display = "none";
	});
  
  const data = window.nslData;
  if (!data || !data.riskRatings?.length) return;

  // Populate project info
  document.getElementById("outputProjectTitle").textContent = data.projectTitle || "";
  document.getElementById("outputCecNumber").textContent = data.cecNumber || "";

  // Populate DA codes
  const selectedCodes = data.selectedActivities?.map(a => a.code).join(", ") || "None";
  document.getElementById("outputDAList").textContent = selectedCodes;

  // Score mapping
  const scoreMap = {
    "N/A": 0,
    "Very Low": 1,
    "Low": 2,
    "Moderate": 3,
    "High": 4,
    "Very High": 5
  };

  let maxTotal = 0;
  let userScore = 0;

  // For rule lookup
  const ruleScoreArray = [];

  data.riskRatings.forEach(entry => {
    const nature = scoreMap[entry.nature] || 0;
    const scale = scoreMap[entry.scale] || 0;
    const location = scoreMap[entry.location] || 0;

	const weights = daWeights[entry.code] || { nature: 1, scale: 1, location: 1 };

	userScore += (nature * weights.nature) + (scale * weights.scale) + (location * weights.location);
	maxTotal += (5 * weights.nature) + (5 * weights.scale) + (5 * weights.location);

    ruleScoreArray.push(nature, scale, location);
  });

  const percentage = maxTotal ? Math.round((userScore / maxTotal) * 100) : 0;
  const thresholds = data.selectedActivities.map(a => daThresholds[a.code] || { threshold: 75, upper: 80, lower: 70 });

	// Average thresholds
  const avg = (arr, key) => arr.reduce((sum, o) => sum + (o[key] || 0), 0) / arr.length;

  const threshold = Math.round(avg(thresholds, "threshold"));
  const upper = Math.round(avg(thresholds, "upper"));
  const lower = Math.round(avg(thresholds, "lower"));

	// Decision based on boundaries
	let decisionText = "";
	let detailText = "";

	if (percentage < lower) {
	  decisionText = `<span style="color:green;font-weight:bold;">EIA SOP is not required</span>`;
	  detailText = `Information provided by applicant is believed to be complete and/or sufficient to assess environmental impact and determine mitigation measures without the need for an EIA. Low acute and cumulative risks to human health and the environment have been determined with acceptable confidence. Considerations beyond the scope of this model must be taken into account to justify contrary action.`;
	} else if (percentage < threshold) {
	  decisionText = `<span style="color:green;font-weight:bold;">EIA SOP is not recommended</span>`;
	  detailText = `Information provided by applicant is believed to be complete and/or sufficient to assess environmental impact and determine mitigation measures without the need for an EIA. Manageable acute and cumulative risks to human health and the environment have been determined with acceptable confidence. Contrary action to this Model suggestion is available at the Officer's discretion.`;
	} else if (percentage < upper) {
	  decisionText = `<span style="color:orange;font-weight:bold;">EIA SOP is recommended</span>`;
	  detailText = `Information reveals areas of concern that may benefit from a more thorough screening assessment. Acute and cumulative risks to human health and the environment may be managed based on existing knowledge. Contrary action to this Model suggestion is available at the Officer's discretion.`;
	} else {
	  decisionText = `<span style="color:red;font-weight:bold;">EIA SOP is required</span>`;
	  detailText = `Information provided by applicant is believed to be insufficient and/or indicates high likelihood of significant impact to human health and environment. A more thorough screening is required to determine the extent of risk and/or appropriate mitigation measures.`;
	}

	document.getElementById("nslSummaryContainer").innerHTML = `
	  <strong>NSL Index:</strong> ${percentage}%<br/>
	  <strong>NSL Threshold:</strong> ${threshold}%<br/>
	  <strong>Upper Bound:</strong> ${upper}%<br/>
	  <strong>Lower Bound:</strong> ${lower}%<br/>
	  <strong>NSL Index Decision:</strong> ${decisionText}
	`;

document.getElementById("nslDetailContainer").textContent = detailText;




  document.getElementById("nslDetailContainer").textContent = detailText;

  drawNSLChart(percentage);

  // Date stamp
  document.getElementById("modelDateStamp").textContent =
    "Date: " + new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });

  document.getElementById("modelOutputPanel").style.display = "flex";
}

function drawNSLChart(score) {
  const ctx = document.getElementById("nslChart").getContext("2d");
  if (window.nslChartInstance) window.nslChartInstance.destroy();

  const threshold = 75;
  const upper = 80;
  const lower = 70;
  const cecLabel = window.nslData?.cecNumber || "CEC";

  const dotColor =
    score < threshold ? "green" :
    score > threshold ? "red" : "darkgray";

  window.nslChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          type: 'scatter',
          label: "NSL Score",
          data: [{ x: 1, y: score }],
          backgroundColor: dotColor,
          pointRadius: 6
        },
        {
          type: 'line',
          label: "Threshold (75%)",
          data: [
            { x: 0.5, y: threshold },
            { x: 1.5, y: threshold }
          ],
          borderColor: "orange",
          borderWidth: 2,
          borderDash: [],
          fill: false
        },
        {
          type: 'line',
          label: "Upper DB (80%)",
          data: [
            { x: 0.5, y: upper },
            { x: 1.5, y: upper }
          ],
          borderColor: "#444",
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false
        },
        {
          type: 'line',
          label: "Lower DB (70%)",
          data: [
            { x: 0.5, y: lower },
            { x: 1.5, y: lower }
          ],
          borderColor: "#5a9bd3",
          borderWidth: 1.5,
          borderDash: [6, 4],
          fill: false
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "top"
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 2,
          ticks: {
            callback: function (val) {
              return val === 1 ? cecLabel : "";
            }
          },
          title: {
            display: true,
            text: "CEC Number"
          },
          grid: {
            drawTicks: false
          }
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "NSL Index (%)"
          }
        }
      }
    }
  });
}

function closeModelOutputPanel() {
  document.getElementById("modelOutputPanel").style.display = "none";
  document.body.classList.remove("modal-open");
}

async function downloadModelOutput() {
  const original = document.getElementById("modelOutputPanel");

  // 1. Replace chart with image (no fixed size)
  const chartCanvas = document.getElementById("nslChart");
  let chartImage = null;
  if (chartCanvas) {
    chartImage = new Image();
    chartImage.src = chartCanvas.toDataURL("image/png");
    chartImage.style.display = "block";
    chartImage.style.maxWidth = "100%";
    chartCanvas.parentNode.replaceChild(chartImage, chartCanvas);
  }

  // 2. Clone the full output panel
  const clone = original.cloneNode(true);
  clone.id = "modelOutputClone";

  // Remove buttons from the clone
  const closeBtn = clone.querySelector(".close-btn");
  const downloadBtn = clone.querySelector("#downloadModelOutputBtn");
  if (closeBtn) closeBtn.remove();
  if (downloadBtn) downloadBtn.remove();

  // 3. Wrap the clone in a clean offscreen container
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.width = "816px";
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.style.zIndex = "-1";
  wrapper.style.background = "#ffffff";
  wrapper.style.boxSizing = "border-box";

  // Ensure clone flows naturally and does not clip content
  clone.style.position = "static";
  clone.style.width = "816px";
  clone.style.minHeight = "1056px";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.margin = "0";
  clone.style.padding = "20px";
  clone.style.boxSizing = "border-box";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Allow browser to layout everything
  await new Promise(res => setTimeout(res, 100));

  // 4. Render the full wrapper
  const canvas = await html2canvas(wrapper, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true
  });

  // 5. Clean up
  document.body.removeChild(wrapper);
  if (chartCanvas && chartImage) {
    chartImage.parentNode.replaceChild(chartCanvas, chartImage);
  }

  // 6. Trigger download
  const imageData = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "NSL_Model_Output.png";
  link.href = imageData;
  link.click();
}
