// Porte d'entrée Vercel de la route de santé : l'état de la configuration vue par
// la fonction réellement déployée. Aucun secret n'en sort (voir diagnostic() dans server/ia.js).
// Fichier volontairement minimal : aucune globale Node n'est disponible ici.
import { traiterSante } from '../server/chat.js';

export default function handler(req, res) {
  const { statut, donnees } = traiterSante({ methode: req.method });
  res.setHeader('cache-control', 'no-store');
  res.status(statut).json(donnees);
}
