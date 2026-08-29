import * as XLSX from "xlsx";

export function parseSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

/** Case/whitespace-insensitive header lookup so admins don't have to match
 * an exact column name — "Trade Name", "trade_name", "TRADE NAME" all work. */
export function findColumn(row: Record<string, unknown>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const key = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
    if (key) return String(row[key] ?? "").trim();
  }
  return "";
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
