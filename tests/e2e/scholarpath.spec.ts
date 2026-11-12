import { expect, test } from '@playwright/test';

test.describe('ScholarPath Complete User & Admin Journeys', () => {
  test('Journey 1: Guest search, multi-filter, and scholarship detail verification', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Your Global Education Journey Starts Here.' }),
    ).toBeVisible();

    // Use interactive hero search bar for Italy
    await page.locator('#hero-country').selectOption('IT');
    await page.locator('#hero-subject').fill('Computer');
    await page.locator('form[aria-label="Search scholarships"] button[type="submit"]').click();

    await expect(page).toHaveURL(/\/scholarships\?.*country=IT/);
    await expect(page.getByRole('heading', { name: 'Scholarship Discovery' })).toBeVisible();

    // Expand mobile filter panel when testing on mobile viewport
    const mobileFiltersBtn = page.getByRole('button', { name: /^Filters$/i });
    if (await mobileFiltersBtn.isVisible()) {
      await mobileFiltersBtn.click();
      await expect(page.getByText('Filter Scholarships')).toBeVisible();
    }

    // Apply simultaneous checkboxes
    await page.getByLabel('No application fee').check();
    await page.getByLabel('Official verified records only').check();

    // Navigate to Opera Universitaria di Trento detail page (0 EUR fee, IT, Computer Science)
    const trentoCard = page.getByTestId(
      'scholarship-card-opera-universitaria-trento-scholarship',
    );
    await expect(trentoCard).toBeVisible();
    await trentoCard.getByRole('link', { name: 'View Details' }).click();

    await expect(page).toHaveURL(/\/scholarships\/opera-universitaria-trento-scholarship/);
    await expect(
      page.getByRole('heading', { name: /Opera Universitaria di Trento Scholarship/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Official Application Portal/i })).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });

  test('Journey 2: 7-Step Student Onboarding & Transparent Eligibility Matcher', async ({
    page,
  }) => {
    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: 'Build Your Student Profile' })).toBeVisible();

    // Step 1
    await page.locator('#onb-country').fill('Nepal');
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Step 2: GPA
    await page.locator('#onb-gpa').fill('3.85');
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Step 3 -> Step 4 -> Step 5 -> Step 6 -> Step 7
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.getByRole('button', { name: /Next Step/i }).click();
    await page.locator('#onb-funding').selectOption('full_tuition_and_living');
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Confirm and save
    await page.getByRole('button', { name: /Save & View Matched Scholarships/i }).click();
    await expect(page).toHaveURL(/\/matcher/);
    await expect(
      page.getByRole('heading', { name: 'Scholarship Eligibility Matcher' }),
    ).toBeVisible();
    await expect(page.getByText(/Nepal • GPA 3\.85/i)).toBeVisible();
  });

  test('Journey 3: Bookmark scholarship & compare up to 4 universities side-by-side', async ({
    page,
  }) => {
    await page.goto('/scholarships?q=EDISU');
    const edisuCard = page.getByTestId('scholarship-card-edisu-piemonte-regional-scholarship');
    await expect(edisuCard).toBeVisible();

    // Toggle Save on EDISU Piemonte
    await edisuCard
      .getByRole('button', { name: /Save EDISU Piemonte|Remove EDISU Piemonte/i })
      .click();

    await page.goto('/saved');
    await expect(page.getByRole('heading', { name: /Saved Opportunities/i })).toBeVisible();
    await expect(page.getByText(/EDISU Piemonte Regional Scholarship/i)).toBeVisible();

    // Compare universities
    await page.goto('/compare/universities?ids=uni-padua,uni-trento,uni-polito');
    await expect(
      page.getByRole('heading', { name: 'Side-by-Side University Comparison' }),
    ).toBeVisible();
    const comparisonTable = page.getByRole('table');
    await expect(comparisonTable.getByRole('link', { name: /University of Padua/i })).toBeVisible();
    await expect(comparisonTable.getByRole('link', { name: /University of Trento/i })).toBeVisible();
    await expect(comparisonTable.getByRole('link', { name: /Politecnico di Torino/i })).toBeVisible();
  });

  test('Journey 4: Track Application, Checklist Tasks, Documents, Calculator & Calendar', async ({
    page,
  }) => {
    await page.goto('/scholarships/edisu-piemonte-regional-scholarship');
    await page.getByRole('button', { name: /Add to Tracker|View in Tracker/i }).click();

    await expect(page).toHaveURL(/\/applications/);
    await expect(page.getByText(/Personal planning tracker only/i)).toBeVisible();

    // Add preparation checklist task to first card
    const firstTaskInput = page
      .locator('input[placeholder*="Add preparation task"]')
      .first();
    await firstTaskInput.fill('Verify Embassy legalization slot');
    await page.getByRole('button', { name: 'Add Task' }).first().click();
    await expect(page.getByText('Verify Embassy legalization slot')).toBeVisible();

    // Check Documents page
    await page.goto('/documents');
    await expect(
      page.getByRole('heading', { name: 'Document Preparation Vault' }),
    ).toBeVisible();

    // Check Financial Calculator computes cleanly without NaN
    await page.goto('/calculator');
    await expect(
      page.getByRole('heading', { name: /Financial Planning & Funding Gap Calculator/i }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NaN');

    // Check Calendar page renders
    await page.goto('/calendar');
    await expect(
      page.getByRole('heading', { name: /Scholarship & Application Calendar/i }),
    ).toBeVisible();
  });

  test('Journey 5: Student blocked on /admin (403); Admin Sandbox publishes verified scholarship', async ({
    page,
  }) => {
    // Student defaults to role=student in demo mode -> 403 UI guard
    await page.goto('/admin');
    await expect(page.getByText(/403 — Administrator Access Required/i)).toBeVisible();

    // Switch to Admin Sandbox
    await page.getByRole('button', { name: 'Switch Account' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByRole('button', { name: 'Admin Sandbox' }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(
      page.getByRole('heading', { name: /Catalog Verification & Operations/i }),
    ).toBeVisible();

    // Publish new verified record
    await page.getByRole('button', { name: 'Add New Scholarship' }).click();
    await page
      .locator('input[placeholder*="Nordic Green Computing"]')
      .fill('E2E Nordic CS Grant 2027');
    await page
      .locator('input[placeholder*="Danish Ministry"]')
      .fill('Nordic E2E Foundation');
    await page
      .locator('textarea[placeholder*="Accurate factual description"]')
      .fill('Playwright E2E verified test scholarship covering bachelor tuition in Computer Science.');

    const urlInputs = page.locator('form input[type="url"]');
    await urlInputs.nth(0).fill('https://studyindenmark.dk/scholarships');
    await urlInputs.nth(1).fill('https://studyindenmark.dk/apply');
    await page
      .locator('input[placeholder="Official University Aid Page"]')
      .fill('Study in Denmark Official Portal');

    await page.getByRole('button', { name: /Save & Publish Record/i }).click();
    await expect(page.getByText('E2E Nordic CS Grant 2027')).toBeVisible();

    // Verify public discovery renders newly published scholarship
    await page.goto('/scholarships?q=Nordic%20CS%20Grant');
    await expect(page.getByText('E2E Nordic CS Grant 2027')).toBeVisible();
  });

  test('Journey 6: Responsive mobile navigation drawer & zero horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);

    // Open mobile navigation menu
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('link', { name: 'Scholarships' }).first()).toBeVisible();
  });

  test('Journey 7: Direct load & browser reload on nested routes preserve content', async ({
    page,
  }) => {
    await page.goto('/universities/politecnico-di-torino');
    await expect(
      page.getByRole('heading', { name: /Politecnico di Torino/i }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Politecnico di Torino/i }),
    ).toBeVisible();
  });
});
