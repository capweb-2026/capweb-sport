# SPEC.md — Identité de Coach Sprint

## Objectif

L'assistant de sport du binôme a une identité reconnaissable dès l'ouverture de la page : un nom, un emoji, un message d'accueil et trois questions pour démarrer. L'utilisateur sait tout de suite à qui il parle, de quoi il peut parler, et que l'assistant ne remplace pas un professionnel.

Valeurs retenues :

- **Nom** : `Coach Sprint`
- **Emoji** : 🏃
- **Accueil** : « Salut, je suis Coach Sprint ! Je t'aide à préparer tes séances de sport. Je ne remplace ni un médecin ni un coach diplômé. »
- **Suggestions** :
  1. « Comment m'échauffer avant de courir ? »
  2. « Combien de séances par semaine pour débuter ? »
  3. « Comment récupérer après un entraînement ? »

## Critères d'acceptation

1. **Nom** — Quand la page s'ouvre, le système affiche le nom de l'assistant dans le titre principal `h1`. Le nom, sans les espaces autour, fait de 2 à 20 caractères : 1 et 21 caractères sont refusés, 2 et 20 sont acceptés.
2. **Emoji** — Quand la page s'ouvre, le système affiche un seul emoji à côté du nom, dans le `h1`. Un emoji composé qui s'affiche comme un seul caractère (par exemple 🏃 ou 🛡️) compte pour un. Deux emojis, du texte, ou une chaîne vide sont refusés.
3. **Accueil** — Quand la conversation est vide, le système affiche un message d'accueil qui contient le nom. Ce message n'est pas une ligne de `#messages`. Il disparaît dès le premier message envoyé, reste caché après un rechargement si une conversation est enregistrée, et revient quand la conversation est effacée.
4. **Suggestions** — Quand la page s'ouvre, le système propose exactement trois questions suggérées, chacune non vide. Quand l'utilisateur clique sur l'une d'elles, le système place son texte dans `#message` sans l'envoyer : `#messages` ne reçoit aucune ligne.
5. **Réponses signées** — Quand l'assistant répond, sa ligne dans `#messages` commence par son nom (`Coach Sprint`) au lieu de « Cap Web ». La ligne de l'utilisateur garde le préfixe « Vous ».
6. **Contrat** — Les tests de contrat CP1 (`tests/contrat/`, `browser/contrat.spec.js`) restent verts, ainsi que les tests existants (`tests/brain.test.js`, `tests/server.test.js`, `tests/harnais/`).

## Hors périmètre

- Pas de choix ni de modification de l'identité par l'utilisateur.
- Pas d'image d'avatar, pas de nouvelle police, pas de dépendance ajoutée.
- Pas d'appel à une IA : `replyTo` reste un cerveau à règles, inchangé par cette fonctionnalité.
- Pas de nouvelle réponse du cerveau aux questions suggérées (voir « Questions ouvertes »).
- Pas de changement de la clé `capweb.historique` ni du format `{ role, text }` enregistré : le préfixe du nom est ajouté à l'affichage seulement.

## Données et fonctions attendues

- **`public/js/persona.js`** (nouveau, module ES, aucun accès à `document`, `window` ni `localStorage`) exporte :
  - `persona` : objet `{ nom: string, emoji: string, accueil: string, suggestions: string[] }` avec les valeurs de l'objectif ;
  - `validatePersona(persona)` : renvoie `{ ok: true }` ou `{ ok: false, erreurs: [string, …] }`, avec au moins une erreur non vide par règle violée.
- `validatePersona` refuse :
  - un nom qui, sans les espaces autour, fait moins de 2 ou plus de 20 caractères ;
  - un emoji qui n'est pas exactement un caractère visible et un emoji (attention : `'🏃'.length` vaut 2 et `'🛡️'.length` vaut 3) ;
  - un accueil qui ne contient pas le nom ;
  - un nombre de suggestions différent de 3, ou une suggestion vide ou faite d'espaces.
  - `validatePersona(persona)` sur l'objet exporté renvoie `{ ok: true }`.
- **`public/index.html`** :
  - le `h1` contient l'emoji et le nom ; le `<title>` contient le nom ;
  - `#accueil` (texte d'accueil) et `#suggestions` (trois `button type="button"`) sont placés **en dehors** de `#messages` et en dehors de `#chat-form` ;
  - les sélecteurs du contrat restent inchangés : `#chat-form`, `#message`, `#messages`, `#status`, `#effacer`, bouton « Envoyer ».
- **`public/js/view.js`** : `renderMessages(messages, container)` garde sa signature et `textContent` ; une ligne `assistant` commence par `Coach Sprint`, une ligne `user` par `Vous`. `view.js` n'importe toujours ni `replyTo` ni `validateMessage`.
- **`public/js/app.js`** : affiche l'identité et les suggestions depuis `persona`, montre ou cache `#accueil` selon que l'historique est vide, sans `innerHTML` ni `createElement('li')`.
- **`server/app.js`** : `/js/persona.js` est ajouté à `FICHIERS` et `js/persona.js` à `TYPES` (`text/javascript; charset=utf-8`).
- **Tests** : `tests/identite.test.js` (Node, `persona.js`) et `browser/identite.spec.js` (Playwright, critères 1 à 5 dans la page).

## Questions ouvertes

- Le cerveau doit-il donner une réponse propre à chacune des trois suggestions, au lieu du repli ? Non décidé : hors de cette PR tant que ce n'est pas tranché.
