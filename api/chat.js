// Porte d'entrée Vercel de la route /api/chat.
// Volontairement minimale : ce fichier n'est couvert par aucun bloc de globales d'eslint.config.js,
// donc ni process, ni console, ni Buffer ici. Toute la logique, et la lecture de la clé,
// vivent dans server/ (piège 2 de la fiche CP3).
import { traiterChat } from '../server/chat.js';

export default async function handler(req, res) {
  const { statut, donnees } = await traiterChat({ methode: req.method, corps: req.body });
  res.status(statut).json(donnees);
}
