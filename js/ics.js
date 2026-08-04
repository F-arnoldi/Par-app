// ---------- Kalender-eksport ----------
import { t } from './i18n.js';
import { formatKr, addDaysISO, kildeNavn } from './utils.js';
import { activitiesFor } from './selectors.js';

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

// Én begivenhed pr. aktivitet med en dato — flydende lokal tid (intet
// Z-suffiks/TZID), da appen ikke sporer eventyrets tidszone, kun de
// tidspunkter brugeren selv har tastet ind. En aktivitet uden klokkeslæt
// bliver en heldagsbegivenhed, samme mønster som selve rejsens begivenhed.
function buildActivityVEvent(x, dtStamp) {
  if (!x.dato) return null;
  const navn = x.kilde ? kildeNavn(x.kilde) : x.navn;
  const datoCompact = x.dato.replace(/-/g, "");
  const lines = ["BEGIN:VEVENT", `UID:${x.id}@nyt-eventyr`, `DTSTAMP:${dtStamp}`];

  if (x.startTid) {
    lines.push(`DTSTART:${datoCompact}T${x.startTid.replace(":", "")}00`);
    if (x.slutTid) lines.push(`DTEND:${datoCompact}T${x.slutTid.replace(":", "")}00`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${datoCompact}`);
    lines.push(`DTEND;VALUE=DATE:${addDaysISO(x.dato, 1).replace(/-/g, "")}`);
  }

  lines.push(`SUMMARY:${icsEscape(navn)}`);
  const location = [x.stedNavn, x.adresse].filter(Boolean).join(", ");
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  if (x.noter) lines.push(`DESCRIPTION:${icsEscape(x.noter)}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildICS(a) {
  const dtStart = a.startdato.replace(/-/g, "");
  const dtEnd = addDaysISO(a.slutdato || a.startdato, 1).replace(/-/g, "");
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const tripEventLines = [
    "BEGIN:VEVENT",
    `UID:${a.id}@nyt-eventyr`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${icsEscape(a.navn)}`,
  ];
  if (Number(a.målBeløb) > 0) {
    tripEventLines.push(`DESCRIPTION:${icsEscape(t('icsAmountLine', formatKr(a.målBeløb)))}`);
  }
  tripEventLines.push("END:VEVENT");

  const activityEventLines = activitiesFor(a.id).flatMap(x => buildActivityVEvent(x, dtStamp) || []);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nyt Eventyr//DA",
    "CALSCALE:GREGORIAN",
    ...tripEventLines,
    ...activityEventLines,
    "END:VCALENDAR",
  ];
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
