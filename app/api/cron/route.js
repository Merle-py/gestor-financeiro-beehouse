import { supabase } from '../../lib/supabase';
import { addMonths, setDate, format, lastDayOfMonth, getDate } from 'date-fns';

export const dynamic = 'force-dynamic'; // Garante que a função rode sempre fresca

export async function GET(request) {
  // Verificação de segurança (opcional, mas recomendado)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return new Response('Unauthorized', { status: 401 }); 
  }

  try {
    // 1. GERAR CONTAS RECORRENTES (Mês Atual + Próximo Mês)
    await gerarRecorrencias();

    // 2. ENVIAR NOTIFICAÇÕES (Seu código original de notificação)
    const notificationResult = await verificarVencimentos();

    return Response.json({ success: true, notification: notificationResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// --- FUNÇÃO 1: GERAÇÃO AUTOMÁTICA DE CONTAS ---
async function gerarRecorrencias() {
    const { data: recurring } = await supabase.from('recurring_expenses').select('*').eq('active', true);
    if (!recurring || recurring.length === 0) return;

    const hoje = new Date();
    // Gera para o mês atual e para o próximo mês (para previsão)
    const mesesParaGerar = [hoje, addMonths(hoje, 1)]; 
    const novosLancamentos = [];

    // Busca transações existentes nesses meses para evitar duplicidade
    // (Uma otimização seria filtrar por data no banco, mas faremos verificação em memória para simplificar a lógica de "mesmo fornecedor/valor")
    const { data: transacoesExistentes } = await supabase.from('transactions').select('*');

    for (const mesRef of mesesParaGerar) {
        for (const item of recurring) {
            // Calcula a data de vencimento correta
            // Ex: Se o dia é 31 e o mês só tem 30 dias, o date-fns/js ajustaria para dia 1 do outro mês.
            // Vamos garantir que fique no último dia do mês correto.
            let dataVencimento = setDate(mesRef, item.day_of_month);
            
            // Correção: Se o dia gerado mudou de mês (ex: era dia 31/02 -> virou março), volta para o último dia do mês correto
            if (dataVencimento.getMonth() !== mesRef.getMonth()) {
                dataVencimento = lastDayOfMonth(mesRef);
            }

            const dataString = format(dataVencimento, 'yyyy-MM-dd');

            // Verifica se já existe (Mesmo Fornecedor + Mesmo Valor + Mesma Data)
            // Isso evita criar duplicado se o cron rodar várias vezes
            const jaExiste = transacoesExistentes.some(t => 
                t.supplier_id === item.supplier_id &&
                // Compara valor como string ou número (margem segura)
                parseFloat(t.amount) === parseFloat(item.amount) && 
                t.due_date === dataString
            );

            if (!jaExiste) {
                novosLancamentos.push({
                    description: item.description,
                    amount: item.amount,
                    due_date: dataString,
                    supplier_id: item.supplier_id,
                    category_id: item.category_id,
                    status: dataString < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Aberto',
                    // Adicionamos uma flag opcional para saber que veio da recorrência
                    // recurring_source_id: item.id (se você quiser criar esse campo na tabela transactions depois)
                });
            }
        }
    }

    if (novosLancamentos.length > 0) {
        const { error } = await supabase.from('transactions').insert(novosLancamentos);
        if (error) console.error('Erro ao gerar recorrências:', error);
        else console.log(`Geradas ${novosLancamentos.length} novas contas recorrentes.`);
    }
}

// --- FUNÇÃO 2: NOTIFICAÇÕES (Sua lógica original preservada e encapsulada) ---
async function verificarVencimentos() {
    const hoje = new Date().toISOString().split('T')[0]; 
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 2);
    const dataFuturo = futuro.toISOString().split('T')[0];

    const { data: contasHoje } = await supabase.from('transactions').select('*, suppliers(name)').eq('due_date', hoje).neq('status', 'Pago');
    const { data: contasFuturo } = await supabase.from('transactions').select('*, suppliers(name)').eq('due_date', dataFuturo).neq('status', 'Pago');

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

    let msg = "💰 [B]FINANCEIRO BEEHOUSE[/B]" + quebra;
    msg += "---------------------------------" + quebra;

    if(hoje.length > 0) {
        msg += `🔴 [B][COLOR=#ff0000]VENCE HOJE (${hoje.length})[/COLOR][/B] - Total: R$ ${totalHoje.toFixed(2)}` + quebra;
        hoje.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
        msg += quebra;
    }

    if(futuro.length > 0) {
        msg += `⚠️ [B]EM 2 DIAS (${futuro.length})[/B] - Total: R$ ${totalFuturo.toFixed(2)}` + quebra;
        futuro.forEach(t => msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
    }

    msg += "---------------------------------" + quebra;
    msg += `[URL=https://${process.env.VERCEL_URL}]➡️ ABRIR GESTOR[/URL]`;

    const webhookUrl = process.env.BITRIX_WEBHOOK_URL + "im.message.add";
    
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "DIALOG_ID": process.env.ID_COLABORADOR_FINANCEIRO,
            "MESSAGE": msg,
            "SYSTEM": "Y"
        })
    });
}