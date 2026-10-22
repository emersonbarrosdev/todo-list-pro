import { test, expect } from '@playwright/test';

test.describe('TODO PRO End-to-End Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.evaluate(() => localStorage.clear());
  });

  test('should complete end-to-end user workflow: login, create, edit, priority, complete, filter, remove', async ({ page }) => {
    // 1. Visit Auth page
    await page.goto('/auth');
    await expect(page.locator('.brand-title')).toContainText('TODO PRO');

    // 2. Submit test email
    const emailInput = page.locator('#email-input');
    await emailInput.fill('developer@todopro.com');
    await page.locator('#btn-continue').click();

    // 3. Enter 6-digit OTP
    const firstDigit = page.locator('.otp-digit').first();
    await expect(firstDigit).toBeVisible({ timeout: 10000 });
    await firstDigit.fill('1');
    await page.locator('.otp-digit').nth(1).fill('2');
    await page.locator('.otp-digit').nth(2).fill('3');
    await page.locator('.otp-digit').nth(3).fill('4');
    await page.locator('.otp-digit').nth(4).fill('5');
    await page.locator('.otp-digit').nth(5).fill('6');

    // Wait for tasks view to load
    await expect(page.locator('.workspace-header')).toBeVisible({ timeout: 15000 });

    // 4. Handle onboarding modal if displayed
    const onboardingCard = page.locator('.onboarding-card');
    if (await onboardingCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.locator('.mode-card').first().click();
    }

    // 5. Open New Task modal
    await page.locator('#btn-new-task').click();
    const detailsSheet = page.locator('.details-sheet');
    await expect(detailsSheet).toBeVisible();

    // Fill title
    const titleInput = page.locator('#task-detail-title');
    await titleInput.fill('Implementar suíte E2E automatizada');

    // Click explicit Criar tarefa button
    await page.locator('#btn-save-task').click();
    await expect(detailsSheet).toBeHidden({ timeout: 5000 });

    // Verify task row appears in list
    const taskRow = page.locator('.task-row').first();
    await expect(taskRow).toBeVisible();
    await expect(taskRow.locator('.task-title')).toContainText('Implementar suíte E2E automatizada');

    // 6. Open task details sheet for editing
    await taskRow.click();
    await expect(detailsSheet).toBeVisible();

    // 7. Edit description with markdown
    const descTextarea = page.locator('.description-textarea');
    await descTextarea.fill('Esta é uma **descrição importante** da tarefa com checklist.');

    // 8. Change priority to High via pill button
    await page.locator('.pill-btn', { hasText: 'Alta' }).click();

    // Verify button is dirty and click Salvar
    const saveBtn = page.locator('#btn-save-task');
    await expect(saveBtn).toHaveClass(/dirty/);
    await saveBtn.click();

    // Verify saved state
    await expect(saveBtn).toContainText('Salvo');

    // Close details panel
    await page.locator('.btn-close').click();
    await expect(detailsSheet).toBeHidden();

    // Verify badge on task row reflects High priority
    await expect(taskRow.locator('.badge-high')).toBeVisible();

    // 9. Change status to Done
    await taskRow.click();
    await expect(detailsSheet).toBeVisible();
    await page.locator('.pill-btn', { hasText: 'Concluída' }).click();
    await saveBtn.click();
    await expect(saveBtn).toContainText('Salvo');
    await page.locator('.btn-close').click();

    // 10. Test filters (pure client-side)
    // Filter "A fazer" should hide the completed task
    await page.locator('.filter-pill', { hasText: 'A fazer' }).click();
    await expect(page.locator('.task-row')).toHaveCount(0);

    // Filter "Concluídas" should show the completed task
    await page.locator('.filter-pill', { hasText: 'Concluídas' }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);

    // Return to "Todas"
    await page.locator('.filter-pill', { hasText: 'Todas' }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);

    // 11. Remove task with dialog confirmation
    page.on('dialog', (dialog) => dialog.accept());
    const deleteBtn = page.locator('.btn-delete').first();
    await deleteBtn.click();

    await expect(page.locator('.task-row')).toHaveCount(0);
  });

  test('should support keyboard shortcuts N, Ctrl+K, and Esc', async ({ page }) => {
    await page.goto('/auth');
    await page.evaluate(() => {
      const mockUser = { id: 'mock-user-shortcuts', email: 'shortcuts@todopro.com' };
      localStorage.setItem('todo_pro_clerk_mock_user', JSON.stringify(mockUser));
      localStorage.setItem('onboarding_done_mock-user-shortcuts', 'true');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.workspace-header')).toBeVisible({ timeout: 15000 });

    // Press 'N' to open new task sheet
    await page.keyboard.press('n');
    await expect(page.locator('.details-sheet')).toBeVisible();

    // Press 'Esc' to close sheet
    await page.keyboard.press('Escape');
    await expect(page.locator('.details-sheet')).toBeHidden();

    // Press 'Control+K' to focus search input
    await page.keyboard.press('Control+k');
    await expect(page.locator('#header-search-input')).toBeFocused();
  });
});
