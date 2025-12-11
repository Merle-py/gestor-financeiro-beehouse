import { supabase } from '../../lib/supabase';
import { addMonths, setDate, format, lastDayOfMonth, startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new Response('Unauthorized', { status: 401 });
    }

    try {
        const syncResult = await gerarRecorrencias();
        const notificationResult = await verificarVencimentos();
        return Response.json({
            success: true,
            notification: notificationResult,
            sync: syncResult
        });
    } catch (error) {
        console.error('Erro no cron:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

async function gerarRecorrencias() {
    console.log('=== INICIANDO GERAÇÃO DE RECORRÊNCIAS ===');

    // 1. Busca regras ativas
    const { data: recurring, error: recurringError } = await supabase.from('recurring_expenses').select('*').eq('active', true);

    console.log('Regras de recorrência encontradas:', recurring?.length || 0);
    console.log('Erro ao buscar recorrências:', recurringError);

    if (!recurring || recurring.length === 0) {
        console.log('Nenhuma regra de recorrência ativa encontrada');
        return { recorrenciasEncontradas: 0, message: 'Nenhuma regra de recorrência ativa' };
    }

    console.log('Regras:', recurring.map(r => ({ id: r.id, desc: r.description, day: r.day_of_month, amount: r.amount, active: r.active })));

    const hoje = new Date();
    const mesesParaGerar = [hoje, addMonths(hoje, 1)];
    const novosLancamentos = [];

    // 2. Busca transações existentes para comparação
    const { data: transacoesExistentes } = await supabase.from('transactions').select('*');
    console.log('Transações existentes no banco:', transacoesExistentes?.length || 0);

    for (const mesRef of mesesParaGerar) {
        // Define o início e fim do mês de referência para busca
        const inicioMes = format(startOfMonth(mesRef), 'yyyy-MM-dd');
        const fimMes = format(lastDayOfMonth(mesRef), 'yyyy-MM-dd');
        console.log(`\nProcessando mês: ${format(mesRef, 'MMM/yyyy')} (${inicioMes} a ${fimMes})`);

        for (const item of recurring) {
            // Calcula a data de vencimento ideal para este mês
            let dataVencimento = setDate(mesRef, item.day_of_month);

            // Ajuste para meses mais curtos (ex: dia 31 em fevereiro)
            if (dataVencimento.getMonth() !== mesRef.getMonth()) {
                dataVencimento = lastDayOfMonth(mesRef);
            }
            const dataString = format(dataVencimento, 'yyyy-MM-dd');

            console.log(`  - Verificando "${item.description}" para ${dataString}`);

            // 3. Procura se já existe uma transação deste ID de recorrência DENTRO deste mês
            const transacaoExistente = transacoesExistentes?.find(t => {
                const ehDaRegra = t.recurring_rule_id === item.id;
                const estaNoMes = t.due_date >= inicioMes && t.due_date <= fimMes;
                return ehDaRegra && estaNoMes;
            });

            if (transacaoExistente) {
                console.log(`    -> Já existe transação (ID: ${transacaoExistente.id}, status: ${transacaoExistente.status})`);

                // 4. ATUALIZAÇÃO: Se existe e não está paga, atualiza os dados
                if (transacaoExistente.status !== 'Pago' && transacaoExistente.status !== 'Cancelado') {
                    const mudouAlgo =
                        parseFloat(transacaoExistente.amount) !== parseFloat(item.amount) ||
                        transacaoExistente.description !== item.description ||
                        transacaoExistente.due_date !== dataString ||
                        transacaoExistente.category_id !== item.category_id ||
                        transacaoExistente.supplier_id !== item.supplier_id;

                    if (mudouAlgo) {
                        console.log(`    -> Atualizando transação existente`);
                        await supabase.from('transactions').update({
                            description: item.description,
                            amount: item.amount,
                            due_date: dataString,
                            supplier_id: item.supplier_id,
                            category_id: item.category_id
                        }).eq('id', transacaoExistente.id);
                    }
                }
            } else {
                // 5. INSERÇÃO: Se não existe, adiciona na lista para criar
                console.log(`    -> Não existe, verificando similaridade...`);

                const existePorSimilaridade = transacoesExistentes?.some(t =>
                    !t.recurring_rule_id &&
                    t.supplier_id === item.supplier_id &&
                    parseFloat(t.amount) === parseFloat(item.amount) &&
                    t.due_date === dataString
                );

                if (!existePorSimilaridade) {
                    console.log(`    -> CRIANDO nova transação para "${item.description}"`);
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
                } else {
                    console.log(`    -> Já existe por similaridade, ignorando`);
                }
            }
        }
    }

    console.log(`\nTotal de lançamentos a criar: ${novosLancamentos.length}`);

    let insertResult = null;
    if (novosLancamentos.length > 0) {
        console.log('Inserindo lançamentos:', novosLancamentos);
        const { error: insertError } = await supabase.from('transactions').insert(novosLancamentos);
        if (insertError) {
            console.error('Erro ao inserir:', insertError);
            insertResult = { error: insertError.message };
        } else {
            console.log('Lançamentos inseridos com sucesso!');
            insertResult = { success: true, count: novosLancamentos.length };
        }
    }

    console.log('=== FIM DA GERAÇÃO DE RECORRÊNCIAS ===');

    return {
        recorrenciasEncontradas: recurring?.length || 0,
        transacoesExistentes: transacoesExistentes?.length || 0,
        lancamentosCriados: novosLancamentos.length,
        insertResult
    };
}

async function verificarVencimentos() {
    console.log('=== VERIFICANDO VENCIMENTOS ===');
    const hoje = new Date().toISOString().split('T')[0];

    // Data de amanhã (1 dia)
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];

    // Data em 2 dias
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 2);
    const dataFuturo = futuro.toISOString().split('T')[0];

    console.log(`Buscando contas atrasadas (antes de ${hoje})`);
    console.log(`Buscando contas que vencem hoje: ${hoje}`);
    console.log(`Buscando contas que vencem amanhã: ${dataAmanha}`);
    console.log(`Buscando contas que vencem em 2 dias: ${dataFuturo}`);

    // Busca contas ATRASADAS (vencidas) - data menor que hoje e NÃO pagas/canceladas
    const { data: contasAtrasadas, error: erroAtrasadas } = await supabase
        .from('transactions')
        .select('*, suppliers(name)')
        .lt('due_date', hoje)
        .eq('type', 'despesa')
        .not('status', 'in', '("Pago","Cancelado")');

    // Busca contas que vencem hoje e NÃO estão pagas ou canceladas
    const { data: contasHoje, error: erroHoje } = await supabase
        .from('transactions')
        .select('*, suppliers(name)')
        .eq('due_date', hoje)
        .eq('type', 'despesa')
        .not('status', 'in', '("Pago","Cancelado")');

    // Busca contas que vencem AMANHÃ (1 dia) e NÃO estão pagas ou canceladas
    const { data: contasAmanha, error: erroAmanha } = await supabase
        .from('transactions')
        .select('*, suppliers(name)')
        .eq('due_date', dataAmanha)
        .eq('type', 'despesa')
        .not('status', 'in', '("Pago","Cancelado")');

    // Busca contas que vencem em 2 dias e NÃO estão pagas ou canceladas
    const { data: contasFuturo, error: erroFuturo } = await supabase
        .from('transactions')
        .select('*, suppliers(name)')
        .eq('due_date', dataFuturo)
        .eq('type', 'despesa')
        .not('status', 'in', '("Pago","Cancelado")');

    if (erroAtrasadas) console.error('Erro ao buscar contas atrasadas:', erroAtrasadas);
    if (erroHoje) console.error('Erro ao buscar contas de hoje:', erroHoje);
    if (erroAmanha) console.error('Erro ao buscar contas de amanhã:', erroAmanha);
    if (erroFuturo) console.error('Erro ao buscar contas futuras:', erroFuturo);

    console.log(`Contas ATRASADAS (não pagas): ${contasAtrasadas?.length || 0}`);
    if (contasAtrasadas?.length > 0) {
        console.log('Detalhes das contas atrasadas:', contasAtrasadas.map(c => ({ desc: c.description, due_date: c.due_date, status: c.status, amount: c.amount })));
    }

    console.log(`Contas vencendo HOJE (não pagas): ${contasHoje?.length || 0}`);
    if (contasHoje?.length > 0) {
        console.log('Detalhes das contas de hoje:', contasHoje.map(c => ({ desc: c.description, status: c.status, amount: c.amount })));
    }

    console.log(`Contas vencendo AMANHÃ (não pagas): ${contasAmanha?.length || 0}`);
    if (contasAmanha?.length > 0) {
        console.log('Detalhes das contas de amanhã:', contasAmanha.map(c => ({ desc: c.description, status: c.status, amount: c.amount })));
    }

    console.log(`Contas vencendo em 2 DIAS (não pagas): ${contasFuturo?.length || 0}`);
    if (contasFuturo?.length > 0) {
        console.log('Detalhes das contas futuras:', contasFuturo.map(c => ({ desc: c.description, status: c.status, amount: c.amount })));
    }

    const temContas = (contasAtrasadas && contasAtrasadas.length > 0) ||
        (contasHoje && contasHoje.length > 0) ||
        (contasAmanha && contasAmanha.length > 0) ||
        (contasFuturo && contasFuturo.length > 0);

    if (temContas) {
        await enviarParaBitrix(contasAtrasadas || [], contasHoje || [], contasAmanha || [], contasFuturo || []);
        return 'Notificação enviada';
    }
    console.log('Nenhuma conta para notificar');
    return 'Nada para notificar';
}

