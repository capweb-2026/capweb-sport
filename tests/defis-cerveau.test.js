import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { replyTo, commande } from '../public/js/brain.js';

// Défis TP13 1 et 2 : commandes, cerveau plus souple.

describe('Défi 2 — mots reconnus dans une phrase', () => {
  it('reconnaît « bonjour » dans une phrase', () => {
    assert.equal(replyTo('bonjour à tous'), replyTo('salut'));
    assert.equal(replyTo('Salut Coach !'), replyTo('salut'));
  });

  it('reconnaît des synonymes', () => {
    for (const m of ['coucou', 'bonsoir', 'hello']) {
      assert.equal(replyTo(m), replyTo('salut'), m);
    }
    assert.equal(replyTo('au secours'), replyTo('aide'));
    assert.equal(replyTo('aide-moi stp'), replyTo('aide'));
    assert.equal(replyTo('ceci est un test'), replyTo('test'));
  });

  it('ne confond pas un mot qui en contient un autre', () => {
    const repli = replyTo('parle-moi de la météo');
    assert.equal(replyTo('je veux tester'), repli);
    assert.equal(replyTo('salutations distinguées'), repli);
    assert.equal(replyTo('aidez'), repli);
  });

  it('garde le repli pour une phrase inconnue', () => {
    assert.equal(replyTo('Qui es-tu?'), replyTo('parle-moi de la météo'));
  });

  it('résiste à une entrée qui n’est pas du texte', () => {
    assert.equal(replyTo(undefined), replyTo('parle-moi de la météo'));
  });
});

describe('Défi 1 — commandes', () => {
  it('ignore un message qui n’est pas une commande', () => {
    assert.equal(commande('salut'), null);
    assert.equal(commande('aide /effacer'), null);
  });

  it('/aide liste toutes les commandes', () => {
    const r = commande('/aide');
    assert.equal(r.action, null);
    for (const c of ['/aide', '/effacer', '/compte']) {
      assert.ok(r.reponse.includes(c), c);
    }
  });

  it('ignore la casse et les espaces', () => {
    assert.deepEqual(commande('  /AIDE '), commande('/aide'));
  });

  it('/effacer demande l’effacement', () => {
    assert.equal(commande('/effacer').action, 'effacer');
  });

  it('/compte donne le nombre de messages', () => {
    assert.match(commande('/compte', { nbMessages: 4 }).reponse, /\b4 messages\b/);
    assert.match(commande('/compte', { nbMessages: 1 }).reponse, /\b1 message\b/);
    assert.match(commande('/compte', { nbMessages: 0 }).reponse, /\b0 message\b/);
    assert.equal(commande('/compte', { nbMessages: 4 }).action, null);
  });

  it('signale une commande inconnue en renvoyant vers /aide', () => {
    const r = commande('/danse');
    assert.equal(r.action, null);
    assert.ok(r.reponse.includes('/aide'));
  });
});

describe('Défis cerveau — brain.js reste pur', () => {
  it('aucun accès à la page', async () => {
    const code = await readFile(new URL('../public/js/brain.js', import.meta.url), 'utf8');
    assert.doesNotMatch(code, /\bdocument\b|\bwindow\b|localStorage/);
  });
});
