import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { traiterChat, traiterSante, TAILLE_MAX } from './chat.js';

// Routes dynamiques du CP3, seules exceptions au « GET et HEAD seulement ».
// En prod, ce sont api/chat.js et api/health.js qui les servent ; ici, les tests navigateur.
const ROUTE_CHAT = '/api/chat';
const ROUTE_SANTE = '/api/health';
const TROP_GROS = Symbol('trop gros');

// Corps de requête lu avec un plafond : on draine toujours, on ne garde rien au-delà.
function lireCorpsBrut(req) {
  return new Promise((resoudre, rejeter) => {
    let corps = '';
    let depasse = false;
    req.setEncoding('utf8');
    req.on('data', (morceau) => {
      if (depasse) return;
      corps += morceau;
      if (corps.length > TAILLE_MAX) {
        depasse = true;
        corps = '';
      }
    });
    req.on('end', () => resoudre(depasse ? TROP_GROS : corps));
    req.on('error', rejeter);
  });
}

// Liste explicite : seuls ces chemins publics sont servis.
const FICHIERS = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/js/app.js': 'js/app.js',
  '/js/brain.js': 'js/brain.js',
  '/js/format.js': 'js/format.js',
  '/js/persona.js': 'js/persona.js',
  '/js/view.js': 'js/view.js'
};

// MIME corrects pour chaque fichier servi.
const TYPES = {
  'index.html': 'text/html; charset=utf-8',
  'styles.css': 'text/css; charset=utf-8',
  'js/app.js': 'text/javascript; charset=utf-8',
  'js/brain.js': 'text/javascript; charset=utf-8',
  'js/format.js': 'text/javascript; charset=utf-8',
  'js/persona.js': 'text/javascript; charset=utf-8',
  'js/view.js': 'text/javascript; charset=utf-8'
};

export function createApp({ publicDir, version = 'dev' } = {}) {
  const serveur = http.createServer((req, res) => {
    traiter(req, res).catch(() => {
      // Dernier filet : ne jamais laisser la requête sans réponse.
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      }
      res.end('Erreur interne');
    });
  });

  // Route du chat : le corps est lu ici, la décision est prise par server/chat.js.
  async function repondreChat(req, res, methode) {
    const brut = methode === 'POST' ? await lireCorpsBrut(req) : undefined;
    const { statut, donnees } =
      brut === TROP_GROS
        ? { statut: 413, donnees: { ok: false, erreur: 'Requête trop volumineuse.' } }
        : await traiterChat({ methode, corps: brut });
    const corps = JSON.stringify(donnees);
    res.writeHead(statut, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(corps)
    });
    res.end(methode === 'HEAD' ? '' : corps);
  }

  async function traiter(req, res) {
    const methode = (req.method ?? 'GET').toUpperCase();
    let chemin = '/';
    try {
      // URL puis décodage : tout encodage suspect hors liste donne 404.
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      chemin = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Non trouvé');
      return;
    }
    if (chemin === ROUTE_CHAT) {
      await repondreChat(req, res, methode);
      return;
    }
    if (chemin === ROUTE_SANTE) {
      const { statut, donnees } = traiterSante({ methode });
      const corps = JSON.stringify(donnees);
      res.writeHead(statut, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(corps),
        // L'état de la configuration change sans changer de commit : jamais de cache.
        'cache-control': 'no-store'
      });
      res.end(methode === 'HEAD' ? '' : corps);
      return;
    }
    // Partout ailleurs : seules GET et HEAD sont autorisées (outillage statique J1).
    if (methode !== 'GET' && methode !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Méthode non autorisée');
      return;
    }
    // Métadonnée de version fournie au démarrage.
    if (chemin === '/version.json') {
      const corps = JSON.stringify({ version });
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(corps) });
      res.end(methode === 'HEAD' ? '' : corps);
      return;
    }
    const relatif = FICHIERS[chemin];
    // Inconnu : 404 neutre, sans fuite du dépôt.
    if (!relatif) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Non trouvé');
      return;
    }
    try {
      // Chemin construit depuis la liste, pas depuis l’URL brute.
      const fichier = path.join(publicDir, relatif);
      const corps = await readFile(fichier);
      res.writeHead(200, { 'content-type': TYPES[relatif], 'content-length': corps.length });
      res.end(methode === 'HEAD' ? '' : corps);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Non trouvé');
    }
  }

  return serveur;
}
