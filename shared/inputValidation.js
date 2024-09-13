function formatPercentage(input) {
  const value = input.value.replace(/[^-\d.]/g, "");
  input.value = `${value}%`;
}

function removeExcessDashes(value) {
  const isNegative = value.substring(0, 1) === "-";
  value = value.replace(/-/g, "");
  return isNegative ? "-" + value : value;
}

function formatNumber(input) {
  let value = input.value.replace(/[^-\d.]/g, "");
  value = removeExcessDashes(value);
  input.value = value;
}

function formatInteger(input) {
  let value = input.value.replace(/[^-\d]/g, "");
  value = removeExcessDashes(value);
  input.value = value;
}

function clickNoiseOption(selectedElement) {
  const value = selectedElement.value;
  const pctNoiseForm = document.getElementById("percent-noise");
  const pctNoiseInput = document.getElementById("percent-noise-input");
  if (value === "none") {
    pctNoiseForm.style.display = "none";
  } else if (value === "kill-cells") {
    pctNoiseForm.style.display = "block";
    pctNoiseInput.value = "3%";
  } else if (value === "kill-instructions") {
    pctNoiseForm.style.display = "block";
    pctNoiseInput.value = "0.2%";
  }
}

function preventPageRefresh(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
}

window.formatPercentage = formatPercentage;
window.formatNumber = formatNumber;
window.formatInteger = formatInteger;
window.clickNoiseOption = clickNoiseOption;
window.preventPageRefresh = preventPageRefresh;