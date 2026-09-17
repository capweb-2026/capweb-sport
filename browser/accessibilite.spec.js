import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
/* global localStorage -- callbacks exécutés dans la page */

// Défi TP13 9 : axe ne doit trouver aucune violation, dans les deux thèmes.
async function violations(page) {
  const resultats = await new AxeBuilder({ page }).analyze();
  return resultats.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const theme of ['light', 'dark']) {
  test.describe(`Accessibilité — thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    });

    test('page d’accueil sans violation', async ({ page }) => {
      await expect(page.locator('#suggestions button')).toHaveCount(3);
      expect(await violations(page)).toEqual([]);
    });

    test('conversation en cours et terminée sans violation', async ({ page }) => {
      await page.locator('#message').fill('un **très** bon /aide');
      await page.getByRole('button', { name: /envoyer/i }).click();
      await expect(page.locator('#status')).not.toHaveText('');
      expect(await violations(page)).toEqual([]);

      await expect(page.locator('#messages li')).toHaveCount(2);
      expect(await violations(page)).toEqual([]);
    });
  });
}
