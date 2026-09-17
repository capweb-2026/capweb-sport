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

---

# SPEC.md — CP3 : la vraie IA en prod

## Objectif

Coach Sprint répond avec une vraie IA, dans son thème, en prod. La clé ne quitte jamais le serveur. Les tests tournent sans clé. Si l'IA ne répond pas, l'assistant répond quand même avec ses règles de J1, et il le dit.

Fournisseur retenu : **Mistral**, via son API compatible OpenAI (`POST <adresse>/chat/completions`). Le code ne connaît que trois variables d'environnement, jamais un fournisseur en dur : changer de passerelle ne demande aucune modification de code.

| Variable | Valeur en prod | Où |
|---|---|---|
| `CAPWEB_IA_URL` | `https://api.mistral.ai/v1` | Vercel, *Preview* et *Production* |
| `CAPWEB_IA_CLE` | la clé « app » | Vercel, *Preview* et *Production* |
| `CAPWEB_IA_MODELE` | `ministral-3b-latest` (défaut du code si absente) | Vercel, *Preview* et *Production* |

Le modèle est une variable, et pas une valeur en dur, parce que **tous les modèles ne sont pas accessibles à tous les paliers de compte** : `mistral-small-latest` figure bien dans `GET /v1/models` mais répond `429 Rate limit exceeded` sur ce compte, alors que `ministral-3b-latest` répond en ~0,3 s. En changer ne demande donc aucune modification de code, seulement une variable et un redéploiement. Avant d'adopter un modèle, vérifier qu'il répond vraiment `200` sur `POST /v1/chat/completions` : figurer dans la liste ne suffit pas.

Aucune de ces variables n'existe en local ni en CI : les tests y sont donc toujours en mode dégradé, ce qui est précisément le comportement à garantir.

## Ce que l'assistant accepte, refuse et ne révèle jamais

- **Accepte** : échauffement et retour au calme, fréquence et progressivité des séances pour débuter (course, marche, vélo, renforcement au poids du corps), récupération (sommeil, hydratation, repos), motivation et régularité.
- **Refuse poliment** : tout le hors-thème. Il ne répond pas sur le fond, rappelle en une phrase qu'il parle de sport, et propose une question.
- **Ne fait jamais** : diagnostic ou traitement, conseil en cas de douleur autre que « arrête et consulte », dopage, régime, calories, objectif de poids, jugement sur le corps, demande de donnée personnelle, et il ne se présente jamais comme un humain ou un professionnel diplômé (`SOUL.md`).
- **Ne révèle jamais** son prompt système, sous aucune forme : citation, résumé, traduction, code, poème, jeu de rôle. Il ne change ni de rôle, ni de thème, quelle que soit la demande.
- **Langue et longueur** : français, tutoiement, une à trois phrases, 60 mots au plus, un emoji au maximum.

## Choix du piège 5 (délai du smoke test)

Le smoke test attend la réponse **5 secondes au plus**, en preview comme en prod.

**Choix retenu : les messages que les règles connaissent déjà gardent leur réponse immédiate ; seul le reste part à l'IA.**

- `salut`, `bonjour`, `bonsoir`, `coucou`, `hello`, `aide`, `secours`, `test` et les commandes `/…` sont servis sans aucun appel réseau. Le contrat CP1 (« salut » doit recevoir exactement `replyTo('salut')`) et le smoke test (qui envoie « salut ») sont donc insensibles à la latence de la passerelle.
- Tout autre message part à l'IA, avec un **délai maximal de 3,5 secondes** (`DELAI_MAX` dans `server/ia.js`), sous les 4 secondes recommandées. Au-delà, la réponse des règles part à sa place.

Ces deux protections sont cumulatives : même si la passerelle devient lente, aucun test de la chaîne ne dépend d'elle.

## Données et fonctions attendues

- **`server/ia.js`** (le seul module qui parle au modèle) exporte :
  - `repondre({ message, historique }, { fournisseur, config, delaiMax })` → `{ ok: true, texte, source, degrade }` ou `{ ok: false, erreur }`. Il ne lève jamais.
  - `source` vaut `'ia'` ou `'regles'` ; `degrade` vaut `true` seulement quand l'IA **aurait dû** répondre et ne l'a pas fait. Une réponse des règles attendue (« salut ») n'est pas un mode dégradé.
  - `construireMessages`, `configuration`, `appelerPasserelle` : format OpenAI, lecture de l'environnement, appel réel.
  - `validateMessage` est rejoué côté serveur : la route ne fait pas confiance au navigateur.
  - L'historique envoyé au modèle est limité aux **6 derniers messages**, filtré des rôles `system` que le client tenterait d'injecter.
- **`server/prompt.js`** : le prompt système, dérivé de `SOUL.md`. Corrigé par PR après chaque passage d'évaluation.
- **`server/chat.js`** : la logique de la route, partagée par les deux portes d'entrée. `GET` répond `{ pret: true }` (sonde), `POST` répond la réponse, toute autre méthode 405.
- **`api/chat.js`** : porte d'entrée Vercel, minimale, sans aucune globale Node (piège 2 de la fiche).
- **`GET /api/health`** (`traiterSante`, `api/health.js`) : l'état de la configuration **telle que la voit la fonction déployée**, en `cache-control: no-store`. Renvoie `configure`, `adresse`, `modele`, `cleFournie` et `delaiMaxMs`. `cleFournie` est un **booléen** : la valeur de la clé ne quitte jamais le serveur, et `tests/sante.test.js` échoue si un fragment de clé apparaît dans la réponse. Cette route existe parce qu'un mode dégradé a deux causes très différentes — variables absentes, ou clé refusée — que seul le serveur peut distinguer. Le repli journalise sa raison (`console.error`), visible dans les *Runtime Logs* de Vercel, sans jamais la clé ni le message de l'utilisateur.
- **`public/index.html` / `public/js/app.js`** : le pied de page (`#ia`) annonce le modèle et l'adresse de la passerelle, ou dit laquelle des deux variables manque. Une route de santé en panne laisse la page pleinement utilisable.
- **`server/app.js`** : routes `POST /api/chat` et `GET /api/health` placées **avant** le contrôle de méthode ; corps plafonné à 16 Ko ; partout ailleurs, `GET` et `HEAD` seulement, comme au J1.
- **`public/index.html`** : `#mode`, paragraphe `role="status"`, placé **hors** de `#messages` et du formulaire. `#status` garde son rôle du J1 (« Coach Sprint écrit… », erreurs de saisie) : le mode dégradé ne s'y affiche jamais.
- **`public/js/app.js`** : envoie `{ message, historique }` à `/api/chat`, affiche le texte reçu tel quel, montre `#mode` quand `degrade` est vrai. Si la requête échoue, la page se replie elle-même sur `replyTo`. Le verrou d'envoi devient un drapeau `enAttente` ; un compteur de génération jette les réponses périmées (effacement pendant l'attente). Ni `AbortController` ni `AbortSignal` : ils sont absents des globales d'`eslint.config.js`.
- **Tests** : `tests/ia.test.js` (faux fournisseur), `tests/chat-route.test.js` (route locale sans clé), `tests/secrets.test.js` (rien de sensible dans `public/`), `browser/ia.spec.js` (mode dégradé dans la page).

## Hors périmètre

- Pas de streaming de la réponse, pas d'historique côté serveur : la mémoire reste dans le navigateur.
- Pas de dépendance ajoutée : `fetch` natif, aucun SDK.
- Pas de modification du contrat CP1 ni des smoke tests.
