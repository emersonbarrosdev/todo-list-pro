import { test, expect } from '@playwright/test';

test.describe('TODO PRO End-to-End Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.evaluate(() => localStorage.clear());
  });

  test('should complete end-to-end user workflow: login, project, create, edit, priority, complete, filter, remove', async ({ page }) => {
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

    // 4. Handle project onboarding modal if displayed
    const onboardingInput = page.locator('#initial-project-name');
    if (await onboardingInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await onboardingInput.fill('Projeto E2E Test');
      await page.locator('#btn-confirm-onboarding').click();
    }

    // 5. Open New Task modal via header
    await page.locator('#btn-header-new-task').click();
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

    // 7. Edit description
    const descTextarea = page.locator('.desc-textarea');
    await descTextarea.fill('Esta é uma **descrição importante** da tarefa simplificada.');

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

    // Verify priority tag on task row
    await expect(taskRow.locator('.priority-high')).toBeVisible();

    // 9. Change status to Done
    await taskRow.click();
    await expect(detailsSheet).toBeVisible();
    await page.locator('.pill-btn', { hasText: 'Concluído' }).click();
    await saveBtn.click();
    await expect(saveBtn).toContainText('Salvo');
    await page.locator('.btn-close').click();

    // 10. Test filters (pure client-side)
    // Filter "Backlog" should hide the completed task
    await page.locator('.filter-pill', { hasText: 'Backlog' }).click();
    await expect(page.locator('.task-row')).toHaveCount(0);

    // Filter "Concluídas" should show the completed task
    await page.locator('.filter-pill', { hasText: 'Concluídas' }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);

    // Return to "Todas"
    await page.locator('.filter-pill', { hasText: 'Todas' }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);

    // 11. Remove task via details sheet delete button
    await taskRow.click();
    await expect(detailsSheet).toBeVisible();
    await page.locator('.btn-delete').click();
    await expect(detailsSheet).toBeHidden();

    await expect(page.locator('.task-row')).toHaveCount(0);
  });

  test('should support keyboard shortcuts N, Ctrl+K, and Esc', async ({ page }) => {
    await page.goto('/auth');
    await page.evaluate(() => {
      const mockUser = { id: 'mock-user-shortcuts', email: 'shortcuts@todopro.com' };
      localStorage.setItem('todo_pro_clerk_mock_user', JSON.stringify(mockUser));
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
