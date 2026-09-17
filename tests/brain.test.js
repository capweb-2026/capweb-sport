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
    assert.equal(replyTo('bonjour'), "Salut ! Prêt à bouger ? Tu peux me demander comment t'échauffer, t'organiser ou récupérer.");
  });
  it('valide réponse correct (normalized)', () => {
    assert.equal(replyTo('bONjouR'), replyTo('bonjour'));
  });
  it('valide réponse aide', () => {
    assert.equal(replyTo('aide'), "Je parle d'échauffement, de séances pour débuter et de récupération. Essaie une des questions suggérées sous l'accueil.");
  });
  it('valide réponse par défaut', () => {
    assert.equal(replyTo('Qui es-tu?'), "Je n'ai pas compris. Reformule ta question, ou choisis une des suggestions.");
  });
});

// SOUL.md : tutoiement, pas de faux statut, réponses courtes.
describe('replyTo respecte SOUL.md', () => {
  const reponses = ['salut', 'aide', 'test', 'parle-moi de la météo'].map((m) => replyTo(m));

  it('tutoie et ne vouvoie jamais', () => {
    for (const r of reponses) {
      assert.doesNotMatch(r, /\bvous\b|\bvotre\b|\bvos\b|-vous\b/i, r);
    }
  });
  it('ne se présente jamais comme une IA, un professionnel ou un humain', () => {
    for (const r of reponses) {
      assert.doesNotMatch(r, /\bIA\b|intelligence artificielle|\bassistant IA\b|je suis (un |une )?(humain|médecin|coach diplômé|kiné)/i, r);
    }
  });
  it('reste court : trois phrases au plus', () => {
    for (const r of reponses) {
      assert.ok(r.split(/[.!?](?:\s|$)/).filter((p) => p.trim()).length <= 3, r);
    }
  });
});
