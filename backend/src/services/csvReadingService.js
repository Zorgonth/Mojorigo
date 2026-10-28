import { mkdir, appendFile, access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const databaseDirectory = path.join(projectRoot, "database");
const csvPath = path.join(databaseDirectory, "readings.csv");

const CSV_HEADERS = [
  "receivedAt",
  "sensorId",
  "cm",
  "fillPercent",
  "binId",
  "binLocation",
  "latitude",
  "longitude",
];

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  // Escape quotes and wrap fields containing commas, quotes or newlines.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function ensureCsvExists() {
  await mkdir(databaseDirectory, { recursive: true });

  try {
    await access(csvPath);
  } catch {
    // "wx" creates the file only if it doesn't already exist.
    try {
      const { open } = await import("node:fs/promises");
      const file = await open(csvPath, "wx");
      await file.writeFile(`${CSV_HEADERS.join(",")}\n`, "utf8");
      await file.close();
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  const fileStats = await stat(csvPath);

  // Handle an existing but empty CSV file.
  if (fileStats.size === 0) {
    await appendFile(csvPath, `${CSV_HEADERS.join(",")}\n`, "utf8");
  }
}

export async function saveReadingToCsv(reading) {
  await ensureCsvExists();

  const row = CSV_HEADERS.map((header) =>
    csvEscape(reading[header]),
  ).join(",");

  await appendFile(csvPath, `${row}\n`, "utf8");

  return reading;
}