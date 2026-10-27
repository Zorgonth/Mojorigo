import { readFileSync, writeFileSync } from "node:fs";

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function escapeCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
}

export function readCsvFile(filePath) {
  return parseCsv(readFileSync(filePath, "utf8"));
}

export function toCsv(rows, headers) {
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((col) => escapeCsvCell(row[col])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function writeCsvFile(filePath, rows, headers) {
  writeFileSync(filePath, toCsv(rows, headers), "utf8");
}
