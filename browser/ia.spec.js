import { test, expect } from '@playwright/test';
import { replyTo } from '../public/js/brain.js';
/* global localStorage -- callbacks exécutés dans la page */

// CP3 — la page parle à /api/chat et signale le mode dégradé.
// En local il n'y a pas de clé : toute question hors des règles revient en mode dégradé,
// avec le texte de replyTo. C'est exactement le comportement à garantir en prod clé coupée.

function surveiller(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  return erreurs;
}

async function pageNeuve(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function envoyer(page, texte) {
  await page.locator('#message').fill(texte);
  await page.getByRole('button', { name: /envoyer/i }).click();
}

const lignes = (page) => page.locator('#messages li');
const mode = (page) => page.locator('#mode');

test.describe('CP3 — la page passe par /api/chat', () => {
  test('une question hors des règles est envoyée à /api/chat', async ({ page }) => {
    await pageNeuve(page);
    const appel = page.waitForRequest((r) => r.url().includes('/api/chat') && r.method() === 'POST');
    await envoyer(page, 'Quel plan pour un premier 10 km ?');
    const requete = await appel;
    expect(JSON.parse(requete.postData() ?? '{}').message).toBe('Quel plan pour un premier 10 km ?');
    await expect(lignes(page)).toHaveCount(2);
  });

  test('aucune requête ne part vers un fournisseur de modèle', async ({ page }) => {
    const externes = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:4173')) externes.push(r.url());
    });
    await pageNeuve(page);
    await envoyer(page, 'Comment récupérer après une grosse séance ?');
    await expect(lignes(page)).toHaveCount(2);
    expect(externes).toEqual([]);
  });
});

test.describe('CP3 — le mode dégradé', () => {
  test('sans clé, la réponse vient des règles et le mode dégradé est visible', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    await envoyer(page, 'Comment progresser en course à pied ?');

    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(1)).toContainText(replyTo('Comment progresser en course à pied ?'));
    await expect(mode(page)).toBeVisible();
    await expect(mode(page)).not.toHaveText(/^\s*$/);
    expect(erreurs).toHaveLength(0);
  });

  test('le mode dégradé s’affiche à part, jamais comme une ligne de la conversation', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'Comment progresser en course à pied ?');

    await expect(lignes(page)).toHaveCount(2);
    await expect(page.locator('#messages #mode')).toHaveCount(0);
    await expect(page.locator('#status')).toHaveText('');
  });

  test('un message que les règles connaissent n’affiche pas le mode dégradé', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(1)).toContainText(replyTo('salut'));
    await expect(mode(page)).toBeHidden();
  });

  test('le mode dégradé disparaît quand la conversation est effacée', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'Comment progresser en course à pied ?');
    await expect(mode(page)).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.locator('#effacer').click();
    await expect(lignes(page)).toHaveCount(0);
    await expect(mode(page)).toBeHidden();
  });

  test('la page reste utilisable si la route tombe en panne', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    // La route renvoie une erreur : la page se replie elle-même sur ses règles.
    await page.route('**/api/chat', (route) => route.fulfill({ status: 500, body: 'panne' }));

    await envoyer(page, 'Comment progresser en course à pied ?');
    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(1)).toContainText(replyTo('Comment progresser en course à pied ?'));
    await expect(mode(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /envoyer/i })).toBeEnabled();
    expect(erreurs).toHaveLength(0);
  });
});
