export async function POST(request) {
  try {
    const { message } = await request.json();

    // URL do Webhook do Bitrix (definida nas variáveis de ambiente)
    const webhookUrl = process.env.BITRIX_WEBHOOK_URL + "im.message.add";

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "DIALOG_ID": process.env.ID_COLABORADOR_FINANCEIRO, // ID do usuário ou chat no Bitrix
        "MESSAGE": message,
        "SYSTEM": "Y" // Mensagem do sistema (aparece diferente no chat)
      })
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}