import { test, expect } from '@playwright/test';

// CP3 — la page affiche l'état de l'IA, lu au démarrage sur /api/health.
// En local, aucune variable n'est définie : l'état annoncé est « non configurée ».

const etatIa = (page) => page.locator('#ia');

test.describe('CP3 — état de l’IA dans la page', () => {
  test('la page interroge /api/health au chargement', async ({ page }) => {
    const appel = page.waitForRequest((r) => r.url().includes('/api/health'));
    await page.goto('/');
    const requete = await appel;
    expect(requete.method()).toBe('GET');
  });

  test('l’état affiche le modèle annoncé par le serveur', async ({ page }) => {
    await page.goto('/');
    await expect(etatIa(page)).toBeVisible();
    const donnees = await (await page.request.get('/api/health')).json();
    await expect(etatIa(page)).toContainText(donnees.modele);
  });

  test('sans configuration, la page le dit au lieu d’annoncer une IA active', async ({ page }) => {
    await page.goto('/');
    await expect(etatIa(page)).toContainText(/non configur/i);
  });

  test('aucune clé ni valeur sensible n’arrive dans la page', async ({ page }) => {
    await page.goto('/');
    await expect(etatIa(page)).toBeVisible();
    const texte = await page.locator('body').innerText();
    expect(texte.toLowerCase()).not.toContain('bearer');
    expect(texte).not.toContain('CAPWEB_IA_CLE');
  });

  test('une route de santé en panne ne casse pas la page', async ({ page }) => {
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(e.message));
    await page.route('**/api/health', (route) => route.fulfill({ status: 500, body: 'panne' }));
    await page.goto('/');
    await expect(page.locator('#chat-form')).toBeVisible();
    await page.locator('#message').fill('salut');
    await page.getByRole('button', { name: /envoyer/i }).click();
    await expect(page.locator('#messages li')).toHaveCount(2);
    expect(erreurs).toHaveLength(0);
  });
});
