'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { 
  Plus, Trash2, Edit, Search, 
  LayoutDashboard, Receipt, Users, Tag,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar, X,
  List, Kanban as KanbanIcon, Check, Menu, ChevronLeft, TrendingUp, DollarSign,
  Repeat, RefreshCw, Briefcase, Wallet
} from 'lucide-react'
import { 
  format, isWithinInterval, parseISO, isValid, differenceInCalendarDays, startOfDay, setDate, lastDayOfMonth 
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts'

// --- COMPONENTES AUXILIARES (DEFINIDOS FORA PARA PERFORMANCE) ---

const FilterBar = ({ 
  filters, 
  setFilters, 
  categories, 
  suppliers, 
  dateResetKey, 
  setDateResetKey, 
  showDates = true, 
  showStatus = true 
}) => (
  <div className="bg-white p-4 rounded-xl border border-neutral-200 mb-4 flex flex-wrap gap-3 items-end shadow-sm flex-shrink-0">
      
      {/* Busca Textual */}
      <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Busca</label>
          <div className="relative group">
              <Search className="absolute left-3 top-2.5 text-neutral-400 group-focus-within:text-[#f9b410] transition-colors" size={16}/>
              <input 
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-[#f9b410] focus:bg-white outline-none transition-all" 
                  placeholder="Descrição, fornecedor..." 
                  value={filters.search} 
                  onChange={e => setFilters(prev => ({...prev, search: e.target.value}))} 
              />
          </div>
      </div>

      {/* Filtro de Status */}
      {showStatus && (
          <div className="w-32">
              <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Status</label>
              <select 
                  className="w-full py-2 px-3 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                  value={filters.status} 
                  onChange={e => setFilters(prev => ({...prev, status: e.target.value}))}
              >
                  <option value="Todos">Todos</option>
                  <option value="Aberto">Aberto</option>
                  <option value="Pago">Pago</option>
                  <option value="Vencido">Vencido</option>
              </select>
          </div>
      )}

      {/* Filtro de Categoria */}
      <div className="w-40">
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Categoria</label>
          <select 
              className="w-full py-2 px-3 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
              value={filters.category} 
              onChange={e => setFilters(prev => ({...prev, category: e.target.value}))}
          >
              <option value="Todos">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
      </div>

      {/* Filtro de Fornecedor */}
      <div className="w-40">
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Fornecedor</label>
          <select 
              className="w-full py-2 px-3 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
              value={filters.supplier} 
              onChange={e => setFilters(prev => ({...prev, supplier: e.target.value}))}
          >
              <option value="Todos">Todos</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
      </div>

      {/* Filtros de Data (Inputs não controlados com Key para reset) */}
      {showDates && (
          <>
              <div className="w-auto min-w-[130px]">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">De</label>
                  <input 
                      key={`start-${dateResetKey}`} 
                      type="date" 
                      className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                      defaultValue={filters.startDate} 
                      onBlur={e => setFilters(prev => ({...prev, startDate: e.target.value}))} 
                  />
              </div>
              <div className="w-auto min-w-[130px]">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Até</label>
                  <input 
                      key={`end-${dateResetKey}`} 
                      type="date" 
                      className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                      defaultValue={filters.endDate} 
                      onBlur={e => setFilters(prev => ({...prev, endDate: e.target.value}))} 
                  />
              </div>
          </>
      )}

      {/* Botão Limpar Filtros */}
      <button 
          onClick={() => {
              setFilters({search: '', status: 'Todos', category: 'Todos', supplier: 'Todos', startDate: '', endDate: ''});
              setDateResetKey(k => k + 1); 
          }} 
          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
          title="Limpar Filtros"
      >
          <X size={20} />
      </button>
  </div>
);

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

// --- COMPONENTE PRINCIPAL ---

export default function GestorFinanceiro() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('dashboard') 
  const [viewMode, setViewMode] = useState('kanban')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dateResetKey, setDateResetKey] = useState(0)
  
  const [transactions, setTransactions] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [sales, setSales] = useState([])

  const [filters, setFilters] = useState({
    search: '', status: 'Todos', category: 'Todos', supplier: 'Todos', startDate: '', endDate: ''
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState('transaction') 
  const [editingItem, setEditingItem] = useState(null) 
  
  // Form States
  const [saleForm, setSaleForm] = useState({ client_name: '', property_info: '', total_value: '', agency_fee_percent: '', broker_commission_percent: '' })
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: '', tax_rate: '' })
  
  const [formData, setFormData] = useState({ description: '', amount: '', due_date: '', day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '', type_trans: 'despesa' })

  // --- CARREGAMENTO ---
  async function fetchAllData() {
    setLoading(true)
    try {
      const [transRes, suppRes, catRes, recurRes, salesRes] = await Promise.all([
        supabase.from('transactions').select('*, suppliers(name), categories(name)').order('due_date', { ascending: true }),
        supabase.from('suppliers').select('*').order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('recurring_expenses').select('*, suppliers(name), categories(name)').order('day_of_month', { ascending: true }),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ])

      if (transRes.error) throw transRes.error
      // ... (erros simplificados para não poluir)

      setTransactions(transRes.data || [])
      setSuppliers(suppRes.data || [])
      setCategories(catRes.data || [])
      setRecurringExpenses(recurRes.data || [])
      setSales(salesRes.data || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllData() }, [])

  // --- SINCRONIZAÇÃO ---
  async function forceSync() {
      setSyncing(true)
      try {
          await fetch('/api/cron');
          await fetchAllData();
          alert('Sistema sincronizado!');
      } catch (error) {
          alert('Erro ao sincronizar.');
      } finally {
          setSyncing(false)
      }
  }

  // --- FILTROS ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
                            t.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = filters.status === 'Todos' || t.status === filters.status
      const matchesCategory = filters.category === 'Todos' || t.category_id === filters.category
      const matchesSupplier = filters.supplier === 'Todos' || t.supplier_id === filters.supplier
      
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

  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter(r => {
        const matchesSearch = r.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
                              r.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase())
        return matchesSearch // simplificado para busca
    })
  }, [recurringExpenses, filters])

  // --- KANBAN ---
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
        if (t.status === 'Pago') { cols.pago.items.push(t); return }
        const dueDate = parseISO(t.due_date)
        const daysDiff = differenceInCalendarDays(dueDate, today)
        if (t.status === 'Vencido' || (t.status === 'Aberto' && daysDiff < 0)) cols.vencido.items.push(t)
        else if (daysDiff <= 7) cols.semana1.items.push(t)
        else if (daysDiff <= 15) cols.semana2.items.push(t)
        else if (daysDiff <= 30) cols.mes.items.push(t)
        else cols.futuro.items.push(t)
    })
    return cols
  }, [filteredTransactions])

  // --- ACTIONS ---
  async function handleSave() {
    setLoading(true)
    try {
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
                status: finalStatus,
                type: formData.type_trans || 'despesa'
            }
            const { error } = editingItem 
                ? await supabase.from('transactions').update(payload).eq('id', editingItem.id)
                : await supabase.from('transactions').insert([payload])
            if (error) throw error

            // NOTIFICAÇÃO IMEDIATA
            if (!editingItem && finalStatus !== 'Pago' && payload.type === 'despesa') {
                const diasParaVencer = differenceInCalendarDays(parseISO(payload.due_date), new Date());
                if (finalStatus === 'Vencido' || diasParaVencer <= 2) {
                    const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.amount);
                    const tag = finalStatus === 'Vencido' ? '🚨 [B][COLOR=#ff0000]CONTA VENCIDA[/COLOR][/B]' : '⚠️ [B]CONTA URGENTE[/B]';
                    const msg = `${tag}\nNova conta lançada: ${payload.description} - ${valorFmt}`;
                    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) }).catch(console.error);
                }
            }
        } 
        else if (modalType === 'sale') {
            // SALVA NOVA VENDA
            const payload = {
                client_name: saleForm.client_name,
                property_info: saleForm.property_info,
                total_value: parseFloat(saleForm.total_value),
                agency_fee_percent: parseFloat(saleForm.agency_fee_percent),
                broker_commission_percent: parseFloat(saleForm.broker_commission_percent)
            }
            await supabase.from('sales').insert([payload])
        }
        else if (modalType === 'installment') {
            // LANÇA PARCELA (RECEITA + IMPOSTO + COMISSÃO)
            const amount = parseFloat(installmentForm.amount)
            const taxRate = parseFloat(installmentForm.tax_rate) || 0

            // 1. Receita
            const receita = {
                description: `Receb. ${editingItem.property_info}`,
                amount: amount, due_date: installmentForm.date, status: 'Aberto', type: 'receita', sale_id: editingItem.id
            }
            await supabase.from('transactions').insert([receita])

            // 2. Imposto
            const taxValue = amount * (taxRate / 100)
            if (taxValue > 0) {
                const imposto = {
                    description: `Imposto (${taxRate}%) - ${editingItem.property_info}`,
                    amount: taxValue, due_date: installmentForm.date, status: 'Aberto', type: 'despesa', sale_id: editingItem.id
                }
                await supabase.from('transactions').insert([imposto])
            }

            // 3. Comissão
            const netAmount = amount - taxValue
            const commissionValue = netAmount * (editingItem.broker_commission_percent / 100)
            if (commissionValue > 0) {
                const comissao = {
                    description: `Comissão - ${editingItem.property_info}`,
                    amount: commissionValue, due_date: installmentForm.date, status: 'Aberto', type: 'despesa', sale_id: editingItem.id
                }
                await supabase.from('transactions').insert([comissao])
            }
        }
        else if (modalType === 'recurring') {
            const payload = {
                description: formData.description, amount: parseFloat(formData.amount), day_of_month: parseInt(formData.day_of_month),
                supplier_id: formData.supplier_id || null, category_id: formData.category_id || null, active: true
            }
            const { error } = editingItem
                ? await supabase.from('recurring_expenses').update(payload).eq('id', editingItem.id)
                : await supabase.from('recurring_expenses').insert([payload])
            if (error) throw error
            
            // Atualização em cascata
            if (editingItem) {
                const { data: linked } = await supabase.from('transactions').select('*').eq('recurring_rule_id', editingItem.id).eq('status', 'Aberto')
                if (linked?.length) {
                    const updates = linked.map(t => {
                        let newDate = t.due_date
                        if (parseInt(formData.day_of_month) !== editingItem.day_of_month) {
                            const curr = parseISO(t.due_date)
                            let d = setDate(curr, parseInt(formData.day_of_month))
                            if (d.getMonth() !== curr.getMonth()) d = lastDayOfMonth(curr)
                            newDate = format(d, 'yyyy-MM-dd')
                        }
                        return { ...t, description: payload.description, amount: payload.amount, due_date: newDate, status: newDate < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Aberto' }
                    })
                    await supabase.from('transactions').upsert(updates)
                }
            }
        }
        else {
            const table = modalType === 'supplier' ? 'suppliers' : 'categories'
            const payload = modalType === 'supplier' ? { name: formData.name, type: formData.type } : { name: formData.name, description: formData.description }
            const { error } = editingItem ? await supabase.from(table).update(payload).eq('id', editingItem.id) : await supabase.from(table).insert([payload])
            if (error) throw error
        }

        setIsModalOpen(false); setEditingItem(null); await fetchAllData()
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  async function quickPay(id) { await supabase.from('transactions').update({ status: 'Pago' }).eq('id', id); fetchAllData() }
  async function handleDelete(id, table) { if(confirm('Confirmar?')) { await supabase.from(table).delete().eq('id', id); fetchAllData() } }

  function openModal(type, item = null) {
    setModalType(type); setEditingItem(item); 
    const today = new Date().toISOString().split('T')[0]
    setFormData({ description: '', amount: '', due_date: today, day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '', type_trans: 'despesa' })
    if(type === 'transaction' && item) setFormData({...item})
    if(type === 'sale') setSaleForm({ client_name: '', property_info: '', total_value: '', agency_fee_percent: '6', broker_commission_percent: '30' })
    if(type === 'installment') setInstallmentForm({ amount: '', date: today, tax_rate: '' })
    setIsModalOpen(true)
  }

  // --- CHART DATA ---
  const chartData = useMemo(() => {
    const catTotals = {}, monthTotals = {}
    filteredTransactions.forEach(t => {
        if(t.type === 'receita') return;
        const cat = t.categories?.name || 'Outros'
        catTotals[cat] = (catTotals[cat] || 0) + t.amount
        const m = format(parseISO(t.due_date), 'MMM', {locale: ptBR})
        monthTotals[m] = (monthTotals[m] || 0) + t.amount
    })
    return { pie: Object.keys(catTotals).map(k => ({name: k, value: catTotals[k]})), bar: Object.keys(monthTotals).map(k => ({name: k, total: monthTotals[k]})) }
  }, [filteredTransactions])
  
  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  // --- RENDER ---
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-neutral-800 font-sans">
      <aside className={`fixed top-0 left-0 h-full bg-black border-r border-neutral-900 z-30 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center h-24"><img src="https://www.beehouse.imb.br/assets/img/lay/logo-nov2025.svg?c=1" alt="Beehouse" className="w-40 object-contain" /><button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-neutral-400"><ChevronLeft size={20}/></button></div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {[{id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard}, {id: 'vendas', label: 'Vendas & Comissões', icon: Briefcase}, {id: 'lancamentos', label: 'Lançamentos', icon: Receipt}, {id: 'recorrencias', label: 'Recorrências', icon: Repeat}, {id: 'fornecedores', label: 'Fornecedores', icon: Users}, {id: 'categorias', label: 'Categorias', icon: Tag}].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${activeTab === item.id ? 'bg-[#f9b410] text-black font-bold shadow-md' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}><item.icon size={20} /> {item.label}</button>
            ))}
        </nav>
        <div className="p-4 border-t border-neutral-900"><div className="bg-neutral-900 p-3 rounded-lg flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#f9b410] flex items-center justify-center text-black font-bold text-xs">BH</div><div><p className="text-xs font-bold text-white">Beehouse</p><p className="text-[10px] text-neutral-500">Gestor Financeiro</p></div></div></div>
      </aside>
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <main className={`flex-1 flex flex-col h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        <header className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur-sm px-4 md:px-8 flex justify-between items-center flex-shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"><Menu size={20} /></button><h1 className="text-xl font-bold text-neutral-900 capitalize">{activeTab}</h1></div>
            <div className="flex gap-2 md:gap-3">
                 {activeTab === 'vendas' && <button onClick={() => openModal('sale')} className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition"><Plus size={18}/> Nova Venda</button>}
                 {activeTab === 'lancamentos' && (<div className="bg-neutral-100 border border-neutral-200 rounded-lg p-1 flex"><button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode==='list'?'bg-white shadow-sm':''}`}><List size={18}/></button><button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode==='kanban'?'bg-white shadow-sm':''}`}><KanbanIcon size={18}/></button></div>)}
                 {activeTab === 'recorrencias' && <button onClick={forceSync} disabled={syncing} className="bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><RefreshCw size={16} className={syncing?'animate-spin':''}/> Sync</button>}
                 {activeTab === 'lancamentos' && <button onClick={() => openModal('transaction')} className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition"><Plus size={18}/> Lançamento</button>}
                 {(activeTab === 'fornecedores' || activeTab === 'categorias' || activeTab === 'recorrencias') && <button onClick={() => openModal(activeTab === 'fornecedores' ? 'supplier' : activeTab === 'categorias' ? 'category' : 'recurring')} className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition"><Plus size={18}/> Novo</button>}
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
            {activeTab === 'dashboard' && (
                <div className="w-full max-w-[98%] mx-auto space-y-6">
                    <FilterBar filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                         <KpiCard title="Receitas (Mês)" icon={ArrowUpRight} colorTheme="success" value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.filter(t => t.type === 'receita').reduce((a,b)=>a+b.amount,0))} />
                         <KpiCard title="Despesas (Mês)" icon={ArrowDownRight} colorTheme="danger" value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.filter(t => t.type === 'despesa').reduce((a,b)=>a+b.amount,0))} />
                         <KpiCard title="Comissões a Pagar" icon={Users} colorTheme="warning" value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.filter(t => t.description.includes('Comissão') && t.status !== 'Pago').reduce((a,b)=>a+b.amount,0))} />
                         <KpiCard title="Saldo Geral" icon={Wallet} colorTheme="primary" value={new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(filteredTransactions.reduce((a,b) => b.type === 'receita' ? a + b.amount : a - b.amount, 0))} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 h-[500px]">
                            <h3 className="font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-[#f9b410]" /> Fluxo Mensal</h3>
                            <ResponsiveContainer width="100%" height="85%"><BarChart data={chartData.bar} margin={{top: 10, right: 30, left: 20, bottom: 0}}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>new Intl.NumberFormat('pt-BR',{notation:"compact"}).format(v)} /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="total" fill="#f9b410" radius={[6, 6, 0, 0]} barSize={50} /></BarChart></ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 h-[500px]">
                            <h3 className="font-bold mb-6 flex items-center gap-2"><Tag size={18} className="text-indigo-500"/> Por Categoria</h3>
                            <ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">{chartData.pie.map((e,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'vendas' && (
                <div className="w-full max-w-[98%] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sales.map(sale => (
                        <div key={sale.id} className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="font-bold text-lg text-neutral-900">{sale.property_info}</h3><p className="text-sm text-neutral-500">{sale.client_name}</p></div>
                                <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded text-xs font-bold">Ativo</span>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm"><span className="text-neutral-500">Valor Venda:</span> <span className="font-bold">{new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(sale.total_value)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-neutral-500">Honorários ({sale.agency_fee_percent}%):</span> <span className="font-bold text-green-600">{new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(sale.total_value * (sale.agency_fee_percent/100))}</span></div>
                                <div className="flex justify-between text-sm border-t border-dashed pt-2"><span className="text-neutral-500">Comissão Corretor ({sale.broker_commission_percent}%):</span> <span className="font-bold text-red-500">{new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format((sale.total_value * (sale.agency_fee_percent/100)) * (sale.broker_commission_percent/100))}</span></div>
                            </div>
                            <button onClick={() => openModal('installment', sale)} className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 hover:bg-black transition"><Plus size={16}/> Lançar Parcela Recebida</button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'lancamentos' && (
                <div className="w-full max-w-[98%] mx-auto h-full flex flex-col">
                    <FilterBar filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} />
                    <div className="flex-1 min-h-0">
                        {viewMode === 'list' ? (
                            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden h-full overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-neutral-50 text-neutral-500 font-semibold border-b sticky top-0 bg-neutral-50 z-10"><tr><th className="px-6 py-3">Tipo</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Vencimento</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3">Entidade</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-center">Ações</th></tr></thead><tbody className="divide-y divide-neutral-100">{filteredTransactions.map(t => (<tr key={t.id} className="hover:bg-neutral-50 transition-colors"><td className="px-6 py-3">{t.type === 'receita' ? <ArrowUpRight size={16} className="text-green-500"/> : <ArrowDownRight size={16} className="text-red-500"/>}</td><td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${t.status==='Pago'?'bg-emerald-50 text-emerald-600 border-emerald-100':t.status==='Vencido'?'bg-rose-50 text-rose-600 border-rose-100':'bg-amber-50 text-amber-600 border-amber-100'}`}>{t.status}</span></td><td className="px-6 py-3 text-neutral-600">{new Date(t.due_date).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</td><td className="px-6 py-3 font-medium">{t.description}</td><td className="px-6 py-3 text-neutral-500">{t.suppliers?.name}</td><td className={`px-6 py-3 text-right font-bold ${t.type==='receita'?'text-green-600':'text-red-600'}`}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(t.amount)}</td><td className="px-6 py-3 text-center flex justify-center gap-2">{t.status !== 'Pago' && <button onClick={() => quickPay(t.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded"><Check size={16}/></button>}<button onClick={() => openModal('transaction', t)} className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16}/></button><button onClick={() => handleDelete(t.id, 'transactions')} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
                        ) : (
                            <div className="h-full overflow-x-auto"><div className="grid grid-cols-6 gap-3 h-full pb-4 min-w-[1100px]">{Object.entries(kanbanColumns).map(([key, col]) => (<div key={key} className={`flex flex-col h-full rounded-xl border-t-[3px] ${col.color} bg-neutral-100/50`}><div className="p-2 border-b border-neutral-200/50 bg-neutral-100/80 flex justify-between"><h3 className="font-bold text-xs uppercase">{col.title}</h3><span className="text-xs font-bold bg-white px-2 rounded">{col.items.length}</span></div><div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">{col.items.map(t => (<div key={t.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-neutral-200 hover:shadow-md transition-all"><div className="flex justify-between mb-1"><span className={`text-[9px] font-bold uppercase px-1 rounded ${t.type==='receita'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{t.type}</span><span className="text-[9px] text-neutral-400">{new Date(t.due_date).toLocaleDateString('pt-BR',{timeZone:'UTC'}).slice(0,5)}</span></div><p className="font-bold text-xs mb-1 truncate">{t.description}</p><p className="text-[10px] text-neutral-500 mb-2 truncate">{t.suppliers?.name}</p><div className="flex justify-between items-center border-t border-dashed pt-2"><span className="font-bold text-xs">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(t.amount)}</span>{t.status !== 'Pago' && <button onClick={()=>quickPay(t.id)} className="bg-emerald-50 text-emerald-600 p-1 rounded-full"><Check size={12}/></button>}</div></div>))}</div></div>))}</div></div>
                        )}
                    </div>
                </div>
            )}
            
            {(activeTab === 'recorrencias' || activeTab === 'fornecedores' || activeTab === 'categorias') && (
                <div className="w-full max-w-[98%] mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 p-4 h-full overflow-y-auto">
                   {activeTab === 'recorrencias' && (
                       <div className="flex flex-col h-full">
                           <div className="mb-4 flex justify-between items-center"><h3 className="font-bold">Contas Recorrentes (Fixas)</h3><FilterBar showDates={false} showStatus={false} filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} /></div>
                           <table className="w-full text-sm text-left"><thead><tr><th>Dia</th><th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{filteredRecurring.map(r=><tr key={r.id} className="border-b hover:bg-neutral-50"><td className="py-2">Dia {r.day_of_month}</td><td>{r.description}</td><td>{r.suppliers?.name}</td><td>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(r.amount)}</td><td><button onClick={()=>openModal('recurring',r)} className="text-blue-600 p-1"><Edit size={14}/></button><button onClick={()=>handleDelete(r.id,'recurring_expenses')} className="text-red-600 p-1"><Trash2 size={14}/></button></td></tr>)}</tbody></table>
                       </div>
                   )}
                   {activeTab !== 'recorrencias' && (
                       <table className="w-full text-sm text-left"><thead><tr><th>Nome</th><th>Detalhe</th><th>Ações</th></tr></thead><tbody>{(activeTab==='fornecedores'?suppliers:categories).map(i=><tr key={i.id} className="border-b hover:bg-neutral-50"><td className="py-2 font-medium">{i.name}</td><td>{i.type||i.description}</td><td><button onClick={()=>openModal(activeTab==='fornecedores'?'supplier':'category',i)} className="text-blue-600 p-1"><Edit size={14}/></button><button onClick={()=>handleDelete(i.id, activeTab)} className="text-red-600 p-1"><Trash2 size={14}/></button></td></tr>)}</tbody></table>
                   )}
                </div>
            )}
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between"><h3 className="font-bold text-lg">Novo Registro</h3><button onClick={()=>setIsModalOpen(false)}><X size={20}/></button></div>
                <div className="p-6 space-y-4">
                    {modalType === 'sale' && (
                        <>
                            <input placeholder="Nome do Cliente" className="w-full border p-2 rounded" value={saleForm.client_name} onChange={e=>setSaleForm({...saleForm, client_name:e.target.value})} />
                            <input placeholder="Imóvel (Ex: Ap 101)" className="w-full border p-2 rounded" value={saleForm.property_info} onChange={e=>setSaleForm({...saleForm, property_info:e.target.value})} />
                            <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Valor Venda" type="number" className="w-full border p-2 rounded" value={saleForm.total_value} onChange={e=>setSaleForm({...saleForm, total_value:e.target.value})} />
                                <input placeholder="% Honorários" type="number" className="w-full border p-2 rounded" value={saleForm.agency_fee_percent} onChange={e=>setSaleForm({...saleForm, agency_fee_percent:e.target.value})} />
                            </div>
                            <input placeholder="% Comissão Corretor (sobre honorários)" type="number" className="w-full border p-2 rounded" value={saleForm.broker_commission_percent} onChange={e=>setSaleForm({...saleForm, broker_commission_percent:e.target.value})} />
                        </>
                    )}
                    {modalType === 'installment' && (
                        <>
                             <p className="text-sm text-neutral-500 mb-2">Lançar parcela recebida. O sistema calculará Imposto e Comissão.</p>
                             <input placeholder="Valor Recebido (Bruto)" type="number" className="w-full border p-2 rounded" value={installmentForm.amount} onChange={e=>setInstallmentForm({...installmentForm, amount:e.target.value})} />
                             <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Imposto (%) Ex: 10.68" type="number" className="w-full border p-2 rounded" value={installmentForm.tax_rate} onChange={e=>setInstallmentForm({...installmentForm, tax_rate:e.target.value})} />
                                <input type="date" className="w-full border p-2 rounded" value={installmentForm.date} onChange={e=>setInstallmentForm({...installmentForm, date:e.target.value})} />
                             </div>
                        </>
                    )}
                    {(modalType === 'transaction' || modalType === 'recurring') && (
                        <>
                             <div className="flex gap-2 mb-2">
                                 <button onClick={()=>setFormData({...formData, type_trans: 'despesa'})} className={`flex-1 py-1 text-sm rounded border ${formData.type_trans==='despesa'?'bg-red-100 border-red-200 text-red-700 font-bold':''}`}>Despesa</button>
                                 <button onClick={()=>setFormData({...formData, type_trans: 'receita'})} className={`flex-1 py-1 text-sm rounded border ${formData.type_trans==='receita'?'bg-green-100 border-green-200 text-green-700 font-bold':''}`}>Receita</button>
                             </div>
                             <input placeholder="Descrição" className="w-full border p-2 rounded" value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} />
                             <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Valor" type="number" className="w-full border p-2 rounded" value={formData.amount} onChange={e=>setFormData({...formData, amount:e.target.value})} />
                                {modalType==='transaction' ? <input type="date" className="w-full border p-2 rounded" value={formData.due_date} onChange={e=>setFormData({...formData, due_date:e.target.value})} /> : <input placeholder="Dia (1-31)" type="number" className="w-full border p-2 rounded" value={formData.day_of_month} onChange={e=>setFormData({...formData, day_of_month:e.target.value})} />}
                             </div>
                             <select className="w-full border p-2 rounded bg-white" value={formData.supplier_id} onChange={e=>setFormData({...formData, supplier_id:e.target.value})}><option value="">Fornecedor/Cliente</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                             <select className="w-full border p-2 rounded bg-white" value={formData.category_id} onChange={e=>setFormData({...formData, category_id:e.target.value})}><option value="">Categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        </>
                    )}
                    {(modalType === 'supplier' || modalType === 'category') && (
                        <>
                             <input placeholder="Nome" className="w-full border p-2 rounded" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} />
                             <input placeholder="Descrição/Tipo" className="w-full border p-2 rounded" value={modalType==='supplier'?formData.type:formData.description} onChange={e=>setFormData({...formData, [modalType==='supplier'?'type':'description']:e.target.value})} />
                        </>
                    )}
                </div>
                <div className="px-6 py-4 border-t bg-neutral-50 flex justify-end gap-2">
                    <button onClick={()=>setIsModalOpen(false)} className="px-4 py-2 text-neutral-500 font-bold hover:bg-neutral-200 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-[#f9b410] text-black font-bold rounded-lg hover:bg-[#e0a20e]">{loading ? '...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}