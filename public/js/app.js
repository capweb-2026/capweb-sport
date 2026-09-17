import { validateMessage, replyTo } from './brain.js'
import { renderMessages } from './view.js'

const formulaire = document.querySelector('#chat-form');
const statut = document.querySelector('#status');
const versionElt = document.querySelector('#version');
const history = document.querySelector('#messages');
const chatbar = document.querySelector('#message');
const deleteButton = document.querySelector('#effacer');

const historique = []; // { role: string, text: string };

// J1 : interface seule, on bloque l’envoi et on l’explique.
formulaire?.addEventListener('submit', (event) => {
  event.preventDefault();

  const prompt = chatbar.value.trim();
  // if (prompt.length === 0) {
  //   statut.textContent = 'Le message ne doit pas être vide';
  //   chatbar.focus()
  //   return;
  // }
  const resp = validateMessage(prompt)
  if (!resp.ok) {
    statut.textContent = resp.error || 'Une erreur est survenue.';
    chatbar.focus()
    return;
  }

  historique.push({ role: 'user', text: resp.value }, { role: 'assistant', text: replyTo(resp.value) });
  localStorage.setItem('capweb.historique', JSON.stringify(historique));
  renderMessages(historique, history);

  // const newMessage = document.createElement("li");
  // newMessage.textContent = "Vous: " + prompt;
  // history.append(newMessage);

  // const newAIMessage = document.createElement("li");
  // newAIMessage.textContent = "Cap Web: " + replyTo(resp.value);
  // history.append(newAIMessage);

  statut.textContent = ''
  chatbar.value = ''
  chatbar.focus()
});

deleteButton?.addEventListener('click', () => {
  if (!confirm('Effacer toute la conversation ?')) return;
  localStorage.removeItem('capweb.historique');
  historique.length = 0;
  renderMessages(historique, history);
});

// Version du serveur local, échec discret si indisponible.
fetch('/version.json', { headers: { accept: 'application/json' } })
  .then((reponse) => (reponse.ok ? reponse.json() : null))
  .then((donnees) => {
    if (donnees && typeof donnees.version === 'string' && versionElt) {
      versionElt.textContent = `version ${donnees.version}`;
    }
  })
  .catch(() => {});

function retrieveHistory() {
  const jsonHistory = localStorage.getItem('capweb.historique');
  if (!jsonHistory) return;

  try {
    const lastHistory = JSON.parse(jsonHistory);
    for (const mess of lastHistory) {
      if ((mess.role !== "user" && mess.role !== "assistant") || (typeof mess.text !== "string" || mess.text.length === 0)) {
        continue
      }
      historique.push(mess)
    }
  } catch {
    statut.textContent = 'Votre dernier historique est corrompu, il ne peut pas être récupéré.';
  }
}
retrieveHistory();
renderMessages(historique, history);