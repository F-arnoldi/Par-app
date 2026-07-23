// ---------- Ikoner ----------
// Selv-indeholdt, monokromt SVG-ikonsæt (ingen ekstern ikon-font/CDN).
// Hvert ikon arver farve fra sin container via currentColor.
export const ICONS = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  beach: '<circle cx="12" cy="9" r="4"/><path d="M3 17c2-2 4-2 6 0s4 2 6 0s4-2 6 0"/>',
  mountain: '<path d="M3 18L9 8l4 5l3-3l5 8"/>',
  landmark: '<path d="M3 10l9-5l9 5"/><path d="M5 10v11M19 10v11M9 10v11M15 10v11"/><path d="M3 21h18"/>',
  "ferris-wheel": '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  wine: '<path d="M8 3h8"/><path d="M8 3c0 5 1.5 8 4 8s4-3 4-8"/><path d="M12 11v7"/><path d="M8 21h8"/>',
  spa: '<path d="M4 20c8 0 14-6 14-16c-10 0-16 6-16 14c0 1 0 2 2 2z"/><path d="M6 18c4-4 8-8 12-12"/>',
  ski: '<path d="M12 2v20"/><path d="M4.2 6L19.8 18"/><path d="M19.8 6L4.2 18"/>',
  boat: '<path d="M3 16h18l-2 4H5z"/><path d="M12 16V4"/><path d="M12 5l6 7"/>',
  tent: '<path d="M12 4l9 16H3z"/><path d="M12 4v16"/><path d="M9 20l3-5.5l3 5.5"/>',
  sunrise: '<path d="M3 18h18"/><path d="M7 18a5 5 0 0110 0"/><path d="M12 8v3M6.5 12.5l1.4 1.4M17.5 12.5l-1.4 1.4"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.4 0 1.9-.9 1.9-1.8c0-.8-.5-1.3-.5-2.1c0-1.3 1.3-1.7 2.6-1.7c2.3 0 4-1.9 4-4.2C20 6 16.5 3 12 3z"/><circle cx="8.3" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="9.7" r="1" fill="currentColor" stroke="none"/>',
  suitcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 12h18"/>',
  plane: '<path d="M21 3L11 13"/><path d="M21 3l-7 18-4-8-8-4z"/>',
  bed: '<path d="M3 19v-7a2 2 0 012-2h14a2 2 0 012 2v7"/><path d="M3 19h18"/><path d="M3 14h18"/><circle cx="7.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  utensils: '<path d="M6 3v7a2 2 0 002 2v9M6 3v7M9 3v7"/><path d="M17 3c-2 0-3 2-3 4v4a2 2 0 002 2v8"/>',
  ticket: '<path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v1.5a1.7 1.7 0 000 5V16a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.5a1.7 1.7 0 000-5z"/><path d="M14 6.5v11" stroke-dasharray="2.2 2.2"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1.1 1.2-2 3-2s3 .9 3 2c0 2.2-6 1-6 3.5c0 1.1 1.2 2 3 2s3-.9 3-2"/><path d="M12 5.8v1.2M12 16v1.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6l9-6"/>',
  bookmark: '<path d="M6 3h12a1 1 0 011 1v17l-7-4l-7 4V4a1 1 0 011-1z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  link: '<path d="M9 15l6-6"/><path d="M8 12l-2 2a3 3 0 004 4l3-3"/><path d="M16 12l2-2a3 3 0 00-4-4l-3 3"/>',
  pin: '<path d="M12 2a6 6 0 00-6 6c0 5 6 12 6 12s6-7 6-12a6 6 0 00-6-6z"/><circle cx="12" cy="8" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 01-.5-8.98A5.5 5.5 0 0117 8.06A4 4 0 0116.5 18H7z"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
};

export function icon(name, cls = "") {
  const inner = ICONS[name] || ICONS.pin;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
