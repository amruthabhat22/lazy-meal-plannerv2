/** Minimal RFC-4180 CSV parser (quotes, embedded commas, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

export interface CsvMealRecord {
  id: string;
  name: string;
  slots: string;
  diet: string;
  cuisine: string | null;
  country: string | null;
  default_qty: number;
  min_qty: number;
  max_qty: number;
  qty_step: number;
  unit: string;
  protein_per_unit: number;
  difficulty: string | null;
  prep_time_min: number | null;
  allergens: string;
}

const REQUIRED_COLUMNS = [
  "id",
  "name",
  "slots",
  "diet",
  "cuisine",
  "country",
  "default_qty",
  "min_qty",
  "max_qty",
  "qty_step",
  "unit",
  "protein_per_unit",
  "difficulty",
  "prep_time_min",
  "allergens",
];

export function parseMealsCsv(text: string): CsvMealRecord[] {
  const rows = parseCsv(text);
  const header = rows[0];
  for (const col of REQUIRED_COLUMNS) {
    if (!header.includes(col)) {
      throw new Error(`meals.csv is missing required column '${col}'`);
    }
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const get = (row: string[], col: string) => (row[idx[col]] ?? "").trim();

  return rows.slice(1).map((row, n) => {
    const num = (col: string): number => {
      const v = Number(get(row, col));
      if (!Number.isFinite(v)) {
        throw new Error(`Row ${n + 2} (${get(row, "id")}): '${col}' is not a number`);
      }
      return v;
    };
    return {
      id: get(row, "id"),
      name: get(row, "name"),
      slots: get(row, "slots"),
      diet: get(row, "diet"),
      cuisine: get(row, "cuisine") || null,
      country: get(row, "country") || null,
      default_qty: num("default_qty"),
      min_qty: num("min_qty"),
      max_qty: num("max_qty"),
      qty_step: num("qty_step"),
      unit: get(row, "unit"),
      protein_per_unit: num("protein_per_unit"),
      difficulty: get(row, "difficulty") || null,
      prep_time_min: get(row, "prep_time_min") ? num("prep_time_min") : null,
      allergens: get(row, "allergens"),
    };
  });
}
