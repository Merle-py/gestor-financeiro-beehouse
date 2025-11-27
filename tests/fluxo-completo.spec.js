import { test, expect } from '@playwright/test';

test.describe('Gestor Financeiro - Testes de Sistema e Integração Bitrix', () => {

  // CONFIGURAÇÃO INICIAL (MOCKS)
  // Simulamos o banco de dados para não precisar de um banco real rodando
  test.beforeEach(async ({ page }) => {
    
    // 1. Simula Fornecedores
    await page.route('**/rest/v1/suppliers*', async route => {
      await route.fulfill({ json: [{ id: 'uuid-1', name: 'Coelba', type: 'Serviço' }] });
    });

    // 2. Simula Categorias
    await page.route('**/rest/v1/categories*', async route => {
      await route.fulfill({ json: [{ id: 'uuid-2', name: 'Energia', description: 'Luz' }] });
    });

    // 3. Simula Transações (Inicia vazio)
    await page.route('**/rest/v1/transactions*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
      } else { // POST, DELETE, PATCH
        await route.fulfill({ status: 201, json: { success: true } });
      }
    });

    // 4. Simula Recorrências
    await page.route('**/rest/v1/recurring_expenses*', async route => {
      await route.fulfill({ json: [{ id: 'uuid-3', description: 'Aluguel Bitrix', amount: 2000, day_of_month: 5, active: true }] });
    });

    // 5. MOCK CRUCIAL: API DE NOTIFICAÇÃO BITRIX (/api/cron)
    // Interceptamos a chamada para confirmar se o sistema tentou enviar a mensagem
    await page.route('**/api/cron', async route => {
      console.log('🔶 [TESTE] O Sistema tentou enviar a notificação para o Bitrix!');
      await route.fulfill({ 
        status: 200, 
        json: { success: true, message: 'Notificação enviada ao Bitrix (Simulado)' } 
      });
    });
  });

  // --- TESTES ---

  test('1. Deve carregar o Dashboard corretamente', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.getByRole('heading', { name: /visão geral/i })).toBeVisible();
    await expect(page.getByText('TOTAL A PAGAR')).toBeVisible();
  });

  test('2. Deve criar um Lançamento e salvar no banco', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Lançamentos' }).click();
    
    await page.getByRole('button', { name: 'Novo' }).click();
    await expect(page.getByRole('heading', { name: 'Novo Registro' })).toBeVisible();

    // Preenchimento
    await page.locator('input[value=""]').first().fill('Teste Bitrix');
    await page.locator('input[type="number"]').first().fill('100.00');
    await page.locator('input[type="date"]').fill('2025-12-10');
    
    // Seleção de Dropdowns
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Coelba' }); 
    await selects.nth(1).selectOption({ label: 'Energia' }); 

    // Intercepta a requisição de salvamento
    const saveRequest = page.waitForRequest(req => req.url().includes('/transactions') && req.method() === 'POST');
    await page.getByRole('button', { name: 'Salvar Registro' }).click();
    
    const request = await saveRequest;
    // Valida se enviou os dados corretos
    expect(request.postDataJSON()).toMatchObject({ description: 'Teste Bitrix', amount: 100 });
  });

  test('3. Deve acionar a NOTIFICAÇÃO DO BITRIX ao Sincronizar', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Vai para Recorrências
    await page.getByRole('button', { name: 'Recorrências' }).click();
    
    // Prepara para aceitar o alerta do navegador ("Sistema Sincronizado")
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Sincronizado');
      await dialog.accept();
    });

    // Monitora se a rota /api/cron foi chamada
    const bitrixRequestPromise = page.waitForRequest(req => req.url().includes('/api/cron'));
    
    // Clica no botão
    await page.getByRole('button', { name: /sincronizar/i }).click();
    
    // Se essa promessa resolver, significa que o botão funcionou e chamou a API
    const request = await bitrixRequestPromise;
    expect(request).toBeTruthy();
    console.log('✅ Sucesso: O botão Sincronizar acionou a rota de notificação.');
  });

  test('4. Deve visualizar o Kanban e suas colunas', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Lançamentos' }).click();

    // Alterna para Kanban
    const btnKanban = page.locator('button').filter({ has: page.locator('svg.lucide-kanban') });
    await btnKanban.click();

    // Verifica se as colunas temporais específicas apareceram
    await expect(page.getByText('VENCIDOS')).toBeVisible();
    await expect(page.getByText('7 DIAS')).toBeVisible();
    await expect(page.getByText('16-30 DIAS')).toBeVisible();
  });

});