'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { 
  Plus, Trash2, Edit, Search, Filter, 
  LayoutDashboard, Receipt, Users, Tag,
  ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle2, Calendar, X,
  List, Kanban as KanbanIcon, ChevronDown, ChevronUp
} from 'lucide-react'
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function GestorFinanceiro() {
  // --- ESTADOS GLOBAIS ---
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, lancamentos, fornecedores, categorias
  const [viewMode, setViewMode] = useState('list') // list | kanban
  const [loading, setLoading] = useState(true)
  
  // --- DADOS DO BANCO ---
  const [transactions, setTransactions] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])

  // --- FILTROS ---
  const [filters, setFilters] = useState({
    search: '',
    status: 'Todos',
    supplier: 'Todos',
    startDate: '',
    endDate: ''
  })

  // --- MODAL E FORMULÁRIO ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState('transaction') 
  const [editingItem, setEditingItem] = useState(null) 
  const [formData, setFormData] = useState({
    description: '', amount: '', due_date: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: ''
  })

  // --- CARREGAMENTO INICIAL ---
  async function fetchAllData() {
    setLoading(true)
    try {
      const [transRes, suppRes, catRes] = await Promise.all([
        supabase.from('transactions').select('*, suppliers(name), categories(name)').order('due_date', { ascending: true }),
        supabase.from('suppliers').select('*').order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true })
      ])

      if (transRes.error) throw transRes.error
      if (suppRes.error) throw suppRes.error
      if (catRes.error) throw catRes.error

      setTransactions(transRes.data || [])
      setSuppliers(suppRes.data || [])
      setCategories(catRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados. Verifique o console.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  // --- LÓGICA DE FILTRAGEM ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Texto
      const matchesSearch = 
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.categories?.name?.toLowerCase().includes(filters.search.toLowerCase())
      
      // Status
      const matchesStatus = filters.status === 'Todos' || t.status === filters.status
      
      // Fornecedor
      const matchesSupplier = filters.supplier === 'Todos' || t.supplier_id == filters.supplier

      // Data
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

      return matchesSearch && matchesStatus && matchesSupplier && matchesDate
    })
  }, [transactions, filters])

  // --- DADOS PARA GRÁFICOS (DASHBOARD) ---
  const chartData = useMemo(() => {
    // 1. Despesas por Categoria (Pie)
    const categoryTotals = {}
    transactions.forEach(t => {
        const catName = t.categories?.name || 'Sem Categoria'
        categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount
    })
    const pieData = Object.keys(categoryTotals).map(key => ({ name: key, value: categoryTotals[key] }))

    // 2. Despesas por Mês (Bar)
    const monthlyTotals = {}
    transactions.forEach(t => {
        const month = format(parseISO(t.due_date), 'MMM/yy', { locale: ptBR })
        monthlyTotals[month] = (monthlyTotals[month] || 0) + t.amount
    })
    const barData = Object.keys(monthlyTotals).map(key => ({ name: key, total: monthlyTotals[key] }))

    return { pieData, barData }
  }, [transactions])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // --- OPERAÇÕES CRUD ---
  async function handleSave() {
    setLoading(true)
    try {
        let error = null
        if (modalType === 'transaction') {
            const payload = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date,
                supplier_id: formData.supplier_id || null,
                category_id: formData.category_id || null,
                status: formData.status
            }
            if (editingItem) {
                const { error: uError } = await supabase.from('transactions').update(payload).eq('id', editingItem.id)
                error = uError
            } else {
                const { error: iError } = await supabase.from('transactions').insert([payload])
                error = iError
                // Notificação simples (opcional)
                if (!error && payload.status === 'Aberto') {
                   await fetch('/api/notify', { method: 'POST', body: JSON.stringify({ message: `Novo lançamento: ${payload.description}` }) })
                }
            }
        } else if (modalType === 'supplier') {
            const payload = { name: formData.name, type: formData.type }
            const { error: e } = editingItem 
                ? await supabase.from('suppliers').update(payload).eq('id', editingItem.id)
                : await supabase.from('suppliers').insert([payload])
            error = e
        } else if (modalType === 'category') {
            const payload = { name: formData.name, description: formData.description }
            const { error: e } = editingItem 
                ? await supabase.from('categories').update(payload).eq('id', editingItem.id)
                : await supabase.from('categories').insert([payload])
            error = e
        }

        if (error) throw error
        setIsModalOpen(false)
        setEditingItem(null)
        await fetchAllData()
    } catch (error) {
        alert('Erro ao salvar: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  async function handleDelete(id, table) {
    if(!confirm('Tem certeza?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) await fetchAllData()
  }

  async function updateStatus(id, newStatus) {
      const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', id)
      if(!error) fetchAllData()
  }

  function openModal(type, item = null) {
    setModalType(type)
    setEditingItem(item)
    if (item) {
        setFormData({ ...item, supplier_id: item.supplier_id || '', category_id: item.category_id || '' })
    } else {
        setFormData({
            description: '', amount: '', due_date: new Date().toISOString().split('T')[0], 
            supplier_id: '', category_id: '', status: 'Aberto', name: '', type: ''
        })
    }
    setIsModalOpen(true)
  }

  // --- COMPONENTES UI ---
  const FilterBar = () => (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Busca</label>
              <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-neutral-400" size={18}/>
                  <input type="text" placeholder="Descrição..." className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]" 
                      value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
              </div>
          </div>
          <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Status</label>
              <select className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]"
                  value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                  <option value="Todos">Todos</option>
                  <option value="Aberto">Aberto</option>
                  <option value="Pago">Pago</option>
                  <option value="Vencido">Vencido</option>
              </select>
          </div>
          <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Data Início</label>
              <input type="date" className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]"
                  value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Data Fim</label>
              <input type="date" className="w-full py-2 px-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410]"
                  value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
      </div>
  )

  const StatCard = ({ title, value, colorClass, icon: Icon }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1 h-full`} style={{ backgroundColor: colorClass }}></div>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
            </div>
            <div className="p-2 rounded-full bg-neutral-50 text-neutral-400">
                {Icon && <Icon size={20} />}
            </div>
        </div>
    </div>
  )

  const TransactionKanban = () => {
      const columns = [
          { id: 'Aberto', title: 'A Pagar', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
          { id: 'Vencido', title: 'Vencidos', color: 'bg-red-100 border-red-300 text-red-800' },
          { id: 'Pago', title: 'Pagos', color: 'bg-green-100 border-green-300 text-green-800' }
      ]

      return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
              {columns.map(col => (
                  <div key={col.id} className="flex flex-col bg-neutral-100 rounded-xl p-4 min-w-[300px]">
                      <div className={`flex items-center justify-between mb-4 pb-2 border-b border-neutral-200 ${col.color.replace('bg-', 'text-').split(' ')[0]}`}>
                          <h3 className="font-bold uppercase tracking-wide text-sm">{col.title}</h3>
                          <span className="text-xs font-bold bg-white px-2 py-1 rounded-full shadow-sm">
                              {filteredTransactions.filter(t => t.status === col.id).length}
                          </span>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                          {filteredTransactions.filter(t => t.status === col.id).map(t => (
                              <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200 hover:shadow-md transition group relative">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="text-xs font-bold text-neutral-400">{t.categories?.name}</span>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                          <button onClick={() => openModal('transaction', t)} className="p-1 hover:bg-neutral-100 rounded"><Edit size={14} /></button>
                                          <button onClick={() => handleDelete(t.id, 'transactions')} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                                      </div>
                                  </div>
                                  <h4 className="font-bold text-neutral-800 mb-1">{t.description}</h4>
                                  <p className="text-xs text-neutral-500 mb-3">{t.suppliers?.name}</p>
                                  <div className="flex justify-between items-center pt-2 border-t border-neutral-50">
                                      <span className="text-sm font-bold text-neutral-900">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                                      </span>
                                      <div className="flex items-center gap-1 text-xs text-neutral-400">
                                          <Calendar size={12} />
                                          {new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                      </div>
                                  </div>
                                  {/* Quick Actions */}
                                  <div className="mt-3 flex gap-2">
                                      {t.status !== 'Pago' && (
                                          <button onClick={() => updateStatus(t.id, 'Pago')} className="flex-1 py-1 bg-green-50 text-green-700 text-xs font-bold rounded hover:bg-green-100">Pagar</button>
                                      )}
                                      {t.status === 'Aberto' && (
                                          <button onClick={() => updateStatus(t.id, 'Vencido')} className="flex-1 py-1 bg-red-50 text-red-700 text-xs font-bold rounded hover:bg-red-100">Vencer</button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )
  }

  // --- RENDER PRINCIPAL ---
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-800 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-black text-white flex flex-col h-screen fixed left-0 top-0 border-r border-neutral-800 z-10">
        <div className="p-6 border-b border-neutral-800 flex justify-center">
            <img src="https://www.beehouse.imb.br/assets/img/lay/logo-nov2025.svg?c=1" alt="Beehouse" className="h-10 object-contain" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
            {[{id:'dashboard', icon:LayoutDashboard, label:'Visão Geral'}, {id:'lancamentos', icon:Receipt, label:'Lançamentos'}, {id:'fornecedores', icon:Users, label:'Fornecedores'}, {id:'categorias', icon:Tag, label:'Categorias'}].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} 
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all ${activeTab === item.id ? 'bg-[#f9b410] text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                    <item.icon size={20}/>{item.label}
                </button>
            ))}
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-black capitalize tracking-tight">{activeTab === 'dashboard' ? 'Dashboard Financeiro' : activeTab}</h1>
                <p className="text-neutral-500 text-sm mt-1">Gestão inteligente para sua empresa.</p>
            </div>
            <div className="flex gap-3">
                {activeTab === 'lancamentos' && (
                    <div className="flex bg-white border border-neutral-200 rounded-lg p-1">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-neutral-100 text-black' : 'text-neutral-400'}`}><List size={20}/></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-neutral-100 text-black' : 'text-neutral-400'}`}><KanbanIcon size={20}/></button>
                    </div>
                )}
                {activeTab !== 'dashboard' && (
                    <button onClick={() => openModal(activeTab === 'lancamentos' ? 'transaction' : activeTab === 'fornecedores' ? 'supplier' : 'category')} 
                        className="bg-[#f9b410] hover:bg-[#e0a20e] text-black px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-transform active:scale-95">
                        <Plus size={18} /> Novo
                    </button>
                )}
            </div>
        </div>

        {/* BARRA DE FILTROS (Global para Dashboard e Lançamentos) */}
        {(activeTab === 'dashboard' || activeTab === 'lancamentos') && <FilterBar />}

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
            <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard title="A Pagar" icon={ArrowDownCircle} colorClass="#dc2626" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredTransactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.amount, 0))} />
                    <StatCard title="Pago" icon={CheckCircle2} colorClass="#10b981" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredTransactions.filter(t => t.status === 'Pago').reduce((acc, t) => acc + t.amount, 0))} />
                    <StatCard title="Vencido" icon={AlertCircle} colorClass="#d97706" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredTransactions.filter(t => t.status === 'Vencido').reduce((acc, t) => acc + t.amount, 0))} />
                    <StatCard title="Total Previsto" icon={ArrowUpCircle} colorClass="#2563eb" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredTransactions.reduce((acc, t) => acc + t.amount, 0))} />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                        <h3 className="font-bold text-lg mb-4">Despesas por Categoria</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                        {chartData.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                        <h3 className="font-bold text-lg mb-4">Evolução Mensal</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.barData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Bar dataKey="total" fill="#f9b410" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- LANÇAMENTOS VIEW --- */}
        {activeTab === 'lancamentos' && (
            <>
                {viewMode === 'list' ? (
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Vencimento</th>
                                    <th className="px-6 py-3">Descrição</th>
                                    <th className="px-6 py-3">Fornecedor</th>
                                    <th className="px-6 py-3">Categoria</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border 
                                                ${t.status === 'Pago' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                  t.status === 'Vencido' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                  'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-neutral-600">{new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>
                                        <td className="px-6 py-3 font-medium text-neutral-900">{t.description}</td>
                                        <td className="px-6 py-3 text-neutral-600">{t.suppliers?.name || '-'}</td>
                                        <td className="px-6 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">{t.categories?.name || '-'}</span></td>
                                        <td className="px-6 py-3 text-right font-bold text-neutral-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</td>
                                        <td className="px-6 py-3 text-center flex justify-center gap-2">
                                            <button onClick={() => openModal('transaction', t)} className="text-neutral-400 hover:text-blue-600 p-1 transition"><Edit size={18}/></button>
                                            <button onClick={() => handleDelete(t.id, 'transactions')} className="text-neutral-400 hover:text-red-600 p-1 transition"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <TransactionKanban />
                )}
            </>
        )}

        {/* --- FORNECEDORES E CATEGORIAS VIEW (Tabelas Simples) --- */}
        {(activeTab === 'fornecedores' || activeTab === 'categorias') && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-600 border-b font-semibold">
                        <tr>
                            <th className="px-6 py-3">Nome</th>
                            <th className="px-6 py-3">{activeTab === 'fornecedores' ? 'Tipo' : 'Descrição'}</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {(activeTab === 'fornecedores' ? suppliers : categories).map(item => (
                            <tr key={item.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-3 font-medium">{item.name}</td>
                                <td className="px-6 py-3 text-neutral-600">{item.type || item.description}</td>
                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal(activeTab === 'fornecedores' ? 'supplier' : 'category', item)} className="text-neutral-400 hover:text-blue-600 p-1"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(item.id, activeTab)} className="text-neutral-400 hover:text-red-600 p-1"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

      </main>

      {/* --- MODAL GENÉRICO --- */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200">
                  <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                      <h3 className="font-bold text-lg text-black">{editingItem ? 'Editar' : 'Novo'} Registro</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-black"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      {modalType === 'transaction' && (
                        <>
                          <div><label className="text-xs font-bold text-neutral-500 uppercase">Descrição</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Valor</label><input type="number" step="0.01" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Vencimento</label><input type="date" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Fornecedor</label><select className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none bg-white" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Categoria</label><select className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none bg-white" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                          </div>
                          <div><label className="text-xs font-bold text-neutral-500 uppercase">Status</label><select className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="Aberto">Aberto</option><option value="Pago">Pago</option><option value="Vencido">Vencido</option></select></div>
                        </>
                      )}
                      {(modalType === 'supplier' || modalType === 'category') && (
                          <>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Nome</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">{modalType === 'supplier' ? 'Tipo' : 'Descrição'}</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={modalType === 'supplier' ? formData.type : formData.description} onChange={e => setFormData({...formData, [modalType === 'supplier' ? 'type' : 'description']: e.target.value})} /></div>
                          </>
                      )}
                  </div>
                  <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 font-bold hover:bg-neutral-200 rounded-lg transition">Cancelar</button>
                      <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-[#f9b410] text-black font-bold hover:bg-[#e0a20e] rounded-lg shadow-sm transition transform active:scale-95">{loading ? 'Salvando...' : 'Salvar'}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}