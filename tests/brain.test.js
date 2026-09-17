import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateMessage, replyTo } from '../public/js/brain.js';

describe('validateMessage', () => {
  it('refuse une chaîne vide', () => {
    assert.equal(validateMessage('   ').ok, false);
  });
  it('refuse un message supérieur à 280 caractères', () => {
    assert.equal(validateMessage('a'.repeat(281)).ok, false);
  });
  it('nettoie les espaces', () => {
    assert.deepEqual(validateMessage('  salut  '), { ok: true, value: 'salut' });
  });
  it('valide réponse correct', () => {
    assert.equal(replyTo('bonjour'), "Bonjour, comment allez-vous ?");
  });
  it('valide réponse correct (normalized)', () => {
    assert.equal(replyTo('bONjouR'), "Bonjour, comment allez-vous ?");
  });
  it('valide réponse par défaut', () => {
    assert.equal(replyTo('Qui es-tu?'), "Désolé, je ne comprends pas votre requête. Pouvez-vous essayer de la reformuler svp?");
  });
});