// ---------- Utilities ----------
import { state } from './data.js';
import { t, locale } from './i18n.js';
import { MAANEDER_MONO, KATEGORIER } from './constants.js';

export function todayISO() {
  return toISO(new Date());
}

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(fromISO, toISO_) {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO_ + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

export function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonoDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const months = MAANEDER_MONO[state.lang] || MAANEDER_MONO.da;
  return `${day} ${months[d.getMonth()]}`;
}

export function formatMonoRange(start, end) {
  if (!start) return "";
  const s = new Date(start + "T00:00:00");
  const startFmt = formatMonoDate(start);
  const startYear = s.getFullYear();
  if (!end || end === start) return `${startFmt} · ${startYear}`;
  const e = new Date(end + "T00:00:00");
  const endFmt = formatMonoDate(end);
  const endYear = e.getFullYear();
  if (startYear === endYear) {
    return `${startFmt} — ${endFmt} · ${startYear}`;
  }
  return `${startFmt} ${startYear} — ${endFmt} ${endYear}`;
}

export function formatKr(n) {
  const val = Math.round(Number(n) || 0);
  return val.toLocaleString(locale()) + " kr.";
}

export function heroCountdown(startdato) {
  const d = daysBetween(todayISO(), startdato);
  if (d === 0) return { num: "0", unit: t('unit_today') };
  if (d === 1) return { num: "1", unit: t('unit_day') };
  if (d > 0)   return { num: String(d), unit: t('unit_days') };
  if (d === -1) return { num: "1", unit: t('unit_day_ago') };
  return { num: String(-d), unit: t('unit_days_ago') };
}

export function shortCountdown(startdato) {
  const d = daysBetween(todayISO(), startdato);
  if (d === 0) return { num: t('unit_today'), unit: "" };
  if (d === 1) return { num: "1", unit: t('unit_day') };
  if (d > 0)   return { num: String(d), unit: t('unit_days') };
  if (d === -1) return { num: "1", unit: t('unit_day_ago') };
  return { num: String(-d), unit: t('unit_days_ago') };
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function kategoriIkon(id) {
  const k = KATEGORIER.find(k => k.id === id);
  return k ? k.ikon : "pin";
}

export function kategoriNavn(id) {
  const k = KATEGORIER.find(k => k.id === id);
  return k ? t('kat_' + id) : "";
}

export function buildMapsUrl(adresse) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

// Kun http/https er tilladt som href — forhindrer at fx en javascript:-URL
// nogensinde kan lande i markup.
export function isSafeHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
