// CP3 — le seul module qui parle au modèle.
// Il reçoit son fournisseur en paramètre : la passerelle en prod, un faux dans les tests.
// Il ne lève jamais : il renvoie toujours un texte, et la source de ce texte.
//
// Règles de forme imposées par le socle :
// - pas de dépendance : fetch est natif ;
// - pas d'AbortController ni d'AbortSignal (absents des globales ESLint) : le délai
//   maximal s'écrit avec setTimeout et Promise.race.
import { validateMessage, replyTo } from '../public/js/brain.js';
import { PROMPT_SYSTEME } from './prompt.js';

export const SOURCE_IA = 'ia';
export const SOURCE_REGLES = 'regles';

// Sous les 4 secondes du smoke test (piège 5 de la fiche CP3, choix écrit dans SPEC.md).
export const DELAI_MAX = 3500;
// Modèle vérifié disponible sur le palier du compte, et le plus rapide mesuré (~0,3 s),
// ce qui laisse de la marge sous les 5 s du smoke test. `mistral-small-latest` existe mais
// répond 429 (quota par modèle) : le vérifier avec GET /v1/models avant d'en changer.
const MODELE_PAR_DEFAUT = 'ministral-3b-latest';
const MAX_ECHANGES = 6;
const LONGUEUR_MAX = 280;
const MAX_MOTS = 300;

// Marqueur interne : distingue « le délai a expiré » d'une vraie réponse.
const DELAI_EXPIRE = Symbol('delai');

// Réponse de repli des règles : replyTo la renvoie pour tout message qu'il ne reconnaît pas.
// Comparer à ce texte dit si les règles connaissent déjà le message, sans toucher à brain.js.
const REPLI = replyTo('');
const connuDesRegles = (message) => replyTo(message) !== REPLI;

export function configuration(env = process.env) {
  // Une valeur collée dans l'interface de Vercel emporte souvent une espace ou un retour
  // à la ligne invisible. Dans la clé, un retour à la ligne rend l'en-tête Authorization
  // invalide : fetch lève avant même d'atteindre la passerelle, et tout finit en mode
  // dégradé sans que rien ne le montre. On nettoie donc ici, une fois pour toutes.
  const propre = (valeur) => (valeur ?? '').trim();
  return {
    url: propre(env.CAPWEB_IA_URL).replace(/\/+$/, ''),
    cle: propre(env.CAPWEB_IA_CLE),
    modele: propre(env.CAPWEB_IA_MODELE) || MODELE_PAR_DEFAUT
  };
}

// État de la configuration, pour la route de santé. Ne renvoie JAMAIS la clé,
// seulement un booléen qui dit si elle est présente : c'est ce qui permet de distinguer
// « variable absente » de « clé refusée » sans jamais exposer de secret.
export function diagnostic(config = configuration()) {
  return {
    configure: Boolean(config.url && config.cle),
    adresse: config.url || null,
    modele: config.modele,
    cleFournie: Boolean(config.cle),
    delaiMaxMs: DELAI_MAX
  };
}

// Messages au format OpenAI, que Mistral partage : prompt système, derniers échanges, message.
export function construireMessages({ message, historique = [], prompt = PROMPT_SYSTEME, maxEchanges = MAX_ECHANGES }) {
  const recents = (Array.isArray(historique) ? historique : [])
    // Le client ne peut glisser ni rôle « system », ni message vide : filtré ici, pas chez lui.
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim() !== '')
    .slice(-maxEchanges)
    .map((m) => ({ role: m.role, content: m.text.slice(0, LONGUEUR_MAX) }));
  return [{ role: 'system', content: prompt }, ...recents, { role: 'user', content: message }];
}

// Appel réel à la passerelle. Le seul endroit du dépôt qui connaît son adresse et sa clé.
export async function appelerPasserelle(messages, config) {
  const reponse = await fetch(`${config.url}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: `Bearer ${config.cle}`
    },
    body: JSON.stringify({
      model: config.modele,
      messages,
      temperature: 0.3,
      max_tokens: MAX_MOTS
    })
  });
  // 401 clé coupée, 429 budget épuisé, 5xx panne : tout finit en repli, jamais en erreur visible.
  if (!reponse.ok) {
    throw new Error(`passerelle ${reponse.status}`);
  }
  const donnees = await reponse.json();
  const texte = donnees?.choices?.[0]?.message?.content;
  if (typeof texte !== 'string' || texte.trim() === '') {
    throw new Error('réponse vide');
  }
  return texte.trim();
}

export async function repondre(
  { message, historique = [] } = {},
  { fournisseur = appelerPasserelle, config = configuration(), delaiMax = DELAI_MAX } = {}
) {
  // Le navigateur valide déjà, mais rien n'empêche d'appeler la route directement.
  const valide = validateMessage(message);
  if (!valide.ok) {
    return { ok: false, erreur: valide.error };
  }
  const texteRegles = replyTo(valide.value);

  // Raccourci des règles : salut, aide et test gardent leur réponse immédiate (SPEC.md, choix CP3).
  // Ce n'est pas un mode dégradé : c'est la réponse attendue.
  if (connuDesRegles(valide.value)) {
    return { ok: true, texte: texteRegles, source: SOURCE_REGLES, degrade: false };
  }

  const repli = { ok: true, texte: texteRegles, source: SOURCE_REGLES, degrade: true };
  if (!config.url || !config.cle) {
    return repli;
  }

  let minuteur = null;
  const delai = new Promise((resoudre) => {
    minuteur = setTimeout(() => resoudre(DELAI_EXPIRE), delaiMax);
  });
  try {
    const messages = construireMessages({ message: valide.value, historique });
    const resultat = await Promise.race([fournisseur(messages, config), delai]);
    if (resultat === DELAI_EXPIRE || typeof resultat !== 'string' || resultat.trim() === '') {
      return repli;
    }
    return { ok: true, texte: resultat.trim(), source: SOURCE_IA, degrade: false };
  } catch (erreur) {
    // Panne, clé coupée, budget épuisé : l'assistant répond quand même, avec ses règles.
    // La raison part dans les journaux du serveur (Vercel → Runtime Logs) pour être
    // diagnosticable ; jamais la clé, jamais le message de l'utilisateur.
    console.error(`[ia] repli sur les règles : ${erreur?.message ?? 'raison inconnue'}`);
    return repli;
  } finally {
    clearTimeout(minuteur);
  }
}
