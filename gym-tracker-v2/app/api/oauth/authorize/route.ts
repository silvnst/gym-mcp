import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, oauthCodes } from '@/lib/db'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const { searchParams } = new URL(request.url)
  const codeChallenge = searchParams.get('code_challenge')
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state') ?? ''

  if (!codeChallenge || !redirectUri) {
    return NextResponse.json({ error: 'missing required params' }, { status: 400 })
  }

  const code = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await db.insert(oauthCodes).values({
    code,
    userId: user.id,
    codeChallenge,
    redirectUri,
    expiresAt,
  })

  const redirectUrl = new URL(redirectUri)
  redirectUrl.searchParams.set('code', code)
  redirectUrl.searchParams.set('state', state)
  return NextResponse.redirect(redirectUrl)
}
