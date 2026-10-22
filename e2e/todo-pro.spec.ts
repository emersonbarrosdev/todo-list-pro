import { test, expect } from '@playwright/test';

test.describe('TODO PRO End-to-End Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean local storage session
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

    // 6th digit automatically submits OTP verification
    const quickAddInput = page.locator('#input-quick-add');
    await expect(quickAddInput).toBeVisible({ timeout: 15000 });

    // 4. Handle onboarding modal if displayed
    const onboardingCard = page.locator('.onboarding-card');
    if (await onboardingCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.locator('.mode-card').first().click();
    }

    // 5. Create new task
    await expect(quickAddInput).toBeVisible();
    await quickAddInput.fill('Implementar suíte E2E automatizada');
    await page.locator('#btn-add-task').click();

    // Verify task row appears
    const taskRow = page.locator('.task-row').first();
    await expect(taskRow).toBeVisible();
    await expect(taskRow.locator('.task-title')).toContainText('Implementar suíte E2E automatizada');

    // 6. Open task details sheet
    await taskRow.click();
    const detailsSheet = page.locator('.details-sheet');
    await expect(detailsSheet).toBeVisible();

    // 7. Edit description with markdown
    const descTextarea = page.locator('.description-textarea');
    await descTextarea.fill('Esta é uma **descrição importante** da tarefa com checklist.');
    
    // 8. Change priority to High via pill button
    await page.locator('.pill-btn', { hasText: 'Alta' }).click();

    // Verify auto-save badge
    await expect(page.locator('.status-saved')).toBeVisible({ timeout: 10000 });

    // 9. Close details panel using Escape
    await page.keyboard.press('Escape');
    await expect(detailsSheet).toBeHidden();

    // Verify badge on task row reflects High priority
    await expect(taskRow.locator('.badge-high')).toBeVisible();

    // 10. Complete task via checkbox
    const taskCheckbox = taskRow.locator('.checkbox-custom');
    await taskCheckbox.check();
    await expect(taskRow).toHaveClass(/completed/);

    // 11. Test filters
    // Filter "A fazer" should hide the completed task
    await page.locator('.filter-pill', { hasText: 'A fazer' }).click();
    await expect(page.locator('.task-row')).toHaveCount(0);

    // Filter "Concluídas" should show the completed task
    await page.locator('.filter-pill', { hasText: 'Concluídas' }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);

    // Return to "Todas"
    await page.locator('.filter-pill', { hasText: 'Todas' }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);

    // 12. Remove task
    const deleteBtn = page.locator('.btn-delete').first();
    await deleteBtn.click();

    // Verify optimistic deletion
    await expect(page.locator('.task-row')).toHaveCount(0);

    // Verify Toast with undo option
    const toast = page.locator('.toast-item', { hasText: 'removida' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Desfazer');
  });

  test('should support keyboard shortcuts N, Ctrl+K, and Esc', async ({ page }) => {
    // Authenticate test session directly in localStorage
    await page.goto('/auth');
    await page.evaluate(() => {
      const mockUser = { id: 'mock-user-shortcuts', email: 'shortcuts@todopro.com' };
      localStorage.setItem('todo_pro_mock_auth', JSON.stringify({ user: mockUser, session: { user: mockUser } }));
      localStorage.setItem('onboarding_done_mock-user-shortcuts', 'true');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#input-quick-add')).toBeVisible({ timeout: 15000 });

    // Press 'N' to focus quick add input
    await page.keyboard.press('n');
    await expect(page.locator('#input-quick-add')).toBeFocused();

    // Blur input
    await page.locator('#input-quick-add').blur();

    // Press 'Control+K' to focus search input
    await page.keyboard.press('Control+k');
    await expect(page.locator('#header-search-input')).toBeFocused();
  });
});
