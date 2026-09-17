import { validateMessage, replyTo, commande } from './brain.js'
import { renderMessages } from './view.js'
import { persona } from './persona.js'
import { conversationEnTexte } from './format.js'

const formulaire = document.querySelector('#chat-form');
const statut = document.querySelector('#status');
const versionElt = document.querySelector('#version');
const history = document.querySelector('#messages');
const chatbar = document.querySelector('#message');
const deleteButton = document.querySelector('#effacer');
const accueil = document.querySelector('#accueil');
const modeElt = document.querySelector('#mode');
const suggestions = document.querySelector('#suggestions');
const boutonEnvoyer = formulaire?.querySelector('button[type="submit"]');
const boutonTheme = document.querySelector('#theme');
const boutonExporter = document.querySelector('#exporter');

const CLE_HISTORIQUE = 'capweb.historique';
const CLE_THEME = 'capweb.theme';
const DELAI_REPONSE = 1000;
// Derniers échanges envoyés au serveur : le reste de la mémoire ne quitte pas le navigateur.
const ECHANGES_ENVOYES = 6;
const TEXTE_MODE_DEGRADE = 'Mode dégradé : Coach Sprint répond avec ses règles, l’IA n’a pas répondu.';

const historique = []; // { role: string, text: string };

// Réponse en attente : tant qu'il y en a une, un nouvel envoi est ignoré.
let enAttente = false;
// Compteur d'envoi : une réponse dont la marque a changé (effacement, nouvel envoi) est jetée.
// Sert de remplaçant à AbortController, absent des globales d'eslint.config.js.
let generation = 0;

// Identité depuis persona.js : nom, emoji, accueil et suggestions.
function afficherIdentite() {
  const nomElt = document.querySelector('#persona-nom');
  const emojiElt = document.querySelector('#persona-emoji');
  if (nomElt) nomElt.textContent = persona.nom;
  if (emojiElt) emojiElt.textContent = persona.emoji;
  document.title = `${persona.nom} — assistant sport`;
  if (accueil) accueil.textContent = persona.accueil;

  const boutons = persona.suggestions.map((texte) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = texte;
    // Place la question dans le champ sans l'envoyer.
    bouton.addEventListener('click', () => {
      chatbar.value = texte;
      chatbar.focus();
    });
    return bouton;
  });
  suggestions?.replaceChildren(...boutons);
}

// L'accueil n'est visible que sur une conversation vide.
function afficherConversation() {
  renderMessages(historique, history);
  if (accueil) accueil.hidden = historique.length > 0;
}

function sauvegarder() {
  localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(historique));
}

function attendreReponse(occupe) {
  if (boutonEnvoyer) boutonEnvoyer.disabled = occupe;
  statut.textContent = occupe ? `${persona.nom} écrit…` : '';
}

// Le mode dégradé a sa propre zone : jamais une ligne de la conversation.
function afficherMode(degrade) {
  if (!modeElt) return;
  modeElt.textContent = degrade ? TEXTE_MODE_DEGRADE : '';
  modeElt.hidden = !degrade;
}

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));

// Demande une réponse au serveur. Ne lève jamais : si la route est injoignable,
// la page se replie elle-même sur les règles de J1, comme le ferait le serveur.
async function demanderReponse(texte) {
  try {
    const reponse = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        message: texte,
        // L'historique s'arrête avant le message courant, déjà envoyé dans « message ».
        historique: historique.slice(0, -1).slice(-ECHANGES_ENVOYES)
      })
    });
    if (!reponse.ok) throw new Error(`route /api/chat : ${reponse.status}`);
    const donnees = await reponse.json();
    if (!donnees || typeof donnees.texte !== 'string' || donnees.texte.trim() === '') {
      throw new Error('réponse inexploitable');
    }
    return { texte: donnees.texte, degrade: donnees.degrade === true };
  } catch {
    return { texte: replyTo(texte), degrade: true };
  }
}