async function enviarParaBitrix(atrasadas, hoje, amanha, futuro) {
    console.log('=== ENVIANDO NOTIFICAÇÃO PARA BITRIX24 ===');

    const totalAtrasadas = atrasadas.reduce((sum, i) => sum + i.amount, 0);
    const totalHoje = hoje.reduce((sum, i) => sum + i.amount, 0);
    const totalAmanha = amanha.reduce((sum, i) => sum + i.amount, 0);
    const totalFuturo = futuro.reduce((sum, i) => sum + i.amount, 0);
    const quebra = "\n";
    const baseUrl = process.env.BITRIX_WEBHOOK_URL;
    const userId = process.env.ID_COLABORADOR_FINANCEIRO;

    // Mensagem detalhada para o chat
    let msg = "💰 [B]FINANCEIRO BEEHOUSE[/B]" + quebra + "---------------------------------" + quebra;

    if (atrasadas.length > 0) {
        msg += `🚨 [B][COLOR=#990000]ATRASADAS (${atrasadas.length})[/COLOR][/B] - Total: R$ ${totalAtrasadas.toFixed(2)}` + quebra;
        atrasadas.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount} (venceu ${t.due_date})` + quebra);
        msg += quebra;
    }

    if (hoje.length > 0) {
        msg += `🔴 [B][COLOR=#ff0000]VENCE HOJE (${hoje.length})[/COLOR][/B] - Total: R$ ${totalHoje.toFixed(2)}` + quebra;
        hoje.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
        msg += quebra;
    }

    if (amanha.length > 0) {
        msg += `🟠 [B][COLOR=#ff6600]VENCE AMANHÃ (${amanha.length})[/COLOR][/B] - Total: R$ ${totalAmanha.toFixed(2)}` + quebra;
        amanha.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
        msg += quebra;
    }

    if (futuro.length > 0) {
        msg += `⚠️ [B]EM 2 DIAS (${futuro.length})[/B] - Total: R$ ${totalFuturo.toFixed(2)}` + quebra;
        futuro.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
    }

    msg += "---------------------------------" + quebra + `[URL=https://viver.bitrix24.com.br/marketplace/app/199/]➡️ ABRIR GESTOR[/URL]`;

    console.log('Webhook URL:', baseUrl ? 'Configurada' : '❌ NÃO CONFIGURADA');
    console.log('ID Colaborador:', userId || '❌ NÃO CONFIGURADO');

    try {
        // 1. ENVIA NOTIFICAÇÃO DO SISTEMA (aparece como alerta/popup)
        let alertMsg = '🚨 CONTAS A PAGAR: ';
        const partes = [];
        if (atrasadas.length > 0) partes.push(`${atrasadas.length} ATRASADA(S) (R$ ${totalAtrasadas.toFixed(2)})`);
        if (hoje.length > 0) partes.push(`${hoje.length} vence(m) HOJE (R$ ${totalHoje.toFixed(2)})`);
        if (amanha.length > 0) partes.push(`${amanha.length} amanhã (R$ ${totalAmanha.toFixed(2)})`);
        if (futuro.length > 0) partes.push(`${futuro.length} em 2 dias (R$ ${totalFuturo.toFixed(2)})`);
        alertMsg += partes.join(' | ');

        console.log('Enviando notificação de alerta...');
        const notifyResponse = await fetch(baseUrl + "im.notify.system.add", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "USER_ID": userId,
                "MESSAGE": alertMsg,
                "MESSAGE_OUT": alertMsg // Mensagem para push notification
            })
        });
        const notifyResult = await notifyResponse.json();
        console.log('Resposta notificação:', notifyResult);

        // 2. ENVIA MENSAGEM NO CHAT (mensagem detalhada)
        console.log('Enviando mensagem no chat...');
        const msgResponse = await fetch(baseUrl + "im.message.add", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "DIALOG_ID": userId,
                "MESSAGE": msg,
                "SYSTEM": "Y"
            })
        });
        const msgResult = await msgResponse.json();
        console.log('Resposta mensagem:', msgResult);

        if (msgResult.result) {
            console.log('✅ Notificações enviadas com sucesso!');
        } else if (msgResult.error) {
            console.error('❌ Erro do Bitrix24:', msgResult.error, msgResult.error_description);
        }
    } catch (error) {
        console.error('❌ Erro ao enviar para Bitrix24:', error.message);
    }
}