export async function POST(request) {
  try {
    const { message } = await request.json();

    const webhookUrl = process.env.BITRIX_WEBHOOK_URL + "im.message.add";

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "DIALOG_ID": process.env.ID_COLABORADOR_FINANCEIRO,
        "MESSAGE": message,
        "SYSTEM": "Y"
      })
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}