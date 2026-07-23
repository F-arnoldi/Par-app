// ---------- Router ----------
import { getAdventure, normalizeTab, isTravelDay } from './selectors.js';
import { todayISO } from './utils.js';
import { renderList, wireList } from './views/list.js';
import { renderDetail, wireDetail } from './views/detail.js';
import { renderCalendar, wireCalendar } from './views/calendar.js';
import { renderProfile, wireProfile } from './views/profile.js';
import { handleJoin } from './views/join.js';
import { renderLogin, wireLogin, isLoggedIn } from './views/login.js';

export function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "list" };
  if (parts[0] === "calendar") return { name: "calendar" };
  if (parts[0] === "profile") return { name: "profile" };
  if (parts[0] === "join" && parts[1] && parts[2]) {
    return { name: "join", serverAdventureId: parts[1], token: parts[2] };
  }
  if (parts[0] === "adventure" && parts[1]) {
    return {
      name: "detail",
      id: parts[1],
      tab: parts[2] || null, // null = intet fane-suffiks i URL'en
    };
  }
  return { name: "list" };
}

export function navigate(path) {
  location.hash = path;
}

// ---------- Render ----------
// Bevarer scroll-position ved en in-place re-render (uændret hash, fx efter
// endnu en indbetaling), men nulstiller til top ved reel navigation (nyt hash)
// — undtagen når vi lander på Program-fanen på en rejsedag, hvor dagens
// datooverskrift scrolles i fokus i stedet.
let lastHash = null;

export function render() {
  const currentHash = location.hash;
  const samePlace = currentHash === lastHash;
  const savedScrollY = samePlace ? window.scrollY : 0;

  const route = parseRoute();
  const root = document.getElementById("app");
  let scrollToToday = false;

  // /join er den eneste undtagelse: en invitation skal kunne åbnes af en
  // helt ny modtager, der endnu ikke har logget ind — handleJoin virker
  // allerede fint på en anonym session. Alle andre ruter kræver enten et
  // bekræftet login, eller at enheden har været logget ind før (se
  // isLoggedIn() / hasLoggedInBefore for hvorfor det virker offline).
  if (route.name !== "join" && !isLoggedIn()) {
    root.innerHTML = renderLogin();
    wireLogin();
    lastHash = currentHash;
    return;
  }

  if (route.name === "join") {
    // Fire-and-forget: handleJoin selv navigerer videre (eller viser en
    // fejltilstand) når den er færdig, hvilket trigger en helt almindelig,
    // synkron render() igen. Ingen scroll-logik er relevant for dette
    // mellemstadie.
    handleJoin(route.serverAdventureId, route.token);
    lastHash = currentHash;
    return;
  }

  if (route.name === "detail") {
    // Gammelt /planer-segment redirectes til /program, så gemte links/
    // bogmærker ikke knækker.
    if (route.tab === "planer") {
      navigate(`/adventure/${route.id}/program`);
      return;
    }

    const adv = getAdventure(route.id);
    if (!adv) { navigate("/"); return; }

    let tab = route.tab;
    if (tab === null) {
      tab = isTravelDay(adv) ? "program" : "oversigt";
    }
    tab = normalizeTab(adv, tab); // validerer (fx en oplevelse har ingen Program-fane)
    if (route.tab === null && tab === "program") scrollToToday = true;

    root.innerHTML = renderDetail(adv, tab);
    wireDetail(adv, tab);
  } else if (route.name === "calendar") {
    root.innerHTML = renderCalendar();
    wireCalendar();
  } else if (route.name === "profile") {
    root.innerHTML = renderProfile();
    wireProfile();
  } else {
    root.innerHTML = renderList();
    wireList();
  }

  if (scrollToToday && !samePlace) {
    const heading = document.querySelector(`[data-day-heading="${todayISO()}"]`);
    if (heading) heading.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, samePlace ? savedScrollY : 0);
  }
  lastHash = currentHash;
}
