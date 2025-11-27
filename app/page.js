'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { 
  Plus, Trash2, Edit, Search, 
  LayoutDashboard, Receipt, Users, Tag,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar, X,
  List, Kanban as KanbanIcon, Check, Menu, ChevronLeft, TrendingUp, DollarSign,
  Repeat, RefreshCw
} from 'lucide-react'
import { 
  format, isWithinInterval, parseISO, isValid, differenceInCalendarDays, startOfDay, setDate, lastDayOfMonth 
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts'

export default function GestorFinanceiro() {
  // --- ESTADOS GLOBAIS ---
  const [activeTab, setActiveTab] = useState('dashboard') 
  const [viewMode, setViewMode] = useState('kanban')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  
  // --- DADOS DO BANCO ---
  const [transactions, setTransactions] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])

  // --- FILTROS ---
  const [filters, setFilters] = useState({
    search: '',
    status: 'Todos',
    category: 'Todos',
    supplier: 'Todos',
    startDate: '',
    endDate: ''
  })

  // --- MODAL E FORMULÁRIO ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState('transaction') 
  const [editingItem, setEditingItem] = useState(null) 
  const [formData, setFormData] = useState({
    description: '', amount: '', due_date: '', day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: ''
  })

  // --- CARREGAMENTO INICIAL ---
  async function fetchAllData() {
    setLoading(true)
    try {
      const [transRes, suppRes, catRes, recurRes] = await Promise.all([
        supabase.from('transactions').select('*, suppliers(name), categories(name)').order('due_date', { ascending: true }),
        supabase.from('suppliers').select('*').order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('recurring_expenses').select('*, suppliers(name), categories(name)').order('day_of_month', { ascending: true })
      ])

      if (transRes.error) throw transRes.error
      if (suppRes.error) throw suppRes.error
      if (catRes.error) throw catRes.error
      if (recurRes.error) throw recurRes.error

      setTransactions(transRes.data || [])
      setSuppliers(suppRes.data || [])
      setCategories(catRes.data || [])
      setRecurringExpenses(recurRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados. Verifique o console.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllData() }, [])

  // --- SINCRONIZAÇÃO MANUAL (Manual Trigger for Cron) ---
  async function forceSync() {
      setSyncing(true)
      try {
          await fetch('/api/cron');
          await fetchAllData();
          alert('Sistema sincronizado! Contas do mês atual e seguinte foram verificadas.');
      } catch (error) {
          alert('Erro ao sincronizar: ' + error.message);
      } finally {
          setSyncing(false)
      }
  }

  // --- LÓGICA DE FILTRAGEM (TRANSAÇÕES) ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Busca Textual
      const matchesSearch = 
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase())
      
      // 2. Filtros Exatos
      const matchesStatus = filters.status === 'Todos' || t.status === filters.status
      const matchesCategory = filters.category === 'Todos' || t.category_id === filters.category
      const matchesSupplier = filters.supplier === 'Todos' || t.supplier_id === filters.supplier
      
      // 3. Filtro de Data
      let matchesDate = true
      if (filters.startDate && filters.endDate) {
        const date = parseISO(t.due_date)
        if (isValid(date)) {
            matchesDate = isWithinInterval(date, {
                start: parseISO(filters.startDate),
                end: parseISO(filters.endDate)
            })
        }
      }
      return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesDate
    })
  }, [transactions, filters])

  // --- LÓGICA DE FILTRAGEM (RECORRÊNCIAS) ---
  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter(r => {
        const matchesSearch = r.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
                              r.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase())
        const matchesCategory = filters.category === 'Todos' || r.category_id === filters.category
        const matchesSupplier = filters.supplier === 'Todos' || r.supplier_id === filters.supplier
        
        return matchesSearch && matchesCategory && matchesSupplier
    })
  }, [recurringExpenses, filters])

  // --- AGRUPAMENTO KANBAN (TEMPORAL) ---
  const kanbanColumns = useMemo(() => {
    const today = startOfDay(new Date())
    
    const cols = {
        vencido: { title: '🚨 Vencidos', items: [], color: 'border-rose-500 bg-rose-50' },
        semana1: { title: '🔥 7 Dias', items: [], color: 'border-orange-400 bg-orange-50' },
        semana2: { title: '⚠️ 8-15 Dias', items: [], color: 'border-amber-400 bg-amber-50' },
        mes:     { title: '📅 16-30 Dias', items: [], color: 'border-blue-400 bg-blue-50' },
        futuro:  { title: '🚀 +30 Dias', items: [], color: 'border-indigo-300 bg-indigo-50' },
        pago:    { title: '✅ Pagos', items: [], color: 'border-emerald-500 bg-emerald-50' },
    }

    filteredTransactions.forEach(t => {
        if (t.status === 'Pago') {
            cols.pago.items.push(t)
            return
        }

        const dueDate = parseISO(t.due_date)
        const daysDiff = differenceInCalendarDays(dueDate, today)

        if (t.status === 'Vencido' || (t.status === 'Aberto' && daysDiff < 0)) {
            cols.vencido.items.push(t)
        } else if (daysDiff <= 7) {
            cols.semana1.items.push(t)
        } else if (daysDiff <= 15) {
            cols.semana2.items.push(t)
        } else if (daysDiff <= 30) {
            cols.mes.items.push(t)
        } else {
            cols.futuro.items.push(t)
        }
    })

    return cols
  }, [filteredTransactions])

  // --- ACTIONS ---
  async function handleSave() {
    setLoading(true)
    try {
        // 1. TRANSAÇÃO AVULSA
        if (modalType === 'transaction') {
            const today = new Date().toISOString().split('T')[0]
            let finalStatus = formData.status
            if (formData.status !== 'Pago') {
                if (formData.due_date < today) finalStatus = 'Vencido'
                else finalStatus = 'Aberto'
            }

            const payload = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date,
                supplier_id: formData.supplier_id || null,
                category_id: formData.category_id || null,
                status: finalStatus
            }
            
            const { error } = editingItem 
                ? await supabase.from('transactions').update(payload).eq('id', editingItem.id)
                : await supabase.from('transactions').insert([payload])
            if (error) throw error
        } 
        
        // 2. RECORRÊNCIA (COM ATUALIZAÇÃO EM CASCATA)
        else if (modalType === 'recurring') {
            const payload = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                day_of_month: parseInt(formData.day_of_month),
                supplier_id: formData.supplier_id || null,
                category_id: formData.category_id || null,
                active: true
            }
            
            const { error } = editingItem
                ? await supabase.from('recurring_expenses').update(payload).eq('id', editingItem.id)
                : await supabase.from('recurring_expenses').insert([payload])
            
            if (error) throw error

            // Se for edição, atualiza os lançamentos abertos vinculados
            if (editingItem) {
                const { data: linkedTrans } = await supabase.from('transactions')
                    .select('*')
                    .eq('recurring_rule_id', editingItem.id)
                    .eq('status', 'Aberto') 

                if (linkedTrans && linkedTrans.length > 0) {
                    const updates = linkedTrans.map(t => {
                        let newDate = t.due_date;
                        // Se mudou o dia de vencimento, recalcula para o mês da transação
                        if (parseInt(formData.day_of_month) !== editingItem.day_of_month) {
                            const current = parseISO(t.due_date);
                            let updatedDate = setDate(current, parseInt(formData.day_of_month));
                            // Ajuste para fim de mês (ex: 31/02 -> 28/02)
                            if (updatedDate.getMonth() !== current.getMonth()) updatedDate = lastDayOfMonth(current);
                            newDate = format(updatedDate, 'yyyy-MM-dd');
                        }
                        
                        return {
                            id: t.id,
                            description: payload.description,
                            amount: payload.amount,
                            supplier_id: payload.supplier_id,
                            category_id: payload.category_id,
                            due_date: newDate,
                            // Atualiza status se a data voltou para o passado ou futuro
                            status: newDate < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Aberto' 
                        }
                    });
                    
                    const { error: upsertError } = await supabase.from('transactions').upsert(updates);
                    if (upsertError) console.error("Erro ao atualizar transações vinculadas:", upsertError);
                }
            }
        }
        
        // 3. OUTROS (CADASTROS)
        else {
            const table = modalType === 'supplier' ? 'suppliers' : 'categories'
            const payload = modalType === 'supplier' 
                ? { name: formData.name, type: formData.type }
                : { name: formData.name, description: formData.description }
            
            const { error } = editingItem
                ? await supabase.from(table).update(payload).eq('id', editingItem.id)
                : await supabase.from(table).insert([payload])
            if (error) throw error
        }

        setIsModalOpen(false)
        setEditingItem(null)
        await fetchAllData()
    } catch (error) {
        alert('Erro: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  async function quickPay(id) {
      const { error } = await supabase.from('transactions').update({ status: 'Pago' }).eq('id', id)
      if(!error) await fetchAllData()
  }

  async function handleDelete(id, table) {
    if(!confirm('Excluir este item?')) return
    await supabase.from(table).delete().eq('id', id)
    await fetchAllData()
  }

  function openModal(type, item = null) {
    setModalType(type)
    setEditingItem(item)
    const today = new Date().toISOString().split('T')[0]
    
    // Form padrão limpo
    const baseForm = { description: '', amount: '', due_date: today, day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '' }

    if (item) {
        setFormData({ ...baseForm, ...item, supplier_id: item.supplier_id || '', category_id: item.category_id || '' })
    } else {
        setFormData(baseForm)
    }
    setIsModalOpen(true)
  }

  // --- DADOS DOS GRÁFICOS ---
  const chartData = useMemo(() => {
    const catTotals = {}
    const monthTotals = {}
    
    // Usa 'filteredTransactions' para que os gráficos obedeçam aos filtros da tela
    filteredTransactions.forEach(t => {
        const cat = t.categories?.name || 'Sem Categoria'
        catTotals[cat] = (catTotals[cat] || 0) + t.amount
        
        const m = format(parseISO(t.due_date), 'MMM', {locale: ptBR})
        monthTotals[m] = (monthTotals[m] || 0) + t.amount
    })
    
    return {
        pie: Object.keys(catTotals).map(k => ({name: k, value: catTotals[k]})),
        bar: Object.keys(monthTotals).map(k => ({name: k, total: monthTotals[k]}))
    }
  }, [filteredTransactions])

  // --- CONFIGURAÇÃO DE CORES E UI ---
  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-neutral-100 shadow-xl rounded-lg">
          <p className="font-bold text-sm text-neutral-700">{label}</p>
          <p className="text-sm font-medium text-[#f9b410]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const KpiCard = ({ title, value, icon: Icon, colorTheme }) => {
      const themes = {
          danger: 'bg-rose-50 text-rose-600 border-rose-100',
          success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          warning: 'bg-amber-50 text-amber-600 border-amber-100',
          primary: 'bg-blue-50 text-blue-600 border-blue-100'
      }
      const theme = themes[colorTheme] || themes.primary;

      return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-2xl font-extrabold text-neutral-800 tracking-tight">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${theme}`}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
            </div>
        </div>
      )
  }

  // --- COMPONENTE DE BARRA DE FILTROS ---
  const FilterBar = ({ showDates = true, showStatus = true }) => (
    <div className="bg-white p-4 rounded-xl border border-neutral-200 mb-4 flex flex-wrap gap-3 items-end shadow-sm flex-shrink-0">
        
        {/* Busca */}
        <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Busca</label>
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-neutral-400 group-focus-within:text-[#f9b410] transition-colors" size={16}/>
                <input className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-[#f9b410] focus:bg-white outline-none transition-all" 
                    placeholder="Descrição..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
            </div>
        </div>

        {/* Status */}
        {showStatus && (
            <div className="w-32">
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Status</label>
                <select className="w-full py-2 px-3 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                    value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                    <option value="Todos">Todos</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Pago">Pago</option>
                    <option value="Vencido">Vencido</option>
                </select>
            </div>
        )}

        {/* Categoria */}
        <div className="w-40">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Categoria</label>
            <select className="w-full py-2 px-3 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
                <option value="Todos">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        {/* Fornecedor */}
        <div className="w-40">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Fornecedor</label>
            <select className="w-full py-2 px-3 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})}>
                <option value="Todos">Todos</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>

        {/* Datas */}
        {showDates && (
            <>
                <div className="w-36">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">De</label>
                    <input type="date" className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                        value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                </div>
                <div className="w-36">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Até</label>
                    <input type="date" className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                        value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                </div>
            </>
        )}

        {/* Botão Limpar Filtros */}
        <button onClick={() => setFilters({search: '', status: 'Todos', category: 'Todos', supplier: 'Todos', startDate: '', endDate: ''})} 
            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Limpar Filtros">
            <X size={20} />
        </button>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-neutral-800 font-sans">
      
      {/* SIDEBAR ESTILO BEEHOUSE (Preto e Amarelo) */}
      <aside className={`fixed top-0 left-0 h-full bg-black border-r border-neutral-900 z-30 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center h-24">
             {/* LOGO */}
             <img src="https://www.beehouse.imb.br/assets/img/lay/logo-nov2025.svg?c=1" alt="Beehouse Logo" className="w-40 object-contain" />
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-neutral-400 hover:text-white"><ChevronLeft size={20} /></button>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {[
                {id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard},
                {id: 'lancamentos', label: 'Lançamentos', icon: Receipt},
                {id: 'recorrencias', label: 'Recorrências', icon: Repeat},
                {id: 'fornecedores', label: 'Fornecedores', icon: Users},
                {id: 'categorias', label: 'Categorias', icon: Tag},
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200
                    ${activeTab === item.id 
                        ? 'bg-[#f9b410] text-black font-bold shadow-md' 
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}>
                    <item.icon size={20} /> {item.label}
                </button>
            ))}
        </nav>

        {/* Footer do Menu */}
        <div className="p-4 border-t border-neutral-900">
            <div className="bg-neutral-900 p-3 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f9b410] flex items-center justify-center text-black font-bold text-xs">BH</div>
                <div>
                    <p className="text-xs font-bold text-white">Beehouse</p>
                    <p className="text-[10px] text-neutral-500">Gestor Financeiro</p>
                </div>
            </div>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* MAIN CONTENT */}
      <main className={`flex-1 flex flex-col h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        
        {/* HEADER */}
        <header className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur-sm px-4 md:px-8 flex justify-between items-center flex-shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"><Menu size={20} /></button>
                <h1 className="text-xl font-bold text-neutral-900 capitalize">
                    {activeTab === 'dashboard' ? 'Visão Geral' : activeTab === 'recorrencias' ? 'Contas Recorrentes' : activeTab}
                </h1>
            </div>
            <div className="flex gap-2 md:gap-3">
                {activeTab === 'lancamentos' && (
                    <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-1 flex">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-black shadow-sm' : 'text-neutral-400'}`}><List size={18}/></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-black shadow-sm' : 'text-neutral-400'}`}><KanbanIcon size={18}/></button>
                    </div>
                )}
                
                {/* Botão de Sincronizar Manual na aba de Recorrências */}
                {activeTab === 'recorrencias' && (
                    <button onClick={forceSync} disabled={syncing}
                        className="bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-70">
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''}/> 
                        <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>
                )}

                <button onClick={() => openModal(activeTab === 'lancamentos' ? 'transaction' : activeTab === 'recorrencias' ? 'recurring' : activeTab === 'fornecedores' ? 'supplier' : 'category')} 
                    className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm shadow-orange-100 transition active:scale-95">
                    <Plus size={18}/> <span className="hidden sm:inline">Novo</span>
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
            
            {/* 1. DASHBOARD - COM BARRA DE FILTROS */}
            {activeTab === 'dashboard' && (
                <div className="w-full max-w-[98%] mx-auto space-y-6">
                    {/* BARRA DE FILTROS AQUI TAMBÉM */}
                    <FilterBar />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <KpiCard title="A Pagar" icon={ArrowDownRight} colorTheme="danger" 
                            value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.filter(t => t.status !== 'Pago').reduce((a,b)=>a+b.amount,0))} />
                        <KpiCard title="Pago" icon={Check} colorTheme="success" 
                            value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.filter(t => t.status === 'Pago').reduce((a,b)=>a+b.amount,0))} />
                        <KpiCard title="Vencido" icon={AlertTriangle} colorTheme="warning" 
                            value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.filter(t => t.status === 'Vencido').reduce((a,b)=>a+b.amount,0))} />
                        <KpiCard title="Total Geral" icon={DollarSign} colorTheme="primary" 
                            value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.reduce((a,b)=>a+b.amount,0))} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ALTURA DOS GRÁFICOS AUMENTADA */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 h-[500px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-neutral-800 flex items-center gap-2"><TrendingUp size={18} className="text-[#f9b410]" /> Fluxo Mensal</h3>
                            </div>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={chartData.bar} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="total" fill="#f9b410" radius={[6, 6, 0, 0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 h-[500px]">
                            <h3 className="font-bold text-neutral-800 mb-6 flex items-center gap-2"><Tag size={18} className="text-indigo-500"/> Por Categoria</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <PieChart>
                                    <Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                                        {chartData.pie.map((e,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. RECORRÊNCIAS - COM FILTROS */}
            {activeTab === 'recorrencias' && (
                <div className="w-full max-w-[98%] mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col h-full">
                    {/* Filtros customizados para Recorrências (sem data) */}
                    <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
                        <FilterBar showDates={false} showStatus={false} />
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-100 text-neutral-500 font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-3">Dia</th>
                                    <th className="px-6 py-3">Descrição</th>
                                    <th className="px-6 py-3">Fornecedor</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredRecurring.map(r => (
                                    <tr key={r.id} className="hover:bg-neutral-50">
                                        <td className="px-6 py-3 font-bold text-neutral-700">Dia {r.day_of_month}</td>
                                        <td className="px-6 py-3 font-medium">{r.description}</td>
                                        <td className="px-6 py-3 text-neutral-500">{r.suppliers?.name}</td>
                                        <td className="px-6 py-3 text-right font-bold">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(r.amount)}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {r.active ? 'Ativo' : 'Pausado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center flex justify-center gap-2">
                                            <button onClick={() => openModal('recurring', r)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(r.id, 'recurring_expenses')} className="text-rose-600 hover:bg-rose-50 p-1 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. LANÇAMENTOS - COM FILTROS COMPLETOS */}
            {activeTab === 'lancamentos' && (
                <div className="h-full flex flex-col w-full max-w-[98%] mx-auto">
                    {/* BARRA DE FILTROS COMPLETA */}
                    <FilterBar />

                    <div className="flex-1 min-h-0">
                        {viewMode === 'list' ? (
                            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden h-full overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b sticky top-0 bg-neutral-50 z-10">
                                        <tr>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Vencimento</th>
                                            <th className="px-6 py-3">Descrição</th>
                                            <th className="px-6 py-3">Fornecedor</th>
                                            <th className="px-6 py-3 text-right">Valor</th>
                                            <th className="px-6 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {filteredTransactions.map(t => (
                                            <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${t.status === 'Pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : t.status === 'Vencido' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{t.status}</span>
                                                </td>
                                                <td className="px-6 py-3 text-neutral-600 font-medium">{new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>
                                                <td className="px-6 py-3 font-semibold text-neutral-800">{t.description}</td>
                                                <td className="px-6 py-3 text-neutral-500">{t.suppliers?.name}</td>
                                                <td className="px-6 py-3 text-right font-bold text-neutral-900">{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(t.amount)}</td>
                                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                                    {t.status !== 'Pago' && <button onClick={() => quickPay(t.id)} title="Marcar como Pago" className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"><Check size={16}/></button>}
                                                    <button onClick={() => openModal('transaction', t)} className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16}/></button>
                                                    <button onClick={() => handleDelete(t.id, 'transactions')} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-full overflow-x-auto overflow-y-hidden">
                                <div className="grid grid-cols-6 gap-3 h-full pb-4 min-w-[1100px]">
                                    {Object.entries(kanbanColumns).map(([key, col]) => (
                                        <div key={key} className={`flex flex-col h-full rounded-xl border-t-[3px] ${col.color} bg-neutral-100/50`}>
                                            <div className="p-2 flex justify-between items-center border-b border-neutral-200/50 bg-neutral-100/80">
                                                <h3 className="font-bold text-[11px] md:text-xs text-neutral-700 uppercase truncate pr-1" title={col.title}>{col.title}</h3>
                                                <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm text-neutral-500 border border-neutral-200">{col.items.length}</span>
                                            </div>
                                            <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                                {col.items.map(t => (
                                                    <div key={t.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-neutral-200 hover:shadow-md hover:border-neutral-300 transition-all group relative">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider truncate max-w-[80px] bg-neutral-50 px-1 rounded">{t.categories?.name || 'Geral'}</span>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition bg-white rounded-md shadow-sm p-0.5 absolute right-1 top-1 border border-neutral-100 z-10">
                                                                <button onClick={() => openModal('transaction', t)} className="p-1 hover:bg-blue-50 text-blue-600 rounded"><Edit size={10} /></button>
                                                                <button onClick={() => handleDelete(t.id, 'transactions')} className="p-1 hover:bg-rose-50 text-rose-600 rounded"><Trash2 size={10} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="mb-2">
                                                            <p className="font-bold text-neutral-800 text-xs leading-snug break-words">{t.description}</p>
                                                            <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{t.suppliers?.name}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-neutral-100">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                                                                    <Calendar size={9}/> {new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}).slice(0,5)}
                                                                </span>
                                                                <span className="font-bold text-neutral-900 text-xs mt-0.5">
                                                                    {new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(t.amount)}
                                                                </span>
                                                            </div>
                                                            {t.status !== 'Pago' ? (
                                                                <button onClick={() => quickPay(t.id)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full p-1.5 transition active:scale-95" title="Pagar Agora">
                                                                    <Check size={12} strokeWidth={3} />
                                                                </button>
                                                            ) : (
                                                                <div className="text-emerald-600 flex items-center gap-0.5 text-[9px] font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                                                    <Check size={10}/> PAGO
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. TABELAS SIMPLES (CADASTROS) */}
            {(activeTab === 'fornecedores' || activeTab === 'categorias') && (
                <div className="w-full max-w-[98%] mx-auto bg-white rounded-xl shadow-sm border border-neutral-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 text-neutral-500 border-b font-semibold">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">{activeTab === 'fornecedores' ? 'Tipo' : 'Descrição'}</th>
                                <th className="px-6 py-3 text-center w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {(activeTab === 'fornecedores' ? suppliers : categories).map(i => (
                                <tr key={i.id} className="hover:bg-neutral-50">
                                    <td className="px-6 py-3 font-medium">{i.name}</td>
                                    <td className="px-6 py-3 text-neutral-500">{i.type || i.description}</td>
                                    <td className="px-6 py-3 flex justify-center gap-2">
                                        <button onClick={() => openModal(activeTab === 'fornecedores'?'supplier':'category', i)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(i.id, activeTab)} className="text-rose-600 hover:bg-rose-50 p-1 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </main>

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                    <h3 className="font-bold text-lg text-neutral-800">
                        {modalType === 'recurring' ? 'Conta Recorrente' : 'Novo Registro'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-neutral-800 transition-colors"/></button>
                </div>
                <div className="p-6 space-y-4">
                    {modalType === 'transaction' && (
                        <>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Descrição</label><input className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410] focus:border-transparent transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Valor</label><input type="number" step="0.01" className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410] transition-all" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Vencimento</label><input type="date" className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410] transition-all" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Fornecedor</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 bg-white outline-none focus:ring-2 focus:ring-[#f9b410]" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Categoria</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 bg-white outline-none focus:ring-2 focus:ring-[#f9b410]" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase">Status Inicial</label>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setFormData({...formData, status: 'Aberto'})} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${formData.status === 'Aberto' ? 'bg-neutral-800 text-white border-neutral-800 shadow-md' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>Aberto</button>
                                    <button onClick={() => setFormData({...formData, status: 'Pago'})} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${formData.status === 'Pago' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>Pago</button>
                                </div>
                            </div>
                        </>
                    )}
                    {modalType === 'recurring' && (
                        <>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Descrição (Ex: Aluguel)</label><input className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Valor Fixo</label><input type="number" step="0.01" className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Dia de Vencimento</label><input type="number" min="1" max="31" placeholder="Dia (1-31)" className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410]" value={formData.day_of_month} onChange={e => setFormData({...formData, day_of_month: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Fornecedor</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 bg-white" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div><label className="text-xs font-bold text-neutral-500 uppercase">Categoria</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 bg-white" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            </div>
                        </>
                    )}
                    {modalType !== 'transaction' && modalType !== 'recurring' && (
                        <>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Nome</label><input className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">{modalType === 'supplier' ? 'Tipo' : 'Descrição'}</label><input className="w-full border border-neutral-200 rounded-lg p-2.5 mt-1 outline-none focus:ring-2 focus:ring-[#f9b410]" value={modalType === 'supplier' ? formData.type : formData.description} onChange={e => setFormData({...formData, [modalType === 'supplier' ? 'type' : 'description']: e.target.value})} /></div>
                        </>
                    )}
                </div>
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 font-bold hover:bg-neutral-200 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-[#f9b410] text-neutral-900 font-bold hover:bg-[#e0a20e] rounded-lg shadow-sm shadow-orange-100 transition-transform active:scale-95">
                        {loading ? 'Salvando...' : 'Salvar Registro'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}