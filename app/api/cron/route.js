import { supabase } from '../../lib/supabase';
import { addMonths, setDate, format, lastDayOfMonth } from 'date-fns';

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
    const { data: recurring } = await supabase.from('recurring_expenses').select('*').eq('active', true);
    if (!recurring || recurring.length === 0) return;

    const hoje = new Date();
    const mesesParaGerar = [hoje, addMonths(hoje, 1)]; 
    const novosLancamentos = [];

    // Busca transações já lançadas para não duplicar
    const { data: transacoesExistentes } = await supabase.from('transactions').select('*');

    for (const mesRef of mesesParaGerar) {
        for (const item of recurring) {
            let dataVencimento = setDate(mesRef, item.day_of_month);
            
            // Corrige se o dia não existe no mês (ex: 31 de Fev)
            if (dataVencimento.getMonth() !== mesRef.getMonth()) {
                dataVencimento = lastDayOfMonth(mesRef);
            }

            const dataString = format(dataVencimento, 'yyyy-MM-dd');

            // Verifica duplicidade (agora usando o ID da regra se disponível, ou fallback para lógica antiga)
            const jaExiste = transacoesExistentes.some(t => 
                (t.recurring_rule_id === item.id && t.due_date === dataString) || 
                (t.supplier_id === item.supplier_id && parseFloat(t.amount) === parseFloat(item.amount) && t.due_date === dataString)
            );

            if (!jaExiste) {
                novosLancamentos.push({
                    description: item.description,
                    amount: item.amount,
                    due_date: dataString,
                    supplier_id: item.supplier_id,
                    category_id: item.category_id,
                    status: dataString < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Aberto',
                    recurring_rule_id: item.id // <--- O SEGREDO ESTÁ AQUI
                });
            }
        }
    }

    if (novosLancamentos.length > 0) {
        await supabase.from('transactions').insert(novosLancamentos);
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
    msg += `[URL=https://viver.bitrix24.com.br/marketplace/app/199/]➡️ ABRIR GESTOR[/URL]`;

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