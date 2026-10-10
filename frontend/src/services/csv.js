// Preserve quoted commas, escaped quotes and newlines in metadata columns.
export function parseCsv(text) {
  const records = [];
  let row = [], cell = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) records.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(cell.trim());
  if (row.some((value) => value !== "")) records.push(row);
  return { headers: records[0] || [], rows: records.slice(1) };
}
