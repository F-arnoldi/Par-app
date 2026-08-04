// ---------- Test-opsætning ----------
// Polyfill for localStorage — data.js (og dermed alt der importerer den,
// inkl. sync.js) forudsætter et browser-lignende localStorage, som ikke
// findes i almindelig Node uden --experimental-webstorage. Denne fil skal
// stå som det ALLERFØRSTE import i enhver test-fil herunder — ES-modulers
// import-rækkefølge kører top-til-bund pr. fil, så polyfillen er sat op
// før data.js/sync.js selv importeres og læser localStorage ved opstart.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}
