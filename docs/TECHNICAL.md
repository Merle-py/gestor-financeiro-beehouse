# 📚 Documentação Técnica - Gestor Financeiro Beehouse

## Índice
1. [Arquitetura](#arquitetura)
2. [Componentes](#componentes)
3. [Banco de Dados](#banco-de-dados)
4. [Fluxos de Dados](#fluxos-de-dados)
5. [API e Integrações](#api-e-integrações)
6. [Guia de Manutenção](#guia-de-manutenção)

---

## 1. Arquitetura

### Visão Geral
O sistema utiliza uma arquitetura **monolítica simplificada** baseada em:

```
┌─────────────────────────────────────────────────┐
│                   Frontend                      │
│              (Next.js 16 + React)               │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Dashboard  │  │   Kanban    │  │  Modais  │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
│                        │                        │
│                        ▼                        │
│              ┌─────────────────┐                │
│              │  Supabase SDK   │                │
│              └────────┬────────┘                │
└───────────────────────┼─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                  Backend                        │
│              (Supabase/PostgreSQL)              │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Tables   │  │  RLS     │  │   Triggers    │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
```

### Stack Tecnológica

| Camada     | Tecnologia           | Versão |
|------------|----------------------|--------|
| Frontend   | Next.js (App Router) | 16.0.3 |
| UI Library | React                | 19.x   |
| Styling    | Tailwind CSS         | 4.x    |
| Charts     | Recharts             | 2.x    |
| Icons      | Lucide React         | Latest |
| Database   | Supabase (PostgreSQL)| -      |
| Date Utils | date-fns             | 4.x    |

---

## 2. Componentes

### Componente Principal: `GestorFinanceiro`

Localização: `app/page.js`

Este é o componente principal que gerencia todo o estado da aplicação.

#### Estados Principais

```javascript
// Navegação e UI
const [activeTab, setActiveTab] = useState('dashboard')     // Aba ativa
const [viewMode, setViewMode] = useState('kanban')          // Modo de visualização
const [isSidebarOpen, setIsSidebarOpen] = useState(true)    // Sidebar aberta
const [showQuickMenu, setShowQuickMenu] = useState(false)   // Menu de criação

// Dados
const [transactions, setTransactions] = useState([])        // Transações
const [suppliers, setSuppliers] = useState([])              // Fornecedores
const [categories, setCategories] = useState([])            // Categorias
const [recurringExpenses, setRecurringExpenses] = useState([]) // Recorrentes

// Filtros
const [filters, setFilters] = useState({
    search: '',
    status: 'Todos',
    category: 'Todos',
    supplier: 'Todos',
    startDate: '',
    endDate: ''
})

// Modal
const [isModalOpen, setIsModalOpen] = useState(false)
const [modalType, setModalType] = useState('transaction')
const [editingItem, setEditingItem] = useState(null)
```

### Componentes Auxiliares

#### `FilterBar`
Barra de filtros reutilizável para busca e filtragem de dados.

```jsx
<FilterBar 
    filters={filters} 
    setFilters={setFilters} 
    categories={categories} 
    suppliers={suppliers} 
    dateResetKey={dateResetKey}
    setDateResetKey={setDateResetKey}
    showDates={true}
    showStatus={true}
/>
```

#### `KpiCard`
Card de métricas para o dashboard.

```jsx
<KpiCard 
    title="Total de Pagamentos" 
    icon={Wallet} 
    colorTheme="blue" 
    value="R$ 10.000,00" 
/>
```

**Temas disponíveis**: `blue`, `green`, `orange`, `red`, `purple`, `dark`

---

## 3. Banco de Dados

### Tabelas

#### `suppliers` (Entidades)
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Outro',  -- Corretor, Empresa, Parceiro, Cliente, Outro
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50),
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `categories` (Plano de Contas)
```sql
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
```

#### `transactions` (Pagamentos)
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    type VARCHAR(20) DEFAULT 'despesa',
    status VARCHAR(20) DEFAULT 'Aberto',  -- Aberto, Pago, Vencido, Cancelado
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    nf_number VARCHAR(100),
    nf_issue_date DATE,
    nf_received_date DATE,  -- Data de pagamento efetivo
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `recurring_expenses` (Despesas Fixas)
```sql
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    last_generated_month VARCHAR(7),  -- Formato: YYYY-MM
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Índices
```sql
CREATE INDEX idx_transactions_due_date ON transactions(due_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_supplier ON transactions(supplier_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
```

---

## 4. Fluxos de Dados

### Fluxo de Criação de Pagamento

```
┌─────────────────┐
│  Usuário clica  │
│  "Novo" > "Novo │
│   Pagamento"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  openModal()    │
│  type='transaction'
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Modal abre com │
│  formulário     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  handleSave()   │
│  valida dados   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  INSERT/UPDATE  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  fetchAllData() │
│ atualiza estado │
└─────────────────┘
```

### Fluxo de Sincronização de Recorrentes

```
┌─────────────────┐
│   forceSync()   │
│  chamado pelo   │
│  usuário        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Para cada recurring_expense:   │
│                                 │
│ 1. Verificar se active=true    │
│ 2. Verificar mês atual         │
│ 3. Calcular due_date           │
│    (day_of_month do mês atual) │
│ 4. Verificar se já existe      │
│    transação no mês            │
│ 5. Se não existe: INSERT       │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────┐
│  Atualiza       │
│  last_generated │
│  _month         │
└─────────────────┘
```

---

## 5. API e Integrações

### Supabase Client

Configuração: `app/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Operações CRUD

#### Listar Transações
```javascript
const { data, error } = await supabase
    .from('transactions')
    .select('*, supplier:suppliers(name), category:categories(name, color)')
    .eq('type', 'despesa')
    .order('due_date', { ascending: false })
```

#### Criar Transação
```javascript
const { data, error } = await supabase
    .from('transactions')
    .insert({
        description: 'Aluguel',
        amount: 2500.00,
        due_date: '2024-12-15',
        type: 'despesa',
        status: 'Aberto',
        supplier_id: '...',
        category_id: '...'
    })
```

#### Atualizar Status
```javascript
const { error } = await supabase
    .from('transactions')
    .update({ status: 'Pago', nf_received_date: new Date() })
    .eq('id', transactionId)
```

#### Deletar
```javascript
const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
```

---

## 6. Guia de Manutenção

### Adicionar Nova Aba

1. Adicione a entrada em `tabNames`:
```javascript
const tabNames = {
    'dashboard': 'Visão Geral',
    'nova_aba': 'Nova Aba',  // ← Adicionar aqui
    // ...
};
```

2. Adicione o item no menu da sidebar:
```javascript
{ id: 'nova_aba', label: 'Nova Aba', desc: 'Descrição', icon: IconName }
```

3. Adicione o conteúdo na renderização:
```javascript
{activeTab === 'nova_aba' && (
    <div>Conteúdo da nova aba</div>
)}
```

### Adicionar Novo Campo em Transação

1. Atualize o `formData` inicial
2. Adicione o campo no modal
3. Inclua no payload do `handleSave`
4. Execute ALTER TABLE no banco
5. Atualize a query em `fetchAllData`

### Customizar Tema de Cores

Edite `app/globals.css`:
```css
:root {
    --primary: #f9b410;      /* Cor primária */
    --primary-dark: #d99a0e; /* Cor primária escura */
    --success: #10b981;      /* Verde */
    --danger: #ef4444;       /* Vermelho */
    --warning: #f59e0b;      /* Laranja */
}
```

### Troubleshooting

| Problema                 | Solução                                                |
|--------------------------|--------------------------------------------------------|
| Dados não aparecem       | Verifique as credenciais do Supabase no `.env.local`   |
| Erro de CORS             | Adicione o domínio nas configurações do Supabase       |
| Gráficos sem dados       | Verifique se existem transações no período selecionado |
| Sync não cria transações | Verifique se `active=true` nas recorrentes             |

---

## Changelog

### v2.0.0 (Dezembro 2025)
- Remoção de funcionalidades de vendas/receitas
- Foco exclusivo em contas a pagar
- Novo design com glassmorphism
- Menu de criação rápida global
- Melhorias de UI/UX

### v1.0.0 (Novembro 2025)
- Versão inicial com vendas e despesas

---

*Documentação atualizada em: Dezembro 2025*
