import {
  mkdir,
  appendFile,
  access,
  stat,
  open,
} from "node:fs/promises";

import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(
  new URL("../../", import.meta.url)
);

const databaseDirectory = path.join(
  projectRoot,
  "database"
);

const csvPath = path.join(
  databaseDirectory,
  "readings.csv"
);

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

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function ensureCsvExists() {
  await mkdir(databaseDirectory, {
    recursive: true,
  });

  try {
    await access(csvPath);
  } catch {
    try {
      const file = await open(csvPath, "wx");

      try {
        await file.writeFile(
          `${CSV_HEADERS.join(",")}\n`,
          "utf8"
        );
      } finally {
        await file.close();
      }
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  const fileStats = await stat(csvPath);

  // Add headers if the file exists but is empty.
  if (fileStats.size === 0) {
    await appendFile(
      csvPath,
      `${CSV_HEADERS.join(",")}\n`,
      "utf8"
    );
  }
}

export async function saveReadingToCsv(reading) {
  await ensureCsvExists();

  const row = CSV_HEADERS
    .map((header) => csvEscape(reading[header]))
    .join(",");

  await appendFile(
    csvPath,
    `${row}\n`,
    "utf8"
  );

  return reading;
}