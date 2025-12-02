import { supabase } from '../../lib/supabase';

// Configuração para permitir execução longa (importações grandes)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

// --- CONFIGURAÇÃO DOS SEUS CAMPOS NO BITRIX ---
// Descubra esses códigos indo em CRM > Configurações > Campos Personalizados no Bitrix
const CAMPOS_BITRIX = {
    HONORARIOS_PERCENT: "UF_CRM_1764591593", // Exemplo: Substitua pelo seu código real
    COMISSAO_CORRETOR_PERCENT: "UF_CRM_1764591529" // Exemplo: Substitua pelo seu código real
};

export async function GET(request) {
  const BITRIX_URL = process.env.BITRIX_API_URL;

  if (!BITRIX_URL) {
      return Response.json({ error: 'Configure a BITRIX_API_URL no .env' }, { status: 500 });
  }

  try {
    // 1. Buscar Negócios Ganhos (Stage = WON)
    const dealsRes = await fetch(`${BITRIX_URL}crm.deal.list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filter: { "STAGE_ID": "WON" },
            select: ["ID", "TITLE", "OPPORTUNITY", "CONTACT_ID", "ASSIGNED_BY_ID", CAMPOS_BITRIX.HONORARIOS_PERCENT, CAMPOS_BITRIX.COMISSAO_CORRETOR_PERCENT]
        })
    });
    
    const dealsData = await dealsRes.json();
    if (!dealsData.result) throw new Error('Erro ao buscar negócios no Bitrix');
    
    const deals = dealsData.result;
    const contactsMap = {};
    const usersMap = {};

    // 2. Preparar IDs para buscar Nomes de Clientes e Corretores em lote
    const contactIds = [...new Set(deals.map(d => d.CONTACT_ID).filter(id => id))];
    const userIds = [...new Set(deals.map(d => d.ASSIGNED_BY_ID).filter(id => id))];

    // 3. Buscar Clientes (Contacts)
    if (contactIds.length > 0) {
        // Nota: Em produção idealmente faríamos em batches de 50, aqui faremos simplificado
        for (const id of contactIds) {
            const cRes = await fetch(`${BITRIX_URL}crm.contact.get?id=${id}`);
            const cData = await cRes.json();
            if (cData.result) contactsMap[id] = `${cData.result.NAME} ${cData.result.LAST_NAME || ''}`.trim();
        }
    }

    // 4. Buscar Corretores (Users)
    if (userIds.length > 0) {
        for (const id of userIds) {
            const uRes = await fetch(`${BITRIX_URL}user.get?ID=${id}`);
            const uData = await uRes.json();
            if (uData.result && uData.result[0]) {
                const user = uData.result[0];
                usersMap[id] = `${user.NAME} ${user.LAST_NAME || ''}`.trim();
            }
        }
    }

    // 5. Processar e Salvar no Banco
    let salesCount = 0;

    for (const deal of deals) {
        // A. Resolver Corretor (Criar ou Vincular)
        let brokerId = null;
        if (deal.ASSIGNED_BY_ID && usersMap[deal.ASSIGNED_BY_ID]) {
            const brokerName = usersMap[deal.ASSIGNED_BY_ID];
            
            // Tenta achar ou criar o corretor na tabela de Fornecedores
            const { data: broker } = await supabase
                .from('suppliers')
                .upsert({ 
                    name: brokerName, 
                    type: 'Corretor',
                    bitrix_id: String(deal.ASSIGNED_BY_ID) // Vincula ID do Bitrix para não duplicar
                }, { onConflict: 'bitrix_id' }) // Ou use 'name' se preferir não usar bitrix_id
                .select('id')
                .single();
            
            if (broker) brokerId = broker.id;
        }

        // B. Salvar Venda
        const salePayload = {
            bitrix_id: String(deal.ID),
            client_name: contactsMap[deal.CONTACT_ID] || 'Cliente Não Identificado',
            property_info: deal.TITLE,
            total_value: parseFloat(deal.OPPORTUNITY || 0),
            agency_fee_percent: parseFloat(deal[CAMPOS_BITRIX.HONORARIOS_PERCENT] || 0),
            broker_commission_percent: parseFloat(deal[CAMPOS_BITRIX.COMISSAO_CORRETOR_PERCENT] || 0),
            broker_id: brokerId,
            status: 'Ativo'
        };

        const { error } = await supabase.from('sales').upsert(salePayload, { onConflict: 'bitrix_id' });
        if (!error) salesCount++;
    }

    return Response.json({ 
        success: true, 
        message: `Importação concluída! ${salesCount} vendas processadas.`,
        details: { dealsFound: deals.length, salesSaved: salesCount }
    });

  } catch (error) {
    console.error('Erro importação Bitrix:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}