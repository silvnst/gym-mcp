import { useState } from "react";
import { useListSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Calendar, ChevronRight, Clock, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [offset, setOffset] = useState(0);

  const { data: sessions, isLoading } = useListSessions(
    { limit: PAGE_SIZE, offset },
    { query: { queryKey: ["/api/sessions", { limit: PAGE_SIZE, offset }] } }
  );

  const hasPrev = offset > 0;
  const hasNext = (sessions?.length ?? 0) === PAGE_SIZE;
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight text-primary">Training History</h1>
        <p className="text-muted-foreground">Review your past workouts.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse bg-muted h-24 border-0" />
          ))}
        </div>
      ) : sessions?.length === 0 && offset === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
          No sessions recorded yet. Start a workout to see it here.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sessions?.map((session) => (
              <Link key={session.id} href={`/history/${session.id}`}>
                <Card className="group hover:border-primary/50 transition-colors cursor-pointer" data-testid={`card-session-${session.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-lg p-3 text-center min-w-16 flex flex-col justify-center">
                        <span className="text-xs font-bold text-primary uppercase">{format(new Date(session.date), "MMM")}</span>
                        <span className="text-xl font-bold font-mono text-primary leading-none">{format(new Date(session.date), "d")}</span>
                      </div>
                      
                      <div className="py-1">
                        <h3 className="font-bold text-lg" data-testid={`text-session-name-${session.id}`}>
                          {session.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(session.date), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}

            {sessions?.length === 0 && offset > 0 && (
              <div className="text-center py-8 text-muted-foreground">No more sessions.</div>
            )}
          </div>

          {(hasPrev || hasNext) && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={!hasPrev}
                data-testid="button-history-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground font-mono">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!hasNext}
                data-testid="button-history-next"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
