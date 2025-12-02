import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    // O Bitrix deve enviar um JSON com estes dados
    const data = await request.json();
    
    console.log("📥 Webhook Bitrix Recebido:", data);

    // Mapeamento dos campos (Ajuste conforme as chaves que você configurar no Bitrix)
    const {
        id_negocio,       // ID do Deal no Bitrix (Ex: 1042)
        titulo,           // Título do Negócio (Ex: "Venda Ap 302 - Ed. Solar")
        cliente,          // Nome do Contato/Empresa
        valor_total,      // Valor da Oportunidade (Ex: 500000.00)
        perc_honorarios,  // Campo personalizado no Bitrix (Ex: 5)
        perc_corretor     // Campo personalizado no Bitrix (Ex: 30)
    } = data;

    // Validação básica
    if (!id_negocio || !valor_total) {
        return Response.json({ error: 'Dados incompletos. ID e Valor são obrigatórios.' }, { status: 400 });
    }

    // Verifica se já existe (Upsert: Atualiza se existir, Cria se não)
    const { data: sale, error } = await supabase
      .from('sales')
      .upsert({
        bitrix_id: String(id_negocio),
        client_name: cliente || 'Cliente Bitrix',
        property_info: titulo || `Negócio #${id_negocio}`,
        total_value: parseFloat(valor_total),
        agency_fee_percent: parseFloat(perc_honorarios || 0),
        broker_commission_percent: parseFloat(perc_corretor || 0),
        status: 'Ativo'
      }, { onConflict: 'bitrix_id' }) // Usa o ID do Bitrix para evitar duplicatas
      .select()
      .single();

    if (error) throw error;

    // (Opcional) Notifica no chat que a venda foi integrada
    const msg = `🚀 [B]NOVA VENDA INTEGRADA![/B]\n\nNegócio: ${titulo}\nValor: R$ ${parseFloat(valor_total).toLocaleString('pt-BR')}\n\nAcesse a aba [B]Vendas[/B] para lançar as parcelas.`;
    
    await fetch(`${process.env.VERCEL_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });

    return Response.json({ success: true, id: sale.id });

  } catch (error) {
    console.error('Erro no Webhook Bitrix:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}