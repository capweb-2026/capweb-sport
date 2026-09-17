export function validateMessage(raw) {
  if (typeof raw !== "string") {
    return { ok: false, error: "Type envoyé incorrect! Entrez un texte valide" };
  }

  const prompt = raw.trim()
  if (prompt.length === 0) {
    return { ok: false, error: "Type envoyé incorrect! Entrez un texte valide" };
  }
  if (prompt.length > 280) {
    return { ok: false, error: "Texte trop long!" };
  }

  return { ok: true, value: prompt }
}

// Ton décrit dans SOUL.md : tutoiement, court, pas de faux statut.
const REPONSES = {
  test: "Message bien reçu, je suis là ! Pose-moi une question sur ta séance de sport.",
  salut: "Salut ! Prêt à bouger ? Tu peux me demander comment t'échauffer, t'organiser ou récupérer.",
  aide: "Je parle d'échauffement, de séances pour débuter et de récupération. Essaie une des questions suggérées sous l'accueil.",
  repli: "Je n'ai pas compris. Reformule ta question, ou choisis une des suggestions."
};

// Mots entiers reconnus, par ordre de priorité : « salut, aide-moi » donne l'aide.
const MOTS_CLES = [
  ['aide', ['aide', 'secours']],
  ['salut', ['salut', 'bonjour', 'bonsoir', 'coucou', 'hello']],
  ['test', ['test']]
];

// Découpe en mots entiers : « tester » ne contient pas le mot « test ».
function mots(texte) {
  return texte.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

export function replyTo(message) {
  const presents = new Set(mots(typeof message === "string" ? message : ""));

  for (const [cle, synonymes] of MOTS_CLES) {
    if (synonymes.some((mot) => presents.has(mot))) {
      return REPONSES[cle];
    }
  }
  return REPONSES.repli;
}

const AIDE_COMMANDES = "Commandes : **/aide** liste les commandes, **/effacer** vide la conversation, **/compte** donne le nombre de messages.";

// Commandes du chat. Renvoie null si le texte n'est pas une commande.
// action : null, ou 'effacer' que app.js applique sur la page.
export function commande(texte, { nbMessages = 0 } = {}) {
  const propre = typeof texte === "string" ? texte.trim().toLowerCase() : "";
  if (!propre.startsWith("/")) {
    return null;
  }

  switch (propre) {
    case "/aide":
      return { reponse: AIDE_COMMANDES, action: null };
    case "/effacer":
      return { reponse: "", action: "effacer" };
    case "/compte": {
      const pluriel = nbMessages > 1 ? "s" : "";
      return { reponse: `La conversation compte ${nbMessages} message${pluriel}.`, action: null };
    }
    default:
      return { reponse: "Je ne connais pas cette commande. Tape /aide pour voir la liste.", action: null };
  }
}