// Un seul chemin « envoyer → attendre → répondre », quelle que soit la source de la réponse.
async function repondre(texte, { local = null } = {}) {
  const marque = ++generation;
  enAttente = true;
  attendreReponse(true);
  afficherMode(false);

  // Le délai minimal garde le statut « écrit… » visible, comme au J1.
  const [resultat] = await Promise.all([
    local === null ? demanderReponse(texte) : Promise.resolve({ texte: local, degrade: false }),
    attendre(DELAI_REPONSE)
  ]);

  // Effacement ou nouvel envoi pendant l'attente : la réponse est périmée, on la jette.
  if (marque !== generation) return;

  enAttente = false;
  historique.push({ role: 'assistant', text: resultat.texte });
  sauvegarder();
  afficherConversation();
  attendreReponse(false);
  afficherMode(resultat.degrade);
  chatbar.focus();
}

function effacerConversation() {
  if (!confirm('Effacer toute la conversation ?')) return;
  // Une réponse en attente ne doit pas réapparaître après l'effacement.
  generation += 1;
  enAttente = false;
  attendreReponse(false);
  afficherMode(false);
  localStorage.removeItem(CLE_HISTORIQUE);
  historique.length = 0;
  afficherConversation();
}

formulaire?.addEventListener('submit', (event) => {
  event.preventDefault();
  // Deux envois rapides : le second est ignoré et garde son texte dans le champ.
  if (enAttente) return;

  const resp = validateMessage(chatbar.value)
  if (!resp.ok) {
    statut.textContent = resp.error || 'Une erreur est survenue.';
    chatbar.focus()
    return;
  }

  const cmd = commande(resp.value, { nbMessages: historique.length });
  chatbar.value = ''
  if (cmd?.action === 'effacer') {
    statut.textContent = ''
    effacerConversation();
    chatbar.focus()
    return;
  }

  historique.push({ role: 'user', text: resp.value });
  sauvegarder();
  afficherConversation();
  chatbar.focus()
  // Une commande se traite dans la page ; tout le reste passe par /api/chat.
  repondre(resp.value, { local: cmd ? cmd.reponse : null });
});

deleteButton?.addEventListener('click', effacerConversation);

// Thème : choix mémorisé, sinon celui du système (géré par le CSS).
function themeActuel() {
  const choisi = document.documentElement.dataset.theme;
  if (choisi === 'light' || choisi === 'dark') return choisi;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function afficherBoutonTheme() {
  if (!boutonTheme) return;
  const sombre = themeActuel() === 'dark';
  boutonTheme.textContent = sombre ? 'Thème clair' : 'Thème sombre';
  boutonTheme.setAttribute('aria-pressed', String(sombre));
}

function appliquerTheme() {
  try {
    const choisi = localStorage.getItem(CLE_THEME);
    if (choisi === 'light' || choisi === 'dark') {
      document.documentElement.dataset.theme = choisi;
    }
  } catch {
    // Stockage indisponible : on garde le thème du système.
  }
  afficherBoutonTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', afficherBoutonTheme);
}

boutonTheme?.addEventListener('click', () => {
  const nouveau = themeActuel() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nouveau;
  try {
    localStorage.setItem(CLE_THEME, nouveau);
  } catch {
    // Choix appliqué pour cette visite seulement.
  }
  afficherBoutonTheme();
});

// Export : fichier texte brut téléchargé, sans passer par le serveur.
boutonExporter?.addEventListener('click', () => {
  if (historique.length === 0) {
    statut.textContent = 'Rien à exporter : la conversation est vide.';
    return;
  }
  const fichier = new window.Blob([conversationEnTexte(historique, persona.nom)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = 'conversation-coach-sprint.txt';
  lien.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
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
  const jsonHistory = localStorage.getItem(CLE_HISTORIQUE);
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
appliquerTheme();
retrieveHistory();
afficherIdentite();
afficherConversation();
