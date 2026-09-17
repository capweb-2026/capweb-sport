# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Consignes générales, commandes, interdits et définition de « fini » : `AGENTS.md` (importé en bas de ce fichier). Ne compléter ici que ce qu'il ne dit pas. `AGENTS.md` est un fichier du harnais : une fois commité, le modifier exige `HARNAIS-CHANGE:` dans la PR, ce fichier-ci non.

## Tests sous Claude Code

La consigne `spawn EPERM` d'`AGENTS.md` vise le bac à sable de dsh, pas Claude Code. Ici, lancer directement `npm test`, `npm run test:browser` et `npm run verify`, et joindre la sortie au résumé. Si `spawn EPERM` apparaît quand même, appliquer la consigne d'`AGENTS.md`.

Lancer un seul test :

```sh
node --test tests/brain.test.js
node --test --test-name-pattern="validateMessage" "tests/**/*.test.js"
npx playwright test browser/contrat.spec.js -g "Effacer"
```

- `test:browser` démarre lui-même `server/start.js` sur le port 4173 (pas de serveur à lancer avant).
- Première installation : `npx playwright install chromium`.
- `test:smoke` exige `BASE_URL` (déploiement réel) : pas d'usage local.
- `npm run build` copie `public/` dans `dist/` et écrit `dist/version.json`.

## Architecture

**Front (`public/js/`)** : modules ES sans build. Les rôles sont vérifiés par analyse statique dans `tests/contrat/brain.contrat.test.js` (commentaires retirés avant l'analyse, donc un mot interdit en commentaire ne compte pas) :
- `brain.js` et `persona.js` : modules purs, sans `document`, `window` ni `localStorage`. `persona.js` porte l'identité (`persona`, `validatePersona`) décrite dans `SPEC.md`.
- `view.js` : construit les `<li>` avec `textContent`, n'importe ni `replyTo` ni `validateMessage`.
- `app.js` : câblage. Jamais `createElement('li')` (réservé à `view.js`).

**Mémoire** : tableau `{ role: 'user' | 'assistant', text }` en JSON dans `localStorage`, clé `capweb.historique`. Le préfixe affiché (« Vous », nom de l'assistant) n'est jamais enregistré. Une mémoire corrompue ne doit ni casser la page ni lever d'erreur.

**Contrat navigateur** (`browser/contrat.spec.js`) : sélecteurs `#chat-form`, `#message`, `#messages`, `#status`, `#effacer`, bouton « Envoyer ». Effacer passe par `confirm()` : accepter vide l'écran et la mémoire, refuser ne change rien.

**Serveur local (`server/app.js`)** : liste blanche `FICHIERS` + `TYPES`. Un fichier de `public/` absent de ces deux objets répond 404, et la page casse si un module l'importe. GET et HEAD seulement.

**Production** : Vercel sert le statique de `dist/`, pas le serveur Node. Le commit déployé se lit dans `/version.json`.

## Harnais

- **Justifications en PR** (`scripts/check-tests.js`) : une ligne hors commentaire HTML, 15 caractères minimum après l'étiquette.
  - `TEST-CHANGE:` si un fichier **existant** de `tests/` ou `browser/` est modifié ou supprimé (un nouveau fichier n'en demande pas) ;
  - `HARNAIS-CHANGE:` si `.github/`, `scripts/`, `package.json`, `package-lock.json`, `dependances-autorisees.json`, `eslint.config.js`, `playwright*.config.js`, `vercel.json` ou `AGENTS.md` (déjà commité) changent.
- **CI** (`.github/workflows/chaine.yml`) :
  - PR : verifier → preview → smoke-preview ;
  - `main` : verifier → production (approbation humaine) → smoke-production → tag `prod-<n>`.
  - `retour-arriere.yml` remet un tag en ligne.
- **Gestionnaire de paquets** : npm (`package-lock.json`, `npm ci` en CI), même si l'humain utilise pnpm en local.

@AGENTS.md
@SPEC.md
@SOUL.md
