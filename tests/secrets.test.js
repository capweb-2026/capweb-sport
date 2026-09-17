import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CP3 — barrière « secret exposé ». Tout ce qui est dans public/ part chez le visiteur :
// ni clé, ni adresse de la passerelle, ni prompt système ne doivent s'y trouver.
// Preuve attendue : une fausse clé glissée dans public/ rend ce test rouge.
const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(racine, 'public');

async function fichiersDe(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const fichiers = await Promise.all(
    entrees.map(async (entree) => {
      const complet = path.join(dossier, entree.name);
      return entree.isDirectory() ? fichiersDe(complet) : [complet];
    })
  );
  return fichiers.flat();
}

// Motifs interdits : le nom dit ce qu'on cherche, le motif comment on le trouve.
const INTERDITS = [
  ['une clé ou une variable de la passerelle', /CAPWEB_IA_(CLE|URL|MODELE)/i],
  ['l’adresse du fournisseur de modèle', /api\.mistral\.ai|\/chat\/completions/i],
  ['un en-tête d’authentification', /authorization\s*[:=]|bearer\s+\S/i],
  ['une lecture de variables d’environnement', /process\.env/],
  // Une clé d'API est une longue suite de lettres et de chiffres sans séparateur :
  // les identifiants du projet contiennent des tirets ou restent bien plus courts.
  ['une chaîne qui ressemble à une clé d’API', /\b(?=[A-Za-z0-9]*[0-9])(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{24,}\b/]
];

describe('CP3 — aucun secret dans public/', () => {
  test('aucun fichier servi au navigateur ne contient de clé ni de trace de la passerelle', async () => {
    const fichiers = await fichiersDe(publicDir);
    assert.ok(fichiers.length > 0, 'public/ doit contenir des fichiers');
    const problemes = [];

    for (const fichier of fichiers) {
      const contenu = await readFile(fichier, 'utf8');
      const relatif = path.relative(racine, fichier).replaceAll('\\', '/');
      for (const [quoi, motif] of INTERDITS) {
        const trouve = contenu.match(motif);
        if (trouve) {
          const ligne = contenu.slice(0, trouve.index).split('\n').length;
          problemes.push(`${relatif}:${ligne} — ${quoi} (« ${trouve[0].slice(0, 40)} »)`);
        }
      }
    }

    assert.deepEqual(problemes, [], `public/ part chez le visiteur :\n${problemes.join('\n')}`);
  });

  test('le prompt système n’est pas descendu dans public/', async () => {
    const fichiers = await fichiersDe(publicDir);
    for (const fichier of fichiers) {
      const contenu = (await readFile(fichier, 'utf8')).toLowerCase();
      assert.ok(
        !contenu.includes('tu es coach sprint'),
        `${path.relative(racine, fichier)} contient le prompt système, que n’importe quel visiteur lirait`
      );
    }
  });

  test('la page appelle sa propre route, jamais le fournisseur directement', async () => {
    const app = await readFile(path.join(publicDir, 'js', 'app.js'), 'utf8');
    assert.match(app, /fetch\(\s*['"]\/api\/chat['"]/, 'la page passe par /api/chat');
    assert.doesNotMatch(app, /https?:\/\/[^'"\s]*(mistral|openai|anthropic)/i, 'aucun appel direct à un fournisseur');
  });
});
