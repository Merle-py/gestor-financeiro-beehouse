'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Edit, Search } from 'lucide-react'

export default function GestorFinanceiro() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  // --- CARREGAR DADOS ---
  async function fetchTransactions() {
    setLoading(true)
    // Busca no Supabase unindo com a tabela de fornecedores
    const { data, error } = await supabase
      .from('transactions')
      .select('*, suppliers(name)')
      .order('due_date', { ascending: true })

    if (error) console.error('Erro:', error)
    else setTransactions(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // --- FUNÇÕES UTILITÁRIAS ---
  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})

  // --- FILTRO LOCAL ---
  const filteredData = transactions.filter(t => 
    t.description.toLowerCase().includes(filter.toLowerCase()) ||
    (t.suppliers?.name || '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      {/* CABEÇALHO */}
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-blue-900">Gestor Financeiro Beehouse</h1>
            <p className="text-sm text-gray-500">Controle de Contas a Pagar</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition">
            <Plus size={18} /> Novo Título
        </button>
      </header>

      {/* FILTROS E KPIs */}
      <div className="max-w-6xl mx-auto mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase">A Pagar (Total)</span>
            <div className="text-2xl font-bold text-red-600 mt-1">
                {formatMoney(transactions.filter(t => t.status !== 'Pago').reduce((acc, t) => acc + t.amount, 0))}
            </div>
         </div>
         <div className="md:col-span-3 flex items-end">
            <div className="relative w-full">
                <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Buscar por descrição ou fornecedor..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
         </div>
      </div>

      {/* TABELA */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-medium border-b">
                    <tr>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Vencimento</th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3">Fornecedor</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Carregando dados...</td></tr>
                    ) : filteredData.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                    ) : (
                        filteredData.map((t) => {
                            let statusColor = "bg-yellow-100 text-yellow-800"
                            if (t.status === 'Pago') statusColor = "bg-green-100 text-green-800"
                            if (t.status === 'Vencido') statusColor = "bg-red-100 text-red-800"

                            return (
                                <tr key={t.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{formatDate(t.due_date)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{t.description}</td>
                                    <td className="px-6 py-4">{t.suppliers?.name || '-'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-700">{formatMoney(t.amount)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-gray-400 hover:text-blue-600 mx-1"><Edit size={16}/></button>
                                        <button className="text-gray-400 hover:text-red-600 mx-1"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}