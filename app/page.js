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
  const [modalType, setModalType] = useState('transaction') 
  const [editingItem, setEditingItem] = useState(null) 
  
  // --- DADOS DO FORMULÁRIO ---
  const [formData, setFormData] = useState({
    description: '', amount: '', due_date: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: ''
  })

  // --- CARREGAMENTO INICIAL ---
  async function fetchAllData() {
    setLoading(true)
    try {
      const [transRes, suppRes, catRes] = await Promise.all([
        // Agora buscamos também a categoria (categories(name))
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

  // --- OPERAÇÕES CRUD ---

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

                // --- NOTIFICAÇÃO DE URGÊNCIA (NOVA LÓGICA) ---
                if (!error && payload.status === 'Aberto') {
                    const hoje = new Date();
                    const vencimento = new Date(payload.due_date);
                    const diferencaTempo = vencimento - hoje;
                    const diasParaVencer = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

                    // Se vencer em menos de 3 dias (ou já estiver vencido), avisa!
                    if (diasParaVencer <= 3) {
                        const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.amount);
                        const msg = `🚨 [B]NOVA CONTA URGENTE![/B]\n\nFoi lançado um novo título com vencimento próximo:\n\n▪ ${payload.description}\n▪ Valor: ${valorFmt}\n▪ Vencimento: ${payload.due_date.split('-').reverse().join('/')}\n\nVerifique no Gestor Financeiro.`;
                        
                        // Dispara o alerta sem travar a tela (Fire and forget)
                        fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: msg })
                        });
                    }
                }
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

        setIsModalOpen(false)
        setEditingItem(null)
        await fetchAllData()
        
    } catch (error) {
        console.error('Erro ao salvar:', error)
        alert('Erro ao salvar: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  async function handleDelete(id, table) {
    if(!confirm('Tem certeza que deseja excluir este item?')) return
    try {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        await fetchAllData()
    } catch (error) {
        alert('Erro ao excluir. Item pode estar em uso.')
    }
  }

  // --- UTILS ---
  function openModal(type, item = null) {
    setModalType(type)
    setEditingItem(item)
    if (item) {
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
        setFormData({
            description: '', amount: '', due_date: new Date().toISOString().split('T')[0], 
            supplier_id: '', category_id: '', status: 'Aberto', name: '', type: ''
        })
    }
    setIsModalOpen(true)
  }

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(filter.toLowerCase()) ||
    t.suppliers?.name?.toLowerCase().includes(filter.toLowerCase()) ||
    t.categories?.name?.toLowerCase().includes(filter.toLowerCase())
  )
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))


  // --- TEMAS E CORES DA BEEHOUSE ---
  // Preto Principal: bg-neutral-900
  // Amarelo Destaque: bg-[#f9b410]
  // Texto no Amarelo: text-black (para contraste)

  const Sidebar = () => (
    <aside className="w-64 bg-black text-white flex flex-col h-screen fixed left-0 top-0 border-r border-neutral-800 z-10">
      <div className="p-6 border-b border-neutral-800 flex justify-center">
        {/* LOGO BEEHOUSE */}
        <img 
            src="https://www.beehouse.imb.br/assets/img/lay/logo-nov2025.svg?c=1" 
            alt="Beehouse" 
            className="h-12 object-contain"
        />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavItem id="dashboard" icon={<LayoutDashboard size={20}/>} label="Visão Geral" />
        <NavItem id="lancamentos" icon={<Receipt size={20}/>} label="Lançamentos" />
        <div className="pt-6 pb-2"><p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Cadastros</p></div>
        <NavItem id="fornecedores" icon={<Users size={20}/>} label="Fornecedores" />
        <NavItem id="categorias" icon={<Tag size={20}/>} label="Categorias" />
      </nav>
      <div className="p-4 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-500">Gestor Financeiro v2.0</p>
      </div>
    </aside>
  )

  const NavItem = ({ id, icon, label }) => (
    <button onClick={() => setActiveTab(id)} 
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all duration-200 
      ${activeTab === id 
        ? 'bg-[#f9b410] text-black shadow-md font-bold'  // Ativo: Amarelo com texto preto
        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white' // Inativo: Cinza
      }`}>
      {icon}{label}
    </button>
  )

  const StatCard = ({ title, value, colorClass }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200 border-l-4" style={{ borderLeftColor: colorClass }}>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
    </div>
  )

  // --- RENDERIZAÇÃO ---
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-800 font-sans">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        {/* Topo */}
        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-black capitalize tracking-tight">
                    {activeTab === 'dashboard' ? 'Visão Geral' : activeTab}
                </h1>
                <p className="text-neutral-500 text-sm mt-1">Controle financeiro simplificado.</p>
            </div>
            
            {activeTab !== 'dashboard' && (
                <button onClick={() => openModal(activeTab === 'lancamentos' ? 'transaction' : activeTab === 'fornecedores' ? 'supplier' : 'category')} 
                    className="bg-[#f9b410] hover:bg-[#e0a20e] text-black px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-transform active:scale-95">
                    <Plus size={18} /> Novo Registro
                </button>
            )}
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="A Pagar (Total)" colorClass="#dc2626" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.amount, 0))} />
                <StatCard title="Pago (Total)" colorClass="#10b981" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactions.filter(t => t.status === 'Pago').reduce((acc, t) => acc + t.amount, 0))} />
                <StatCard title="Vencido" colorClass="#d97706" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transactions.filter(t => t.status === 'Vencido').reduce((acc, t) => acc + t.amount, 0))} />
                <StatCard title="Total Lançamentos" colorClass="#2563eb" value={transactions.length} />
            </div>
        )}

        {/* LANÇAMENTOS */}
        {activeTab === 'lancamentos' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-100 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-neutral-400" size={18}/>
                        <input type="text" placeholder="Buscar por descrição, fornecedor ou categoria..." className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#f9b410] focus:border-transparent" onChange={(e) => setFilter(e.target.value)} />
                    </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Vencimento</th>
                            <th className="px-6 py-3">Descrição</th>
                            <th className="px-6 py-3">Fornecedor</th>
                            <th className="px-6 py-3">Categoria</th> {/* COLUNA NOVA */}
                            <th className="px-6 py-3 text-right">Valor</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-3">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold 
                                        ${t.status === 'Pago' ? 'bg-green-100 text-green-700' : 
                                          t.status === 'Vencido' ? 'bg-red-100 text-red-700' : 
                                          'bg-yellow-100 text-yellow-800'}`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-neutral-600">{new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>
                                <td className="px-6 py-3 font-medium text-neutral-900">{t.description}</td>
                                <td className="px-6 py-3 text-neutral-600">{t.suppliers?.name || '-'}</td>
                                <td className="px-6 py-3">
                                    {t.categories?.name ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                                            {t.categories.name}
                                        </span>
                                    ) : '-'}
                                </td>
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
        )}

        {/* FORNECEDORES */}
        {activeTab === 'fornecedores' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-600 border-b font-semibold"><tr><th className="px-6 py-3">Nome</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-3 font-medium">{s.name}</td>
                                <td className="px-6 py-3 text-neutral-600">{s.type}</td>
                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal('supplier', s)} className="text-neutral-400 hover:text-blue-600 p-1"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(s.id, 'suppliers')} className="text-neutral-400 hover:text-red-600 p-1"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        
        {/* CATEGORIAS */}
        {activeTab === 'categorias' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-600 border-b font-semibold"><tr><th className="px-6 py-3">Nome</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredCategories.map(c => (
                            <tr key={c.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-3 font-medium">{c.name}</td>
                                <td className="px-6 py-3 text-neutral-600">{c.description}</td>
                                <td className="px-6 py-3 text-center flex justify-center gap-2">
                                    <button onClick={() => openModal('category', c)} className="text-neutral-400 hover:text-blue-600 p-1"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(c.id, 'categories')} className="text-neutral-400 hover:text-red-600 p-1"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

      </main>

      {/* MODAL FORMULÁRIO (ESTILO BEEHOUSE) */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200">
                  <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                      <h3 className="font-bold text-lg text-black">
                        {editingItem ? 'Editar' : 'Novo'} {modalType === 'transaction' ? 'Lançamento' : modalType === 'supplier' ? 'Fornecedor' : 'Categoria'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-black"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* INPUTS (COM BORDA FOCO AMARELA) */}
                      {modalType === 'transaction' && (
                        <>
                          <div><label className="text-xs font-bold text-neutral-500 uppercase">Descrição</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] focus:border-[#f9b410] outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Valor</label><input type="number" step="0.01" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Vencimento</label><input type="date" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Fornecedor</label>
                                <select className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none bg-white" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             </div>
                             <div><label className="text-xs font-bold text-neutral-500 uppercase">Categoria</label>
                                <select className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none bg-white" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                             </div>
                          </div>
                          <div><label className="text-xs font-bold text-neutral-500 uppercase">Status</label>
                              <select className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                  <option value="Aberto">Aberto</option>
                                  <option value="Pago">Pago</option>
                                  <option value="Vencido">Vencido</option>
                              </select>
                          </div>
                        </>
                      )}

                      {/* FORNECEDOR FORM */}
                      {modalType === 'supplier' && (
                          <>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Nome da Empresa</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Tipo</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} /></div>
                          </>
                      )}

                      {/* CATEGORIA FORM */}
                      {modalType === 'category' && (
                          <>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Nome da Categoria</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-neutral-500 uppercase">Descrição</label><input type="text" className="w-full border border-neutral-300 rounded-md p-2 mt-1 focus:ring-2 focus:ring-[#f9b410] outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                          </>
                      )}
                  </div>

                  <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 font-bold hover:bg-neutral-200 rounded-lg transition">Cancelar</button>
                      <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-[#f9b410] text-black font-bold hover:bg-[#e0a20e] rounded-lg shadow-sm transition transform active:scale-95">
                          {loading ? 'Salvando...' : 'Salvar Registro'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}