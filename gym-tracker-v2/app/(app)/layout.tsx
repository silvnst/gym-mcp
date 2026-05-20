'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import Link from 'next/link'
import { History, Play } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="text-lg" style={{ fontFamily: 'Georgia, serif' }}>
              Gym Tracker
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/start" className="text-muted-foreground hover:text-foreground">
                <Play className="w-5 h-5" />
              </Link>
              <Link href="/history" className="text-muted-foreground hover:text-foreground">
                <History className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}
