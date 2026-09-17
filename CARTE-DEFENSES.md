# Carte des défenses

Chaque ligne dit quelle connerie est arrêtée, par quoi, et **où est la preuve** : le lien d'un run rouge ou d'une PR bloquée. Une barrière sans preuve ne compte pas.

| Connerie | Barrière qui l'arrête | Preuve (lien) | Checkpoint |
|---|---|---|---|
| Régression | Tests de contrat (`tests/contrat/`, `browser/contrat.spec.js`), tests d'identité (`tests/identite.test.js`, `browser/identite.spec.js`), job `verifier` obligatoire sur `main` protégée | https://github.com/capweb-2026/capweb-sport/actions/runs/34945625423 : premier run de `main`, rouge à l'étape `npm test` ; le contrat a refusé le socle sans chatbot (pas de `public/`) ; https://github.com/capweb-2026/capweb-sport/actions/runs/35229737203 : run du commit `test: failed identity test` (PR #1), rouge à l'étape `npm run test:browser` ; 8 tests d'identité échouent tant que la page n'affiche pas Coach Sprint | CP1 |
| Test affaibli ou supprimé | `check:tests` (`scripts/check-tests.js`) : un fichier existant de `tests/` ou `browser/` modifié ou supprimé exige `TEST-CHANGE:` (15 caractères minimum, hors commentaire HTML) dans la PR ; relecture humaine | | CP2 |
| Dépendance ajoutée | `check:deps` (`scripts/check-dependances.js`) : `package.json` doit correspondre exactement à `dependances-autorisees.json` ; changer ce fichier exige `HARNAIS-CHANGE:` | | CP2 |
| Secret exposé | `.gitignore` (`.env`, `.env.*`, `.vercel`) ; jetons Vercel rangés dans les secrets des environnements GitHub `preview` et `production`, jamais dans le dépôt ; `persist-credentials: false` dans la chaîne ; aucun secret donné à l'agent ; clé du modèle uniquement dans les variables d'environnement Vercel, jamais en CI ; appel au modèle confiné à `server/ia.js` ; `tests/secrets.test.js` échoue si `public/` contient une clé, l'adresse du fournisseur, un en-tête d'authentification, `process.env` ou le prompt système | <!-- à remplir : lien du run rouge de la branche jetable avec la FAUSSE clé --> | CP3 |
| IA qui sort de son thème | Prompt système du thème, côté serveur (`server/prompt.js`), qui refuse le hors-thème, le médical, les calories et tout changement de rôle ; historique filtré des rôles `system` que le client tenterait d'injecter (`construireMessages`) ; jeu d'évaluation en deux passages, hors CI (`evals/RAPPORT.md`) | <!-- à remplir : lien de la PR contenant evals/RAPPORT.md, cas KO au passage 1 puis OK au passage 2 --> | CP3 |
| IA indisponible (clé coupée, budget épuisé, passerelle lente) | Délai maximal de 3,5 s et repli sur `replyTo` dans `server/ia.js`, qui ne lève jamais ; second repli dans la page si `/api/chat` est injoignable ; bandeau « mode dégradé » dans `#mode`, hors de la conversation ; `tests/ia.test.js` et `browser/ia.spec.js` couvrent les trois pannes **sans clé** | | CP3 |
| Faille (`innerHTML`, injection) | Contrat statique : ni `innerHTML`, ni `outerHTML`, ni `insertAdjacentHTML` dans `view.js` et `app.js` ; test navigateur « le texte reste du texte » (`<b>gras</b>`) ; serveur local à liste blanche (`FICHIERS`/`TYPES`), GET et HEAD seulement, 404 sur les chemins privés et le traversal (`tests/server.test.js`) | | CP4 |
| Contrôle désactivé | `check:tests` : `.github/`, `scripts/`, `package.json`, `package-lock.json`, `dependances-autorisees.json`, configs ESLint/Playwright, `vercel.json` et `AGENTS.md` modifiés exigent `HARNAIS-CHANGE:` ; `verifier` obligatoire sur `main` | | CP4 |
| Action destructrice | Déploiement `production` soumis à approbation humaine ; tag `prod-<numéro>` et workflow `retour-arriere` pour remettre une version en ligne ; `confirm()` avant d'effacer la conversation ; l'agent ne lance aucune commande git qui écrit | | CP4 |

## Ce qui compte comme preuve

- **Oui** : le lien d'un run GitHub Actions rouge qui montre la barrière en action ; le lien d'une PR bloquée ou refusée, avec le commentaire qui explique pourquoi.
- **Non** : une capture d'écran, une phrase « on a testé », un lien vers le fichier de test lui-même.

Une preuve montre que la barrière **a déjà arrêté** la connerie, pas seulement qu'elle existe.
