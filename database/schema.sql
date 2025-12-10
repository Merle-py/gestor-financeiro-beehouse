-- =====================================================
-- GESTOR FINANCEIRO - BEEHOUSE INVESTIMENTOS IMOBILIÁRIOS
-- =====================================================
-- Script de Criação e Configuração do Banco de Dados
-- Execute este script no SQL Editor do Supabase
-- Versão: 2.0 | Data: Dezembro 2024
-- =====================================================

-- =====================================================
-- PARTE 1: LIMPEZA COMPLETA DO BANCO DE DADOS
-- =====================================================
-- Remove todas as tabelas existentes (cuidado: isso apaga todos os dados!)

DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Remove tipos personalizados se existirem
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS supplier_type CASCADE;

-- =====================================================
-- PARTE 2: CRIAÇÃO DAS TABELAS
-- =====================================================

-- Tabela de Entidades (Fornecedores/Favorecidos/Parceiros)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Outro',
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50), -- CPF ou CNPJ
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE suppliers IS 'Entidades: fornecedores, parceiros, corretores e clientes da Beehouse';
COMMENT ON COLUMN suppliers.type IS 'Tipos: Corretor, Empresa, Parceiro, Cliente, Outro';
COMMENT ON COLUMN suppliers.document IS 'CPF ou CNPJ da entidade';

-- Tabela de Categorias (Plano de Contas)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Plano de Contas: categorias de despesas da Beehouse';
COMMENT ON COLUMN categories.color IS 'Cor em formato hexadecimal para identificação visual';

-- Tabela de Transações (Pagamentos/Contas a Pagar)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    type VARCHAR(20) DEFAULT 'despesa',
    status VARCHAR(20) DEFAULT 'Aberto',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    recurring_rule_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL, -- Vínculo com regra de recorrência
    nf_number VARCHAR(100),
    nf_issue_date DATE,
    nf_received_date DATE, -- Data de pagamento efetivo
    fine_amount DECIMAL(15,2) DEFAULT 0, -- Valor da multa por atraso
    interest_amount DECIMAL(15,2) DEFAULT 0, -- Valor dos juros por atraso
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE transactions IS 'Transações: contas a pagar e pagamentos realizados';
COMMENT ON COLUMN transactions.status IS 'Status: Aberto, Pago, Vencido, Cancelado';
COMMENT ON COLUMN transactions.nf_received_date IS 'Data em que o pagamento foi efetivamente realizado';
COMMENT ON COLUMN transactions.fine_amount IS 'Valor da multa aplicada por atraso no pagamento';
COMMENT ON COLUMN transactions.interest_amount IS 'Valor dos juros aplicados por atraso no pagamento';

-- Tabela de Despesas Recorrentes (Fixas/Mensais)
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    last_generated_month VARCHAR(7), -- Formato: YYYY-MM
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE recurring_expenses IS 'Despesas fixas que se repetem mensalmente';
COMMENT ON COLUMN recurring_expenses.day_of_month IS 'Dia do mês em que a conta vence (1-31)';
COMMENT ON COLUMN recurring_expenses.last_generated_month IS 'Último mês em que foi gerada transação automática';

