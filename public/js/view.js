import { persona } from './persona.js'

export function renderMessages(messages, container) {
  const render = [];
  for (const mess of messages) {
    const newMessage = document.createElement("li");
    if (mess.role === "user") {
      newMessage.textContent = "Vous: " + mess.text;
    } else {
      newMessage.textContent = persona.nom + ": " + mess.text;
    }
    render.push(newMessage);
  }
  container.replaceChildren(...render);
}
