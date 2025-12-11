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
    'lancamentos': 'Contas a Pagar',
    'recorrencias': 'Despesas Fixas',
    'fornecedores': 'Entidades',
    'categorias': 'Plano de Contas'
};

// --- COMPONENTES AUXILIARES ---

const FilterBar = ({ filters, setFilters, categories, suppliers, dateResetKey, setDateResetKey, showDates = true, showStatus = true }) => (
    <div className="bg-white p-3 rounded-xl border border-neutral-200 mb-4 flex flex-wrap gap-3 items-end shadow-sm shrink-0">
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

const KpiCard = ({ title, value, subtitle, icon: Icon, colorTheme, trend }) => {
    const themes = {
        blue: { bg: 'bg-linear-to-br from-blue-50 to-blue-100', icon: 'bg-blue-500 text-white', text: 'text-blue-600' },
        green: { bg: 'bg-linear-to-br from-emerald-50 to-emerald-100', icon: 'bg-emerald-500 text-white', text: 'text-emerald-600' },
        orange: { bg: 'bg-linear-to-br from-amber-50 to-orange-100', icon: 'bg-orange-500 text-white', text: 'text-orange-600' },
        red: { bg: 'bg-linear-to-br from-rose-50 to-red-100', icon: 'bg-rose-500 text-white', text: 'text-rose-600' },
        purple: { bg: 'bg-linear-to-br from-purple-50 to-violet-100', icon: 'bg-purple-500 text-white', text: 'text-purple-600' },
        dark: { bg: 'bg-linear-to-br from-neutral-800 to-neutral-900', icon: 'bg-white text-neutral-800', text: 'text-white' }
    }
    const theme = themes[colorTheme] || themes.blue;

    return (
        <div className={`${theme.bg} p-5 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-between hover:translate-y-[-3px] hover:shadow-lg transition-all duration-300 group`}>
            <div className="flex justify-between items-start mb-3">
                <div className={`p-3 rounded-xl ${theme.icon} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={20} strokeWidth={2} />
                </div>
                {subtitle && <span className="text-[9px] font-bold uppercase tracking-wide bg-white/50 text-neutral-600 px-2 py-1 rounded-full">{subtitle}</span>}
            </div>
            <div>
                <h4 className={`${theme.text} text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80`}>{title}</h4>
                <p className={`text-2xl font-extrabold ${colorTheme === 'dark' ? 'text-white' : 'text-neutral-900'} tracking-tight`}>{value}</p>
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
    const [showQuickMenu, setShowQuickMenu] = useState(false)

    const [transactions, setTransactions] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [categories, setCategories] = useState([])
    const [recurringExpenses, setRecurringExpenses] = useState([])

    const [filters, setFilters] = useState({ search: '', status: 'Todos', category: 'Todos', supplier: 'Todos', startDate: '', endDate: '' })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalType, setModalType] = useState('transaction')
    const [editingItem, setEditingItem] = useState(null)

    const [formData, setFormData] = useState({ description: '', amount: '', due_date: '', day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '', nf_number: '', nf_issue_date: '', nf_received_date: '', fine_amount: '', interest_amount: '' })

    // Estado para modal de confirmação de pagamento
    const [paymentModal, setPaymentModal] = useState({ open: false, transaction: null })
    const [paymentData, setPaymentData] = useState({ payment_date: '', fine_amount: '', interest_amount: '' })

    // Estado para modal de confirmação de exclusão
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, table: null, description: '' })

    // Estado para modal de confirmação de cancelamento
    const [cancelModal, setCancelModal] = useState({ open: false, transaction: null })

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
            return <span className="text-emerald-600 font-bold">Pago</span>;
        }
        const diff = differenceInCalendarDays(dueDate, new Date());
        if (diff < 0) return <span className="text-red-500 font-bold">{Math.abs(diff)}d de atraso</span>;
        if (diff === 0) return <span className="text-orange-500 font-bold">Vence Hoje</span>;
        return <span className="text-neutral-500">Vence em {diff}d</span>;
    }

    const getInitials = (name) => {
        if (!name) return '??';
        return name.substring(0, 2).toUpperCase();
    }

    async function fetchAllData() {
        setLoading(true)
        try {
            const [transRes, suppRes, catRes, recurRes] = await Promise.all([
                supabase.from('transactions').select('*, suppliers(name), categories(name)').eq('type', 'despesa').order('due_date', { ascending: true }),
                supabase.from('suppliers').select('*').order('name', { ascending: true }),
                supabase.from('categories').select('*').order('name', { ascending: true }),
                supabase.from('recurring_expenses').select('*, suppliers(name), categories(name)').order('day_of_month', { ascending: true })
            ])
            setTransactions(transRes.data || [])
            setSuppliers(suppRes.data || [])
            setCategories(catRes.data || [])
            setRecurringExpenses(recurRes.data || [])
        } catch (error) { console.error('Erro ao buscar dados:', error); alert('Erro ao carregar dados.') } finally { setLoading(false) }
    }
    useEffect(() => { fetchAllData() }, [])

    async function forceSync() {
        setSyncing(true)
        try {
            console.log('Iniciando sincronização...');
            const response = await fetch('/api/cron');
            const result = await response.json();
            console.log('Resultado da sincronização:', result);

            if (result.success) {
                await fetchAllData();

                // Monta mensagem informativa
                let msg = '✅ Sincronização concluída!\n\n';
                if (result.sync) {
                    msg += `📋 Recorrências encontradas: ${result.sync.recorrenciasEncontradas}\n`;
                    msg += `📦 Transações no banco: ${result.sync.transacoesExistentes}\n`;
                    msg += `➕ Lançamentos criados: ${result.sync.lancamentosCriados}\n`;

                    if (result.sync.message) {
                        msg += `\n⚠️ ${result.sync.message}`;
                    }
                }

                alert(msg);
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
            alert('❌ Erro ao sincronizar: ' + error.message);
        } finally {
            setSyncing(false)
        }
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
        const today = new Date().toISOString().split('T')[0];
        const data = filteredTransactions.filter(t => t.status !== 'Cancelado');
        const totalDespesas = data.reduce((acc, t) => acc + Number(t.amount), 0);
        const despesasPagas = data.filter(t => t.status === 'Pago').reduce((acc, t) => acc + Number(t.amount), 0);

        // Contas vencidas: status 'Vencido' OU status 'Aberto' com data anterior a hoje
        const despesasVencidas = data.filter(t =>
            t.status === 'Vencido' || (t.status === 'Aberto' && t.due_date < today)
        ).reduce((acc, t) => acc + Number(t.amount), 0);

        // Contas em aberto: apenas as com status 'Aberto' e data >= hoje
        const despesasAbertas = data.filter(t =>
            t.status === 'Aberto' && t.due_date >= today
        ).reduce((acc, t) => acc + Number(t.amount), 0);

        return { totalDespesas, despesasPagas, despesasAbertas, despesasVencidas };
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        const expenseCatTotals = {};
        const flux = {};

        filteredTransactions.forEach(t => {
            if (t.status === 'Cancelado') return;

            const cat = t.categories?.name || 'Outros';
            expenseCatTotals[cat] = (expenseCatTotals[cat] || 0) + Number(t.amount);

            const date = parseISO(t.due_date);
            if (isValid(date)) {
                const k = format(date, 'MMM/yy', { locale: ptBR });
                if (!flux[k]) flux[k] = { name: k, despesa: 0, date: startOfDay(date).getTime() };
                flux[k].despesa += Number(t.amount);
            }
        })
        const sortedFlux = Object.values(flux).sort((a, b) => a.date - b.date);

        return {
            pieExpense: Object.keys(expenseCatTotals).map(k => ({ name: k, value: expenseCatTotals[k] })).sort((a, b) => b.value - a.value),
            flow: sortedFlux
        }
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

        const cols = {
            vencido: { title: 'Vencidos', items: [], color: 'bg-red-50 border-red-100 text-red-700' },
            hoje: { title: 'Vencendo Hoje', items: [], color: 'bg-orange-50 border-orange-100 text-orange-700' },
            aberto: { title: 'A Pagar', items: [], color: 'bg-blue-50 border-blue-100 text-blue-700' },
            pago: { title: 'Pagos', items: [], color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
            cancelado: { title: 'Cancelados', items: [], color: 'bg-gray-50 border-gray-100 text-gray-500' }
        }

        const sorted = [...filteredTransactions].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

        sorted.forEach(t => {
            if (t.status === 'Cancelado') { cols.cancelado.items.push(t); return; }
            if (t.status === 'Pago') { cols.pago.items.push(t); return }
            const dueDate = parseISO(t.due_date)
            if (isSameDay(dueDate, today)) cols.hoje.items.push(t);
            else if (isBefore(dueDate, today)) cols.vencido.items.push(t);
            else cols.aberto.items.push(t);
        })
        return cols
    }, [filteredTransactions, activeTab])

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

                const payload = {
                    description: formData.description,
                    amount: parseFloat(formData.amount),
                    due_date: formData.due_date,
                    supplier_id: formData.supplier_id || null,
                    category_id: formData.category_id || null,
                    status: finalStatus,
                    type: 'despesa',
                    nf_number: formData.nf_number || null,
                    nf_issue_date: formData.nf_issue_date || null,
                    nf_received_date: formData.nf_received_date || null,
                    fine_amount: parseFloat(formData.fine_amount) || 0,
                    interest_amount: parseFloat(formData.interest_amount) || 0
                }
                const { error } = editingItem ? await supabase.from('transactions').update(payload).eq('id', editingItem.id) : await supabase.from('transactions').insert([payload])
                if (error) throw error
            }
            else if (modalType === 'recurring') {
                const recurringPayload = {
                    description: formData.description,
                    amount: parseFloat(formData.amount),
                    day_of_month: parseInt(formData.day_of_month),
                    supplier_id: formData.supplier_id || null,
                    category_id: formData.category_id || null,
                    active: true
                }

                if (editingItem) {
                    // Atualiza a regra de recorrência
                    const { error } = await supabase.from('recurring_expenses').update(recurringPayload).eq('id', editingItem.id);
                    if (error) throw error;

                    // Atualiza automaticamente todas as transações não pagas dessa recorrência
                    const { error: updateError } = await supabase
                        .from('transactions')
                        .update({
                            description: formData.description,
                            amount: parseFloat(formData.amount),
                            supplier_id: formData.supplier_id || null,
                            category_id: formData.category_id || null
                        })
                        .eq('recurring_rule_id', editingItem.id)
                        .neq('status', 'Pago')
                        .neq('status', 'Cancelado');

                    if (updateError) console.error('Erro ao atualizar transações:', updateError);
                } else {
                    // Insere nova recorrência
                    const { error } = await supabase.from('recurring_expenses').insert([recurringPayload]);
                    if (error) throw error;
                }

                // Sincroniza automaticamente para gerar as transações
                try {
                    await fetch('/api/cron');
                } catch (syncError) {
                    console.error('Erro na sincronização:', syncError);
                }
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
            // Encontra a transação para abrir o modal
            const transaction = transactions.find(t => t.id === id);
            if (transaction) {
                setCancelModal({ open: true, transaction });
            }
        } else if (newStatus === 'Pago') {
            // Encontra a transação para abrir o modal
            const transaction = transactions.find(t => t.id === id);
            if (transaction) {
                openPaymentModal(transaction);
            }
        }
    }

    async function confirmCancel() {
        if (!cancelModal.transaction) return;

        setLoading(true);
        try {
            await supabase.from('transactions').update({ status: 'Cancelado' }).eq('id', cancelModal.transaction.id);
            setCancelModal({ open: false, transaction: null });
            await fetchAllData();
        } catch (e) {
            alert('Erro ao cancelar: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    function openPaymentModal(transaction) {
        const today = new Date().toISOString().split('T')[0];
        setPaymentData({ payment_date: today, fine_amount: '', interest_amount: '' });
        setPaymentModal({ open: true, transaction });
    }

    async function confirmPayment() {
        if (!paymentModal.transaction) return;
        if (!paymentData.payment_date) {
            alert('Por favor, informe a data do pagamento.');
            return;
        }

        setLoading(true);
        try {
            const updates = {
                status: 'Pago',
                nf_received_date: paymentData.payment_date,
                fine_amount: parseFloat(paymentData.fine_amount) || 0,
                interest_amount: parseFloat(paymentData.interest_amount) || 0
            };
            await supabase.from('transactions').update(updates).eq('id', paymentModal.transaction.id);
            setPaymentModal({ open: false, transaction: null });
            fetchAllData();
        } catch (e) {
            alert('Erro ao confirmar pagamento: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    function handleDelete(id, table, description = 'este item') {
        console.log('handleDelete chamado:', { id, table, description });
        // Abre o modal de confirmação em vez de usar window.confirm
        setDeleteModal({ open: true, id, table, description });
    }

    async function confirmDelete() {
        if (!deleteModal.id || !deleteModal.table) return;

        setLoading(true);
        try {
            console.log('Tentando deletar de:', deleteModal.table, 'com id:', deleteModal.id);
            const { error } = await supabase.from(deleteModal.table).delete().eq('id', deleteModal.id);
            if (error) {
                console.error('Erro do Supabase:', error);
                throw error;
            }
            console.log('Deletado com sucesso!');
            setDeleteModal({ open: false, id: null, table: null, description: '' });
            await fetchAllData();
        } catch (e) {
            console.error('Erro ao excluir:', e);
            alert('Erro ao excluir: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    function openModal(type, item = null) {
        setModalType(type); setEditingItem(item);
        const today = new Date().toISOString().split('T')[0]

        setFormData({ description: '', amount: '', due_date: today, day_of_month: '', supplier_id: '', category_id: '', status: 'Aberto', name: '', type: '', nf_number: '', nf_issue_date: '', nf_received_date: '', fine_amount: '', interest_amount: '' })
        if (type === 'transaction' && item) setFormData({ ...item, fine_amount: item.fine_amount || '', interest_amount: item.interest_amount || '' })
        if (type === 'recurring' && item) setFormData({ ...item })
        if ((type === 'supplier' || type === 'category') && item) setFormData({ ...item })
        setIsModalOpen(true)
    }

    const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#e11d48', '#84cc16'];

    return (
        <div className="flex h-screen overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 text-neutral-800 font-sans selection:bg-yellow-100">
            {/* SIDEBAR PREMIUM */}
            <aside className={`fixed top-0 left-0 h-full sidebar-gradient border-r border-neutral-800/50 z-30 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'}`}>
                <div className="p-6 flex justify-between items-center h-24 border-b border-neutral-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#f9b410] to-[#d99a0e] flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Wallet className="text-black" size={20} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Gestor Financeiro</p>
                            <p className="text-neutral-500 text-[10px] font-medium">Beehouse</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-neutral-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider px-3 mb-3">Menu Principal</p>
                    {[
                        { id: 'dashboard', label: 'Visão Geral', desc: 'Resumo e métricas', icon: LayoutDashboard },
                        { id: 'lancamentos', label: 'Contas a Pagar', desc: 'Gerencie pagamentos', icon: Receipt },
                        { id: 'recorrencias', label: 'Despesas Fixas', desc: 'Pagamentos recorrentes', icon: Repeat },
                    ].map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 animate-slide-in ${activeTab === item.id ? 'bg-linear-to-r from-[#f9b410] to-[#e0a20e] text-black shadow-lg shadow-amber-500/30' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === item.id ? 'bg-black/10' : 'bg-neutral-800'}`}>
                                <item.icon size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{item.label}</p>
                                <p className={`text-[10px] ${activeTab === item.id ? 'text-black/60' : 'text-neutral-600'}`}>{item.desc}</p>
                            </div>
                        </button>
                    ))}

                    <div className="h-px bg-neutral-800 my-4"></div>
                    <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider px-3 mb-3">Configurações</p>

                    {[
                        { id: 'fornecedores', label: 'Entidades', desc: 'Fornecedores e parceiros', icon: Building2 },
                        { id: 'categorias', label: 'Plano de Contas', desc: 'Categorias de despesas', icon: FolderOpen }
                    ].map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${activeTab === item.id ? 'bg-linear-to-r from-[#f9b410] to-[#e0a20e] text-black shadow-lg shadow-amber-500/30' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === item.id ? 'bg-black/10' : 'bg-neutral-800'}`}>
                                <item.icon size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{item.label}</p>
                                <p className={`text-[10px] ${activeTab === item.id ? 'text-black/60' : 'text-neutral-600'}`}>{item.desc}</p>
                            </div>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-800/50">
                    <div className="bg-linear-to-r from-neutral-800 to-neutral-900 p-4 rounded-xl flex items-center gap-3 shadow-inner">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#f9b410] to-[#d99a0e] flex items-center justify-center text-black font-bold text-xs shadow-lg">BH</div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white">Beehouse Imobiliária</p>
                            <p className="text-[10px] text-neutral-500">Gestor v2.0</p>
                        </div>
                    </div>
                </div>
            </aside>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

            <main className={`flex-1 flex flex-col h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}>
                <header className="h-20 glass-card px-6 md:px-8 flex justify-between items-center shrink-0 sticky top-0 z-10 border-b border-neutral-200/50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-all duration-200 hover:scale-105">
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{tabNames[activeTab]}</h1>
                            <p className="text-xs text-neutral-400">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        {activeTab === 'lancamentos' && (
                            <div className="bg-white border border-neutral-200 rounded-xl p-1 flex shadow-sm">
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-neutral-100 text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
                                    <List size={16} />
                                    <span className="text-xs font-medium hidden md:inline">Lista</span>
                                </button>
                                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-neutral-100 text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
                                    <KanbanIcon size={16} />
                                    <span className="text-xs font-medium hidden md:inline">Kanban</span>
                                </button>
                            </div>
                        )}
                        {activeTab === 'recorrencias' && (
                            <button onClick={forceSync} disabled={syncing} className="bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all hover:scale-105">
                                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                Sincronizar
                            </button>
                        )}

                        {/* Menu de Criação Rápida - Disponível em todas as abas */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQuickMenu(!showQuickMenu)}
                                className="btn-primary text-neutral-900 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-105 active:scale-95"
                            >
                                <Plus size={16} />
                                <span className="hidden md:inline">Novo</span>
                                <ChevronLeft size={14} className={`transition-transform duration-200 ${showQuickMenu ? 'rotate-90' : '-rotate-90'}`} />
                            </button>

                            {showQuickMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowQuickMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50 animate-fade-in">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-4 py-2">Criação Rápida</p>

                                        <button
                                            onClick={() => { openModal('transaction'); setShowQuickMenu(false); }}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Receipt size={16} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-neutral-800">Novo Pagamento</p>
                                                <p className="text-[10px] text-neutral-400">Conta avulsa</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { openModal('recurring'); setShowQuickMenu(false); }}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                                <Repeat size={16} className="text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-neutral-800">Despesa Recorrente</p>
                                                <p className="text-[10px] text-neutral-400">Pagamento mensal fixo</p>
                                            </div>
                                        </button>

                                        <div className="h-px bg-neutral-100 my-2" />

                                        <button
                                            onClick={() => { openModal('supplier'); setShowQuickMenu(false); }}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                <Building2 size={16} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-neutral-800">Nova Entidade</p>
                                                <p className="text-[10px] text-neutral-400">Fornecedor ou parceiro</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { openModal('category'); setShowQuickMenu(false); }}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                                <FolderOpen size={16} className="text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-neutral-800">Nova Categoria</p>
                                                <p className="text-[10px] text-neutral-400">Plano de contas</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <div className="w-full max-w-[98%] mx-auto space-y-6 pb-4 animate-fade-in">
                            <FilterBar filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} />

                            {/* KPI CARDS PREMIUM */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <KpiCard title="Total de Pagamentos" icon={Wallet} colorTheme="blue" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.totalDespesas)} />
                                <KpiCard title="Pagos" icon={Check} colorTheme="green" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.despesasPagas)} />
                                <KpiCard title="Em Aberto" icon={Calendar} colorTheme="orange" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.despesasAbertas)} />
                                <KpiCard title="Vencidos" icon={AlertTriangle} colorTheme="red" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.despesasVencidas)} />
                            </div>

                            {/* CONTAS VENCIDAS - Alerta Crítico */}
                            {(() => {
                                const today = new Date().toISOString().split('T')[0];
                                const todayDate = startOfDay(new Date());

                                const overduePayments = filteredTransactions
                                    .filter(t => (t.status === 'Aberto' || t.status === 'Vencido') && t.due_date)
                                    .filter(t => t.due_date < today)
                                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

                                if (overduePayments.length === 0) return null;

                                const totalOverdue = overduePayments.reduce((acc, t) => acc + Number(t.amount), 0);

                                return (
                                    <div className="bg-linear-to-r from-red-50 via-rose-50 to-red-50 p-5 rounded-2xl border border-red-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-500 rounded-xl text-white shadow-lg animate-pulse">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-red-800">⚠️ Contas Vencidas</h3>
                                                    <p className="text-xs text-red-600">
                                                        {overduePayments.length} conta(s) atrasada(s) - Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOverdue)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('lancamentos')}
                                                className="text-xs font-bold text-red-700 hover:text-red-900 hover:underline transition-colors"
                                            >
                                                Ver todas →
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                                            {overduePayments.slice(0, 5).map(payment => {
                                                const dueDate = parseISO(payment.due_date);
                                                const daysOverdue = differenceInCalendarDays(todayDate, dueDate);

                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className="bg-white p-4 rounded-xl border border-red-300 hover:shadow-md transition-all cursor-pointer"
                                                        onClick={() => openModal('transaction', payment)}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white">
                                                                {daysOverdue}d atraso
                                                            </span>
                                                            <span className="text-[10px] text-neutral-500">{format(dueDate, 'dd/MM')}</span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-neutral-800 truncate mb-1" title={payment.description}>{payment.description}</p>
                                                        <p className="text-lg font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {overduePayments.length > 5 && (
                                            <p className="text-xs text-red-600 mt-3 text-center">
                                                + {overduePayments.length - 5} outra(s) conta(s) vencida(s)
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* PRÓXIMOS VENCIMENTOS - Alerta Visual */}
                            {(() => {
                                const today = startOfDay(new Date());
                                const in7Days = new Date(today);
                                in7Days.setDate(in7Days.getDate() + 7);

                                const upcomingPayments = filteredTransactions
                                    .filter(t => t.status === 'Aberto' && t.due_date)
                                    .filter(t => {
                                        const dueDate = parseISO(t.due_date);
                                        return isValid(dueDate) && dueDate >= today && dueDate <= in7Days;
                                    })
                                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                                    .slice(0, 5);

                                if (upcomingPayments.length === 0) return null;

                                return (
                                    <div className="bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg animate-pulse-soft">
                                                    <AlertCircle size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-amber-800">Próximos Vencimentos</h3>
                                                    <p className="text-xs text-amber-600">{upcomingPayments.length} conta(s) vencem nos próximos 7 dias</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('lancamentos')}
                                                className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline transition-colors"
                                            >
                                                Ver todas →
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                                            {upcomingPayments.map(payment => {
                                                const dueDate = parseISO(payment.due_date);
                                                const daysUntil = differenceInCalendarDays(dueDate, today);
                                                const isToday = daysUntil === 0;
                                                const isTomorrow = daysUntil === 1;

                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className={`bg-white p-4 rounded-xl border ${isToday ? 'border-red-300 bg-red-50' : isTomorrow ? 'border-orange-300 bg-orange-50' : 'border-amber-200'} hover:shadow-md transition-all cursor-pointer`}
                                                        onClick={() => openModal('transaction', payment)}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isToday ? 'bg-red-500 text-white' : isTomorrow ? 'bg-orange-500 text-white' : 'bg-amber-200 text-amber-800'}`}>
                                                                {isToday ? 'Hoje!' : isTomorrow ? 'Amanhã' : `${daysUntil} dias`}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-500">{format(dueDate, 'dd/MM')}</span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-neutral-800 truncate mb-1" title={payment.description}>{payment.description}</p>
                                                        <p className="text-lg font-bold text-neutral-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* GRÁFICOS EM GRID COMPACTO */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* GRÁFICO 1: PAGAMENTOS POR MÊS */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 h-[280px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-sm text-neutral-700 flex items-center gap-2"><TrendingUp size={16} className="text-[#f9b410]" /> Pagamentos por Mês</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={chartData.flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 10 }} dy={5} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0a0a0', fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(v)} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                                            <Bar dataKey="despesa" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={30} name="Pagamentos" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* GRÁFICO 2: POR CATEGORIA */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 h-[280px] flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-sm text-neutral-700 flex items-center gap-2"><FolderOpen size={16} className="text-indigo-500" /> Pagamentos por Categoria</h3>
                                    </div>
                                    <div className="flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={chartData.pieExpense} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                                                    {chartData.pieExpense.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />)}
                                                </Pie>
                                                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", style: 'currency', currency: 'BRL' }).format(value)} contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', lineHeight: '10px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'lancamentos' && (
                        <div className="w-full max-w-[98%] mx-auto h-full flex flex-col">
                            <FilterBar filters={filters} setFilters={setFilters} categories={categories} suppliers={suppliers} dateResetKey={dateResetKey} setDateResetKey={setDateResetKey} />

                            <div className="flex-1 min-h-0">
                                {viewMode === 'list' ? (
                                    <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden h-full overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b sticky top-0 z-10"><tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Vencimento</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Entidade</th><th className="px-6 py-4">Plano Contas</th><th className="px-6 py-4 text-right">Valor</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
                                            <tbody className="divide-y divide-neutral-100">
                                                {filteredTransactions.map(t => (
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
                                                        <td className="px-6 py-4 text-right font-bold text-base text-rose-600">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</td>
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
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Pago' ? 'bg-emerald-500' : t.status === 'Cancelado' ? 'bg-neutral-400' : t.status === 'Vencido' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
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
                        <div className="w-full max-w-[98%] mx-auto flex flex-col overflow-y-auto pb-10">
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
                                                        <button onClick={() => handleDelete(r.id, 'recurring_expenses', r.description)} className="p-1 hover:bg-neutral-100 rounded text-red-600"><Trash2 size={14} /></button>
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
                                                    <button onClick={() => handleDelete(s.id, 'suppliers', s.name)} className="p-1.5 hover:bg-red-50 rounded text-red-600 transition"><Trash2 size={14} /></button>
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
                                                    <button onClick={() => handleDelete(c.id, 'categories', c.name)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"><Trash2 size={16} /></button>
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

            {/* MODAL PREMIUM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-neutral-900/70 z-50 flex items-center justify-center backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-linear-to-r from-neutral-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl shadow-md ${modalType === 'transaction' ? 'bg-blue-500 text-white' : modalType === 'recurring' ? 'bg-purple-500 text-white' : modalType === 'supplier' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {modalType === 'transaction' && <Receipt size={18} />}
                                    {modalType === 'recurring' && <Repeat size={18} />}
                                    {modalType === 'supplier' && <Building2 size={18} />}
                                    {modalType === 'category' && <FolderOpen size={18} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-neutral-800">
                                        {modalType === 'transaction' ? (editingItem ? 'Editar Pagamento' : 'Novo Pagamento') :
                                            modalType === 'recurring' ? (editingItem ? 'Editar Recorrência' : 'Nova Despesa Fixa') :
                                                modalType === 'supplier' ? (editingItem ? 'Editar Entidade' : 'Nova Entidade') :
                                                    (editingItem ? 'Editar Categoria' : 'Nova Categoria')}
                                    </h3>
                                    <p className="text-xs text-neutral-400">Preencha os campos abaixo</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                                <X size={20} className="text-neutral-400 hover:text-neutral-800 transition-colors" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {modalType === 'transaction' && (
                                <>
                                    <div>
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Descrição *</label>
                                        <input
                                            className="w-full border-2 border-neutral-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all text-neutral-800 placeholder:text-neutral-300"
                                            placeholder="Ex: Aluguel do escritório"
                                            defaultValue={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Valor *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full border-2 border-neutral-200 rounded-xl p-3 pl-10 outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                                                    placeholder="0,00"
                                                    defaultValue={formData.amount}
                                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Vencimento *</label>
                                            <input
                                                type="date"
                                                className="w-full border-2 border-neutral-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                                                defaultValue={formData.due_date}
                                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Bloco de Baixa/Pagamento */}
                                    <div className="bg-linear-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
                                        <p className="text-[11px] font-bold text-emerald-700 uppercase mb-3 flex items-center gap-2">
                                            <Check size={14} /> Confirmação de Pagamento
                                        </p>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Data de Pagamento</label>
                                                <input
                                                    type="date"
                                                    className="w-full border-2 border-emerald-200 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                                                    defaultValue={formData.nf_received_date}
                                                    onChange={e => setFormData({ ...formData, nf_received_date: e.target.value })}
                                                />
                                            </div>

                                            {/* Campos de Multa e Juros - só aparecem se conta vencida E tem data de pagamento */}
                                            {formData.nf_received_date && formData.due_date && new Date(formData.due_date) < new Date(new Date().toISOString().split('T')[0]) && (
                                                <div className="bg-red-50/50 p-3 rounded-lg border border-red-200 space-y-3">
                                                    <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Encargos por Atraso (conta vencida)
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Multa</label>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">R$</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0,00"
                                                                    className="w-full border-2 border-red-200 rounded-lg p-2 pl-8 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                                                                    value={formData.fine_amount}
                                                                    onChange={e => setFormData({ ...formData, fine_amount: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Juros</label>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">R$</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0,00"
                                                                    className="w-full border-2 border-red-200 rounded-lg p-2 pl-8 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                                                                    value={formData.interest_amount}
                                                                    onChange={e => setFormData({ ...formData, interest_amount: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(parseFloat(formData.fine_amount) > 0 || parseFloat(formData.interest_amount) > 0) && (
                                                        <div className="flex justify-between items-center pt-2 border-t border-red-200">
                                                            <span className="text-[10px] font-bold text-red-700">Total com encargos:</span>
                                                            <span className="font-bold text-red-700">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                                    (parseFloat(formData.amount) || 0) +
                                                                    (parseFloat(formData.fine_amount) || 0) +
                                                                    (parseFloat(formData.interest_amount) || 0)
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                                                <AlertCircle size={10} /> Preencher data marca automaticamente como "Pago"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Entidade (Favorecido)</label>
                                            <select
                                                className="w-full border-2 border-neutral-200 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 cursor-pointer"
                                                defaultValue={formData.supplier_id}
                                                onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Categoria</label>
                                            <select
                                                className="w-full border-2 border-neutral-200 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 cursor-pointer"
                                                defaultValue={formData.category_id}
                                                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">Status</label>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setFormData({ ...formData, status: 'Aberto' })}
                                                className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${formData.status === 'Aberto' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
                                            >
                                                <Calendar size={16} /> Aberto
                                            </button>
                                            <button
                                                onClick={() => setFormData({ ...formData, status: 'Pago' })}
                                                className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${formData.status === 'Pago' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
                                            >
                                                <Check size={16} /> Pago
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            {modalType === 'recurring' && (
                                <><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Descrição</label><input placeholder="Ex: Aluguel" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Valor Fixo</label><input type="number" step="0.01" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Dia de Vencimento</label><input type="number" min="1" max="31" placeholder="Dia (1-31)" className="w-full border border-neutral-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#f9b410]" defaultValue={formData.day_of_month} onChange={e => setFormData({ ...formData, day_of_month: e.target.value })} /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Entidade</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white" defaultValue={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}><option value="">Selecione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Plano de Contas</label><select className="w-full border border-neutral-200 rounded-lg p-2.5 bg-white" defaultValue={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}><option value="">Selecione...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div></>
                            )}

                            {(modalType === 'supplier' || modalType === 'category') && (
                                <>
                                    <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Nome</label><input placeholder="Nome" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>

                                    {modalType === 'supplier' ? (
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Tipo de Entidade</label>
                                            <select
                                                className="w-full border p-2 rounded bg-white text-sm"
                                                value={formData.type || ''}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Corretor">Corretor</option>
                                                <option value="Empresa">Empresa</option>
                                                <option value="Parceiro">Parceiro</option>
                                                <option value="Cliente">Cliente</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div><label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Descrição</label><input placeholder="Descrição" className="w-full border p-2 rounded" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="px-6 py-5 bg-linear-to-r from-neutral-50 to-white border-t border-neutral-100 flex justify-between items-center">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-200 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-8 py-3 btn-primary text-neutral-900 font-bold rounded-xl flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Salvar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE PAGAMENTO */}
            {paymentModal.open && paymentModal.transaction && (
                <div className="fixed inset-0 bg-neutral-900/70 z-50 flex items-center justify-center backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        {/* Header */}
                        <div className="bg-linear-to-r from-emerald-500 to-green-600 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <Check size={28} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl">Confirmar Pagamento</h2>
                                    <p className="text-white/80 text-sm">{paymentModal.transaction.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 space-y-4">
                            {/* Valor da conta */}
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Valor Original</p>
                                <p className="text-2xl font-extrabold text-neutral-800">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentModal.transaction.amount)}
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Vencimento: {format(parseISO(paymentModal.transaction.due_date), "dd/MM/yyyy")}
                                </p>
                            </div>

                            {/* Data de Pagamento */}
                            <div>
                                <label className="text-[11px] font-bold text-neutral-500 uppercase block mb-2">
                                    Data do Pagamento *
                                </label>
                                <input
                                    type="date"
                                    className="w-full border-2 border-neutral-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                                    value={paymentData.payment_date}
                                    onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                />
                            </div>

                            {/* Encargos (opcional) - só aparece se conta está vencida */}
                            {paymentModal.transaction && new Date(paymentModal.transaction.due_date) < new Date(new Date().toISOString().split('T')[0]) && (
                                <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-3">
                                    <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                                        <AlertTriangle size={12} /> Encargos por Atraso (conta vencida)
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Multa</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0,00"
                                                    className="w-full border-2 border-red-200 rounded-lg p-2.5 pl-10 bg-white outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                                                    value={paymentData.fine_amount}
                                                    onChange={e => setPaymentData({ ...paymentData, fine_amount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Juros</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0,00"
                                                    className="w-full border-2 border-red-200 rounded-lg p-2.5 pl-10 bg-white outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all"
                                                    value={paymentData.interest_amount}
                                                    onChange={e => setPaymentData({ ...paymentData, interest_amount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total com encargos */}
                                    {(parseFloat(paymentData.fine_amount) > 0 || parseFloat(paymentData.interest_amount) > 0) && (
                                        <div className="flex justify-between items-center pt-3 border-t border-red-200">
                                            <span className="text-sm font-bold text-red-700">Total Pago:</span>
                                            <span className="text-lg font-extrabold text-red-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    (parseFloat(paymentModal.transaction.amount) || 0) +
                                                    (parseFloat(paymentData.fine_amount) || 0) +
                                                    (parseFloat(paymentData.interest_amount) || 0)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-linear-to-r from-neutral-50 to-white border-t border-neutral-100 flex justify-between items-center">
                            <button
                                onClick={() => setPaymentModal({ open: false, transaction: null })}
                                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPayment}
                                disabled={loading}
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Processando...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Confirmar Pagamento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-neutral-900/70 z-50 flex items-center justify-center backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                        {/* Header */}
                        <div className="bg-linear-to-r from-red-500 to-rose-600 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <Trash2 size={28} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl">Confirmar Exclusão</h2>
                                    <p className="text-white/80 text-sm">Esta ação é irreversível</p>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <p className="text-sm text-red-800">
                                    <strong>⚠️ ATENÇÃO:</strong> Você está prestes a excluir <strong>{deleteModal.description}</strong> permanentemente.
                                </p>
                            </div>
                            <p className="text-neutral-600 text-sm">
                                Este registro será removido do sistema e não poderá ser recuperado.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-neutral-50 border-t border-neutral-100 flex justify-between items-center">
                            <button
                                onClick={() => setDeleteModal({ open: false, id: null, table: null, description: '' })}
                                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={loading}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Excluindo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} /> Excluir
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
            {cancelModal.open && (
                <div className="fixed inset-0 bg-neutral-900/70 z-50 flex items-center justify-center backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                        {/* Header */}
                        <div className="bg-linear-to-r from-neutral-500 to-neutral-600 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <Ban size={28} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl">Cancelar Lançamento</h2>
                                    <p className="text-white/80 text-sm">O item será removido dos cálculos</p>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                <p className="text-sm text-amber-800">
                                    <strong>⚠️ ATENÇÃO:</strong> Você está prestes a cancelar o lançamento <strong>"{cancelModal.transaction?.description}"</strong>.
                                </p>
                            </div>
                            <p className="text-neutral-600 text-sm">
                                Este lançamento será marcado como cancelado e não será mais contabilizado nos totais.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-neutral-50 border-t border-neutral-100 flex justify-between items-center">
                            <button
                                onClick={() => setCancelModal({ open: false, transaction: null })}
                                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-neutral-200 rounded-xl transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={confirmCancel}
                                disabled={loading}
                                className="px-6 py-2.5 bg-neutral-600 hover:bg-neutral-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Cancelando...
                                    </>
                                ) : (
                                    <>
                                        <Ban size={16} /> Confirmar Cancelamento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}