import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const base = new URL(request.url).origin
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
  })
}
