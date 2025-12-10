import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('=== TESTE DE ENVIO PARA BITRIX24 ===');

    const webhookUrl = process.env.BITRIX_WEBHOOK_URL + "im.message.add";
    const dialogId = process.env.ID_COLABORADOR_FINANCEIRO;

    console.log('Webhook URL:', process.env.BITRIX_WEBHOOK_URL);
    console.log('Dialog ID:', dialogId);

    if (!process.env.BITRIX_WEBHOOK_URL || !dialogId) {
        return NextResponse.json({
            error: 'Variáveis de ambiente não configuradas',
            BITRIX_WEBHOOK_URL: process.env.BITRIX_WEBHOOK_URL ? 'OK' : 'FALTANDO',
            ID_COLABORADOR_FINANCEIRO: dialogId ? 'OK' : 'FALTANDO'
        });
    }

    const testMessage = `🧪 [B]TESTE DE NOTIFICAÇÃO[/B]
---------------------------------
✅ O sistema de notificações está funcionando!

📅 Data: ${new Date().toLocaleDateString('pt-BR')}
🕐 Hora: ${new Date().toLocaleTimeString('pt-BR')}

[URL=https://viver.bitrix24.com.br/marketplace/app/199/]➡️ ABRIR GESTOR[/URL]`;

    try {
        console.log('Enviando mensagem de teste...');

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "DIALOG_ID": dialogId,
                "MESSAGE": testMessage,
                "SYSTEM": "Y"
            })
        });

        const result = await response.json();
        console.log('Resposta do Bitrix24:', JSON.stringify(result, null, 2));

        if (result.result) {
            return NextResponse.json({
                success: true,
                message: 'Mensagem enviada com sucesso!',
                messageId: result.result,
                bitrixResponse: result
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error || 'Erro desconhecido',
                errorDescription: result.error_description,
                bitrixResponse: result
            });
        }
    } catch (error) {
        console.error('Erro ao enviar:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        });
    }
}
