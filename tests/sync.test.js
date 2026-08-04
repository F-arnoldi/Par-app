// sync.js har bevidst INGEN top-level import af 'https://esm.sh/...' (kun
// initSync() gør det, dynamisk) — så dette kan importeres direkte i Node
// uden netværksadgang, og de rene funktioner (isNewer/isDirty/merge*/
// to*Row/from*Row) kan testes uden en rigtig Supabase-forbindelse.
import './test-setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/data.js';
import {
  isNewer, isDirty,
  toAdventureRow, fromAdventureRow,
  toActivityRow, fromActivityRow,
  toSavingsRow, fromSavingsRow,
  mergeAdventures, mergeActivities, mergeSavings,
} from '../js/sync.js';

function resetState() {
  state.adventures = [];
  state.activities = [];
  state.savings = [];
  state.plans = {};
  state.lastSyncedAt = null;
}

test('isNewer: sammenligner faktisk tidspunkt, ikke rå streng (+00:00 vs. Z)', () => {
  // Samme øjeblik, to forskellige gyldige ISO-repræsentationer.
  assert.equal(isNewer('2026-01-01T12:00:00.000+00:00', '2026-01-01T12:00:00.000Z'), false);
  assert.equal(isNewer('2026-01-01T12:00:01.000Z', '2026-01-01T12:00:00.000Z'), true);
  assert.equal(isNewer('2026-01-01T11:59:59.000Z', '2026-01-01T12:00:00.000Z'), false);
});

test('isDirty: uden serverId er altid beskidt (aldrig pushet endnu)', () => {
  resetState();
  assert.equal(isDirty({ serverId: null, updatedAt: '2020-01-01T00:00:00Z' }), true);
});

test('isDirty: med serverId men uden lastSyncedAt er altid beskidt (første sync)', () => {
  resetState();
  state.lastSyncedAt = null;
  assert.equal(isDirty({ serverId: 'srv1', updatedAt: '2020-01-01T00:00:00Z' }), true);
});

test('isDirty: nyere end sidste sync er beskidt, ældre/lige er ren', () => {
  resetState();
  state.lastSyncedAt = '2026-01-01T00:00:00Z';
  assert.equal(isDirty({ serverId: 'srv1', updatedAt: '2026-01-02T00:00:00Z' }), true);
  assert.equal(isDirty({ serverId: 'srv1', updatedAt: '2025-12-31T00:00:00Z' }), false);
  assert.equal(isDirty({ serverId: 'srv1', updatedAt: '2026-01-01T00:00:00Z' }), false);
});

