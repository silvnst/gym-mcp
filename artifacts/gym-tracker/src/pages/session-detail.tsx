import { useParams } from "wouter";
import { useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionDetailPage() {
  const params = useParams();

  const { data: session, isLoading } = useGetSession(params.id as string, {
    query: {
      enabled: !!params.id,
      queryKey: getGetSessionQueryKey(params.id as string),
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
        <div>
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">History</h2>
          <h1 className="text-4xl font-serif text-foreground">Workout Summary</h1>
        </div>
      </div>

      {/* Session overview card */}
      <Card className="bg-card border border-border rounded-sm">
        <CardContent className="p-6">
          <h2 className="text-2xl font-serif mb-2">{session.name}</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {format(new Date(session.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
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
              const hasTarget = exercise.targetReps != null || exercise.targetWeightKg != null;

              return (
                <div key={exercise.id} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-serif text-muted-foreground">{index + 1}.</span>
                      <h4 className="text-2xl font-serif text-foreground">{exercise.name}</h4>
                    </div>
                    {hasTarget && (
                      <span className="text-xs font-medium text-primary shrink-0">
                        Target: {exercise.targetSets ?? "—"}×{exercise.targetReps ?? "—"}
                        {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ""}
                      </span>
                    )}
                  </div>

                  {allSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic pl-6">No sets logged.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-sm border border-border/50">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                          <tr>
                            <th className="py-2 px-3 text-center w-12">Set</th>
                            <th className="py-2 px-3 text-right">Target kg</th>
                            <th className="py-2 px-3 text-right text-foreground">Actual kg</th>
                            <th className="py-2 px-3 text-right">Target Reps</th>
                            <th className="py-2 px-3 text-right text-foreground">Actual Reps</th>
                            <th className="py-2 px-3 text-right">Vol</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {allSets.map((set) => {
                            const actualReps = set.reps;
                            const actualWeight = set.weightKg;
                            const vol =
                              actualReps != null && actualWeight != null
                                ? actualReps * actualWeight
                                : null;
                            const isComplete = actualReps != null && actualWeight != null;

                            return (
                              <tr key={set.id} className={isComplete ? "bg-card" : "bg-muted/20"}>
                                <td className="py-2 px-3 text-center font-serif text-muted-foreground">
                                  {set.setNumber}
                                </td>
                                <td className="py-2 px-3 text-right text-muted-foreground">
                                  {exercise.targetWeightKg ?? "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-foreground">
                                  {actualWeight ?? <span className="text-muted-foreground/50">—</span>}
                                </td>
                                <td className="py-2 px-3 text-right text-muted-foreground">
                                  {exercise.targetReps ?? "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-foreground">
                                  {actualReps ?? <span className="text-muted-foreground/50">—</span>}
                                </td>
                                <td className="py-2 px-3 text-right font-serif text-primary/80">
                                  {vol != null && vol > 0 ? vol : <span className="text-muted-foreground/50">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