-- =====================================================
-- PARTE 3: ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_transactions_due_date ON transactions(due_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_supplier ON transactions(supplier_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_recurring ON transactions(recurring_rule_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_recurring_active ON recurring_expenses(active);
CREATE INDEX idx_suppliers_active ON suppliers(active);
CREATE INDEX idx_suppliers_type ON suppliers(type);
CREATE INDEX idx_categories_active ON categories(active);

-- =====================================================
-- PARTE 4: TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_updated_at
    BEFORE UPDATE ON recurring_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 5: PLANO DE CONTAS - BEEHOUSE INVESTIMENTOS IMOBILIÁRIOS
-- =====================================================
-- Categorias específicas para uma imobiliária/investidora

INSERT INTO categories (name, description, color) VALUES
    -- 💼 CUSTOS OPERACIONAIS
    ('Aluguel do Escritório', 'Aluguel mensal do espaço comercial', '#ef4444'),
    ('Condomínio', 'Taxa condominial do escritório', '#f97316'),
    ('IPTU', 'Imposto Predial e Territorial Urbano', '#f59e0b'),
    
    -- ⚡ UTILITIES
    ('Energia Elétrica', 'Conta de luz do escritório', '#eab308'),
    ('Água e Esgoto', 'Conta de água e saneamento', '#84cc16'),
    ('Internet e Telefonia', 'Serviços de comunicação e internet', '#22c55e'),
    ('Gás', 'Fornecimento de gás', '#10b981'),
    
    -- 💻 TECNOLOGIA E SOFTWARE
    ('Software e Assinaturas', 'CRM, gestão, ferramentas digitais', '#14b8a6'),
    ('Hospedagem e Domínios', 'Sites, servidores e domínios', '#06b6d4'),
    ('Equipamentos de TI', 'Computadores, impressoras, periféricos', '#0ea5e9'),
    
    -- 📣 MARKETING E PUBLICIDADE
    ('Marketing Digital', 'Google Ads, Meta Ads, campanhas online', '#3b82f6'),
    ('Produção de Conteúdo', 'Fotos, vídeos, tours virtuais', '#6366f1'),
    ('Material Impresso', 'Folders, cartões, placas', '#8b5cf6'),
    ('Portais Imobiliários', 'VivaReal, ZAP, OLX Imóveis', '#a855f7'),
    
    -- 👥 PESSOAL E RH
    ('Folha de Pagamento', 'Salários dos colaboradores', '#d946ef'),
    ('INSS e Encargos', 'Encargos trabalhistas e previdenciários', '#ec4899'),
    ('FGTS', 'Fundo de Garantia por Tempo de Serviço', '#f43f5e'),
    ('Vale Transporte', 'Benefício de transporte para funcionários', '#fb7185'),
    ('Vale Refeição/Alimentação', 'Benefício alimentício para funcionários', '#fda4af'),
    ('Plano de Saúde', 'Convênio médico dos colaboradores', '#fb923c'),
    
    -- 💰 IMPOSTOS E TAXAS
    ('Impostos Federais', 'IR, PIS, COFINS, CSLL', '#dc2626'),
    ('Impostos Estaduais', 'ICMS e outros tributos estaduais', '#ea580c'),
    ('Impostos Municipais', 'ISS e outros tributos municipais', '#ca8a04'),
    ('Taxas e Anuidades', 'CRECI, sindicatos, associações', '#65a30d'),
    
    -- 📋 SERVIÇOS PROFISSIONAIS
    ('Contabilidade', 'Honorários do escritório contábil', '#059669'),
    ('Advocacia', 'Consultoria e assessoria jurídica', '#0891b2'),
    ('Consultoria', 'Consultorias especializadas', '#0284c7'),
    ('Despachante/Cartório', 'Serviços cartorários e despachante', '#4f46e5'),
    
    -- 🏢 MANUTENÇÃO E ESTRUTURA
    ('Manutenção do Escritório', 'Reparos e manutenção predial', '#7c3aed'),
    ('Material de Escritório', 'Papelaria e suprimentos', '#9333ea'),
    ('Limpeza e Conservação', 'Serviços de limpeza', '#c026d3'),
    ('Segurança', 'Vigilância, alarmes, monitoramento', '#db2777'),
    
    -- 🚗 VEÍCULOS E DESLOCAMENTO
    ('Combustível', 'Gasolina, etanol, diesel', '#e11d48'),
    ('Estacionamento', 'Vagas e estacionamentos', '#be123c'),
    ('Manutenção de Veículos', 'Oficina, revisões, peças', '#9f1239'),
    ('IPVA e Licenciamento', 'Impostos e taxas veiculares', '#881337'),
    ('Uber/Táxi/99', 'Transporte por aplicativo', '#831843'),
    
    -- 🎁 REPRESENTAÇÃO E EVENTOS
    ('Eventos e Feiras', 'Participação em eventos do setor', '#86198f'),
    ('Brindes e Presentes', 'Itens promocionais para clientes', '#a21caf'),
    ('Confraternizações', 'Eventos internos da equipe', '#c026d3'),
    
    -- 💳 FINANCEIROS
    ('Tarifas Bancárias', 'Taxas e tarifas de contas', '#64748b'),
    ('Juros e Multas', 'Encargos por atraso', '#475569'),
    ('Empréstimos', 'Parcelas de financiamentos', '#334155'),
    
    -- 📦 OUTROS
    ('Investimentos em Imóveis', 'Aquisição de imóveis para carteira', '#1e293b'),
    ('Reformas e Melhorias', 'Reformas em imóveis da carteira', '#0f172a'),
    ('Despesas Diversas', 'Outras despesas não categorizadas', '#71717a');

-- =====================================================
-- PARTE 6: ENTIDADES PADRÃO - BEEHOUSE INVESTIMENTOS IMOBILIÁRIOS
-- =====================================================
-- Fornecedores e parceiros comuns de uma imobiliária

INSERT INTO suppliers (name, type, notes) VALUES
    -- 🏢 EMPRESAS DE SERVIÇOS PÚBLICOS
    ('CELESC', 'Empresa', 'Energia elétrica - Santa Catarina'),
    ('Casan', 'Empresa', 'Água e saneamento - Santa Catarina'),
    
    -- 💻 TECNOLOGIA E SOFTWARE
    ('Google', 'Empresa', 'Google Workspace, Ads, Cloud'),
    ('Meta/Facebook', 'Empresa', 'Facebook Ads, Instagram'),
    ('Microsoft', 'Empresa', 'Office 365, Azure'),
    ('Bitrix24', 'Empresa', 'CRM e gestão'),
    
    -- 🏠 PORTAIS IMOBILIÁRIOS
    ('Grupo ZAP (VivaReal/ZAP)', 'Empresa', 'Portal de anúncios imobiliários'),
    ('OLX', 'Empresa', 'Classificados online'),
    ('Imovelweb', 'Empresa', 'Portal de imóveis'),
    ('Chaves na Mão', 'Empresa', 'Portal de imóveis'),
    
    -- 📋 SERVIÇOS PROFISSIONAIS
    ('Contador', 'Parceiro', 'Escritório de contabilidade'),
    ('Advogado Imobiliário', 'Parceiro', 'Assessoria jurídica imobiliária'),
    ('Despachante', 'Parceiro', 'Serviços de despachante'),
    ('Cartório de Registro', 'Empresa', 'Registro de imóveis'),
    ('Cartório de Notas', 'Empresa', 'Reconhecimento de firma e escrituras'),
    
    -- 🎥 MARKETING E CONTEÚDO
    ('Fotógrafo', 'Parceiro', 'Fotografia de imóveis'),
    ('Videomaker', 'Parceiro', 'Vídeos e tours virtuais'),
    ('Designer Gráfico', 'Parceiro', 'Criação visual'),
    ('Agência de Marketing', 'Empresa', 'Gestão de marketing digital'),
    ('Gráfica', 'Empresa', 'Impressão de materiais'),
    
    -- 🏗️ MANUTENÇÃO E REFORMAS
    ('Eletricista', 'Parceiro', 'Serviços elétricos'),
    ('Encanador', 'Parceiro', 'Serviços hidráulicos'),
    ('Pintor', 'Parceiro', 'Pintura e acabamentos'),
    ('Pedreiro', 'Parceiro', 'Construção e reformas'),
    ('Marceneiro', 'Parceiro', 'Móveis e instalações'),
    ('Vidraceiro', 'Parceiro', 'Vidros e espelhos'),
    ('Serralheiro', 'Parceiro', 'Grades, portões, estruturas metálicas'),
    ('Empresa de Limpeza', 'Empresa', 'Limpeza profissional'),
    ('Jardineiro', 'Parceiro', 'Paisagismo e jardinagem'),
    
    -- 🚗 VEÍCULOS
    ('Posto de Combustível', 'Empresa', 'Abastecimento de veículos'),
    ('Oficina Mecânica', 'Empresa', 'Manutenção de veículos'),
    ('Seguradora', 'Empresa', 'Seguro de veículos e imóveis'),
    
    -- 💼 ASSOCIAÇÕES E SINDICATOS
    ('CRECI', 'Empresa', 'Conselho Regional de Corretores'),
    ('Sindicato dos Corretores', 'Empresa', 'SINDIMÓVEIS'),
    ('Associação Comercial', 'Empresa', 'ACIJ, ACIB, etc'),
    
    -- 🏦 FINANCEIRO
    ('Banco do Brasil', 'Empresa', 'Conta empresarial'),
    ('Caixa Econômica', 'Empresa', 'Conta e financiamentos'),
    ('Itaú', 'Empresa', 'Conta empresarial'),
    ('Bradesco', 'Empresa', 'Conta empresarial'),
    ('Santander', 'Empresa', 'Conta empresarial'),
    ('Nubank', 'Empresa', 'Conta digital'),
    ('Stone/Pagseguro', 'Empresa', 'Maquininha de cartão'),
    
    -- 👥 IMOBILIÁRIA INTERNA
    ('Beehouse Folha', 'Empresa', 'Pagamento de funcionários'),
    ('Proprietário do Escritório', 'Parceiro', 'Aluguel do espaço comercial');

-- =====================================================
-- PARTE 7: DESPESAS RECORRENTES DE EXEMPLO
-- =====================================================
-- Despesas fixas típicas de uma imobiliária (descomente para usar)

/*
INSERT INTO recurring_expenses (description, amount, day_of_month, supplier_id, category_id, active)
SELECT 
    'Aluguel do Escritório',
    3500.00,
    5,
    s.id,
    c.id,
    true
FROM suppliers s, categories c
WHERE s.name = 'Proprietário do Escritório' AND c.name = 'Aluguel do Escritório';

INSERT INTO recurring_expenses (description, amount, day_of_month, supplier_id, category_id, active)
SELECT 
    'Internet e Telefone',
    350.00,
    10,
    s.id,
    c.id,
    true
FROM suppliers s, categories c
WHERE s.name = 'Vivo' AND c.name = 'Internet e Telefonia';

INSERT INTO recurring_expenses (description, amount, day_of_month, supplier_id, category_id, active)
SELECT 
    'Assinatura Bitrix24',
    199.00,
    15,
    s.id,
    c.id,
    true
FROM suppliers s, categories c
WHERE s.name = 'Bitrix24' AND c.name = 'Software e Assinaturas';

INSERT INTO recurring_expenses (description, amount, day_of_month, supplier_id, category_id, active)
SELECT 
    'Google Workspace',
    150.00,
    1,
    s.id,
    c.id,
    true
FROM suppliers s, categories c
WHERE s.name = 'Google' AND c.name = 'Software e Assinaturas';
*/

-- =====================================================
-- CONSULTAS ÚTEIS PARA VERIFICAÇÃO
-- =====================================================

-- Verificar categorias criadas
-- SELECT name, description, color FROM categories ORDER BY name;

-- Verificar entidades criadas
-- SELECT name, type, notes FROM suppliers ORDER BY type, name;

-- Contagem por tipo de entidade
-- SELECT type, COUNT(*) as total FROM suppliers GROUP BY type ORDER BY total DESC;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Beehouse Investimentos Imobiliários
-- Sistema de Gestão Financeira v2.0
-- =====================================================
