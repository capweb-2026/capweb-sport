// CP3 — la logique de la route /api/chat, partagée par les deux portes d'entrée :
// api/chat.js (Vercel, en prod) et server/app.js (local, tests navigateur).
// Elle ne connaît ni http, ni Vercel : elle reçoit une méthode et un corps, elle rend un statut.
import { repondre, diagnostic } from './ia.js';

// Le message fait 280 caractères au plus, l'historique une poignée de lignes : 16 Ko suffisent.
export const TAILLE_MAX = 16 * 1024;

function lireCorps(corps) {
  if (corps === undefined || corps === null || corps === '') return {};
  if (typeof corps === 'object') return corps;
  if (typeof corps !== 'string') return null;
  if (corps.length > TAILLE_MAX) return null;
  try {
    const donnees = JSON.parse(corps);
    return donnees !== null && typeof donnees === 'object' ? donnees : null;
  } catch {
    return null;
  }
}

// Route de santé : l'état de la configuration vue par la fonction déployée.
// Lecture seule, jamais mise en cache, et aucun secret (voir diagnostic()).
export function traiterSante({ methode = 'GET' } = {}, { config } = {}) {
  const verbe = String(methode).toUpperCase();
  if (verbe !== 'GET' && verbe !== 'HEAD') {
    return { statut: 405, donnees: { ok: false, erreur: 'Méthode non autorisée' } };
  }
  return { statut: 200, donnees: config ? diagnostic(config) : diagnostic() };
}

export async function traiterChat({ methode = 'GET', corps } = {}, options = {}) {
  const verbe = String(methode).toUpperCase();

  // Sonde du tuyau (CP3-1, étape 1) : elle ne dit rien de la configuration.
  if (verbe === 'GET' || verbe === 'HEAD') {
    return { statut: 200, donnees: { pret: true } };
  }
  if (verbe !== 'POST') {
    return { statut: 405, donnees: { ok: false, erreur: 'Méthode non autorisée' } };
  }

  const demande = lireCorps(corps);
  if (demande === null) {
    return { statut: 400, donnees: { ok: false, erreur: 'Corps de requête illisible.' } };
  }

  const resultat = await repondre({ message: demande.message, historique: demande.historique }, options);
  return { statut: resultat.ok ? 200 : 400, donnees: resultat };
}
