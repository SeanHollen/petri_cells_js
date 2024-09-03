function formatPercentage(input) {
  const value = input.value.replace(/[^-\d.]/g, "");
  input.value = `${value}%`;
}

function formatNumber(input) {
  const value = input.value.replace(/[^-\d.]/g, "");
  input.value = `${value}`;
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
