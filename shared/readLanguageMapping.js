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
        const value = parseInt(cells[0].innerText);
        map[value] = i;
    });
    return map;
}

export { getLanguageMapping }
