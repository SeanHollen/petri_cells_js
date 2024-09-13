import { EventHandleHelper } from "../shared/handleEvents.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";

function getDefaultMapping() {
  const map = {};
  for (let i = 0; i <= 10; i++) {
    map[i] = i;
  }
  return map;
}

function getRandomMapping() {
  const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = values.sort(() => Math.random() - 0.5);
  const map = {};
  shuffled.forEach((val, i) => {
    map[val] = i;
  });
  return map;
}

function containsDuplicates(cells) {
  const seen = new Set();
  for (let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    let input = cell.querySelector("input");
    let value = input.value;
    if (seen.has(value)) {
      return true;
    }
    if (value) {
      seen.add(value);
    }
  }
  return false;
}

function getCells() {
  const table = document.getElementById("bf-language-table");
  const rows = table.getElementsByTagName("tr");
  const rowsArr = [];
  for (let i in rows) {
    rowsArr.push(rows[i]);
  }
  return rowsArr.slice(1, 12).map((row) => {
    const cells = row.getElementsByTagName("td");
    return cells[0];
  });
}

function inverseMapping(mapping) {
  return Object.fromEntries(
    Object.entries(mapping).map(([k, v]) => [v, k])
  );
}

function setTableValues(mapping, cells) {
  mapping = inverseMapping(mapping);
  for (let i = 0; i < cells.length; i++) {
    if (i in mapping) {
      let cell = cells[i];
      let val = cell.querySelector(".val");
      val.innerText = mapping[i];
    }
  }
}

function openForms(cells, mapping) {
  mapping = inverseMapping(mapping);
  for (let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    let val = cell.querySelector(".val");
    val.style.display = "none";
    let input = cell.querySelector("input");
    input.style.display = "inline";
    input.value = mapping[i] || "";
  }
}

function closeForms(cells) {
  for (let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    let input = cell.querySelector("input");
    input.style.display = "none";
    let value = input.value;
    let valDiv = cell.querySelector(".val");
    valDiv.innerText = value;
    valDiv.style.display = "inline";
  }
}

const eventHandleHelper = new EventHandleHelper();
eventHandleHelper.addEventListener("edit-language-button", () => {
  const cells = getCells();
  const mapping = getLanguageMapping();
  openForms(cells, mapping);
  const saveButton = document.getElementById("save-language-button");
  saveButton.style.display = "inline";
  const editButton = document.getElementById("edit-language-button");
  editButton.style.display = "none";
  const randomizeButton = document.getElementById("random-language-button");
  randomizeButton.style.display = "none";
  const toDefaultButton = document.getElementById("reset-language-button");
  toDefaultButton.style.display = "none";
});
eventHandleHelper.addEventListener("save-language-button", () => {
  const cells = getCells();
  const containsDups = containsDuplicates(cells);
  const warning = document.getElementById("duplication-warning");
  if (containsDups) {
    warning.style.display = "block";
    return;
  }
  closeForms(cells);
  const editButton = document.getElementById("edit-language-button");
  editButton.style.display = "inline";
  const saveButton = document.getElementById("save-language-button");
  saveButton.style.display = "none";
  warning.style.display = "none";
  const randomizeButton = document.getElementById("random-language-button");
  randomizeButton.style.display = "inline";
  const toDefaultButton = document.getElementById("reset-language-button");
  toDefaultButton.style.display = "inline";
});
eventHandleHelper.addEventListener("random-language-button", () => {
  const mapping = getRandomMapping();
  const cells = getCells();
  setTableValues(mapping, cells);
  const toDefaultButton = document.getElementById("reset-language-button");
  toDefaultButton.style.display = "inline";
});
eventHandleHelper.addEventListener("reset-language-button", () => {
  const mapping = getDefaultMapping();
  const cells = getCells();
  setTableValues(mapping, cells);
  const button = document.getElementById("reset-language-button");
  button.style.display = "none";
});
