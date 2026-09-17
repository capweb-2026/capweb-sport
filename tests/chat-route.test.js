import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { replyTo } from '../public/js/brain.js';

// CP3 — la porte d'entrée locale, celle qu'utilisent les tests navigateur.
// Elle tourne sans clé : la source est donc toujours « regles ».
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

let serveur;
let base;
const environnementInitial = {};

before(async () => {
  // Une clé traînant dans l'environnement du poste ne doit pas changer le résultat.
  for (const nom of ['CAPWEB_IA_URL', 'CAPWEB_IA_CLE']) {
    environnementInitial[nom] = process.env[nom];
    delete process.env[nom];
  }
  serveur = createApp({ publicDir, version: 'test-cp3' });
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

const poster = (corps, options = {}) =>
  fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    ...options
  });

describe('CP3 — POST /api/chat en local', () => {
  test('répond 200 en JSON, avec la source regles puisqu’il n’y a pas de clé', async () => {
    const reponse = await poster({ message: 'Comment préparer un premier 10 km ?', historique: [] });
    assert.equal(reponse.status, 200);
    assert.match(reponse.headers.get('content-type') ?? '', /application\/json/);
    const donnees = await reponse.json();
    assert.equal(donnees.ok, true);
    assert.equal(donnees.source, 'regles');
    assert.equal(donnees.texte, replyTo('Comment préparer un premier 10 km ?'));
    assert.equal(donnees.degrade, true);
  });

  test('un message que les règles connaissent garde sa réponse exacte', async () => {
    const donnees = await (await poster({ message: 'salut' })).json();
    assert.equal(donnees.texte, replyTo('salut'), 'le contrat CP1 attend exactement cette réponse');
    assert.equal(donnees.degrade, false);
  });

  test('un message vide est refusé sans faire tomber le serveur', async () => {
    const reponse = await poster({ message: '   ' });
    assert.equal(reponse.status, 400);
    const donnees = await reponse.json();
    assert.equal(donnees.ok, false);
    assert.ok(typeof donnees.erreur === 'string' && donnees.erreur.trim().length > 0);
  });

  test('un corps qui n’est pas du JSON est refusé proprement', async () => {
    const reponse = await poster('{pas du json');
    assert.equal(reponse.status, 400);
    const donnees = await reponse.json();
    assert.equal(donnees.ok, false);
  });

  test('un corps démesuré est refusé sans être lu en entier', async () => {
    const reponse = await poster({ message: 'a'.repeat(200000) });
    assert.ok([400, 413].includes(reponse.status), `400 ou 413 attendu, reçu ${reponse.status}`);
  });

  test('la réponse ne contient jamais la configuration du serveur', async () => {
    const texte = await (await poster({ message: 'Comment récupérer après une séance ?' })).text();
    assert.ok(!texte.includes('CAPWEB_IA'), 'aucun nom de variable d’environnement dans la réponse');
    assert.ok(!texte.toLowerCase().includes('bearer'), 'aucun en-tête d’authentification dans la réponse');
  });

  test('GET /api/chat répond que le tuyau est prêt, sans rien révéler', async () => {
    const reponse = await fetch(`${base}/api/chat`);
    assert.equal(reponse.status, 200);
    const donnees = await reponse.json();
    assert.equal(donnees.pret, true, 'sonde du tuyau (CP3-1, étape 1)');
    assert.ok(!('cle' in donnees) && !('url' in donnees), 'la sonde ne dit rien de la configuration');
  });

  test('les autres méthodes sur /api/chat sont refusées', async () => {
    for (const method of ['PUT', 'DELETE']) {
      const reponse = await fetch(`${base}/api/chat`, { method });
      assert.equal(reponse.status, 405, `405 attendu pour ${method}`);
    }
  });

  test('POST sur une ressource statique reste refusé avec 405', async () => {
    assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/js/app.js`, { method: 'POST' })).status, 405);
  });
});
