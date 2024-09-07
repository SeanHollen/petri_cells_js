function getLanguageMapping() {
    const table = document.getElementById("bf-language-table");
    const rows = table.getElementsByTagName("tr");
    const map = {};
    const rowsArr = []
    for (let i in rows) {
        rowsArr.push(rows[i]);
    }
    rowsArr.slice(1, 12).forEach((row, i) => {
        const cells = row.getElementsByTagName("td");
        if (cells.length === 0) {
            return;
        }
        let value = parseInt(cells[0].innerText);
        value = isNaN(value) ? "" : value;
        map[value] = i;
    });
    return map;
}

export { getLanguageMapping }
