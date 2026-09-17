// Sonde du tuyau (CP3-1, étape 1) : avant toute IA, vérifier que Vercel sert bien ce fichier
// comme une fonction. Ouvrir https://<adresse de la preview>/api/chat doit afficher {"pret":true}.
// Aucune globale Node ici : ce fichier n'est couvert par aucun bloc de globales d'eslint.config.js.
export default function handler(req, res) {
  res.status(200).json({ pret: true });
}
