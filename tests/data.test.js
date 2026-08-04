import './test-setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY } from '../js/constants.js';
import { loadData, defaultData, touch, tombstone, restore } from '../js/data.js';

function seed(raw) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

test('loadData: intet gemt endnu -> tom, frisk stand', () => {
  localStorage.clear();
  const data = loadData();
  assert.equal(data.dataVersion, 3);
  assert.equal(data.lang, 'da');
  assert.deepEqual(data.adventures, []);
  assert.deepEqual(data.activities, []);
  assert.deepEqual(data.savings, []);
  assert.equal(data.hasLoggedInBefore, false);
});

test('loadData: korrupt JSON falder gracefuldt tilbage til default', () => {
  localStorage.setItem(STORAGE_KEY, '{ not valid json');
  const data = loadData();
  assert.equal(data.dataVersion, 3);
  assert.deepEqual(data.adventures, []);
});

test('loadData: ugyldigt sprog rettes til "da"', () => {
  seed({ dataVersion: 3, lang: 'fr', adventures: [], activities: [], savings: [] });
  const data = loadData();
  assert.equal(data.lang, 'da');
});

test('loadData: ugyldigt ikon rettes til første i ICON_VALG', () => {
  seed({
    dataVersion: 3, lang: 'da', activities: [], savings: [],
    adventures: [{ id: 'a1', navn: 'Test', icon: 'et-ikon-der-ikke-findes' }],
  });
  const data = loadData();
  assert.equal(data.adventures[0].icon, 'globe');
});

test('loadData: v2-migrering udleder kilde fra "Fly"/"Hotel"-navne uden dataVersion', () => {
  seed({
    adventures: [{ id: 'a1', navn: 'Rom-tur' }],
    activities: [
      { id: 'x1', adventureId: 'a1', navn: 'Fly', kategori: 'transport', dato: '', pris: 500 },
      { id: 'x2', adventureId: 'a1', navn: 'Hotel', kategori: 'ophold', dato: '', pris: 800 },
      { id: 'x3', adventureId: 'a1', navn: 'Colosseum', kategori: 'oplevelse', dato: '', pris: 0 },
    ],
    savings: [],
  });
  const data = loadData();
  assert.equal(data.activities.find(x => x.id === 'x1').kilde, 'fly');
  assert.equal(data.activities.find(x => x.id === 'x2').kilde, 'hotel');
  assert.equal(data.activities.find(x => x.id === 'x3').kilde, null);
  // v2-feltdefaults skal alle være til stede, ikke undefined
  const flyAct = data.activities.find(x => x.id === 'x1');
  for (const felt of ['startTid', 'slutTid', 'varerTil', 'stedNavn', 'adresse', 'reference', 'link', 'telefon', 'noter']) {
    assert.equal(flyAct[felt], '', `${felt} skal defaulte til tom streng`);
  }
  assert.equal(flyAct.status, 'idé');
});

test('loadData: v3-migrering stempler updatedAt/deletedAt/serverId på alt', () => {
  seed({
    adventures: [{ id: 'a1', navn: 'Rom-tur' }],
    activities: [{ id: 'x1', adventureId: 'a1', navn: 'Colosseum', kategori: 'oplevelse', dato: '', pris: 0 }],
    savings: [{ id: 's1', adventureId: 'a1', beløb: 100, dato: '2026-01-01', notat: '' }],
  });
  const data = loadData();
  for (const record of [...data.adventures, ...data.activities, ...data.savings]) {
    assert.ok(record.updatedAt, 'updatedAt skal være sat');
    assert.equal(record.deletedAt, null);
    assert.equal(record.serverId, null);
  }
});

test('loadData: rører IKKE en allerede-sat updatedAt for data der allerede er v3', () => {
  const fastTimestamp = '2020-01-01T00:00:00.000Z';
  seed({
    dataVersion: 3, lang: 'da', savings: [], plans: {},
    activities: [{
      id: 'x1', adventureId: 'a1', navn: 'Colosseum', kategori: 'oplevelse', dato: '', pris: 0,
      startTid: '', slutTid: '', varerTil: '', stedNavn: '', adresse: '', reference: '', link: '',
      telefon: '', noter: '', status: 'idé', kilde: null,
      updatedAt: fastTimestamp, deletedAt: null, serverId: null,
    }],
    adventures: [],
  });
  const data = loadData();
  assert.equal(data.activities[0].updatedAt, fastTimestamp);
});

test('loadData: nye eventyr-felter (checklist/valuta/kurs) defaulter fornuftigt', () => {
  seed({ dataVersion: 3, lang: 'da', activities: [], savings: [], adventures: [{ id: 'a1', navn: 'Rom-tur' }] });
  const data = loadData();
  assert.deepEqual(data.adventures[0].checklist, []);
  assert.equal(data.adventures[0].valuta, null);
  assert.equal(data.adventures[0].kurs, null);
});

test('defaultData() matcher det loadData() giver uden gemt data', () => {
  localStorage.clear();
  assert.deepEqual(loadData(), defaultData());
});

test('touch() sætter et ISO-tidsstempel og returnerer recorden', () => {
  const record = { id: 'x1' };
  const result = touch(record);
  assert.equal(result, record); // samme reference
  assert.ok(!isNaN(new Date(record.updatedAt).getTime()));
});

test('tombstone() sætter både deletedAt og updatedAt', () => {
  const record = { id: 'x1' };
  tombstone(record);
  assert.ok(record.deletedAt);
  assert.ok(record.updatedAt);
});

test('restore() nulstiller deletedAt og opdaterer updatedAt', () => {
  const record = { id: 'x1', deletedAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' };
  restore(record);
  assert.equal(record.deletedAt, null);
  assert.notEqual(record.updatedAt, '2020-01-01T00:00:00.000Z');
});
