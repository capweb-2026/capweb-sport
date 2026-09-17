// Identité de l'assistant (SPEC.md, critères 1 à 5). Module pur : aucun accès à la page.

export const persona = Object.freeze({
  nom: 'Coach Sprint',
  emoji: '🏃',
  accueil: "Salut, je suis Coach Sprint ! Je t'aide à préparer tes séances de sport. Je ne remplace ni un médecin ni un coach diplômé.",
  suggestions: Object.freeze([
    "Comment m'échauffer avant de courir ?",
    'Combien de séances par semaine pour débuter ?',
    'Comment récupérer après un entraînement ?'
  ])
});

const NOM_MIN = 2;
const NOM_MAX = 20;
const NB_SUGGESTIONS = 3;

// Compte les caractères visibles : '🏃'.length vaut 2, mais un seul caractère s'affiche.
const segmenteur = new Intl.Segmenter('fr', { granularity: 'grapheme' });
const caracteres = (texte) => [...segmenteur.segment(texte)].map((s) => s.segment);

const estTexte = (valeur) => typeof valeur === 'string';

export function validatePersona(candidat) {
  if (candidat === null || typeof candidat !== 'object') {
    return { ok: false, erreurs: ['La persona doit être un objet.'] };
  }
  const { nom, emoji, accueil, suggestions } = candidat;
  const erreurs = [];

  const nomPropre = estTexte(nom) ? nom.trim() : '';
  const longueurNom = caracteres(nomPropre).length;
  if (longueurNom < NOM_MIN || longueurNom > NOM_MAX) {
    erreurs.push(`Le nom doit faire de ${NOM_MIN} à ${NOM_MAX} caractères, sans les espaces autour.`);
  }

  const graphemes = estTexte(emoji) ? caracteres(emoji) : [];
  if (graphemes.length !== 1 || !/^\p{Extended_Pictographic}/u.test(graphemes[0])) {
    erreurs.push("L'emoji doit être exactement un seul emoji.");
  }

  if (!estTexte(accueil) || nomPropre.length === 0 || !accueil.includes(nomPropre)) {
    erreurs.push("Le message d'accueil doit contenir le nom.");
  }

  if (!Array.isArray(suggestions) || suggestions.length !== NB_SUGGESTIONS) {
    erreurs.push(`Il faut exactement ${NB_SUGGESTIONS} questions suggérées.`);
  } else if (suggestions.some((s) => !estTexte(s) || s.trim().length === 0)) {
    erreurs.push('Chaque question suggérée doit être un texte non vide.');
  }

  return erreurs.length === 0 ? { ok: true } : { ok: false, erreurs };
}
