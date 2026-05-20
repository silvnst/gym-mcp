import { NextRequest, NextResponse } from 'next/server'
import { db, oauthCodes, oauthTokens } from '@/lib/db'
import { eq, and, gt } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  let code: string | undefined
  let codeVerifier: string | undefined
  let redirectUri: string | undefined

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData().catch(() => null)
    if (formData) {
      code = formData.get('code')?.toString()
      codeVerifier = formData.get('code_verifier')?.toString()
      redirectUri = formData.get('redirect_uri')?.toString()
    }
  } else {
    const body = await request.json().catch(() => null)
    if (body) {
      code = body.code
      codeVerifier = body.code_verifier
      redirectUri = body.redirect_uri
    }
  }

  if (!code || !codeVerifier || !redirectUri) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const [codeRow] = await db
    .select()
    .from(oauthCodes)
    .where(and(eq(oauthCodes.code, code), gt(oauthCodes.expiresAt, new Date())))

  if (!codeRow || codeRow.redirectUri !== redirectUri) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
  }

  // Verify PKCE: SHA256(code_verifier) base64url == code_challenge
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const base64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  if (base64url !== codeRow.codeChallenge) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
  }

  await db.delete(oauthCodes).where(eq(oauthCodes.code, code))

  const accessToken = crypto.randomUUID() + '-' + crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await db.insert(oauthTokens).values({
    token: accessToken,
    userId: codeRow.userId,
    expiresAt,
  })

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
  })
}
