import { useState } from "react";
import { useListSessions, useDeleteSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Calendar, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [offset, setOffset] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useListSessions(
    { limit: PAGE_SIZE, offset },
    { query: { queryKey: ["/api/sessions", { limit: PAGE_SIZE, offset }] } }
  );

  const deleteSession = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Workout deleted" });
        setConfirmId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete workout", variant: "destructive" });
        setConfirmId(null);
      },
    },
  });

  const hasPrev = offset > 0;
  const hasNext = (sessions?.length ?? 0) === PAGE_SIZE;
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Logbook</h2>
        <h1 className="text-4xl font-serif text-foreground">History</h1>
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
              const d = parseISO(session.date);
              const isConfirming = confirmId === session.id;

              return (
                <div key={session.id} className="flex gap-4 items-start">
                  {/* Date column */}
                  <div className="flex-shrink-0 w-12 pt-1 text-center">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                      {format(d, "MMM")}
                    </div>
                    <div className="text-2xl font-serif text-foreground leading-tight">
                      {format(d, "d")}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0">
                    {isConfirming ? (
                      /* Inline confirmation */
                      <div className="bg-card border border-destructive/40 p-4 rounded-sm flex items-center justify-between gap-3">
                        <p className="text-sm text-foreground font-serif">Delete this workout?</p>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs font-medium text-muted-foreground px-3 py-1.5 border border-border rounded-sm hover:border-primary transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => deleteSession.mutate({ id: session.id })}
                            disabled={deleteSession.isPending}
                            className="text-xs font-medium text-destructive-foreground bg-destructive px-3 py-1.5 rounded-sm disabled:opacity-60"
                          >
                            {deleteSession.isPending ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <Link
                          href={`/history/${session.id}`}
                          data-testid={`card-session-${session.id}`}
                          className="block bg-card border border-border p-4 rounded-sm hover:border-primary transition-colors"
                        >
                          <h3
                            className="text-lg font-serif text-foreground truncate pr-8"
                            data-testid={`text-session-name-${session.id}`}
                          >
                            {session.name}
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                            <span>{format(d, "h:mm a")}</span>
                          </div>
                        </Link>
                        {/* Trash button — overlaid top-right, stops link navigation */}
                        <button
                          onClick={(e) => { e.preventDefault(); setConfirmId(session.id); }}
                          data-testid={`button-delete-session-${session.id}`}
                          aria-label="Delete workout"
                          className="absolute top-3 right-3 p-1.5 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sessions?.length === 0 && offset > 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No more sessions.</div>
            )}
          </div>

          {(hasPrev || hasNext) && (
            <div className="mt-12 flex justify-between items-center text-sm font-medium text-foreground border-t border-border pt-6">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={!hasPrev}
                data-testid="button-history-prev"
                className="py-2 px-4 border border-border rounded-sm text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:border-primary transition-colors"
              >
                Previous
              </button>
              <span className="font-serif">Page {page}</span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!hasNext}
                data-testid="button-history-next"
                className="py-2 px-4 border border-border rounded-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:border-primary transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
