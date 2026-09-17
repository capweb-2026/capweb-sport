import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decouperGras, prefixe, conversationEnTexte } from '../public/js/format.js';

// Défis TP13 6 et 7 : gras sans danger, export texte.

describe('Défi 6 — decouperGras', () => {
  it('laisse un texte sans étoiles tel quel', () => {
    assert.deepEqual(decouperGras('salut'), [{ texte: 'salut', gras: false }]);
  });

  it('met en gras le texte entre deux paires d’étoiles', () => {
    assert.deepEqual(decouperGras('un **très** bon conseil'), [
      { texte: 'un ', gras: false },
      { texte: 'très', gras: true },
      { texte: ' bon conseil', gras: false }
    ]);
  });

  it('gère plusieurs passages en gras', () => {
    assert.deepEqual(decouperGras('**a** et **b**'), [
      { texte: 'a', gras: true },
      { texte: ' et ', gras: false },
      { texte: 'b', gras: true }
    ]);
  });

  it('laisse des étoiles orphelines ou vides en texte brut', () => {
    assert.deepEqual(decouperGras('**pas fermé'), [{ texte: '**pas fermé', gras: false }]);
    assert.deepEqual(decouperGras('rien ****'), [{ texte: 'rien ****', gras: false }]);
  });

  it('garde le HTML comme du texte', () => {
    assert.deepEqual(decouperGras('**<b>x</b>**'), [{ texte: '<b>x</b>', gras: true }]);
  });

  it('renvoie une liste vide pour un texte vide', () => {
    assert.deepEqual(decouperGras(''), []);
  });
});

describe('Défi 7 — export', () => {
  it('préfixe « Vous » pour l’utilisateur et le nom pour l’assistant', () => {
    assert.equal(prefixe('user', 'Coach Sprint'), 'Vous: ');
    assert.equal(prefixe('assistant', 'Coach Sprint'), 'Coach Sprint: ');
  });

  it('écrit une ligne par message, texte brut', () => {
    const messages = [
      { role: 'user', text: 'salut' },
      { role: 'assistant', text: 'un **très** bon conseil' }
    ];
    assert.equal(conversationEnTexte(messages, 'Coach Sprint'), 'Vous: salut\nCoach Sprint: un **très** bon conseil\n');
  });

  it('renvoie un texte vide pour une conversation vide', () => {
    assert.equal(conversationEnTexte([], 'Coach Sprint'), '');
  });
});

describe('format.js reste pur et le serveur le sert', () => {
  it('aucun accès à la page', async () => {
    const code = await readFile(new URL('../public/js/format.js', import.meta.url), 'utf8');
    assert.doesNotMatch(code, /\bdocument\b|\bwindow\b|localStorage|innerHTML/);
  });

  it('/js/format.js est dans la liste blanche du serveur', async () => {
    const code = await readFile(new URL('../server/app.js', import.meta.url), 'utf8');
    assert.match(code, /'\/js\/format\.js': 'js\/format\.js'/);
    assert.match(code, /'js\/format\.js': 'text\/javascript; charset=utf-8'/);
  });
});
