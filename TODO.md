# TP13 — Défis (quand tout le reste est fini)

Au choix, dans l'ordre que vous voulez. Chaque défi = une entrée dans le suivi. Règles : vous devez pouvoir expliquer chaque ligne ; chaque nouveau fichier va dans la liste blanche du serveur ; un défi qui touche `brain.js` vient avec son test.

## Cerveau

1. **Commandes** : `/aide` liste les commandes, `/effacer` vide la conversation, `/compte` donne le nombre de messages.
2. **Plus souple** : reconnaître le mot dans une phrase (« bonjour à tous ») et des synonymes. Attention : « tester » contient « test ».
3. ~~**Deux langues** : `/lang en` bascule les réponses en anglais.~~

## Interface

4. **Cap Web réfléchit** : réponse après une seconde (`setTimeout`), bouton désactivé, statut « Cap Web écrit… ». Que se passe-t-il si on envoie deux messages très vite ?
5. **Thème sombre** : `prefers-color-scheme`, plus un bouton qui mémorise le choix.
6. **Gras sans danger** : `**très**` affiché en gras sans jamais utiliser `innerHTML`.
7. **Exporter** : télécharger la conversation en `.txt`.

## Qualité

8. **Navigateur automatisé** : depuis `atelier`, `npm ci`, `npx playwright install chromium`, puis écrivez `browser/chat.spec.js` (taper « salut », envoyer, vérifier deux messages) et lancez `npm run test:browser`.
9. **Accessibilité mesurée** : un test avec `@axe-core/playwright` qui échoue s'il trouve une violation.
10. **Tout vert** : `npm run verify` (lint, tests, navigateur).
11. **Regard critique (vaut double)** : listez trois améliorations de `app.js` pour un projet qui doit durer un an. Demandez la même chose à une IA et comparez : où a-t-elle raison, où se trompe-t-elle ?

MOI:
- Ajouter une meilleure sécurité, pour l'instant un hackeur peut bypass les vérifications frontend
- Ajoute des commentaires pour mieux comprendre le code la prochaine fois
- Retirer complètement `app.js` et le séparer en plusieurs fichiers pour une relecture plus propre.

IA:
1. Sortir la mémoire dans un module pur et testable
  
  La lecture et la validation de l'historique (public/js/app.js:182) et l'écriture (public/js/app.js:56) sont mêlées au code de la  page. On ne peut donc les tester qu'avec Playwright, et la suite navigateur prend déjà 50 s.
  - À faire : créer un module memoire.js sur le modèle de format.js. Une fonction pure lireHistorique(json) renverrait { messages, 
    corrompu }, et app.js ne ferait plus qu'appeler localStorage. Chaque cas limite se teste alors en Node en quelques millisecondes :
    JSON invalide, null, un objet au lieu d'un tableau, un message sans text.
  - Un vrai bug au passage : localStorage.setItem (public/js/app.js:57) n'est pas dans un try/catch. Si le stockage est plein ou bloqué    (navigation privée, quota), l'envoi lève une erreur au milieu du traitement : le message de l'utilisateur est affiché, mais la
    réponse n'arrive jamais. CLAUDE.md exige pourtant qu'un problème de mémoire ne casse jamais la page.

  2. Un seul chemin « envoyer → attendre → répondre », prêt pour l'IA

  L'état est dispersé : historique, minuteur (public/js/app.js:25), le bouton désactivé et le statut. Chaque fonction qui modifie
  l'historique doit penser à appeler sauvegarder() puis afficherConversation(). On l'a vu avec effacerConversation : il a fallu ne pas
  oublier clearTimeout, sinon la réponse réapparaissait.

  - Pourquoi c'est urgent : mercredi, le setTimeout deviendra un fetch vers le serveur. Ce fetch peut échouer, être lent, ou revenir
    après un effacement. Le verrou actuel, basé sur un minuteur, ne gère aucun de ces cas.
  - À faire : une fonction envoyer(texte) asynchrone, seule autorisée à modifier l'état, qui sauvegarde et affiche à un seul endroit.
    Avec un AbortController, « Effacer » annulerait la requête en cours. Avec un try/catch/finally, le bouton serait toujours réactivé
    et une erreur réseau s'afficherait dans #status.

  3. Rendre le code cohérent pour qu'une autre personne s'y retrouve dans un an

  - Nommage mélangé : history, chatbar, deleteButton, retrieveHistory côtoient historique, statut, effacerConversation. Pire, history
    (public/js/app.js:9) masque l'objet global window.history, déclaré dans la config ESLint, ce qui peut créer un bug discret si on
    s'en sert un jour.
  - Vérifications incohérentes : les éléments sont récupérés avec ?. à certains endroits, mais statut et chatbar sont utilisés sans
    vérification. Si un sélecteur change, la page casse à un endroit imprévu. Mieux vaut échouer tout de suite au démarrage avec un
    message clair, ou tout vérifier.
  - Textes éparpillés : les messages affichés sont écrits en dur un peu partout (public/js/app.js:79, :160, :195). Les regrouper dans
    un seul objet, comme persona.js le fait pour l'identité, facilite la relecture au regard de SOUL.md et une future traduction.
  - Forme : les points-virgules sont irréguliers. On peut ajouter une règle ESLint semi, mais c'est une modification du harnais, donc
    une PR avec HARNAIS-CHANGE:.

COMPARAISON:
Tout d'abord, le plus flagrant: l'IA a écrit un grand paragraphe détaillé.
En résumé, l'IA a proposé:
1. Séparer les responsabilités par fichier -> je l'ai proposé en 3.
2. Modifier le life cycle -> Bonne idée! Je n'y avais pas pensé
3. Rendre le code plus cohérent et compréhensible -> je l'ai proposé en 1. pour les commentaires!
En bref, nous avons eu à peu près les mêmes idées. Sur un projet d'une durée d'1 an, le code doit respecter les principes SOLID et facile à maintenir pour tout nouveaux devs.

Retour : [APRES-MIDI-J1.md](../APRES-MIDI-J1.md)