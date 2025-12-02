import { supabase } from '../../lib/supabase';
import { addMonths, setDate, format, lastDayOfMonth, startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new Response('Unauthorized', { status: 401 });
    }

    try {
        await gerarRecorrencias();
        const notificationResult = await verificarVencimentos();
        return Response.json({ success: true, notification: notificationResult });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

async function gerarRecorrencias() {
    // 1. Busca regras ativas
    const { data: recurring } = await supabase.from('recurring_expenses').select('*').eq('active', true);
    if (!recurring || recurring.length === 0) return;

    const hoje = new Date();
    const mesesParaGerar = [hoje, addMonths(hoje, 1)];
    const novosLancamentos = [];

    // 2. Busca transações existentes para comparação
    const { data: transacoesExistentes } = await supabase.from('transactions').select('*');

    for (const mesRef of mesesParaGerar) {
        // Define o início e fim do mês de referência para busca
        const inicioMes = format(startOfMonth(mesRef), 'yyyy-MM-dd');
        const fimMes = format(lastDayOfMonth(mesRef), 'yyyy-MM-dd');

        for (const item of recurring) {
            // Calcula a data de vencimento ideal para este mês
            let dataVencimento = setDate(mesRef, item.day_of_month);

            // Ajuste para meses mais curtos (ex: dia 31 em fevereiro)
            if (dataVencimento.getMonth() !== mesRef.getMonth()) {
                dataVencimento = lastDayOfMonth(mesRef);
            }
            const dataString = format(dataVencimento, 'yyyy-MM-dd');

            // 3. Procura se já existe uma transação deste ID de recorrência DENTRO deste mês
            // Isso corrige o problema: buscamos pelo ID da regra e pelo intervalo do mês, não apenas pela data exata
            const transacaoExistente = transacoesExistentes.find(t => {
                const ehDaRegra = t.recurring_rule_id === item.id;
                const estaNoMes = t.due_date >= inicioMes && t.due_date <= fimMes;
                return ehDaRegra && estaNoMes;
            });

            if (transacaoExistente) {
                // 4. ATUALIZAÇÃO: Se existe e não está paga, atualiza os dados
                if (transacaoExistente.status !== 'Pago' && transacaoExistente.status !== 'Cancelado') {
                    // Verifica se algo mudou para evitar update desnecessário
                    const mudouAlgo =
                        parseFloat(transacaoExistente.amount) !== parseFloat(item.amount) ||
                        transacaoExistente.description !== item.description ||
                        transacaoExistente.due_date !== dataString ||
                        transacaoExistente.category_id !== item.category_id ||
                        transacaoExistente.supplier_id !== item.supplier_id;

                    if (mudouAlgo) {
                        await supabase.from('transactions').update({
                            description: item.description,
                            amount: item.amount,
                            due_date: dataString, // Atualiza a data caso o dia da recorrência tenha mudado
                            supplier_id: item.supplier_id,
                            category_id: item.category_id
                        }).eq('id', transacaoExistente.id);
                    }
                }
            } else {
                // 5. INSERÇÃO: Se não existe, adiciona na lista para criar
                // Verificação secundária para evitar duplicidade por supplier/valor se não tiver ID de regra (legado)
                const existePorSimilaridade = transacoesExistentes.some(t =>
                    !t.recurring_rule_id && // Só checa similaridade se não tiver vínculo forte
                    t.supplier_id === item.supplier_id &&
                    parseFloat(t.amount) === parseFloat(item.amount) &&
                    t.due_date === dataString
                );

                if (!existePorSimilaridade) {
                    novosLancamentos.push({
                        description: item.description,
                        amount: item.amount,
                        due_date: dataString,
                        supplier_id: item.supplier_id,
                        category_id: item.category_id,
                        status: dataString < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Aberto',
                        recurring_rule_id: item.id,
                        type: 'despesa'
                    });
                }
            }
        }
    }

    if (novosLancamentos.length > 0) {
        await supabase.from('transactions').insert(novosLancamentos);
    }
}

async function verificarVencimentos() {
    const hoje = new Date().toISOString().split('T')[0];
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 2);
    const dataFuturo = futuro.toISOString().split('T')[0];

    const { data: contasHoje } = await supabase.from('transactions').select('*, suppliers(name)').eq('due_date', hoje).neq('status', 'Pago').eq('type', 'despesa');
    const { data: contasFuturo } = await supabase.from('transactions').select('*, suppliers(name)').eq('due_date', dataFuturo).neq('status', 'Pago').eq('type', 'despesa');

    if ((contasHoje && contasHoje.length > 0) || (contasFuturo && contasFuturo.length > 0)) {
        await enviarParaBitrix(contasHoje || [], contasFuturo || []);
        return 'Notificação enviada';
    }
    return 'Nada para notificar';
}

async function enviarParaBitrix(hoje, futuro) {
    const totalHoje = hoje.reduce((sum, i) => sum + i.amount, 0);
    const totalFuturo = futuro.reduce((sum, i) => sum + i.amount, 0);
    const quebra = "\n";

    let msg = "💰 [B]FINANCEIRO BEEHOUSE[/B]" + quebra + "---------------------------------" + quebra;

    if (hoje.length > 0) {
        msg += `🔴 [B][COLOR=#ff0000]VENCE HOJE (${hoje.length})[/COLOR][/B] - Total: R$ ${totalHoje.toFixed(2)}` + quebra;
        hoje.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
        msg += quebra;
    }

    if (futuro.length > 0) {
        msg += `⚠️ [B]EM 2 DIAS (${futuro.length})[/B] - Total: R$ ${totalFuturo.toFixed(2)}` + quebra;
        futuro.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
    }

    msg += "---------------------------------" + quebra + `[URL=https://viver.bitrix24.com.br/marketplace/app/199/]➡️ ABRIR GESTOR[/URL]`;

    const webhookUrl = process.env.BITRIX_WEBHOOK_URL + "im.message.add";
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "DIALOG_ID": process.env.ID_COLABORADOR_FINANCEIRO, "MESSAGE": msg, "SYSTEM": "Y" })
    });
}