// ---------- Kalender-eksport ----------
import { t } from './i18n.js';
import { formatKr, addDaysISO } from './utils.js';

export function icsEscape(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function icsFoldLines(text) {
  return text.split("\r\n").map(line => {
    if (line.length <= 75) return line;
    let folded = "";
    let rest = line;
    while (rest.length > 75) {
      folded += rest.slice(0, 75) + "\r\n ";
      rest = rest.slice(75);
    }
    return folded + rest;
  }).join("\r\n");
}

export function buildICS(a) {
  const dtStart = a.startdato.replace(/-/g, "");
  const dtEnd = addDaysISO(a.slutdato || a.startdato, 1).replace(/-/g, "");
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nyt Eventyr//DA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${a.id}@nyt-eventyr`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${icsEscape(a.navn)}`,
  ];
  if (Number(a.målBeløb) > 0) {
    lines.push(`DESCRIPTION:${icsEscape(t('icsAmountLine', formatKr(a.målBeløb)))}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return icsFoldLines(lines.join("\r\n"));
}

export function downloadICS(a) {
  const ics = buildICS(a);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = (a.navn || "eventyr")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "eventyr";
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
