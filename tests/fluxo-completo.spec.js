import { test, expect } from '@playwright/test';

test.describe('Gestor Financeiro - Suite de Testes Completa', () => {

  // --- MOCKS GLOBAIS (Simulação do Backend) ---
  test.beforeEach(async ({ page }) => {

    // 1. Simula tabelas auxiliares
    await page.route('**/rest/v1/suppliers*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [{ id: 1, name: 'Fornecedor Teste', type: 'Parceiro' }] });
      } else { await route.fulfill({ status: 201 }); }
    });

    await page.route('**/rest/v1/categories*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [{ id: 1, name: 'Despesas Gerais', description: 'Geral' }] });
      } else { await route.fulfill({ status: 201 }); }
    });

    // 2. Simula Transações (GET retorna lista vazia inicialmente, POST retorna sucesso)
    await page.route('**/rest/v1/transactions*', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        // Retorna uma transação fictícia para testar visualização
        await route.fulfill({
          json: [{
            id: 999,
            description: 'Conta de Luz',
            amount: 150.00,
            due_date: '2025-12-10',
            status: 'Aberto',
            type: 'despesa',
            suppliers: { name: 'Coelba' },
            categories: { name: 'Energia' }
          }]
        });
      } else {
        await route.fulfill({ status: 201, json: { id: 1000, success: true } });
      }
    });

    // 3. Simula Vendas
    await page.route('**/rest/v1/sales*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: [{
            id: 50,
            client_name: 'Cliente Teste',
            property_info: 'Apto 101',
            total_value: 500000,
            agency_fee_percent: 6,
            broker_commission_percent: 30,
            suppliers: { name: 'Corretor João' }
          }]
        });
      } else {
        await route.fulfill({ status: 201 });
      }
    });

    // 4. Simula Recorrências
    await page.route('**/rest/v1/recurring_expenses*', async route => {
      await route.fulfill({ json: [] });
    });

    // 5. Simula API de Notificação (Cron)
    await page.route('**/api/cron', async route => {
      await route.fulfill({ json: { success: true } });
    });

    // 6. Simula API de Notificação por mensagem
    await page.route('**/api/notify', async route => {
      await route.fulfill({ json: { success: true } });
    });
  });

  // --- TESTES DE UI E NAVEGAÇÃO ---

  test('1. Deve carregar a Dashboard e exibir os KPIs e Gráficos', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Verifica elementos visuais principais
    await expect(page.getByRole('heading', { name: 'Visão Geral' })).toBeVisible();
    await expect(page.getByText('VGC Total')).toBeVisible(); // KPI Card
    await expect(page.getByText('Entradas e Saídas (Volume)')).toBeVisible(); // Gráfico
  });

  test('2. Deve navegar entre todas as abas do sistema', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.getByRole('button', { name: 'Vendas & Comissões' }).click();
    await expect(page.getByRole('heading', { name: 'Vendas & Comissões' })).toBeVisible();

    await page.getByRole('button', { name: 'Lançamentos' }).click();
    await expect(page.getByRole('heading', { name: 'Lançamentos' })).toBeVisible();

    await page.getByRole('button', { name: 'Entidades' }).click();
    await expect(page.getByRole('heading', { name: 'Entidades' })).toBeVisible();
  });

  // --- TESTES DE LANÇAMENTOS (TRANSACTIONS) ---

  test('3. Deve criar um novo Lançamento de Despesa', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Lançamentos' }).click();

    await page.getByRole('button', { name: 'Lançamento', exact: true }).click();
    await expect(page.getByText('Novo Registro')).toBeVisible();

    // Preenche o formulário
    // Nota: Usamos seletores específicos baseados no placeholder ou label implícito
    await page.locator('input').nth(2).fill('Compra de Material'); // Descrição (3º input global devido aos filtros)
    await page.locator('input[type="number"]').first().fill('500');

    // Monitora a requisição POST para garantir que os dados estão indo corretamente
    const requestPromise = page.waitForRequest(request =>
      request.url().includes('/transactions') &&
      request.method() === 'POST' &&
      request.postDataJSON().amount === 500
    );

    await page.getByRole('button', { name: 'Salvar Registro' }).click();

    const request = await requestPromise;
    expect(request).toBeTruthy();
  });

  test('4. Deve alternar visualização entre Lista e Kanban', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Lançamentos' }).click();

    // O padrão é Kanban, verifica se colunas existem
    await expect(page.getByText('A VENCER')).toBeVisible();
    await expect(page.getByText('VENCENDO HOJE')).toBeVisible();

    // Clica no botão de lista (primeiro botão dentro do container de toggle)
    await page.locator('.bg-white.border.rounded-xl button').first().click();

    // Verifica se a tabela apareceu
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Descrição' })).toBeVisible();
  });

  test('5. Deve lidar com popup de confirmação ao "Pagar"', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Lançamentos' }).click();

    // Modo Lista para facilitar clique
    await page.locator('.bg-white.border.rounded-xl button').first().click();

    // Configura o listener para aceitar o "window.confirm"
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Deseja marcar este lançamento como PAGO');
      await dialog.accept();
    });

    // Monitora o PATCH
    const patchPromise = page.waitForRequest(req => req.method() === 'PATCH' && req.url().includes('/transactions'));

    // Clica no check de pagar da primeira linha
    await page.locator('button[title="Pagar"]').first().click();

    await patchPromise;
  });

  // --- TESTES DE VENDAS E LÓGICA DE NEGÓCIO ---

  test('6. Deve criar uma Venda e verificar payload', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Vendas & Comissões' }).click();

    await page.getByRole('button', { name: 'Nova Venda' }).click();

    await page.locator('input[placeholder="Nome do Cliente"]').fill('Maria Silva');
    await page.locator('input[placeholder*="Imóvel"]').fill('Casa Centro');
    await page.locator('input[placeholder="Valor Venda"]').fill('1000000'); // 1 milhão

    const savePromise = page.waitForRequest(req =>
      req.url().includes('/sales') &&
      req.method() === 'POST' &&
      req.postDataJSON().client_name === 'Maria Silva'
    );

    await page.getByRole('button', { name: 'Salvar Registro' }).click();
    await savePromise;
  });

  test('7. Deve lançar parcela e gerar Comissão/Imposto Automaticamente', async ({ page }) => {
    // Este teste é crucial: verifica a "inteligência" do sistema
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Vendas & Comissões' }).click();

    // Clica em "Lançar Recebimento" no card da venda mockada
    await page.getByRole('button', { name: 'Lançar Recebimento' }).first().click();

    await page.locator('input[placeholder*="Valor Recebido"]').fill('10000');
    await page.locator('input[placeholder*="Imposto"]').fill('10'); // 10%

    // Ao salvar, o sistema deve fazer 3 inserts na tabela transactions:
    // 1. Receita (Entrada)
    // 2. Despesa (Imposto)
    // 3. Despesa (Comissão)

    // Vamos capturar todas as requisições
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/transactions') && req.method() === 'POST') {
        requests.push(req.postDataJSON());
      }
    });

    await page.getByRole('button', { name: 'Salvar Registro' }).click();

    // Espera um pouco para as requisições acontecerem
    await page.waitForTimeout(1000);

    // Validações
    const receita = requests.find(r => r.type === 'receita');
    const imposto = requests.find(r => r.description.includes('Imposto'));
    const comissao = requests.find(r => r.description.includes('Comissão'));

    expect(receita).toBeTruthy();
    expect(receita.amount).toBe(10000); // Valor cheio

    expect(imposto).toBeTruthy();
    expect(imposto.amount).toBe(1000); // 10% de 10.000

    expect(comissao).toBeTruthy();
    // A comissão é calculada sobre o líquido (10000 - 1000 = 9000). 
    // No mock da venda, comissão do corretor é 30%. 30% de 9000 = 2700.
    expect(comissao.amount).toBe(2700);
  });

  // --- TESTES DE ENTIDADES (FORNECEDORES) ---

  test('8. Deve cadastrar uma nova Entidade (Fornecedor)', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Entidades' }).click();

    await page.getByRole('button', { name: 'Novo' }).click();

    await page.locator('input[placeholder="Nome"]').fill('Novo Fornecedor Playwright');

    const reqPromise = page.waitForRequest(req =>
      req.url().includes('/suppliers') &&
      req.method() === 'POST'
    );

    await page.getByRole('button', { name: 'Salvar Registro' }).click();
    await reqPromise;
  });

});