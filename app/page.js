'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import {
    Plus, Trash2, Edit, Search,
    LayoutDashboard, Receipt, Users, Tag,
    ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar, X,
    List, Kanban as KanbanIcon, Check, Menu, ChevronLeft, TrendingUp, DollarSign,
    Repeat, RefreshCw, Briefcase, Wallet, FileText, AlertCircle, Ban, Gift, Calculator, Lock, PieChart as PieIcon,
    Building2, FolderOpen, Activity, CalendarDays, MoreHorizontal, Percent, TrendingDown, Scale, ArrowRightLeft
} from 'lucide-react'
import {
    format, isWithinInterval, parseISO, isValid, differenceInCalendarDays, startOfDay, setDate, lastDayOfMonth, isSameDay, isBefore
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList, ComposedChart, Line, Area, ReferenceLine
} from 'recharts'

// --- CONSTANTES ---
const tabNames = {
    'dashboard': 'Visão Geral',
    'vendas': 'Vendas & Comissões',
    'lancamentos': 'Gestão de Lançamentos',
    'recorrencias': 'Despesas Fixas',
    'fornecedores': 'Entidades',
    'categorias': 'Plano de Contas'
};

// --- COMPONENTES AUXILIARES ---

const FilterBar = ({ filters, setFilters, categories, suppliers, dateResetKey, setDateResetKey, showDates = true, showStatus = true }) => (
    <div className="bg-white p-3 rounded-xl border border-neutral-200 mb-4 flex flex-wrap gap-3 items-end shadow-sm flex-shrink-0">
        <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block tracking-wide">Busca</label>
            <div className="relative group">
                <Search className="absolute left-2.5 top-2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                <input className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" placeholder="Buscar..." value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} />
            </div>
        </div>
        {showStatus && (
            <div className="w-32">
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block tracking-wide">Status</label>
                <select className="w-full py-1.5 px-2 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer" value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="Todos">Todos</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Pago">Pago</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Cancelado">Cancelado</option>
                </select>
            </div>
        )}
        <div className="w-40">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block tracking-wide">Plano de Contas</label>
            <select className="w-full py-1.5 px-2 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer" value={filters.category} onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}>
                <option value="Todos">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>
        <div className="w-40">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block tracking-wide">Entidade</label>
            <select className="w-full py-1.5 px-2 border border-neutral-200 bg-neutral-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer" value={filters.supplier} onChange={e => setFilters(prev => ({ ...prev, supplier: e.target.value }))}>
                <option value="Todos">Todos</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>
        {showDates && (
            <>
                <div className="w-auto min-w-[120px]"><label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block tracking-wide">De</label><input key={`start-${dateResetKey}`} type="date" className="w-full py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer" defaultValue={filters.startDate} onBlur={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                <div className="w-auto min-w-[120px]"><label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block tracking-wide">Até</label><input key={`end-${dateResetKey}`} type="date" className="w-full py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer" defaultValue={filters.endDate} onBlur={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} /></div>
            </>
        )}
        <button onClick={() => { setFilters({ search: '', status: 'Todos', category: 'Todos', supplier: 'Todos', startDate: '', endDate: '' }); setDateResetKey(k => k + 1); }} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Limpar Filtros"><X size={18} /></button>
    </div>
);

const KpiCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
    const themes = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-rose-50 text-rose-600',
        purple: 'bg-purple-50 text-purple-600',
        dark: 'bg-neutral-800 text-white'
    }
    const theme = themes[colorTheme] || themes.blue;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${theme} shadow-sm`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                {subtitle && <span className="text-[9px] font-bold uppercase tracking-wide bg-neutral-50 text-neutral-500 px-1.5 py-0.5 rounded-full truncate max-w-[100px]" title={subtitle}>{subtitle}</span>}
            </div>
            <div>
                <h4 className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate" title={title}>{title}</h4>
                <p className="text-lg font-bold text-neutral-900 tracking-tight">{value}</p>
            </div>
        </div>
    )
}

const MarginCard = ({ title, value, color }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    }
    const theme = colors[color] || colors.blue;
    return (
        <div className={`flex-1 p-3 rounded-xl border ${theme} flex flex-col items-center justify-center min-w-[120px]`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1 text-center">{title}</span>
            <span className="text-lg font-extrabold tracking-tight flex items-center gap-1">
                <Percent size={14} className="opacity-50" />
                {value.toFixed(1)}%
            </span>
        </div>
    )
}


// --- PÁGINA PRINCIPAL ---

export default function GestorFinanceiro() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [viewMode, setViewMode] = useState('kanban')
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [dateResetKey, setDateResetKey] = useState(0)

    // Novo estado para controlar a sub-aba de lançamentos
    const [lancamentoMode, setLancamentoMode] = useState('saida') // 'saida' | 'entrada'

    const [transactions, setTransactions] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [categories, setCategories] = useState([])
    const [recurringExpenses, setRecurringExpenses] = useState([])
    const [sales, setSales] = useState([])

    const [filters, setFilters] = useState({ search: '', status: 'Todos', category: 'Todos', supplier: 'Todos', startDate: '', endDate: '' })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalType, setModalType] = useState('transaction')
    const [editingItem, setEditingItem] = useState(null)

    const [saleForm, setSaleForm] = useState({ client_name: '', property_info: '', total_value: '', agency_fee_percent: '', broker_commission_percent: '', broker_id: '' })
    const [installmentForm, setInstallmentForm] = useState({ amount: '', date: '', tax_rate: '' })
    const [bonusForm, setBonusForm] = useState({ amount: '', broker_percent: '100', tax_rate: '0', date: '' })

    const [formData, setFormData] = useState({ description: '', amount: '', due_date: '', day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '', type_trans: 'despesa', nf_number: '', nf_issue_date: '', nf_received_date: '' })

    // --- HELPERS LÓGICOS ---

    const getDaysText = (t) => {
        const dueDate = parseISO(t.due_date);
        if (t.status === 'Cancelado') return <span className="text-neutral-400">Cancelado</span>;
        if (t.status === 'Pago') {
            if (t.nf_received_date) {
                const payDate = parseISO(t.nf_received_date);
                const diff = differenceInCalendarDays(dueDate, payDate);
                if (diff < 0) return <span className="text-red-600 font-bold">Pago c/ {Math.abs(diff)}d atraso</span>;
                if (diff === 0) return <span className="text-emerald-600 font-bold">Pago no dia</span>;
                return <span className="text-blue-600 font-bold">Pago {diff}d adiantado</span>;
            }
            return <span className="text-emerald-600 font-bold">Pago</span>; // Fallback se não tiver data recebimento
        }
        const diff = differenceInCalendarDays(dueDate, new Date());
        if (diff < 0) return <span className="text-red-500 font-bold">{Math.abs(diff)}d de atraso</span>;
        if (diff === 0) return <span className="text-orange-500 font-bold">Vence Hoje</span>;
        return <span className="text-neutral-500">Vence em {diff}d</span>;
    }

    const calculateSaleTotals = (sale, allTransactions) => {
        const saleTrans = allTransactions.filter(t => t.sale_id === sale.id && t.status !== 'Cancelado');
        const totalHonorarios = sale.total_value * (sale.agency_fee_percent / 100);
        const recebidoTotal = saleTrans.filter(t => t.type === 'receita' && t.status === 'Pago').reduce((acc, t) => acc + Number(t.amount), 0);
        const restanteReceber = totalHonorarios - recebidoTotal;
        const totalComissaoPrevista = totalHonorarios * (sale.broker_commission_percent / 100);
        const comissaoPaga = saleTrans.filter(t => t.type === 'despesa' && t.description.includes('Comissão') && t.status === 'Pago').reduce((acc, t) => acc + Number(t.amount), 0);
        const restanteComissao = totalComissaoPrevista - comissaoPaga;
        const impostosPagos = saleTrans.filter(t => t.type === 'despesa' && t.description.includes('Imposto') && t.status === 'Pago').reduce((acc, t) => acc + Number(t.amount), 0);
        return { totalHonorarios, recebidoTotal, restanteReceber, totalComissaoPrevista, comissaoPaga, restanteComissao, impostosPagos };
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.substring(0, 2).toUpperCase();
    }

    async function fetchAllData() {
        setLoading(true)
        try {
            const [transRes, suppRes, catRes, recurRes, salesRes] = await Promise.all([
                supabase.from('transactions').select('*, suppliers(name), categories(name)').order('due_date', { ascending: true }),
                supabase.from('suppliers').select('*').order('name', { ascending: true }),
                supabase.from('categories').select('*').order('name', { ascending: true }),
                supabase.from('recurring_expenses').select('*, suppliers(name), categories(name)').order('day_of_month', { ascending: true }),
                supabase.from('sales').select('*, suppliers(name)').order('created_at', { ascending: false })
            ])
            setTransactions(transRes.data || [])
            setSuppliers(suppRes.data || [])
            setCategories(catRes.data || [])
            setRecurringExpenses(recurRes.data || [])
            setSales(salesRes.data || [])
        } catch (error) { console.error('Erro ao buscar dados:', error); alert('Erro ao carregar dados.') } finally { setLoading(false) }
    }
    useEffect(() => { fetchAllData() }, [])

    async function forceSync() {
        setSyncing(true)
        try { await fetch('/api/cron'); await fetchAllData(); alert('Sincronizado!'); } catch (error) { alert('Erro.'); } finally { setSyncing(false) }
    }

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description?.toLowerCase().includes(filters.search.toLowerCase()) || t.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase()) || t.nf_number?.includes(filters.search)
            const matchesStatus = filters.status === 'Todos' || t.status === filters.status
            const matchesCategory = filters.category === 'Todos' || t.category_id === filters.category
            const matchesSupplier = filters.supplier === 'Todos' || t.supplier_id === filters.supplier
            let matchesDate = true
            if (filters.startDate && filters.endDate) {
                const date = parseISO(t.due_date)
                if (isValid(date)) matchesDate = isWithinInterval(date, { start: parseISO(filters.startDate), end: parseISO(filters.endDate) })
            }
            return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesDate
        })
    }, [transactions, filters])

    // --- CÁLCULOS FINANCEIROS ---
    const financialMetrics = useMemo(() => {
        const data = filteredTransactions.filter(t => t.status !== 'Cancelado');

        // VGC: Valor Geral de Comissão (Entrada Bruta)
        const vgc = data.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0);

        const isRepasse = (t) => {
            if (t.type !== 'despesa') return false;
            if (t.sale_id) return true;
            const catName = t.categories?.name?.toLowerCase() || '';
            return catName.includes('imposto') || catName.includes('comissão');
        };

        const repasses = data.filter(t => isRepasse(t)).reduce((acc, t) => acc + Number(t.amount), 0);
        const receitaLiquidaAgencia = vgc - repasses;
        const despesasFixas = data.filter(t => t.type === 'despesa' && !isRepasse(t)).reduce((acc, t) => acc + Number(t.amount), 0);
        const lucroOperacional = receitaLiquidaAgencia - despesasFixas;

        const margemRetencao = vgc > 0 ? (receitaLiquidaAgencia / vgc) * 100 : 0;
        const margemLucro = vgc > 0 ? (lucroOperacional / vgc) * 100 : 0;

        return { vgc, repasses, receitaLiquidaAgencia, despesasFixas, lucroOperacional, margemRetencao, margemLucro };
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        const catTotals = {}, flux = {};
        filteredTransactions.forEach(t => {
            if (t.status === 'Cancelado') return;
            if (t.type === 'despesa') { const cat = t.categories?.name || 'Outros'; catTotals[cat] = (catTotals[cat] || 0) + Number(t.amount); }
            const date = parseISO(t.due_date);
            if (isValid(date)) {
                const k = format(date, 'MMM/yy', { locale: ptBR });
                if (!flux[k]) flux[k] = { name: k, receita: 0, despesa: 0, saldo: 0, date: startOfDay(date).getTime() };
                const val = Number(t.amount);
                if (t.type === 'receita') {
                    flux[k].receita += val;
                    flux[k].saldo += val;
                } else {
                    flux[k].despesa += val;
                    flux[k].saldo -= val;
                }
            }
        })
        const sortedFlux = Object.values(flux).sort((a, b) => a.date - b.date);
        return { pie: Object.keys(catTotals).map(k => ({ name: k, value: catTotals[k] })).sort((a, b) => b.value - a.value), flow: sortedFlux }
    }, [filteredTransactions])

    const filteredRecurring = useMemo(() => {
        return recurringExpenses.filter(r => {
            const matchesSearch = r.description?.toLowerCase().includes(filters.search.toLowerCase()) || r.suppliers?.name?.toLowerCase().includes(filters.search.toLowerCase())
            return matchesSearch
        })
    }, [recurringExpenses, filters])

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => {
            return s.name.toLowerCase().includes(filters.search.toLowerCase()) || (s.type && s.type.toLowerCase().includes(filters.search.toLowerCase()));
        });
    }, [suppliers, filters]);

    const filteredCategories = useMemo(() => {
        return categories.filter(c => {
            return c.name.toLowerCase().includes(filters.search.toLowerCase());
        });
    }, [categories, filters]);


    const kanbanColumns = useMemo(() => {
        const today = startOfDay(new Date())
        const targetType = lancamentoMode === 'entrada' ? 'receita' : 'despesa';

        // Definição das colunas baseadas no MODO (Entrada ou Saída)
        let cols = {};

        if (lancamentoMode === 'saida') {
            cols = {
                vencido: { title: 'Vencidos', items: [], color: 'bg-red-50 border-red-100 text-red-700' },
                hoje: { title: 'Vencendo Hoje', items: [], color: 'bg-orange-50 border-orange-100 text-orange-700' },
                aberto: { title: 'A Pagar', items: [], color: 'bg-blue-50 border-blue-100 text-blue-700' },
                pago: { title: 'Pagos', items: [], color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                cancelado: { title: 'Cancelados', items: [], color: 'bg-gray-50 border-gray-100 text-gray-500' }
            }
        } else {
            cols = {
                vencido: { title: 'Atrasados', items: [], color: 'bg-red-50 border-red-100 text-red-700' },
                hoje: { title: 'Receber Hoje', items: [], color: 'bg-orange-50 border-orange-100 text-orange-700' },
                aberto: { title: 'A Receber', items: [], color: 'bg-blue-50 border-blue-100 text-blue-700' },
                pago: { title: 'Recebidos', items: [], color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                cancelado: { title: 'Cancelados', items: [], color: 'bg-gray-50 border-gray-100 text-gray-500' }
            }
        }

        // Filtra transações pelo TIPO da aba atual
        const sorted = [...filteredTransactions]
            .filter(t => t.type === targetType)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

        sorted.forEach(t => {
            if (t.status === 'Cancelado') { cols.cancelado.items.push(t); return; }
            if (t.status === 'Pago') { cols.pago.items.push(t); return }
            const dueDate = parseISO(t.due_date)
            if (isSameDay(dueDate, today)) cols.hoje.items.push(t);
            else if (isBefore(dueDate, today)) cols.vencido.items.push(t);
            else cols.aberto.items.push(t);
        })
        return cols
    }, [filteredTransactions, activeTab, lancamentoMode]) // Reage à mudança de aba de lançamentos

    async function handleSave() {
        setLoading(true)
        try {
            if (modalType === 'transaction') {
                const today = new Date().toISOString().split('T')[0]
                let finalStatus = formData.status
                if (formData.nf_received_date) finalStatus = 'Pago';
                else if (formData.status !== 'Pago' && formData.status !== 'Cancelado') {
                    if (formData.due_date < today) finalStatus = 'Vencido'
                    else finalStatus = 'Aberto'
                }

                // Força o tipo se estiver vindo da aba de lançamentos restrita
                const forcedType = (activeTab === 'lancamentos')
                    ? (lancamentoMode === 'entrada' ? 'receita' : 'despesa')
                    : formData.type_trans;

                const payload = { description: formData.description, amount: parseFloat(formData.amount), due_date: formData.due_date, supplier_id: formData.supplier_id || null, category_id: formData.category_id || null, status: finalStatus, type: forcedType, nf_number: formData.nf_number || null, nf_issue_date: formData.nf_issue_date || null, nf_received_date: formData.nf_received_date || null }
                const { error } = editingItem ? await supabase.from('transactions').update(payload).eq('id', editingItem.id) : await supabase.from('transactions').insert([payload])
                if (error) throw error
            }
            else if (modalType === 'sale') {
                const payload = { client_name: saleForm.client_name, property_info: saleForm.property_info, total_value: parseFloat(saleForm.total_value), agency_fee_percent: parseFloat(saleForm.agency_fee_percent), broker_commission_percent: parseFloat(saleForm.broker_commission_percent), broker_id: saleForm.broker_id || null }
                const { error } = editingItem
                    ? await supabase.from('sales').update(payload).eq('id', editingItem.id)
                    : await supabase.from('sales').insert([payload]);
                if (error) throw error;
            }
            else if (modalType === 'installment') {
                const amount = parseFloat(installmentForm.amount); const taxRate = parseFloat(installmentForm.tax_rate) || 0;
                const stats = calculateSaleTotals(editingItem, transactions);
                if (amount > (stats.restanteReceber + 1)) { if (!confirm(`ATENÇÃO: O valor de R$ ${amount} ultrapassa o restante a receber do contrato. Continuar?`)) { setLoading(false); return; } }
                const receitaPayload = { description: `Receb. ${editingItem.property_info} (${editingItem.client_name})`, amount: amount, due_date: installmentForm.date, status: 'Aberto', type: 'receita', sale_id: editingItem.id }
                await supabase.from('transactions').insert([receitaPayload])
                const taxValue = amount * (taxRate / 100); if (taxValue > 0) { await supabase.from('transactions').insert([{ description: `Imposto (${taxRate}%) - ${editingItem.property_info}`, amount: taxValue, due_date: installmentForm.date, status: 'Aberto', type: 'despesa', sale_id: editingItem.id }]) }
                const netAmount = amount - taxValue; const commissionValue = netAmount * (editingItem.broker_commission_percent / 100); if (commissionValue > 0) { await supabase.from('transactions').insert([{ description: `Comissão - ${editingItem.property_info}`, amount: commissionValue, due_date: installmentForm.date, status: 'Aberto', type: 'despesa', sale_id: editingItem.id, supplier_id: editingItem.broker_id }]) }
            }
            else if (modalType === 'bonus') {
                const amount = parseFloat(bonusForm.amount);
                const taxRate = parseFloat(bonusForm.tax_rate) || 0;
                const brokerPercent = parseFloat(bonusForm.broker_percent) || 0;
                await supabase.from('transactions').insert([{ description: `Bônus - ${editingItem.property_info}`, amount: amount, due_date: bonusForm.date, status: 'Aberto', type: 'receita', sale_id: editingItem.id }]);
                const brokerShare = amount * (brokerPercent / 100);
                if (brokerShare > 0) { await supabase.from('transactions').insert([{ description: `Pgto Bônus - ${editingItem.property_info}`, amount: brokerShare, due_date: bonusForm.date, status: 'Aberto', type: 'despesa', sale_id: editingItem.id, supplier_id: editingItem.broker_id }]); }
                const agencyShare = amount - brokerShare;
                if (agencyShare > 0 && taxRate > 0) {
                    const taxValue = agencyShare * (taxRate / 100);
                    await supabase.from('transactions').insert([{ description: `Imposto s/ Bônus - ${editingItem.property_info}`, amount: taxValue, due_date: bonusForm.date, status: 'Aberto', type: 'despesa', sale_id: editingItem.id }]);
                }
            }
            else if (modalType === 'recurring') {
                const payload = { description: formData.description, amount: parseFloat(formData.amount), day_of_month: parseInt(formData.day_of_month), supplier_id: formData.supplier_id || null, category_id: formData.category_id || null, active: true }
                const { error } = editingItem ? await supabase.from('recurring_expenses').update(payload).eq('id', editingItem.id) : await supabase.from('recurring_expenses').insert([payload]); if (error) throw error;
            } else {
                const table = modalType === 'supplier' ? 'suppliers' : 'categories'
                const payload = modalType === 'supplier' ? { name: formData.name, type: formData.type } : { name: formData.name, description: formData.description }
                const { error } = editingItem ? await supabase.from(table).update(payload).eq('id', editingItem.id) : await supabase.from(table).insert([payload])
                if (error) throw error
            }

            setIsModalOpen(false); setEditingItem(null); await fetchAllData()
        } catch (e) { alert(e.message) } finally { setLoading(false) }
    }

    async function updateStatus(id, newStatus) {
        if (newStatus === 'Cancelado') {
            if (!confirm('ATENÇÃO: Deseja realmente CANCELAR este lançamento? Ele será removido dos cálculos.')) return;
        } else if (newStatus === 'Pago') {
            if (!confirm('CONFIRMAÇÃO: Deseja marcar este lançamento como PAGO/RECEBIDO?')) return;
        }
        const updates = { status: newStatus };
        if (newStatus === 'Pago') { updates.nf_received_date = new Date().toISOString().split('T')[0]; }
        await supabase.from('transactions').update(updates).eq('id', id);
        fetchAllData()
    }

    async function handleDelete(id, table) {
        if (confirm('PERIGO CRÍTICO: Essa ação excluirá o registro PERMANENTEMENTE. Deseja realmente EXCLUIR para sempre?')) {
            await supabase.from(table).delete().eq('id', id);
            fetchAllData()
        }
    }

    function openModal(type, item = null) {
        setModalType(type); setEditingItem(item);
        const today = new Date().toISOString().split('T')[0]

        // Define o tipo padrão com base na aba ativa (Se estiver em lançamentos, respeita o filtro)
        let defaultType = 'despesa';
        if (activeTab === 'lancamentos' && lancamentoMode === 'entrada') defaultType = 'receita';
        if (item) defaultType = item.type; // Se for edição, respeita o item

        setFormData({ description: '', amount: '', due_date: today, day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '', type_trans: defaultType, nf_number: '', nf_issue_date: '', nf_received_date: '' })
        if (type === 'transaction' && item) setFormData({ ...item, type_trans: item.type })

        if (type === 'sale') {
            if (item) {
                setSaleForm({
                    client_name: item.client_name,
                    property_info: item.property_info,
                    total_value: item.total_value,
                    agency_fee_percent: item.agency_fee_percent,
                    broker_commission_percent: item.broker_commission_percent,
                    broker_id: item.broker_id
                })
            } else {
                setSaleForm({ client_name: '', property_info: '', total_value: '', agency_fee_percent: '6', broker_commission_percent: '30', broker_id: '' })
            }
        }

        if (type === 'installment') setInstallmentForm({ amount: '', date: today, tax_rate: '' })
        if (type === 'bonus') setBonusForm({ amount: '', broker_percent: '100', tax_rate: '0', date: today })
        setIsModalOpen(true)
    }

    const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#e11d48', '#84cc16'];

    return (
        <div className="flex h-screen overflow-hidden bg-[#f0f0f0] text-neutral-800 font-sans selection:bg-yellow-100">
            {/* SIDEBAR PRETA */}
            <aside className={`fixed top-0 left-0 h-full bg-black border-r border-neutral-900 z-30 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}>
                <div className="p-6 flex justify-between items-center h-20 border-b border-neutral-900">
                    <img src="https://www.beehouse.imb.br/assets/img/lay/logo-nov2025.svg?c=1" alt="Beehouse" className="w-32 object-contain" />
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-neutral-400"><ChevronLeft size={20} /></button>
                </div>
                <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                    {[
                        { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
                        { id: 'vendas', label: 'Vendas & Comissões', icon: Briefcase },
                        { id: 'lancamentos', label: 'Lançamentos', icon: Receipt },
                        { id: 'recorrencias', label: 'Despesas Fixas', icon: Repeat },
                        { id: 'fornecedores', label: 'Entidades', icon: Building2 },
                        { id: 'categorias', label: 'Plano de Contas', icon: FolderOpen }
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-[#f9b410] text-black font-bold shadow-md shadow-orange-900/20' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}><item.icon size={18} /> {item.label}</button>
                    ))}
                </nav>
                <div className="p-4 border-t border-neutral-900"><div className="bg-neutral-900 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#f9b410] flex items-center justify-center text-black font-bold text-xs">BH</div><div><p className="text-xs font-bold text-white">Beehouse</p><p className="text-[10px] text-neutral-500">Gestor Financeiro</p></div></div></div>
            </aside>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

            <main className={`flex-1 flex flex-col h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
                <header className="h-16 bg-white/90 backdrop-blur-md px-6 md:px-8 flex justify-between items-center flex-shrink-0 sticky top-0 z-10 border-b border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors"><Menu size={20} /></button><h1 className="text-lg font-bold text-neutral-800 tracking-tight capitalize">{tabNames[activeTab]}</h1></div>
                    <div className="flex gap-2 md:gap-3">
                        {activeTab === 'vendas' && <button onClick={() => openModal('sale')} className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"><Plus size={16} /> Nova Venda</button>}
                        {activeTab === 'lancamentos' && (<div className="bg-white border border-neutral-200 rounded-lg p-1 flex shadow-sm"><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-neutral-100 text-black' : 'text-neutral-400 hover:text-neutral-600'}`}><List size={16} /></button><button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-neutral-100 text-black' : 'text-neutral-400 hover:text-neutral-600'}`}><KanbanIcon size={16} /></button></div>)}
                        {activeTab === 'recorrencias' && <button onClick={forceSync} disabled={syncing} className="bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync</button>}
                        {activeTab === 'lancamentos' && <button onClick={() => openModal('transaction')} className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"><Plus size={16} /> Lançamento</button>}
                        {(activeTab === 'fornecedores' || activeTab === 'categorias' || activeTab === 'recorrencias') && <button onClick={() => openModal(activeTab === 'fornecedores' ? 'supplier' : activeTab === 'categorias' ? 'category' : 'recurring')} className="bg-[#f9b410] hover:bg-[#e0a20e] text-neutral-900 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"><Plus size={16} /> Novo</button>}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
                    {activeTab === 'dashboard' && (
                        <div className="w-full max-w-[98%] mx-auto space-y-4 pb-4">
                            <FilterBar filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} />

                            {/* KPI CARDS COMPACTOS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                <KpiCard title="Receita Bruta (VGC)" icon={ArrowUpRight} colorTheme="green" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.vgc)} />
                                <KpiCard title="Repasses" subtitle="Corretor/Imposto" icon={Tag} colorTheme="orange" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.repasses)} />
                                <KpiCard title="Receita Líquida" subtitle="Agência" icon={Scale} colorTheme="blue" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.receitaLiquidaAgencia)} />
                                <KpiCard title="Despesas Fixas" icon={ArrowDownRight} colorTheme="red" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.despesasFixas)} />
                                <KpiCard title="Lucro Operacional" icon={DollarSign} colorTheme="dark" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.lucroOperacional)} />
                            </div>

                            {/* MARGENS LINHA FINA */}
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-neutral-200 flex flex-wrap gap-4 justify-around items-center">
                                <MarginCard title="Margem da Agência (Retenção)" value={financialMetrics.margemRetencao} color="blue" />
                                <MarginCard title="Margem de Lucro" value={financialMetrics.margemLucro} color="emerald" />
                            </div>

                            {/* GRÁFICOS EM GRID COMPACTO */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* GRÁFICO 1: VOLUME */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 h-[280px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-sm text-neutral-700 flex items-center gap-2"><TrendingUp size={16} className="text-[#f9b410]" /> Volume</h3>
                                        <div className="flex gap-2 text-[10px] font-bold">
                                            <span className="text-emerald-600">Receita</span>
                                            <span className="text-rose-600">Despesa</span>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={chartData.flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 10 }} dy={5} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(v)} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                                            <Bar dataKey="receita" fill="#10b981" radius={[3, 3, 0, 0]} barSize={20} />
                                            <Bar dataKey="despesa" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* GRÁFICO 2: RESULTADO */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 h-[280px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-sm text-neutral-700 flex items-center gap-2"><DollarSign size={16} className="text-blue-500" /> Resultado</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={chartData.flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 10 }} dy={5} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(v)} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                                            <ReferenceLine y={0} stroke="#e5e5e5" />
                                            <Bar dataKey="saldo" radius={[3, 3, 0, 0]} barSize={30}>
                                                {chartData.flow.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.saldo >= 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* GRÁFICO 3: DISTRIBUIÇÃO */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 h-[280px]">
                                    <h3 className="font-bold text-sm text-neutral-700 mb-4 flex items-center gap-2"><FolderOpen size={16} className="text-indigo-500" /> Categorias</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <PieChart>
                                            <Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                                {chartData.pie.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />)}
                                            </Pie>
                                            <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lancamentos' && (
                        <div className="w-full max-w-[98%] mx-auto h-full flex flex-col">
                            {/* SELETOR DE MODO (ENTRADAS vs SAIDAS) */}
                            <div className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Modo de Visualização:</span>
                                <div className="flex bg-neutral-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setLancamentoMode('saida')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${lancamentoMode === 'saida' ? 'bg-white text-red-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                                    >
                                        <ArrowDownRight size={14} /> Contas a Pagar (Saídas)
                                    </button>
                                    <button
                                        onClick={() => setLancamentoMode('entrada')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${lancamentoMode === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                                    >
                                        <ArrowUpRight size={14} /> Contas a Receber (Entradas)
                                    </button>
                                </div>
                            </div>

                            <FilterBar filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} />

                            <div className="flex-1 min-h-0">
                                {viewMode === 'list' ? (
                                    <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden h-full overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b sticky top-0 z-10"><tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Vencimento</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Entidade</th><th className="px-6 py-4">Plano Contas</th><th className="px-6 py-4 text-right">Valor</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
                                            <tbody className="divide-y divide-neutral-100">
                                                {/* Filtra a lista também pelo modo selecionado */}
                                                {filteredTransactions.filter(t => t.type === (lancamentoMode === 'entrada' ? 'receita' : 'despesa')).map(t => (
                                                    <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 w-fit ${t.status === 'Pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : t.status === 'Vencido' ? 'bg-rose-50 text-rose-600 border-rose-100' : t.status === 'Cancelado' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                {t.status === 'Pago' && <Check size={10} />} {t.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4"><div className="flex flex-col"><span className="text-neutral-700 font-medium">{new Date(t.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span><span className="text-[10px]">{getDaysText(t)}</span></div></td>
                                                        <td className="px-6 py-4 font-medium text-neutral-900">{t.description}</td>
                                                        <td className="px-6 py-4 text-neutral-500">{t.suppliers?.name}</td>
                                                        <td className="px-6 py-4 text-neutral-500"><span className="bg-neutral-100 px-2 py-1 rounded text-xs">{t.categories?.name}</span></td>
                                                        <td className={`px-6 py-4 text-right font-bold text-base ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'despesa' ? '-' : '+'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {(t.status === 'Aberto' || t.status === 'Vencido') && <><button onClick={() => updateStatus(t.id, 'Pago')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition" title="Pagar"><Check size={16} /></button><button onClick={() => updateStatus(t.id, 'Cancelado')} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-100 transition" title="Cancelar"><Ban size={16} /></button></>}
                                                                <button onClick={() => openModal('transaction', t)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"><Edit size={16} /></button>
                                                                <button onClick={() => handleDelete(t.id, 'transactions')} className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="h-full overflow-x-auto">
                                        <div className="grid grid-cols-5 gap-4 h-full pb-4 min-w-[1400px]">
                                            {Object.entries(kanbanColumns).map(([key, col]) => (
                                                <div key={key} className="flex flex-col h-full rounded-2xl bg-neutral-100/70 border border-neutral-200">
                                                    <div className={`p-3 rounded-t-2xl border-b border-neutral-200 ${col.color.replace('text', 'bg').replace('50', '100')} flex justify-between items-center`}>
                                                        <h3 className={`font-bold text-xs uppercase ${col.color.split(' ')[2]}`}>{col.title}</h3>
                                                        <span className="text-xs font-bold bg-white/80 px-2 py-0.5 rounded-full shadow-sm">{col.items.length}</span>
                                                    </div>
                                                    <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                                        {col.items.map(t => (
                                                            <div key={t.id} onClick={() => openModal('transaction', t)} className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group relative">
                                                                <div className="absolute top-3 right-3 text-[9px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                                    {t.categories?.name}
                                                                </div>

                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${t.type === 'receita' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase">{getDaysText(t)}</span>
                                                                </div>

                                                                <p className="font-bold text-sm text-neutral-900 mb-1 leading-tight line-clamp-2">{t.description}</p>
                                                                <p className="text-xs text-neutral-500 mb-3 flex items-center gap-1"><Building2 size={10} /> {t.suppliers?.name}</p>

                                                                <div className="flex justify-between items-end border-t border-dashed border-neutral-100 pt-3">
                                                                    <span className={`font-extrabold text-base ${t.type === 'receita' ? 'text-emerald-600' : 'text-neutral-800'}`}>
                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                                                                    </span>

                                                                    {(t.status === 'Aberto' || t.status === 'Vencido') && (
                                                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                                            <button onClick={() => updateStatus(t.id, 'Pago')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition" title="Pagar"><Check size={14} /></button>
                                                                            <button onClick={() => updateStatus(t.id, 'Cancelado')} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-100 transition" title="Cancelar"><Ban size={14} /></button>
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

                    {(activeTab === 'recorrencias' || activeTab === 'fornecedores' || activeTab === 'categorias') && (
                        <div className="w-full max-w-[98%] mx-auto h-full flex flex-col">
                            {activeTab === 'recorrencias' && (
                                <>
                                    <div className="mb-4 flex justify-between items-center"><h3 className="font-bold text-lg text-neutral-700">Despesas Fixas & Assinaturas</h3><FilterBar showDates={false} showStatus={false} filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                                        {filteredRecurring.map(r => (
                                            <div key={r.id} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1">
                                                        <Calendar size={12} /> Dia {r.day_of_month}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <button onClick={() => openModal('recurring', r)} className="p-1 hover:bg-neutral-100 rounded text-blue-600"><Edit size={14} /></button>
                                                        <button onClick={() => handleDelete(r.id, 'recurring_expenses')} className="p-1 hover:bg-neutral-100 rounded text-red-600"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-neutral-900 mb-1 truncate" title={r.description}>{r.description}</h4>
                                                <p className="text-xs text-neutral-500 mb-4 truncate">{r.suppliers?.name || 'Fornecedor não informado'}</p>
                                                <div className="border-t pt-3 flex justify-between items-center">
                                                    <span className="text-xs text-neutral-400 uppercase font-bold">Valor Fixo</span>
                                                    <span className="font-bold text-neutral-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.amount)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {activeTab === 'fornecedores' && (
                                <>
                                    <div className="mb-4 flex justify-between items-center"><h3 className="font-bold text-lg text-neutral-700">Entidades (Clientes & Fornecedores)</h3><FilterBar showDates={false} showStatus={false} filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                                        {filteredSuppliers.map(s => (
                                            <div key={s.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold text-sm">
                                                    {getInitials(s.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-neutral-900 truncate" title={s.name}>{s.name}</h4>
                                                    <p className="text-xs text-neutral-500 truncate">{s.type || 'Geral'}</p>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => openModal('supplier', s)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition"><Edit size={14} /></button>
                                                    <button onClick={() => handleDelete(s.id, 'suppliers')} className="p-1.5 hover:bg-red-50 rounded text-red-600 transition"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {activeTab === 'categorias' && (
                                <>
                                    <div className="mb-4 flex justify-between items-center"><h3 className="font-bold text-lg text-neutral-700">Plano de Contas (Centros de Custo)</h3><FilterBar showDates={false} showStatus={false} filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} /></div>
                                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                                        {filteredCategories.map((c, idx) => (
                                            <div key={c.id} className={`p-4 flex justify-between items-center hover:bg-neutral-50 transition-colors ${idx !== filteredCategories.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-yellow-50 p-2 rounded-lg text-[#f9b410]">
                                                        <FolderOpen size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-neutral-800 text-sm">{c.name}</h4>
                                                        <p className="text-xs text-neutral-400">{c.description || 'Sem descrição'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => openModal('category', c)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(c.id, 'categories')} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"><div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50"><h3 className="font-bold text-lg text-neutral-800">{modalType === 'recurring' ? 'Conta Recorrente' : modalType === 'bonus' ? 'Lançar Bônus' : modalType === 'installment' ? 'Lançar Recebimento' : 'Novo Registro'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20} className="text-neutral-400 hover:text-neutral-800 transition-colors" /></button></div><div className="p-6 space-y-4">
                    {modalType === 'transaction' && (
                        <>
                            {/* SELETOR DE TIPO (MOSTRA APENAS SE NÃO ESTIVER NA ABA LANÇAMENTOS, POIS LÁ É TRAVADO) */}
                            {activeTab !== 'lancamentos' && (
                                <div className="flex gap-2 mb-2 p-1 bg-neutral-100 rounded-lg">
                                    <button
                                        onClick={() => setFormData({ ...formData, type_trans: 'despesa' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.type_trans === 'despesa' ? 'bg-white text-red-600 shadow-sm border border-neutral-200' : 'text-neutral-400 hover:text-neutral-600'}`}
                                    >
                                        Saída / Despesa
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, type_trans: 'receita' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.type_trans === 'receita' ? 'bg-white text-green-600 shadow-sm border border-neutral-200' : 'text-neutral-400 hover:text-neutral-600'}`}
                                    >
                                        Entrada / Receita
                                    </button>
                                </div>
                            )}

                            {/* AVISO QUANDO O TIPO ESTÁ TRAVADO PELO PIPELINE */}
                            {activeTab === 'lancamentos' && (
                                <div className={`text-xs font-bold uppercase p-2 rounded-lg text-center mb-3 ${lancamentoMode === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    Registrando {lancamentoMode === 'entrada' ? 'Entrada (Receita)' : 'Saída (Despesa)'}
                                </div>
                            )}

                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Descrição</label><input className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410] focus:border-transparent transition-all" defaultValue={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Valor</label><input type="number" step="0.01" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410] transition-all" defaultValue={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Vencimento</label><input type="date" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410] transition-all" defaultValue={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} /></div></div>
                            {/* Campos de NF */}
                            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2 flex items-center gap-1"><FileText size={12} /> Dados da Nota Fiscal / Recibo</p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div><label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Número da NF</label><input placeholder="Ex: 1234" className="w-full border p-2 rounded text-sm" defaultValue={formData.nf_number} onChange={e => setFormData({ ...formData, nf_number: e.target.value })} /></div>
                                    <div><label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Data Emissão</label><input type="date" className="w-full border p-2 rounded text-sm" defaultValue={formData.nf_issue_date} onChange={e => setFormData({ ...formData, nf_issue_date: e.target.value })} /></div>
                                </div>
                                <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Data de {formData.type_trans === 'receita' ? 'Recebimento' : 'Pagamento'}</label><input type="date" className="w-full border p-2 rounded text-sm" defaultValue={formData.nf_received_date} onChange={e => setFormData({ ...formData, nf_received_date: e.target.value })} /><p className="text-[9px] text-neutral-400 mt-1">*Preencher isso marca a conta como {formData.type_trans === 'receita' ? 'Paga/Recebida' : 'Paga'}.</p></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Entidade (Favorecido)</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Plano de Contas</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Status Inicial</label><div className="flex gap-2"><button onClick={() => setFormData({ ...formData, status: 'Aberto' })} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${formData.status === 'Aberto' ? 'bg-neutral-800 text-white border-neutral-800 shadow-md' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>Aberto</button><button onClick={() => setFormData({ ...formData, status: 'Pago' })} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${formData.status === 'Pago' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>{formData.type_trans === 'receita' ? 'Recebido' : 'Pago'}</button></div></div>
                        </>
                    )}
                    {modalType === 'recurring' && (
                        <><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Descrição</label><input placeholder="Ex: Aluguel" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Valor Fixo</label><input type="number" step="0.01" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Dia de Vencimento</label><input type="number" min="1" max="31" placeholder="Dia (1-31)" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.day_of_month} onChange={e => setFormData({ ...formData, day_of_month: e.target.value })} /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Entidade</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white" defaultValue={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Plano de Contas</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white" defaultValue={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div></>
                    )}
                    {modalType === 'sale' && (
                        <>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Nome do Cliente</label><input placeholder="Nome Completo" className="w-full border p-2 rounded" value={saleForm.client_name} onChange={e => setSaleForm({ ...saleForm, client_name: e.target.value })} /></div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Imóvel</label><input placeholder="Ex: Ap 101" className="w-full border p-2 rounded" value={saleForm.property_info} onChange={e => setSaleForm({ ...saleForm, property_info: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Valor Venda</label><input placeholder="R$ 0,00" type="number" className="w-full border p-2 rounded" value={saleForm.total_value} onChange={e => setSaleForm({ ...saleForm, total_value: e.target.value })} /></div>
                                <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">% Honorários</label><input placeholder="%" type="number" className="w-full border p-2 rounded" value={saleForm.agency_fee_percent} onChange={e => setSaleForm({ ...saleForm, agency_fee_percent: e.target.value })} /></div>
                            </div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">% Comissão Corretor (sobre honorários)</label><input placeholder="%" type="number" className="w-full border p-2 rounded" value={saleForm.broker_commission_percent} onChange={e => setSaleForm({ ...saleForm, broker_commission_percent: e.target.value })} /></div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Corretor Responsável</label><select className="w-full border p-2 rounded bg-white" value={saleForm.broker_id} onChange={e => setSaleForm({ ...saleForm, broker_id: e.target.value })}><option value="">Selecione...</option>{suppliers.filter(s => s.type === 'Parceiro' || s.type === 'Corretor').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        </>
                    )}
                    {modalType === 'installment' && (
                        <>
                            <p className="text-sm text-neutral-500 mb-2">Lançar parcela recebida. O sistema calculará Imposto e Comissão.</p>
                            <div className="bg-blue-50 p-3 rounded mb-3 text-xs space-y-1 border border-blue-200">
                                {(() => {
                                    const stats = calculateSaleTotals(editingItem, transactions);
                                    return (
                                        <>
                                            <div className="flex justify-between"><span>Total Honorários:</span> <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalHonorarios)}</b></div>
                                            <div className="flex justify-between text-green-700"><span>Já Recebido:</span> <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.recebidoTotal)}</b></div>
                                            <div className="flex justify-between border-t border-blue-200 pt-1 mt-1 font-bold"><span>Restante a Receber (Teto):</span> <b className={stats.restanteReceber < 0 ? 'text-red-600' : 'text-blue-800'}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.restanteReceber)}</b></div>
                                        </>
                                    )
                                })()}
                            </div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Valor Recebido (Bruto)</label><input placeholder="R$ 0,00" type="number" className="w-full border p-2 rounded" value={installmentForm.amount} onChange={e => setInstallmentForm({ ...installmentForm, amount: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Imposto (%)</label><input placeholder="Ex: 10.68" type="number" className="w-full border p-2 rounded" value={installmentForm.tax_rate} onChange={e => setInstallmentForm({ ...installmentForm, tax_rate: e.target.value })} /></div>
                                <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Data Recebimento</label><input type="date" className="w-full border p-2 rounded" value={installmentForm.date} onChange={e => setInstallmentForm({ ...installmentForm, date: e.target.value })} /></div>
                            </div>
                        </>
                    )}
                    {modalType === 'bonus' && (
                        <>
                            <p className="text-xs text-neutral-500 mb-2">Simulação de Bônus (Imposto incide apenas sobre a parte da imobiliária).</p>
                            <div className="bg-neutral-50 p-3 rounded mb-3 text-xs space-y-1 border border-neutral-200">
                                <div className="flex justify-between"><span>Valor Total:</span> <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bonusForm.amount || 0)}</b></div>
                                <div className="flex justify-between text-red-600"><span>(-) Corretor ({bonusForm.broker_percent}%):</span> <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((bonusForm.amount || 0) * (bonusForm.broker_percent / 100))}</b></div>
                                <div className="flex justify-between border-t pt-1 mt-1"><span>Base Imob:</span> <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((bonusForm.amount || 0) - ((bonusForm.amount || 0) * (bonusForm.broker_percent / 100)))}</b></div>
                                <div className="flex justify-between text-orange-600"><span>(-) Imposto ({bonusForm.tax_rate}%):</span> <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((bonusForm.amount || 0) - ((bonusForm.amount || 0) * (bonusForm.broker_percent / 100))) * (bonusForm.tax_rate / 100))}</b></div>
                            </div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Valor Total do Bônus</label><input placeholder="R$ 0,00" type="number" className="w-full border p-2 rounded" value={bonusForm.amount} onChange={e => setBonusForm({ ...bonusForm, amount: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">% Corretor</label><input type="number" className="w-full border p-2 rounded" value={bonusForm.broker_percent} onChange={e => setBonusForm({ ...bonusForm, broker_percent: e.target.value })} /></div>
                                <div><label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">% Imposto (Imob)</label><input type="number" className="w-full border p-2 rounded" value={bonusForm.tax_rate} onChange={e => setBonusForm({ ...bonusForm, tax_rate: e.target.value })} /></div>
                            </div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Data</label><input type="date" className="w-full border p-2 rounded" value={bonusForm.date} onChange={e => setBonusForm({ ...bonusForm, date: e.target.value })} /></div>
                        </>
                    )}
                    {(modalType === 'supplier' || modalType === 'category') && (
                        <>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Nome</label><input placeholder="Nome" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                            <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Descrição/Tipo</label><input placeholder="Descrição" className="w-full border p-2 rounded" value={modalType === 'supplier' ? formData.type : formData.description} onChange={e => setFormData({ ...formData, [modalType === 'supplier' ? 'type' : 'description']: e.target.value })} /></div>
                        </>
                    )}
                </div><div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 font-bold hover:bg-neutral-200 rounded-lg transition-colors">Cancelar</button><button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-[#f9b410] text-neutral-900 font-bold hover:bg-[#e0a20e] rounded-lg shadow-sm shadow-orange-100 transition-transform active:scale-95">{loading ? 'Salvando...' : 'Salvar Registro'}</button></div></div></div>
            )}
        </div>
    )
}