test('mergeAdventures: ny server-række uden lokalt match tilføjes', () => {
  resetState();
  mergeAdventures([{
    id: 'srv1', navn: 'Rom-tur', type: 'rejse', startdato: '2026-08-01', slutdato: '2026-08-05',
    maal_beloeb: 5000, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: null, frekvens: null, checklist: [], valuta: null, kurs: null,
    join_token: 'tok123', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.adventures.length, 1);
  assert.equal(state.adventures[0].navn, 'Rom-tur');
  assert.equal(state.adventures[0].serverId, 'srv1');
});

test('mergeAdventures: nyere server-række overskriver lokal (last-write-wins)', () => {
  resetState();
  state.adventures = [{
    id: 'local1', serverId: 'srv1', navn: 'Gammelt navn', updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null, type: 'rejse',
  }];
  mergeAdventures([{
    id: 'srv1', navn: 'Nyt navn (fra partner)', type: 'rejse', startdato: '', slutdato: '',
    maal_beloeb: 0, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: null, frekvens: null, join_token: null,
    updated_at: '2026-01-02T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.adventures[0].navn, 'Nyt navn (fra partner)');
  assert.equal(state.adventures[0].id, 'local1'); // det lokale id bevares, kun feltværdier opdateres
});

test('mergeAdventures: ÆLDRE eller LIGE server-række overskriver IKKE en nyere/lige lokal ændring', () => {
  resetState();
  state.adventures = [{
    id: 'local1', serverId: 'srv1', navn: 'Min friske ændring', updatedAt: '2026-01-05T00:00:00Z',
    deletedAt: null, type: 'rejse',
  }];
  mergeAdventures([{
    id: 'srv1', navn: 'Forældet server-version', type: 'rejse', startdato: '', slutdato: '',
    maal_beloeb: 0, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: null, frekvens: null, join_token: null,
    updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.adventures[0].navn, 'Min friske ændring');
});

test('mergeAdventures: join_token opdateres ALTID, selv når resten af rækken ikke er nyere', () => {
  // Se sync.js's egen kommentar: join_token er ikke et LWW-konfliktfelt,
  // klienten sender det aldrig selv, så uden denne undtagelse ville
  // ejerens egen første pull af sin lige-pushede række aldrig fange
  // tokenet (updated_at er identisk, "kun ved nyere" ville springe det over).
  resetState();
  state.adventures = [{
    id: 'local1', serverId: 'srv1', navn: 'Rom-tur', updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null, type: 'rejse', joinToken: null,
  }];
  mergeAdventures([{
    id: 'srv1', navn: 'Rom-tur', type: 'rejse', startdato: '', slutdato: '',
    maal_beloeb: 0, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: null, frekvens: null, join_token: 'frisk-token',
    updated_at: '2026-01-01T00:00:00Z', deleted_at: null, // SAMME tidsstempel som lokalt
  }]);
  assert.equal(state.adventures[0].joinToken, 'frisk-token');
  assert.equal(state.adventures[0].navn, 'Rom-tur'); // resten er urørt, som forventet ved "ikke nyere"
});

test('mergeAdventures: en tombstonet server-række (deleted_at sat) fletter ind som slettet lokalt', () => {
  resetState();
  state.adventures = [{
    id: 'local1', serverId: 'srv1', navn: 'Rom-tur', updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null, type: 'rejse',
  }];
  mergeAdventures([{
    id: 'srv1', navn: 'Rom-tur', type: 'rejse', startdato: '', slutdato: '',
    maal_beloeb: 0, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: null, frekvens: null, join_token: null,
    updated_at: '2026-01-02T00:00:00Z', deleted_at: '2026-01-02T00:00:00Z',
  }]);
  assert.ok(state.adventures[0].deletedAt);
});

test('mergeAdventures: planlagt_beloeb/frekvens folder ind i state.plans; fjernes når null', () => {
  resetState();
  mergeAdventures([{
    id: 'srv1', navn: 'Rom-tur', type: 'rejse', startdato: '', slutdato: '',
    maal_beloeb: 0, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: 350, frekvens: 'uge', join_token: null,
    updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  }]);
  const localId = state.adventures[0].id;
  assert.deepEqual(state.plans[localId], { planlagtBeløb: 350, frekvens: 'uge' });

  mergeAdventures([{
    id: 'srv1', navn: 'Rom-tur', type: 'rejse', startdato: '', slutdato: '',
    maal_beloeb: 0, icon: 'globe', afsluttet: false, opsparing_aktiveret: false,
    planlagt_beloeb: null, frekvens: null, join_token: null,
    updated_at: '2026-01-02T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.plans[localId], undefined);
});

test('mergeActivities: springer en aktivitet over hvis dens forældre-eventyr endnu ikke findes lokalt', () => {
  resetState();
  mergeActivities([{
    id: 'act-srv1', adventure_id: 'ukendt-eventyr-srv-id', navn: 'Colosseum', kategori: 'oplevelse',
    dato: '', pris: 0, kilde: null, start_tid: '', slut_tid: '', varer_til: null,
    sted_navn: '', adresse: '', reference: '', link: '', telefon: '', noter: '', status: 'idé',
    votes: {}, created_by: null, updated_by: null,
    updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.activities.length, 0);
});

test('mergeActivities: LWW gælder samme som eventyr', () => {
  resetState();
  state.adventures = [{ id: 'localAdv', serverId: 'srv-adv', navn: 'Rom-tur' }];
  state.activities = [{
    id: 'localAct', serverId: 'srv-act', adventureId: 'localAdv', navn: 'Gammelt navn',
    updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
  }];
  mergeActivities([{
    id: 'srv-act', adventure_id: 'srv-adv', navn: 'Nyt navn', kategori: 'oplevelse',
    dato: '', pris: 0, kilde: null, start_tid: '', slut_tid: '', varer_til: null,
    sted_navn: '', adresse: '', reference: '', link: '', telefon: '', noter: '', status: 'idé',
    votes: {}, created_by: null, updated_by: null,
    updated_at: '2026-01-02T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.activities[0].navn, 'Nyt navn');
});

test('mergeSavings: springer over uden kendt forældre, fletter ellers med LWW', () => {
  resetState();
  mergeSavings([{
    id: 'sav-srv1', adventure_id: 'ukendt', beloeb: 100, dato: '2026-01-01', notat: '',
    user_id: null, updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.savings.length, 0);

  state.adventures = [{ id: 'localAdv', serverId: 'srv-adv', navn: 'Rom-tur' }];
  mergeSavings([{
    id: 'sav-srv2', adventure_id: 'srv-adv', beloeb: 500, dato: '2026-01-01', notat: 'Bonus',
    user_id: 'user-1', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  }]);
  assert.equal(state.savings.length, 1);
  assert.equal(state.savings[0].beløb, 500);
  assert.equal(state.savings[0].userId, 'user-1');
});

test('toSavingsRow/toActivityRow sender ALDRIG user_id/created_by op (ét-vejs server-felter)', () => {
  const savingsRow = toSavingsRow({ serverId: 's1', adventureId: 'a1', beløb: 100, dato: '2026-01-01', notat: '', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, userId: 'skulle-ikke-sendes' });
  assert.equal('user_id' in savingsRow, false);

  const activityRow = toActivityRow({ serverId: 'x1', adventureId: 'a1', navn: 'Test', kategori: 'oplevelse', dato: '', pris: 0, updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, createdBy: 'skulle-ikke-sendes' });
  assert.equal('created_by' in activityRow, false);
  // updated_by SKAL derimod sendes ved hvert push (modsat created_by)
  assert.equal('updated_by' in activityRow, true);
});

test('toAdventureRow sender ALDRIG join_token op', () => {
  const row = toAdventureRow({ id: 'a1', serverId: 'srv1', navn: 'Test', type: 'rejse', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, joinToken: 'skulle-ikke-sendes' });
  assert.equal('join_token' in row, false);
});

test('fromAdventureRow/toAdventureRow rundtur bevarer beløb korrekt (kr. <-> maal_beloeb)', () => {
  const original = {
    id: 'a1', serverId: 'srv1', navn: 'Rom-tur', type: 'rejse', startdato: '2026-08-01',
    slutdato: '2026-08-05', målBeløb: 5000, icon: 'globe', afsluttet: false,
    opsparingAktiveret: false, checklist: [], valuta: 'EUR', kurs: 7.46,
    updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
  };
  const row = toAdventureRow(original);
  assert.equal(row.maal_beloeb, 5000);
  assert.equal(row.valuta, 'EUR');
  assert.equal(row.kurs, 7.46);

  const roundtripped = fromAdventureRow({ ...row, id: 'srv1', join_token: null });
  assert.equal(roundtripped.målBeløb, 5000);
  assert.equal(roundtripped.valuta, 'EUR');
  assert.equal(roundtripped.kurs, 7.46);
});
