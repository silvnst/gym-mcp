import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSession, useDeleteSession, getGetSessionQueryKey, getListSessionsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function SessionDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading } = useGetSession(params.id as string, {
    query: {
      enabled: !!params.id,
      queryKey: getGetSessionQueryKey(params.id as string),
    },
  });

  const deleteSession = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Workout deleted" });
        setLocation("/history");
      },
      onError: () => {
        toast({ title: "Failed to delete workout", variant: "destructive" });
        setConfirming(false);
      },
    },
  });

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground font-serif italic">Loading details…</div>;
  }

  if (!session) {
    return <div className="py-16 text-center text-destructive font-serif italic">Session not found</div>;
  }

  const exercises = session.exercises ?? [];

  const totalVolume = exercises.reduce((acc, exercise) => {
    return acc + (exercise.sets ?? []).reduce((setAcc, set) => {
      const reps = set.reps ?? 0;
      const weight = set.weightKg ?? 0;
      return setAcc + reps * weight;
    }, 0);
  }, 0);

  const totalSets = exercises.reduce(
    (acc, ex) => acc + (ex.sets ?? []).filter((s) => s.reps != null && s.weightKg != null).length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Editorial header */}
      <div className="flex items-start gap-4">
        <Link href="/history">
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">History</h2>
          <h1 className="text-4xl font-serif text-foreground">Workout Summary</h1>
        </div>
        {/* Delete button */}
        {confirming ? (
          <div className="flex gap-2 items-center shrink-0 mt-1">
            <button
              onClick={() => setConfirming(false)}
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
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirming(true)}
            data-testid="button-delete-session"
            className="shrink-0 mt-1 text-muted-foreground/40 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Session overview card */}
      <Card className="bg-card border border-border rounded-sm">
        <CardContent className="p-5">
          <h2 className="text-2xl font-serif mb-2">{session.name}</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {format(new Date(session.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-background rounded-sm p-4 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest mb-1">Total Volume</div>
              <div className="text-2xl font-serif text-primary">{totalVolume > 0 ? `${totalVolume} kg` : "—"}</div>
            </div>
            <div className="bg-background rounded-sm p-4 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest mb-1">Sets Completed</div>
              <div className="text-2xl font-serif text-primary">{totalSets}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises section */}
      <div className="space-y-10">
        <div className="border-b border-border pb-2">
          <h3 className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-1">Logged</h3>
          <p className="text-2xl font-serif text-foreground">Exercises</p>
        </div>

        {exercises.length === 0 ? (
          <div className="text-muted-foreground font-serif italic">No exercises logged in this session.</div>
        ) : (
          exercises
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((exercise, index) => {
              const allSets = (exercise.sets ?? []).slice().sort((a, b) => a.setNumber - b.setNumber);
              const hasTarget = exercise.targetReps != null || exercise.targetWeightKg != null || exercise.targetSets != null;

              return (
                <div key={exercise.id} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-serif text-muted-foreground">{index + 1}.</span>
                      <h4 className="text-2xl font-serif text-foreground">{exercise.name}</h4>
                    </div>
                    {hasTarget && (
                      <span className="text-xs font-medium text-primary">
                        Target: {exercise.targetSets ?? "—"}×{exercise.targetReps ?? "—"}
                        {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ""}
                      </span>
                    )}
                  </div>

                  {allSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic pl-6">No sets logged.</p>
                  ) : (
                    <div className="rounded-sm border border-border/50 overflow-hidden">
                      {/* Mobile-optimised 4-column table: Set | kg | Reps | Vol */}
                      <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr] text-[10px] font-medium tracking-widest uppercase text-muted-foreground bg-muted/50 px-3 py-2 gap-2">
                        <div className="text-center">Set</div>
                        <div className="text-right">kg</div>
                        <div className="text-right">Reps</div>
                        <div className="text-right">Vol</div>
                      </div>
                      <div className="divide-y divide-border/30">
                        {allSets.map((set) => {
                          const vol =
                            set.reps != null && set.weightKg != null
                              ? set.reps * set.weightKg
                              : null;
                          const isComplete = set.reps != null && set.weightKg != null;

                          return (
                            <div
                              key={set.id}
                              className={`grid grid-cols-[2.5rem_1fr_1fr_1fr] gap-2 px-3 py-2.5 text-sm items-center ${
                                isComplete ? "bg-card" : "bg-muted/10"
                              }`}
                            >
                              <div className="text-center font-serif text-muted-foreground text-xs">{set.setNumber}</div>
                              <div className="text-right font-medium text-foreground">
                                {set.weightKg ?? <span className="text-muted-foreground/40">—</span>}
                              </div>
                              <div className="text-right font-medium text-foreground">
                                {set.reps ?? <span className="text-muted-foreground/40">—</span>}
                              </div>
                              <div className="text-right font-serif text-primary/80 text-xs">
                                {vol != null && vol > 0 ? vol : <span className="text-muted-foreground/40">—</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
