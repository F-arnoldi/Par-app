// ---------- Lokale påmindelser (spareplan) ----------
// Kun relevant i den native iOS-shell — window.Capacitor findes ikke i en
// almindelig browserfane, så alle kald herfra er bevidst optional-chained
// og fejler stille i stedet for at kaste, hvis appen kører som ren PWA.
// Rent enheds-lokalt med vilje: hver partners telefon planlægger sin egen
// påmindelse uafhængigt, der er intet at synkronisere på tværs af enheder.
import { t } from './i18n.js';

function plugin() {
  return window.Capacitor?.Plugins?.LocalNotifications || null;
}

// LocalNotifications kræver et numerisk id, men vores egne eventyr-id'er
// er UUID-strenge — afleder et stabilt 32-bit heltal af id'et i stedet
// for at holde styr på en separat tæller.
function notificationId(adventureId) {
  let h = 0;
  for (let i = 0; i < adventureId.length; i++) {
    h = (h * 31 + adventureId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export async function ensureNotificationPermission() {
  const p = plugin();
  if (!p) return false;
  const status = await p.checkPermissions();
  if (status.display === "granted") return true;
  const req = await p.requestPermissions();
  return req.display === "granted";
}

export async function scheduleSavingsReminder(adventure, plan) {
  const p = plugin();
  if (!p || !plan?.planlagtBeløb) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  const schedule = plan.frekvens === "uge"
    ? { every: "week", on: { weekday: 2, hour: 18, minute: 0 } }
    : { every: "month", on: { day: 1, hour: 18, minute: 0 } };
  await p.schedule({
    notifications: [{
      id: notificationId(adventure.id),
      title: t('reminderTitle'),
      body: t('reminderBody', adventure.navn),
      schedule,
    }],
  }).catch(() => {});
}

export async function cancelSavingsReminder(adventure) {
  const p = plugin();
  if (!p) return;
  await p.cancel({ notifications: [{ id: notificationId(adventure.id) }] }).catch(() => {});
}
