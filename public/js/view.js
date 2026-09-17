import { persona } from './persona.js'
import { decouperGras, prefixe } from './format.js'

export function renderMessages(messages, container) {
  const render = [];
  for (const mess of messages) {
    const newMessage = document.createElement("li");
    newMessage.textContent = prefixe(mess.role, persona.nom);
    // **texte** en gras : un <strong> rempli avec textContent, jamais de HTML.
    for (const morceau of decouperGras(mess.text)) {
      if (morceau.gras) {
        const gras = document.createElement("strong");
        gras.textContent = morceau.texte;
        newMessage.append(gras);
      } else {
        newMessage.append(morceau.texte);
      }
    }
    render.push(newMessage);
  }
  container.replaceChildren(...render);
}
