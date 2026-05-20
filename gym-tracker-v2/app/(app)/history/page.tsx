'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const PAGE_SIZE = 10

type Session = {
  id: string
  planId: string | null
  date: string
  name: string
  notes: string | null
  createdAt: string
}

export default function HistoryPage() {
  const [offset, setOffset] = useState(0)

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['sessions', { limit: PAGE_SIZE, offset }],
    queryFn: () =>
      fetch(`/api/sessions?limit=${PAGE_SIZE}&offset=${offset}`).then((r) => r.json()),
  })

  const hasPrev = offset > 0
  const hasNext = (sessions?.length ?? 0) === PAGE_SIZE
  const page = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">
          Logbook
        </h2>
        <h1 className="text-4xl text-foreground" style={{ fontFamily: 'Georgia, serif' }}>
          History
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-card border border-border h-20 rounded-sm" />
          ))}
        </div>
      ) : sessions?.length === 0 && offset === 0 ? (
        <div className="text-center py-14 px-6 text-muted-foreground bg-card rounded-sm border border-dashed border-border">
          <Calendar className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No sessions recorded yet. Start a workout to see it here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {sessions?.map((session) => {
              const d = parseISO(session.date)
              return (
                <Link
                  key={session.id}
                  href={`/history/${session.id}`}
                  data-testid={`card-session-${session.id}`}
                  className="flex gap-4 items-start group"
                >
                  <div className="flex-shrink-0 w-12 pt-1 text-center">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                      {format(d, 'MMM')}
                    </div>
                    <div
                      className="text-2xl text-foreground leading-tight"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {format(d, 'd')}
                    </div>
                  </div>

                  <div className="flex-1 bg-card border border-border p-4 rounded-sm group-hover:border-primary transition-colors min-w-0">
                    <h3
                      className="text-lg text-foreground truncate"
                      data-testid={`text-session-name-${session.id}`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {session.name}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span>{format(d, 'h:mm a')}</span>
                    </div>
                  </div>
                </Link>
              )
            })}

            {sessions?.length === 0 && offset > 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No more sessions.
              </div>
            )}
          </div>

          {(hasPrev || hasNext) && (
            <div className="mt-12 flex justify-between items-center text-sm font-medium text-foreground border-t border-border pt-6">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={!hasPrev}
                data-testid="button-history-prev"
                className="py-2 px-4 border border-border rounded-sm text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
              >
                Previous
              </button>
              <span style={{ fontFamily: 'Georgia, serif' }}>Page {page}</span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!hasNext}
                data-testid="button-history-next"
                className="py-2 px-4 border border-border rounded-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
