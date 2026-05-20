export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { db, oauthTokens } from '@/lib/db'
import { and, eq, gt } from 'drizzle-orm'
import { createMcpServer } from '@/lib/mcp/tools'

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return new NextResponse('Unauthorized', { status: 401 })

  const [tokenRow] = await db
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.token, token), gt(oauthTokens.expiresAt, new Date())))

  if (!tokenRow) return new NextResponse('Unauthorized', { status: 401 })

  const server = createMcpServer(tokenRow.userId)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  await server.connect(transport)

  return transport.handleRequest(request)
}
