'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { 
  Plus, Trash2, Edit, Search, Filter, 
  LayoutDashboard, Receipt, Users, Tag,
  ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle2, Calendar
} from 'lucide-react'

export default function GestorFinanceiro() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('lancamentos') // lancamentos, dashboard, fornecedores, categorias
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  
  // --- CARREGAMENTO DE DADOS ---
  async function fetchTransactions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, suppliers(name)')
      .order('due_date', { ascending: true })

    if (error) console.error('Erro ao carregar:', error)
    else setTransactions(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // --- CÁLCULOS DE RESUMO (KPIs) ---
  const summary = {
    totalOpen: transactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.amount, 0),
    totalOverdue: transactions.filter(t => t.status === 'Vencido').reduce((acc, t) => acc + t.amount, 0),
    countOpen: transactions.filter(t => t.status !== 'Pago').length,
    totalPaid: transactions.filter(t => t.status === 'Pago').reduce((acc, t) => acc + t.amount, 0)
  }

  // --- FILTROS ---
  const filteredData = transactions.filter(t => 
    t.description.toLowerCase().includes(filter.toLowerCase()) ||
    (t.suppliers?.name || '').toLowerCase().includes(filter.toLowerCase())
  )

  // --- FORMATAÇÃO ---
  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatDate = (date) => {
      if(!date) return '-'
      // Corrige fuso horário adicionando horas para evitar dia anterior
      const d = new Date(date)
      return d.toLocaleDateString('pt-BR', {timeZone: 'UTC'})
  }

  // --- COMPONENTES VISUAIS ---

  // 1. Sidebar de Navegação
  const Sidebar = () => (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">B</div>
          Beehouse
        </h1>
        <p className="text-xs text-slate-500 mt-1">Gestor Financeiro</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        <NavItem id="dashboard" icon={<LayoutDashboard size={20}/>} label="Visão Geral" />
        <NavItem id="lancamentos" icon={<Receipt size={20}/>} label="Lançamentos" />
        <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cadastros</p>
        </div>
        <NavItem id="fornecedores" icon={<Users size={20}/>} label="Fornecedores" />
        <NavItem id="categorias" icon={<Tag size={20}/>} label="Categorias" />
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">U</div>
            <div>
                <p className="text-sm font-medium text-white">Usuário</p>
                <p className="text-xs text-slate-500">Financeiro</p>
            </div>
        </div>
      </div>
    </aside>
  )

  const NavItem = ({ id, icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  // 2. Cards de Estatística
  const StatCard = ({ title, value, icon, color, subtext }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            {subtext && <p className={`text-xs mt-1 ${color.text}`}>{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.bg} ${color.text}`}>
            {icon}
        </div>
    </div>
  )

  // 3. Tabela Principal
  const TransactionTable = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar da Tabela */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Todos os Lançamentos</h2>
            <div className="flex gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
                    <Filter size={18}/> Filtros
                </button>
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                    <Plus size={18}/> Novo
                </button>
            </div>
        </div>

        {/* Conteúdo da Tabela */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Vencimento</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Fornecedor</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Carregando transações...</td></tr>
                    ) : filteredData.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                    ) : (
                        filteredData.map((t) => {
                            // Lógica de Badges
                            let badgeStyle = "bg-slate-100 text-slate-600"
                            let StatusIcon = Calendar
                            
                            if (t.status === 'Pago') {
                                badgeStyle = "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                StatusIcon = CheckCircle2
                            } else if (t.status === 'Vencido') {
                                badgeStyle = "bg-red-50 text-red-700 border border-red-200"
                                StatusIcon = AlertCircle
                            } else {
                                badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200"
                            }

                            return (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
                                            <StatusIcon size={12} />
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{formatDate(t.due_date)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{t.description}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {(t.suppliers?.name || '?').charAt(0)}
                                            </div>
                                            {t.suppliers?.name || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                                        {formatMoney(t.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-md transition-colors" title="Editar">
                                                <Edit size={16}/>
                                            </button>
                                            <button className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors" title="Excluir">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
            <span>Mostrando {filteredData.length} registros</span>
            <div className="flex gap-1">
                <button className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50" disabled>Anterior</button>
                <button className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50" disabled>Próxima</button>
            </div>
        </div>
    </div>
  )

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Menu Lateral */}
      <Sidebar />

      {/* Área de Conteúdo */}
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        {/* Cabeçalho da Página */}
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">
                {activeTab === 'lancamentos' && 'Contas a Pagar'}
                {activeTab === 'dashboard' && 'Visão Geral'}
                {activeTab === 'fornecedores' && 'Gerenciar Fornecedores'}
                {activeTab === 'categorias' && 'Categorias Financeiras'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gerencie as finanças da Beehouse de forma eficiente.</p>
        </div>

        {/* Conteúdo da Aba Lançamentos */}
        {activeTab === 'lancamentos' && (
            <div className="space-y-6">
                {/* Cards de Resumo Rápido */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard 
                        title="A Pagar (Total)" 
                        value={formatMoney(summary.totalOpen)} 
                        subtext={`${summary.countOpen} contas em aberto`}
                        icon={<ArrowUpCircle size={24} />}
                        color={{ bg: 'bg-red-100', text: 'text-red-600' }}
                    />
                    <StatCard 
                        title="Em Atraso" 
                        value={formatMoney(summary.totalOverdue)} 
                        subtext="Requer atenção imediata"
                        icon={<AlertCircle size={24} />}
                        color={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
                    />
                     <StatCard 
                        title="Pago (Total)" 
                        value={formatMoney(summary.totalPaid)} 
                        subtext="Acumulado"
                        icon={<CheckCircle2 size={24} />}
                        color={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }}
                    />
                     <StatCard 
                        title="Saldo Previsto" 
                        value="R$ --" 
                        subtext="Integração futura"
                        icon={<LayoutDashboard size={24} />}
                        color={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                    />
                </div>

                {/* Tabela */}
                <TransactionTable />
            </div>
        )}

        {/* Placeholder para outras abas */}
        {activeTab !== 'lancamentos' && (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <LayoutDashboard size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Em desenvolvimento</h3>
                <p className="text-slate-500 text-sm max-w-xs text-center mt-2">
                    O módulo de <strong>{activeTab}</strong> estará disponível na próxima atualização do sistema.
                </p>
            </div>
        )}

      </main>

      {/* Modal de Formulário (Overlay Simples) */}
      {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800">Novo Lançamento</h3>
                      <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Descrição</label>
                          <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Ex: Conta de Luz" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Valor</label>
                              <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="0,00" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Vencimento</label>
                              <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                          </div>
                      </div>
                      <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-lg flex gap-2 items-start">
                          <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                          <p>Para salvar dados, conecte o formulário à função <code>supabase.insert</code> no próximo passo.</p>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">Cancelar</button>
                      <button className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg shadow-sm transition">Salvar Lançamento</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}