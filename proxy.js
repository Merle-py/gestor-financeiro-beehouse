import { NextResponse } from 'next/server'

export function proxy(request) {
  
  // TRUQUE PARA BITRIX: Se vier um POST na página inicial, transforma em GET
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    // O código 303 (See Other) força o navegador a repetir a requisição como GET
    return NextResponse.redirect(new URL('/', request.url), 303);
  }

  const response = NextResponse.next()

  // Permite que o Bitrix coloque seu site dentro dele (Iframe)
  response.headers.delete('x-frame-options')
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.bitrix24.com.br https://*.bitrix24.com https://*.bitrix24.eu"
  )

  return response
}

export const config = {
  matcher: '/:path*',
}