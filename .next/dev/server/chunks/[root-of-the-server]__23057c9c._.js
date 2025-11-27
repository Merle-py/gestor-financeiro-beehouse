module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/lib/supabase.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-route] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://qxsjbtpcmeuzhqmpvtlp.supabase.co");
const supabaseKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c2pidHBjbWV1emhxbXB2dGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjEzNjksImV4cCI6MjA3OTEzNzM2OX0.x9LWXXW917Tbnoc86rrhrtTN3snKCZKg7qU0lwt-RqE");
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseKey);
}),
"[project]/app/api/cron/route.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$supabase$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/supabase.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addMonths.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$setDate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/setDate.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$lastDayOfMonth$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/lastDayOfMonth.js [app-route] (ecmascript)");
;
;
const dynamic = 'force-dynamic'; // Garante que a função rode sempre fresca
async function GET(request) {
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
        return Response.json({
            success: true,
            notification: notificationResult
        });
    } catch (error) {
        return Response.json({
            error: error.message
        }, {
            status: 500
        });
    }
}
// --- FUNÇÃO 1: GERAÇÃO AUTOMÁTICA DE CONTAS ---
async function gerarRecorrencias() {
    const { data: recurring } = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$supabase$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from('recurring_expenses').select('*').eq('active', true);
    if (!recurring || recurring.length === 0) return;
    const hoje = new Date();
    // Gera para o mês atual e para o próximo mês (para previsão)
    const mesesParaGerar = [
        hoje,
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(hoje, 1)
    ];
    const novosLancamentos = [];
    // Busca transações existentes nesses meses para evitar duplicidade
    // (Uma otimização seria filtrar por data no banco, mas faremos verificação em memória para simplificar a lógica de "mesmo fornecedor/valor")
    const { data: transacoesExistentes } = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$supabase$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from('transactions').select('*');
    for (const mesRef of mesesParaGerar){
        for (const item of recurring){
            // Calcula a data de vencimento correta
            // Ex: Se o dia é 31 e o mês só tem 30 dias, o date-fns/js ajustaria para dia 1 do outro mês.
            // Vamos garantir que fique no último dia do mês correto.
            let dataVencimento = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$setDate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setDate"])(mesRef, item.day_of_month);
            // Correção: Se o dia gerado mudou de mês (ex: era dia 31/02 -> virou março), volta para o último dia do mês correto
            if (dataVencimento.getMonth() !== mesRef.getMonth()) {
                dataVencimento = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$lastDayOfMonth$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["lastDayOfMonth"])(mesRef);
            }
            const dataString = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(dataVencimento, 'yyyy-MM-dd');
            // Verifica se já existe (Mesmo Fornecedor + Mesmo Valor + Mesma Data)
            // Isso evita criar duplicado se o cron rodar várias vezes
            const jaExiste = transacoesExistentes.some((t)=>t.supplier_id === item.supplier_id && // Compara valor como string ou número (margem segura)
                parseFloat(t.amount) === parseFloat(item.amount) && t.due_date === dataString);
            if (!jaExiste) {
                novosLancamentos.push({
                    description: item.description,
                    amount: item.amount,
                    due_date: dataString,
                    supplier_id: item.supplier_id,
                    category_id: item.category_id,
                    status: dataString < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Aberto'
                });
            }
        }
    }
    if (novosLancamentos.length > 0) {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$supabase$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from('transactions').insert(novosLancamentos);
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
    const { data: contasHoje } = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$supabase$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from('transactions').select('*, suppliers(name)').eq('due_date', hoje).neq('status', 'Pago');
    const { data: contasFuturo } = await __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$supabase$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from('transactions').select('*, suppliers(name)').eq('due_date', dataFuturo).neq('status', 'Pago');
    if (contasHoje && contasHoje.length > 0 || contasFuturo && contasFuturo.length > 0) {
        await enviarParaBitrix(contasHoje || [], contasFuturo || []);
        return 'Notificação enviada';
    }
    return 'Nada para notificar';
}
async function enviarParaBitrix(hoje, futuro) {
    const totalHoje = hoje.reduce((sum, i)=>sum + i.amount, 0);
    const totalFuturo = futuro.reduce((sum, i)=>sum + i.amount, 0);
    const quebra = "\n";
    let msg = "💰 [B]FINANCEIRO BEEHOUSE[/B]" + quebra;
    msg += "---------------------------------" + quebra;
    if (hoje.length > 0) {
        msg += `🔴 [B][COLOR=#ff0000]VENCE HOJE (${hoje.length})[/COLOR][/B] - Total: R$ ${totalHoje.toFixed(2)}` + quebra;
        hoje.forEach((t)=>msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
        msg += quebra;
    }
    if (futuro.length > 0) {
        msg += `⚠️ [B]EM 2 DIAS (${futuro.length})[/B] - Total: R$ ${totalFuturo.toFixed(2)}` + quebra;
        futuro.forEach((t)=>msg += `▪ ${t.description} - R$ ${t.amount}` + quebra);
    }
    msg += "---------------------------------" + quebra;
    msg += `[URL=https://${process.env.VERCEL_URL}]➡️ ABRIR GESTOR[/URL]`;
    const webhookUrl = process.env.BITRIX_WEBHOOK_URL + "im.message.add";
    await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "DIALOG_ID": process.env.ID_COLABORADOR_FINANCEIRO,
            "MESSAGE": msg,
            "SYSTEM": "Y"
        })
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__23057c9c._.js.map