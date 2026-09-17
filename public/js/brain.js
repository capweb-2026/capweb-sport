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

export function replyTo(message) {
  const trimmed = message.trim();
  const normalized = trimmed.toLowerCase();

  switch (normalized) {
    case "test":
      return "Bonjour, comment-allez vous ?"
    case "bonjour":
      return "Bonjour, comment allez-vous ?"
    case "salut":
      return "Bonjour, comment allez-vous ?"
    case "aide":
      return "Je suis votre assistant IA, posez-moi les questions que vous voulez et j'essaierai d'y répondre au mieux! :)"
    default:
      return "Désolé, je ne comprends pas votre requête. Pouvez-vous essayer de la reformuler svp?"
  }
}