import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'; // Garante que a função rode sempre fresca

export async function GET(request) {
  // Verificação de segurança (opcional, mas recomendado)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return new Response('Unauthorized', { status: 401 }); // Descomente quando configurar o Cron Job na Vercel
  }

  const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Data daqui a 2 dias
  const futuro = new Date();
  futuro.setDate(futuro.getDate() + 2);
  const dataFuturo = futuro.toISOString().split('T')[0];

  // 1. Buscar contas de HOJE
  const { data: contasHoje } = await supabase
    .from('transactions')
    .select('*, suppliers(name)')
    .eq('due_date', hoje)
    .neq('status', 'Pago');

  // 2. Buscar contas de DAQUI A 2 DIAS
  const { data: contasFuturo } = await supabase
    .from('transactions')
    .select('*, suppliers(name)')
    .eq('due_date', dataFuturo)
    .neq('status', 'Pago');

  // Se houver contas, envia para o Bitrix
  if ((contasHoje && contasHoje.length > 0) || (contasFuturo && contasFuturo.length > 0)) {
    await enviarParaBitrix(contasHoje || [], contasFuturo || []);
    return Response.json({ success: true, message: 'Notificação enviada' });
  }

  return Response.json({ success: true, message: 'Nada para enviar hoje' });
}

async function enviarParaBitrix(hoje, futuro) {
    const totalHoje = hoje.reduce((sum, i) => sum + i.amount, 0);
    const totalFuturo = futuro.reduce((sum, i) => sum + i.amount, 0);
    const quebra = "\n";

    let msg = "💰 [B]FINANCEIRO BEEHOUSE (Vercel)[/B]" + quebra;
    msg += "---------------------------------" + quebra;

    if(hoje.length > 0) {
        msg += `🔴 [B][COLOR=#ff0000]VENCE HOJE (${hoje.length})[/COLOR][/B] - Total: R$ ${totalHoje.toFixed(2)}` + quebra;
        hoje.forEach(t => msg += `▪ ${t.description} (${t.suppliers?.name}) - R$ ${t.amount}` + quebra);
        msg += quebra;
    }

    if(futuro.length > 0) {
        msg += `⚠️ [B]EM 2 DIAS (${futuro.length})[/B] - Total: R$ ${totalFuturo.toFixed(2)}` + quebra;
        futuro.forEach(t => msg += `▪ ${t.description} (${t.suppliers?.name}) - R$ ${t.amount}` + quebra);
    }

    msg += "---------------------------------" + quebra;
    // Em produção, isso será a URL do seu site Vercel
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