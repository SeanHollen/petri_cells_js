function formatPercentage(input) {
  const value = input.value.replace(/[^-\d.]/g, "");
  input.value = `${value}%`;
}

function formatNumber(input) {
  const value = input.value.replace(/[^-\d.]/g, "");
  input.value = `${value}`;
}

function clickNoiseOption(value) {
  const pctNoiseForm = document.getElementById("percent-noise");

  if (value === 0) {
    pctNoiseForm.style.display = "none";
  } else if (value === 1 || value === 2) {
    pctNoiseForm.style.display = "block";
  }
}
