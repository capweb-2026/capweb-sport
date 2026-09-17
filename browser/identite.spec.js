import { test, expect } from '@playwright/test';
import { persona } from '../public/js/persona.js';
import { replyTo } from '../public/js/brain.js';
/* global localStorage -- callbacks exécutés dans la page */

// Identité de Coach Sprint : SPEC.md, critères 1 à 5, dans un vrai navigateur.
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

const segmenteur = new Intl.Segmenter('fr', { granularity: 'grapheme' });
const compterEmojis = (texte) =>
  [...segmenteur.segment(texte)].filter(({ segment }) => /\p{Extended_Pictographic}/u.test(segment)).length;

test.describe('Identité — critères 1 et 2 : nom et emoji', () => {
  test('le h1 et le titre affichent le nom', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    await expect(page.locator('h1')).toContainText(persona.nom);
    expect(await page.title()).toContain(persona.nom);
    expect(erreurs).toHaveLength(0);
  });

  test('le h1 affiche un seul emoji, celui de la persona', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    const h1 = page.locator('h1');
    await expect(h1).toContainText(persona.emoji);
    expect(compterEmojis(await h1.innerText())).toBe(1);
    expect(erreurs).toHaveLength(0);
  });
});

test.describe('Identité — critère 3 : accueil', () => {
  test('visible sur une conversation vide, hors de #messages et du formulaire', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    const accueil = page.locator('#accueil');
    await expect(accueil).toBeVisible();
    await expect(accueil).toContainText(persona.nom);
    await expect(page.locator('#messages #accueil')).toHaveCount(0);
    await expect(page.locator('#chat-form #accueil')).toHaveCount(0);
    await expect(lignes(page)).toHaveCount(0);
    expect(erreurs).toHaveLength(0);
  });

  test('disparaît au premier message, reste caché au rechargement, revient après Effacer', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    const accueil = page.locator('#accueil');
    await expect(accueil).toBeVisible();

    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    await expect(accueil).toBeHidden();

    await page.reload();
    await expect(lignes(page)).toHaveCount(2);
    await expect(accueil).toHaveCount(1);
    await expect(accueil).toBeHidden();

    page.once('dialog', (d) => d.accept());
    await page.locator('#effacer').click();
    await expect(lignes(page)).toHaveCount(0);
    await expect(accueil).toBeVisible();
    expect(erreurs).toHaveLength(0);
  });

  test('reste caché si la confirmation d’Effacer est refusée', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    const accueil = page.locator('#accueil');
    await expect(accueil).toHaveCount(1);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);

    page.once('dialog', (d) => d.dismiss());
    await page.locator('#effacer').click();
    await expect(lignes(page)).toHaveCount(2);
    await expect(accueil).toBeHidden();
    expect(erreurs).toHaveLength(0);
  });
});

test.describe('Identité — critère 4 : suggestions', () => {
  test('trois boutons non vides, hors de #messages et du formulaire', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    const boutons = page.locator('#suggestions button');
    await expect(boutons).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(boutons.nth(i)).toHaveAttribute('type', 'button');
      await expect(boutons.nth(i)).toHaveText(persona.suggestions[i]);
      await expect(boutons.nth(i)).not.toHaveText(/^\s*$/);
    }
    await expect(page.locator('#messages #suggestions')).toHaveCount(0);
    await expect(page.locator('#chat-form #suggestions')).toHaveCount(0);
    expect(erreurs).toHaveLength(0);
  });

  test('cliquer place le texte dans #message sans l’envoyer', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    const boutons = page.locator('#suggestions button');
    await expect(boutons).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await boutons.nth(i).click();
      await expect(page.locator('#message')).toHaveValue(persona.suggestions[i]);
      await expect(lignes(page)).toHaveCount(0);
    }
    expect(await memoire(page)).toBeNull();
    expect(erreurs).toHaveLength(0);
  });
});

test.describe('Identité — critère 5 : réponses signées', () => {
  test('la réponse commence par le nom, le message par « Vous »', async ({ page }) => {
    const erreurs = surveiller(page);
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    await expect(lignes(page).nth(0)).toHaveText(/^Vous/);
    await expect(lignes(page).nth(1)).toHaveText(new RegExp(`^${persona.nom}`));
    await expect(lignes(page).nth(1)).not.toContainText('Cap Web');
    await expect(lignes(page).nth(1)).toContainText(replyTo('salut'));
    expect(erreurs).toHaveLength(0);
  });

  test('la mémoire garde { role, text } sans préfixe', async ({ page }) => {
    await pageNeuve(page);
    await envoyer(page, 'salut');
    await expect(lignes(page)).toHaveCount(2);
    expect(JSON.parse(await memoire(page))).toEqual([
      { role: 'user', text: 'salut' },
      { role: 'assistant', text: replyTo('salut') }
    ]);
  });
});
