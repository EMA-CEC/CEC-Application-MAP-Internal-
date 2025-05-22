// Utility functions shared across modules

function formatDateToComparable(dateStr) {
  if (!dateStr) return "";

  // Check if it's already in ISO format (YYYY-MM-DD or ISO string)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10); // Just use YYYY-MM-DD portion
  }

  // Otherwise, assume DD-MMM-YY
  const monthMap = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };

  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";

  const [day, mon, yearSuffix] = parts;
  const year = parseInt(yearSuffix, 10) < 50 ? `20${yearSuffix}` : `19${yearSuffix}`;
  return `${year}-${monthMap[mon]}-${day.padStart(2, '0')}`;
}

function convertUTMToLatLon(easting, northing) {
  const proj32620 = "+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs";
  const proj4326 = "+proj=longlat +datum=WGS84 +no_defs";
  const [lon, lat] = proj4(proj32620, proj4326, [parseFloat(easting), parseFloat(northing)]);
  return [lat, lon];
}

function convertLatLonToUTM(lat, lon) {
  const proj4UTM = "+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs";
  const [easting, northing] = proj4("EPSG:4326", proj4UTM, [lon, lat]);
  return { easting, northing };
}

function getStatusBadge(status) {
  const statusClass = {
    "Application Withdrawn": "status-withdrawn",
    "File Closed": "status-closed",
    "Issued CEC": "status-issued",
    "No CEC Required": "status-lime",
    "Notice of Refusal": "status-refused",
    "Pending": "status-pending",
    "General Letter": "status-letter"
  };

  const className = statusClass[status] || "status-pending"; // fallback
  return `<span class="status-badge ${className}">${status}</span>`;
}

function populateDropdown(selectId, items) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- All --</option>'; // Default option

  items.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

const designatedActivityCodes = [
  "N/A", "TBD", "1 (a)", "1 (b)", "2", "3", "4", "5 (a)", "5 (b)", "5 (c)", "6", "7", "8 (a)",
  "8 (b)", "8 (c)", "9", "10 (a)(i)", "10 (a)(ii)", "10 (b)(i)", "10 (b)(ii)", "11", "12", "13 (a)",
  "13 (b)", "13 (c)", "14 (a)", "14 (b)", "15", "16", "17", "18 (a)", "18 (b)", "19", "20 (a)", "20 (b)",
  "20 (c)", "20 (d)", "21", "22", "23", "24", "25", "26 (a)", "26 (b)", "27", "28", "29", "30", "31 (a)",
  "31 (b)", "32", "33 (a)", "33 (b)", "34", "35", "36", "37", "38 (a)", "38 (b)", "38 (c)", "39", "40 (a)",
  "40 (b)", "41 (a)", "41 (b)", "41 (c)", "42", "43 (a)", "43 (b)", "43 (c)", "43 (d)", "44 (a)", "44 (b)"
];

function populateDASelect(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- All --</option>';

  designatedActivityCodes.forEach(code => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code;
    select.appendChild(option);
  });
}
