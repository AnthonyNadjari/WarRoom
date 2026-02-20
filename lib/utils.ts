import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string as DD/MM/YYYY (European format) */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Format YYYY-MM-DD for display as DD/MM/YYYY in inputs */
export function formatDateForInput(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Parse DD/MM/YYYY or D/M/YYYY to YYYY-MM-DD, or return empty string if invalid */
export function parseInputToIsoDate(input: string): string {
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return "";
  if (year < 100) return ""; // require 4-digit year
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const monthPadded = String(month).padStart(2, "0");
  const dayPadded = String(day).padStart(2, "0");
  return `${year}-${monthPadded}-${dayPadded}`;
}
