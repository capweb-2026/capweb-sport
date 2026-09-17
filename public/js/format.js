// Mise en forme du texte des messages. Module pur : aucun accès à la page.

// Découpe un texte en morceaux { texte, gras } : **très** devient un morceau en gras.
// view.js en fait des nœuds texte, jamais du HTML.
export function decouperGras(texte) {
  const morceaux = [];
  const motif = /\*\*(.+?)\*\*/gs;
  let debut = 0;

  for (const trouve of texte.matchAll(motif)) {
    if (trouve.index > debut) {
      morceaux.push({ texte: texte.slice(debut, trouve.index), gras: false });
    }
    morceaux.push({ texte: trouve[1], gras: true });
    debut = trouve.index + trouve[0].length;
  }
  if (debut < texte.length) {
    morceaux.push({ texte: texte.slice(debut), gras: false });
  }
  return morceaux;
}

export function prefixe(role, nom) {
  return role === 'user' ? 'Vous: ' : `${nom}: `;
}

// Conversation au format texte brut, une ligne par message.
export function conversationEnTexte(messages, nom) {
  return messages.map((m) => `${prefixe(m.role, nom)}${m.text}\n`).join('');
}
