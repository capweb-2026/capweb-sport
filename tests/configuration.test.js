import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { configuration } from '../server/ia.js';

// CP3 — une valeur collée dans l'interface de Vercel emporte souvent une espace ou un
// retour à la ligne invisible. Dans la clé, un retour à la ligne rend l'en-tête
// Authorization invalide : fetch lève avant même d'atteindre la passerelle, et tout
// finit en mode dégradé sans que rien ne le montre. La configuration nettoie donc ses valeurs.

describe('CP3 — nettoyage de la configuration', () => {
  test('les espaces autour des valeurs sont retirés', () => {
    const config = configuration({
      CAPWEB_IA_URL: '  https://api.mistral.ai/v1  ',
      CAPWEB_IA_CLE: '  une-cle  ',
      CAPWEB_IA_MODELE: '  un-modele  '
    });
    assert.deepEqual(config, { url: 'https://api.mistral.ai/v1', cle: 'une-cle', modele: 'un-modele' });
  });

  test('un retour à la ligne collé par erreur ne survit pas', () => {
    const config = configuration({
      CAPWEB_IA_URL: 'https://api.mistral.ai/v1\n',
      CAPWEB_IA_CLE: 'une-cle\n',
      CAPWEB_IA_MODELE: 'un-modele\r\n'
    });
    for (const valeur of Object.values(config)) {
      assert.doesNotMatch(valeur, /[\r\n]/, 'aucun retour à la ligne ne doit atteindre l’en-tête HTTP');
    }
    assert.equal(config.cle, 'une-cle');
  });

  test('une barre oblique finale de trop est retirée de l’adresse', () => {
    assert.equal(configuration({ CAPWEB_IA_URL: 'https://api.mistral.ai/v1/' }).url, 'https://api.mistral.ai/v1');
    assert.equal(configuration({ CAPWEB_IA_URL: 'https://api.mistral.ai/v1///' }).url, 'https://api.mistral.ai/v1');
  });

  test('une valeur faite d’espaces vaut une valeur absente', () => {
    const config = configuration({ CAPWEB_IA_URL: '   ', CAPWEB_IA_CLE: '\n', CAPWEB_IA_MODELE: '  ' });
    assert.equal(config.url, '');
    assert.equal(config.cle, '');
    assert.ok(config.modele.length > 0, 'le modèle retombe sur sa valeur par défaut');
  });
});
