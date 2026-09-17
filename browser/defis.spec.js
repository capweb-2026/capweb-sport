import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { persona } from '../public/js/persona.js';
import { replyTo } from '../public/js/brain.js';
/* global localStorage -- callbacks exécutés dans la page */

// Défis TP13 1, 4, 5, 6 et 7, vérifiés dans un vrai navigateur.
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
const memoire = (page) => page.evaluate(() => localStorage.getItem('capweb.historique'));
const boutonEnvoyer = (page) => page.getByRole('button', { name: /envoyer/i });

test.describe('Défi 4 — Coach Sprint réfléchit', () => {
  test('la réponse arrive après un délai, bouton désactivé et statut visible', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    await envoyer(page, 'salut');

    await expect(lignes(page)).toHaveCount(1);
    await expect(boutonEnvoyer(page)).toBeDisabled();
    await expect(page.locator('#status')).toHaveText(`${persona.nom} écrit…`);

    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(1)).toContainText(replyTo('salut'));
    await expect(boutonEnvoyer(page)).toBeEnabled();
    await expect(page.locator('#status')).toHaveText('');
    expect(erreurs).toHaveLength(0);
  });

  test('un second envoi pendant l’attente est ignoré et garde le texte saisi', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await page.locator('#message').fill('aide');
    // Envoi sans passer par le bouton désactivé.
    await page.locator('#chat-form').evaluate((f) => f.requestSubmit());

    await expect(lignes(page)).toHaveCount(2);
    await page.waitForTimeout(1500);
    await expect(lignes(page)).toHaveCount(2);
    await expect(page.locator('#message')).toHaveValue('aide');
  });

  test('Effacer pendant l’attente annule la réponse', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    page.once('dialog', (d) => d.accept());
    await page.locator('#effacer').click();

    await page.waitForTimeout(1500);
    await expect(lignes(page)).toHaveCount(0);
    expect(await memoire(page)).toBeNull();
    await expect(boutonEnvoyer(page)).toBeEnabled();
    await expect(page.locator('#status')).toHaveText('');
  });
});

test.describe('Défi 1 — commandes dans la page', () => {
  test('/aide affiche la liste des commandes', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, '/aide');
    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(1)).toContainText('/effacer');
  });

  test('/compte donne le nombre de messages déjà échangés', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    await envoyer(page, '/compte');
    await expect(lignes(page)).toHaveCount(4);
    await expect(lignes(page).nth(3)).toContainText('2 messages');
  });

  test('/effacer vide la conversation après confirmation', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    page.once('dialog', (d) => d.accept());
    await envoyer(page, '/effacer');
    await expect(lignes(page)).toHaveCount(0);
    await expect(page.locator('#message')).toHaveValue('');
    expect(await memoire(page)).toBeNull();
    await expect(page.locator('#accueil')).toBeVisible();
  });

  test('/effacer refusé garde la conversation', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    page.once('dialog', (d) => d.dismiss());
    await envoyer(page, '/effacer');
    await expect(lignes(page)).toHaveCount(2);
  });
});

test.describe('Défi 5 — thème sombre', () => {
  const fond = (page) => page.locator('body').evaluate((b) => b.ownerDocument.defaultView.getComputedStyle(b).backgroundColor);

  test('suit prefers-color-scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await pageNeuve(page);
    const sombre = await fond(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => fond(page)).toBe('rgb(255, 255, 255)');
    expect(sombre).not.toBe('rgb(255, 255, 255)');
  });

  test('le bouton change le thème et mémorise le choix', async ({ page }) => {
    const erreurs = surveiller(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await pageNeuve(page);
    await expect.poll(() => fond(page)).toBe('rgb(255, 255, 255)');

    await page.locator('#theme').click();
    await expect.poll(() => fond(page)).not.toBe('rgb(255, 255, 255)');
    expect(await page.evaluate(() => localStorage.getItem('capweb.theme'))).toBe('dark');

    await page.reload();
    await expect.poll(() => fond(page)).not.toBe('rgb(255, 255, 255)');

    await page.locator('#theme').click();
    await expect.poll(() => fond(page)).toBe('rgb(255, 255, 255)');
    expect(await page.evaluate(() => localStorage.getItem('capweb.theme'))).toBe('light');
    expect(erreurs).toHaveLength(0);
  });

  test('le choix mémorisé l’emporte sur le système', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await pageNeuve(page);
    await page.evaluate(() => localStorage.setItem('capweb.theme', 'light'));
    await page.reload();
    await expect.poll(() => fond(page)).toBe('rgb(255, 255, 255)');
  });
});

test.describe('Défi 6 — gras sans danger', () => {
  test('**très** s’affiche en gras, la mémoire garde le texte brut', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'un **très** bon conseil');
    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(0).locator('strong')).toHaveText('très');
    await expect(lignes(page).nth(0)).toHaveText('Vous: un très bon conseil');
    expect(JSON.parse(await memoire(page))[0]).toEqual({ role: 'user', text: 'un **très** bon conseil' });
  });

  test('le HTML entre étoiles reste du texte', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, '**<b>x</b>**');
    await expect(lignes(page)).toHaveCount(2);
    await expect(page.locator('#messages b')).toHaveCount(0);
    await expect(lignes(page).nth(0).locator('strong')).toHaveText('<b>x</b>');
  });
});

test.describe('Défi 7 — exporter', () => {
  test('télécharge la conversation en .txt', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);

    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exporter').click()
    ]);
    expect(telechargement.suggestedFilename()).toMatch(/\.txt$/);
    const contenu = await readFile(await telechargement.path(), 'utf8');
    expect(contenu).toBe(`Vous: salut\n${persona.nom}: ${replyTo('salut')}\n`);
  });

  test('une conversation vide ne télécharge rien et le dit', async ({ page }) => {
    await pageNeuve(page);
    let telecharge = false;
    page.on('download', () => { telecharge = true; });
    await page.locator('#exporter').click();
    await expect(page.locator('#status')).not.toHaveText(/^\s*$/);
    expect(telecharge).toBe(false);
  });
});
