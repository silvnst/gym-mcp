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
    return <div className="p-8 text-center font-mono">Loading details...</div>;
  }

  if (!session) {
    return <div className="p-8 text-center text-destructive">Session not found</div>;
  }

  const totalVolume = session.exercises.reduce((acc, exercise) => {
    return acc + exercise.sets.reduce((setAcc, set) => {
      const reps = set.reps ?? 0;
      const weight = set.weightKg ?? 0;
      return setAcc + reps * weight;
    }, 0);
  }, 0);

  const totalSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.reps != null && s.weightKg != null).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/history">
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight text-primary">
            Workout Summary
          </h1>
        </div>
      </div>

      <Card className="bg-card border-primary/20">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">{session.name}</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {format(new Date(session.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-background rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Volume</div>
              <div className="text-2xl font-mono font-bold text-primary">{totalVolume > 0 ? `${totalVolume} kg` : "—"}</div>
            </div>
            <div className="bg-background rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Sets Completed</div>
              <div className="text-2xl font-mono font-bold text-primary">{totalSets}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 mt-8">
        <h3 className="text-xl font-bold font-mono uppercase border-b pb-2">Exercises</h3>

        {session.exercises.length === 0 ? (
          <div className="text-muted-foreground">No exercises logged in this session.</div>
        ) : (
          session.exercises
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((exercise, index) => {
              const allSets = exercise.sets.slice().sort((a, b) => a.setNumber - b.setNumber);
              const hasTarget = exercise.targetReps != null || exercise.targetWeightKg != null;

              return (
                <div key={exercise.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-primary/50 text-sm">{index + 1}.</span>
                      {exercise.name}
                    </h4>
                    {hasTarget && (
                      <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded-md">
                        Target: {exercise.targetSets ?? "—"}×{exercise.targetReps ?? "—"}
                        {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ""}
                      </span>
                    )}
                  </div>

                  {allSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic pl-6">No sets logged.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border border-border/50">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground font-mono text-xs">
                          <tr>
                            <th className="py-2 px-3 text-center w-12">Set</th>
                            <th className="py-2 px-3 text-right">Target kg</th>
                            <th className="py-2 px-3 text-right font-semibold text-foreground">Actual kg</th>
                            <th className="py-2 px-3 text-right">Target Reps</th>
                            <th className="py-2 px-3 text-right font-semibold text-foreground">Actual Reps</th>
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
                                <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                                  {set.setNumber}
                                </td>
                                <td className="py-2 px-3 text-right text-muted-foreground">
                                  {exercise.targetWeightKg ?? "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-foreground">
                                  {actualWeight ?? <span className="text-muted-foreground/50">—</span>}
                                </td>
                                <td className="py-2 px-3 text-right text-muted-foreground">
                                  {exercise.targetReps ?? "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-foreground">
                                  {actualReps ?? <span className="text-muted-foreground/50">—</span>}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-primary/80">
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
