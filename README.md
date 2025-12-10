# 💰 Gestor Financeiro Beehouse

Sistema simplificado de gestão de **contas a pagar** desenvolvido para a Beehouse Imobiliária. Focado exclusivamente em controle de saídas/despesas com interface moderna e intuitiva.

![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)

---

## 📋 Sobre o Sistema

Este é um sistema de gestão financeira **focado em despesas**, ideal para pequenas e médias empresas que precisam:

- ✅ Controlar contas a pagar
- ✅ Gerenciar despesas recorrentes (fixas)
- ✅ Visualizar métricas financeiras em dashboard
- ✅ Organizar pagamentos por categorias e fornecedores
- ✅ Acompanhar status de pagamentos (Aberto, Pago, Vencido)

---

## 🚀 Funcionalidades

### Dashboard (Visão Geral)
- **KPIs em tempo real**: Total de pagamentos, Pagos, Em Aberto, Vencidos
- **Gráfico de barras**: Pagamentos por mês
- **Gráfico de pizza**: Distribuição por categoria
- **Filtros avançados**: Por data, status, categoria e entidade

### Contas a Pagar
- **Visualização Kanban**: Organize pagamentos por status
- **Visualização Lista**: Tabela detalhada com todas as informações
- **Ações rápidas**: Editar, excluir, marcar como pago
- **Filtros**: Busca, status, categoria, entidade, período

### Despesas Fixas (Recorrentes)
- Cadastro de despesas mensais automáticas
- Definição do dia de vencimento
- Sincronização automática para criar lançamentos mensais
- Vinculação com fornecedores e categorias

### Entidades (Fornecedores)
- Cadastro de fornecedores e parceiros
- Tipos: Corretor, Empresa, Parceiro, Cliente, Outro
- Vinculação com transações e despesas

### Plano de Contas (Categorias)
- Organização de despesas por categoria
- Cores personalizadas para identificação visual
- Análise de gastos por categoria

---

## 🛠️ Tecnologias

| Tecnologia | Descrição |
|------------|-----------|
| **Next.js 16** | Framework React com App Router |
| **Supabase** | Banco de dados PostgreSQL + API |
| **Tailwind CSS** | Estilização utilitária |
| **Recharts** | Gráficos interativos |
| **Lucide React** | Biblioteca de ícones |
| **date-fns** | Manipulação de datas |

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/gestor-financeiro-beehouse.git
cd gestor-financeiro-beehouse
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 4. Configure o banco de dados
Execute o script SQL no Supabase:
```bash
# O arquivo está em: database/schema.sql
```

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## 🗄️ Estrutura do Banco de Dados

```
┌─────────────────┐
│   suppliers     │  ← Entidades (Fornecedores)
├─────────────────┤
│ id (UUID)       │
│ name            │
│ type            │
│ active          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  transactions   │     │   categories    │
├─────────────────┤     ├─────────────────┤
│ id (UUID)       │     │ id (UUID)       │
│ description     │     │ name            │
│ amount          │     │ description     │
│ due_date        │     │ color           │
│ status          │◄────│ active          │
│ supplier_id     │     └─────────────────┘
│ category_id     │
│ nf_received_date│
└─────────────────┘
         ▲
         │
┌────────┴─────────┐
│recurring_expenses│  ← Despesas Fixas
├──────────────────┤
│ id (UUID)        │
│ description      │
│ amount           │
│ day_of_month     │
│ supplier_id      │
│ category_id      │
│ active           │
└──────────────────┘
```

---

## 📁 Estrutura do Projeto

```
gestor-financeiro-beehouse/
├── app/
│   ├── globals.css      # Estilos globais
│   ├── layout.tsx       # Layout principal
│   ├── page.js          # Componente principal
│   └── lib/
│       └── supabase.js  # Configuração do Supabase
├── database/
│   └── schema.sql       # Script de criação do banco
├── public/              # Assets estáticos
├── .env.local           # Variáveis de ambiente
├── package.json         # Dependências
├── tailwind.config.js   # Configuração Tailwind
└── README.md            # Este arquivo
```

---

## 🎨 Guia de Estilos

### Cores Principais
| Cor          | Hex       | Uso               |
|--------------|-----------|-------------------|
| **Primária** | `#f9b410` | Botões, destaques |
| **Sucesso**  | `#10b981` | Status Pago       |
| **Alerta**   | `#f59e0b` | Status Aberto     |
| **Perigo**   | `#ef4444` | Status Vencido    |
| **Fundo**    | `#f4f6f9` | Background geral  |

### Classes CSS Personalizadas
- `.glass-card` - Cards com efeito glassmorphism
- `.btn-primary` - Botão primário com gradiente
- `.sidebar-gradient` - Gradiente da sidebar
- `.animate-fade-in` - Animação de entrada
- `.custom-scrollbar` - Scrollbar personalizada

---

## ⌨️ Atalhos e Navegação

| Ação                     | Como fazer                                  |
|--------------------------|---------------------------------------------|
| Novo registro            | Botão "Novo" no header (qualquer aba)       |
| Trocar visualização      | Botões Lista/Kanban na aba Contas a Pagar   |
| Sincronizar recorrências | Botão "Sincronizar" na aba Despesas Fixas   |
| Limpar filtros           | Botão X na barra de filtros                 |

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar produção
npm start

# Lint
npm run lint
```

---

## 📊 Status dos Pagamentos

| Status        | Cor          | Descrição                           |
|---------------|--------------|-------------------------------------|
| **Aberto**    | 🔵 Azul      | Pagamento pendente, dentro do prazo |
| **Pago**      | 🟢 Verde     | Pagamento realizado                 |
| **Vencido**   | 🔴 Vermelho  | Pagamento em atraso                 |
| **Cancelado** | ⚫ Cinza     | Pagamento cancelado                 |

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é de uso privado da **Beehouse Imobiliária**.

---

## 👨‍💻 Desenvolvido por

**Beehouse Tecnologia**  
Gestor Financeiro v2.0

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Abra uma issue no repositório
- Entre em contato com o time de desenvolvimento

---

*Última atualização: Dezembro 2025*
