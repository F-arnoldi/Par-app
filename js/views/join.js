// ---------- Tilslut via invitationslink ----------
// Den ene bevidste undtagelse fra "render() er altid synkron": at åbne et
// invitationslink kræver af natur et netværkskald, før eventyret kan vises
// — enheden har det ikke lokalt endnu. Resten af appen forbliver synkron.
import { t } from '../i18n.js';
import { navigate } from '../router.js';

export async function handleJoin(serverAdventureId, token) {
  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="hero-empty">
      <p class="eyebrow" style="color:var(--ink-soft)">${t('joiningTitle')}</p>
      <h2>${t('joiningText')}</h2>
    </div>
  `;

  try {
    const sync = await import('../sync.js');
    await sync.initSync();
    const localId = await sync.joinAdventure(serverAdventureId, token);
    if (!localId) throw new Error("join_failed");
    navigate(`/adventure/${localId}`);
  } catch {
    root.innerHTML = `
      <div class="hero-empty">
        <p class="eyebrow" style="color:var(--ink-soft)">${t('joinFailedTitle')}</p>
        <h2>${t('joinFailedText')}</h2>
        <button class="btn btn-rust" data-action="join-back">${t('backLabel')}</button>
      </div>
    `;
    document.querySelector('[data-action="join-back"]')?.addEventListener("click", () => navigate("/"));
  }
}
