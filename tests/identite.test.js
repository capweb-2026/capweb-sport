import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { persona, validatePersona } from '../public/js/persona.js';

const valide = {
  nom: 'Coach Sprint',
  emoji: '🏃',
  accueil: 'Salut, je suis Coach Sprint !',
  suggestions: ['Question 1 ?', 'Question 2 ?', 'Question 3 ?']
};

describe('persona', () => {
  it('reprend le nom et l\'emoji de la spec', () => {
    assert.equal(persona.nom, 'Coach Sprint');
    assert.equal(persona.emoji, '🏃');
  });
  it('reprend l\'accueil de la spec', () => {
    assert.equal(persona.accueil, "Salut, je suis Coach Sprint ! Je t'aide à préparer tes séances de sport. Je ne remplace ni un médecin ni un coach diplômé.");
  });
  it('reprend les trois suggestions de la spec', () => {
    assert.deepEqual([...persona.suggestions], [
      "Comment m'échauffer avant de courir ?",
      'Combien de séances par semaine pour débuter ?',
      'Comment récupérer après un entraînement ?'
    ]);
  });
  it('est valide', () => {
    assert.deepEqual(validatePersona(persona), { ok: true });
  });
});

describe('validatePersona', () => {
  it('refuse un nom de 1 caractère', () => {
    assert.equal(validatePersona({ ...valide, nom: 'a', accueil: 'Salut a' }).ok, false);
  });
  it('accepte un nom de 2 caractères', () => {
    assert.deepEqual(validatePersona({ ...valide, nom: 'ab', accueil: 'Salut ab' }), { ok: true });
  });
  it('accepte un nom de 20 caractères', () => {
    assert.deepEqual(validatePersona({ ...valide, nom: 'a'.repeat(20), accueil: 'Salut ' + 'a'.repeat(20) }), { ok: true });
  });
  it('refuse un nom de 21 caractères', () => {
    assert.equal(validatePersona({ ...valide, nom: 'a'.repeat(21), accueil: 'Salut ' + 'a'.repeat(21) }).ok, false);
  });
  it('ne compte pas les espaces autour du nom', () => {
    assert.deepEqual(validatePersona({ ...valide, nom: '  ab  ', accueil: 'Salut ab' }), { ok: true });
    assert.equal(validatePersona({ ...valide, nom: '  a  ', accueil: 'Salut a' }).ok, false);
  });
  it('accepte un emoji simple ou composé', () => {
    assert.deepEqual(validatePersona({ ...valide, emoji: '🏃' }), { ok: true });
    assert.deepEqual(validatePersona({ ...valide, emoji: '🛡️' }), { ok: true });
  });
  it('refuse deux emojis', () => {
    assert.equal(validatePersona({ ...valide, emoji: '🏃🏃' }).ok, false);
  });
  it('refuse du texte à la place de l\'emoji', () => {
    assert.equal(validatePersona({ ...valide, emoji: 'a' }).ok, false);
    assert.equal(validatePersona({ ...valide, emoji: 'ab' }).ok, false);
  });
  it('refuse un emoji vide', () => {
    assert.equal(validatePersona({ ...valide, emoji: '' }).ok, false);
  });
  it('refuse un accueil qui ne contient pas le nom', () => {
    assert.equal(validatePersona({ ...valide, accueil: 'Bonjour et bienvenue !' }).ok, false);
  });
  it('refuse 2 ou 4 suggestions', () => {
    assert.equal(validatePersona({ ...valide, suggestions: ['Question 1 ?', 'Question 2 ?'] }).ok, false);
    assert.equal(validatePersona({ ...valide, suggestions: ['Question 1 ?', 'Question 2 ?', 'Question 3 ?', 'Question 4 ?'] }).ok, false);
  });
  it('refuse une suggestion vide ou faite d\'espaces', () => {
    assert.equal(validatePersona({ ...valide, suggestions: ['Question 1 ?', 'Question 2 ?', ''] }).ok, false);
    assert.equal(validatePersona({ ...valide, suggestions: ['Question 1 ?', '   ', 'Question 3 ?'] }).ok, false);
  });
  it('donne une erreur non vide par règle violée', () => {
    const r = validatePersona({ nom: 'a', emoji: '', accueil: 'Bonjour', suggestions: [] });
    assert.equal(r.ok, false);
    assert.ok(r.erreurs.length >= 4);
    assert.ok(r.erreurs.every((e) => typeof e === 'string' && e.trim().length > 0));
  });
});
