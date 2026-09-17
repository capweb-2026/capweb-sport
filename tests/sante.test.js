import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { diagnostic } from '../server/ia.js';

// CP3 — route de santé : elle dit si la fonction déployée voit sa configuration,
// et laquelle des deux variables manque. Elle ne révèle JAMAIS la clé.
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CLE_FICTIVE = 'SECRET-a-ne-jamais-divulguer-123456';

let serveur;
let base;
const environnementInitial = {};

before(async () => {
  for (const nom of ['CAPWEB_IA_URL', 'CAPWEB_IA_CLE', 'CAPWEB_IA_MODELE']) {
    environnementInitial[nom] = process.env[nom];
    delete process.env[nom];
  }
  serveur = createApp({ publicDir, version: 'test-sante' });
  await new Promise((resolve) => serveur.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${serveur.address().port}`;
});

after(async () => {
  for (const [nom, valeur] of Object.entries(environnementInitial)) {
    if (valeur === undefined) delete process.env[nom];
    else process.env[nom] = valeur;
  }
  await new Promise((resolve) => serveur.close(resolve));
});

describe('CP3 — diagnostic', () => {
  test('la clé n’apparaît jamais dans le diagnostic, sous aucune forme', () => {
    const rapport = diagnostic({ url: 'https://api.exemple.test/v1', cle: CLE_FICTIVE, modele: 'un-modele' });
    const serialise = JSON.stringify(rapport);
    assert.ok(!serialise.includes(CLE_FICTIVE), 'la valeur de la clé ne doit jamais sortir du serveur');
    assert.ok(!serialise.includes(CLE_FICTIVE.slice(0, 8)), 'même un fragment de clé est de trop');
  });

  test('la clé est annoncée par un booléen, pas par sa valeur', () => {
    const rapport = diagnostic({ url: 'https://api.exemple.test/v1', cle: CLE_FICTIVE, modele: 'un-modele' });
    assert.equal(rapport.cleFournie, true);
    assert.equal(typeof rapport.cleFournie, 'boolean');
    assert.ok(!('cle' in rapport), 'aucun champ « cle » dans le rapport');
  });

  test('configuré seulement quand l’adresse ET la clé sont là', () => {
    const complet = { url: 'https://api.exemple.test/v1', cle: CLE_FICTIVE, modele: 'm' };
    assert.equal(diagnostic(complet).configure, true);
    assert.equal(diagnostic({ ...complet, cle: '' }).configure, false);
    assert.equal(diagnostic({ ...complet, url: '' }).configure, false);
  });

  test('le rapport dit laquelle des deux variables manque', () => {
    const sansCle = diagnostic({ url: 'https://api.exemple.test/v1', cle: '', modele: 'm' });
    assert.equal(sansCle.adresse, 'https://api.exemple.test/v1');
    assert.equal(sansCle.cleFournie, false);

    const sansAdresse = diagnostic({ url: '', cle: CLE_FICTIVE, modele: 'm' });
    assert.equal(sansAdresse.adresse, null, 'adresse absente : null, pas une chaîne vide');
    assert.equal(sansAdresse.cleFournie, true);
  });

  test('le modèle et le délai maximal sont annoncés', () => {
    const rapport = diagnostic({ url: 'https://api.exemple.test/v1', cle: CLE_FICTIVE, modele: 'mon-modele' });
    assert.equal(rapport.modele, 'mon-modele');
    assert.equal(typeof rapport.delaiMaxMs, 'number');
    assert.ok(rapport.delaiMaxMs > 0 && rapport.delaiMaxMs <= 4000, 'sous les 4 s du smoke test');
  });
});

describe('CP3 — GET /api/health', () => {
  test('répond 200 en JSON avec le diagnostic', async () => {
    const reponse = await fetch(`${base}/api/health`);
    assert.equal(reponse.status, 200);
    assert.match(reponse.headers.get('content-type') ?? '', /application\/json/);
    const donnees = await reponse.json();
    assert.equal(donnees.configure, false, 'aucune variable en local : non configuré');
    assert.equal(donnees.cleFournie, false);
    assert.equal(donnees.adresse, null);
    assert.equal(typeof donnees.modele, 'string');
    assert.ok(donnees.modele.length > 0, 'le modèle par défaut est annoncé même sans variable');
  });

  test('la route de santé n’est jamais mise en cache', async () => {
    const reponse = await fetch(`${base}/api/health`);
    assert.match(reponse.headers.get('cache-control') ?? '', /no-store/);
  });

  test('POST sur la route de santé est refusé', async () => {
    const reponse = await fetch(`${base}/api/health`, { method: 'POST' });
    assert.equal(reponse.status, 405);
  });
});
