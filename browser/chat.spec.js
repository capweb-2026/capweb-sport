import { test, expect } from '@playwright/test';
/* global localStorage -- callbacks exécutés dans la page */

// Défi TP13 8 : taper « salut », envoyer, vérifier deux messages.
test('taper « salut » et envoyer affiche deux messages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('#message').fill('salut');
  await page.getByRole('button', { name: /envoyer/i }).click();

  const lignes = page.locator('#messages li');
  await expect(lignes).toHaveCount(2);
  await expect(lignes.nth(0)).toHaveText('Vous: salut');
  await expect(lignes.nth(1)).toHaveText(/^Coach Sprint: /);
});
