'use client'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { 
  Plus, Trash2, Edit, Search, Filter, 
  LayoutDashboard, Receipt, Users, Tag,
  ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle2, Calendar, X
} from 'lucide-react'

export default function GestorFinanceiro() {
  // --- ESTADOS GLOBAIS ---
  const [activeTab, setActiveTab] = useState('lancamentos')
  const [loading, setLoading] = useState(true)
  
  // --- DADOS DO BANCO ---
  const [transactions, setTransactions] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])

  // --- ESTADOS DE CONTROLE DE UI ---
  const [filter, setFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState('transaction') // 'transaction', 'supplier', 'category'
  const [editingItem, setEditingItem] = useState(null) // Se null, é criação. Se tiver objeto, é edição.
  
  // --- DADOS DO FORMULÁRIO ---
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

      setTransactions(transRes.data)
      setSuppliers(suppRes.data)
      setCategories(catRes.data)
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

  // --- OPERAÇÕES CRUD (CRIAR / EDITAR / EXCLUIR) ---

  // 1. Função Unificada de Salvar (Create/Update)
  async function handleSave() {
    setLoading(true)
    try {
        let error = null
        
        // LÓGICA PARA TRANSAÇÕES (LANÇAMENTOS)
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
                const { error: updateError } = await supabase.from('transactions').update(payload).eq('id', editingItem.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase.from('transactions').insert([payload])
                error = insertError
            }
        }

        // LÓGICA PARA FORNECEDORES
        else if (modalType === 'supplier') {
            const payload = { name: formData.name, type: formData.type }
            if (editingItem) {
                const { error: e } = await supabase.from('suppliers').update(payload).eq('id', editingItem.id)
                error = e
            } else {
                const { error: e } = await supabase.from('suppliers').insert([payload])
                error = e
            }
        }

        // LÓGICA PARA CATEGORIAS
        else if (modalType === 'category') {
            const payload = { name: formData.name, description: formData.description }
            if (editingItem) {
                const { error: e } = await supabase.from('categories').update(payload).eq('id', editingItem.id)
                error = e
            } else {
                const { error: e } = await supabase.from('categories').insert([payload])
                error = e
            }
        }

        if (error) throw error

        // Sucesso
        setIsModalOpen(false)
        setEditingItem(null)
        await fetchAllData() // Recarrega tudo para atualizar as listas
        
    } catch (error) {
        console.error('Erro ao salvar:', error)
        alert('Erro ao salvar: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  // 2. Função de Excluir
  async function handleDelete(id, table) {
    if(!confirm('Tem certeza que deseja excluir este item?')) return

    try {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        await fetchAllData()
    } catch (error) {
        console.error('Erro ao excluir:', error)
        alert('Erro ao excluir. Verifique se este item não está sendo usado em outros registros.')
    }
  }

  // --- GERENCIAMENTO DE MODAL ---
  function openModal(type, item = null) {
    setModalType(type)
    setEditingItem(item)
    
    if (item) {
        // Modo Edição: Preenche os campos
        setFormData({
            description: item.description || '',
            amount: item.amount || '',
            due_date: item.due_date || '',
            supplier_id: item.supplier_id || '',
            category_id: item.category_id || '',
            status: item.status || 'Aberto',
            name: item.name || '',
            type: item.type || ''
        })
    } else {
        // Modo Criação: Limpa
        setFormData({
            description: '', amount: '', due_date: new Date().toISOString().split('T')[0], 
            supplier_id: '', category_id: '', status: 'Aberto', name: '', type: ''
        })
    }
    setIsModalOpen(true)
  }


  // --- FILTROS DE VISUALIZAÇÃO ---
  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(filter.toLowerCase()) ||
    t.suppliers?.name?.toLowerCase().includes(filter.toLowerCase())
  )
  
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))


  // --- COMPONENTES INTERNOS (UI) ---
  const Sidebar = () => (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-10">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">B</div>
          Beehouse
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavItem id="dashboard" icon={<LayoutDashboard size={20}/>} label="Visão Geral" />
        <NavItem id="lancamentos" icon={<Receipt size={20}/>} label="Lançamentos" />
        <div className="pt-4 pb-2"><p className="px-3 text-xs font-semibold text-slate-500 uppercase">Cadastros</p></div>
        <NavItem id="fornecedores" icon={<Users size={20}/>} label="Fornecedores" />
        <NavItem id="categorias" icon={<Tag size={20}/>} label="Categorias" />
      </nav>
    </aside>
  )

  const NavItem = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
      {icon}{label}
    </button>
  )

  const StatCard = ({ title, value, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
    </div>
  )

  // --- RENDERIZAÇÃO ---
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        {/* Cabeçalho */}
        <div className="mb-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 capitalize">
                {activeTab === 'dashboard' ? 'Visão Geral' : activeTab}
            </h1>
            {activeTab !== 'dashboard' && (
                <button onClick={() => openModal(activeTab === 'lancamentos' ? 'transaction' : activeTab === 'fornecedores' ? 'supplier' : 'category')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <Plus size={18} /> Novo
                </button>
            )}
        </div>

        {/* CONTEÚDO: DASHBOARD */}
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="A Pagar (Total)" color="text-red-600" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.amount, 0))} />
                <StatCard title="Pago (Total)" color="text-emerald-600" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactions.filter(t => t.status === 'Pago').reduce((acc, t) => acc + t.amount, 0))} />
                <StatCard title="Vencido" color="text-amber-600" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactions.filter(t => t.status === 'Vencido').reduce((acc, t) => acc + t.amount, 0))} />
                <StatCard title="Total Itens" color="text-blue-600" value={transactions.length} />
            </div>
        )}

        {/* CONTEÚDO: LANÇAMENTOS */}
        {activeTab === 'lancamentos' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFilter(e.target.value)} />
                    </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                        <tr><th className="px-6 py-3">Status</th><th className="px-6 py-3">Vencimento</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3">Fornecedor</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'Pago' ? 'bg-green-100 text-green-800' : t.status === 'Vencido' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.status}</span></td>
                                <td className="px-6 py-3">{new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>
                                <td className="px-6 py-3 font-medium">{t.description}</td>
                                <td className="px-6 py-3">{t.suppliers?.name}</td>
                                <td className="px-6 py-3 text-right font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</td>
                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal('transaction', t)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(t.id, 'transactions')} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* CONTEÚDO: FORNECEDORES */}
        {activeTab === 'fornecedores' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b"><tr><th className="px-6 py-3">Nome</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-medium">{s.name}</td>
                                <td className="px-6 py-3">{s.type}</td>
                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal('supplier', s)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(s.id, 'suppliers')} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        
        {/* CONTEÚDO: CATEGORIAS */}
        {activeTab === 'categorias' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b"><tr><th className="px-6 py-3">Nome</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCategories.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-medium">{c.name}</td>
                                <td className="px-6 py-3">{c.description}</td>
                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal('category', c)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(c.id, 'categories')} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

      </main>

      {/* MODAL DE FORMULÁRIO */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800">
                        {editingItem ? 'Editar' : 'Novo'} {modalType === 'transaction' ? 'Lançamento' : modalType === 'supplier' ? 'Fornecedor' : 'Categoria'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* CAMPOS: TRANSAÇÃO */}
                      {modalType === 'transaction' && (
                        <>
                          <div><label className="text-xs font-bold text-slate-500 uppercase">Descrição</label><input type="text" className="w-full border rounded p-2 mt-1" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Valor</label><input type="number" step="0.01" className="w-full border rounded p-2 mt-1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Vencimento</label><input type="date" className="w-full border rounded p-2 mt-1" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Fornecedor</label>
                                <select className="w-full border rounded p-2 mt-1" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             </div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                                <select className="w-full border rounded p-2 mt-1" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                             </div>
                          </div>
                          <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                              <select className="w-full border rounded p-2 mt-1" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                  <option value="Aberto">Aberto</option>
                                  <option value="Pago">Pago</option>
                                  <option value="Vencido">Vencido</option>
                              </select>
                          </div>
                        </>
                      )}

                      {/* CAMPOS: FORNECEDOR */}
                      {modalType === 'supplier' && (
                          <>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Nome da Empresa</label><input type="text" className="w-full border rounded p-2 mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Tipo (Serviço, Produto...)</label><input type="text" className="w-full border rounded p-2 mt-1" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} /></div>
                          </>
                      )}

                      {/* CAMPOS: CATEGORIA */}
                      {modalType === 'category' && (
                          <>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Nome da Categoria</label><input type="text" className="w-full border rounded p-2 mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Descrição</label><input type="text" className="w-full border rounded p-2 mt-1" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                          </>
                      )}
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">Cancelar</button>
                      <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg shadow-sm transition">
                          {loading ? 'Salvando...' : 'Salvar'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}