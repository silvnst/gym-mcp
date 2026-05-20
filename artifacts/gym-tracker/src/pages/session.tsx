import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSession, useAddSet, useUpdateSet, useDeleteSet, useAddSessionExercise, getGetSessionQueryKey, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useIsMutating } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { SetRecord } from "@workspace/api-client-react";

export default function SessionPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useGetSession(params.id as string, {
    query: {
      enabled: !!params.id,
      queryKey: getGetSessionQueryKey(params.id as string),
    },
  });

  const addSet = useAddSet();
  const deleteSet = useDeleteSet();

  const addExercise = useAddSessionExercise({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(params.id as string) });
      },
      onError: () => {
        toast({ title: "Failed to add exercise", variant: "destructive" });
      },
    },
  });

  const handleAddSet = (exerciseId: string, existingSets: { setNumber: number }[]) => {
    const nextSetNumber = existingSets.length === 0
      ? 1
      : Math.max(...existingSets.map((s) => s.setNumber)) + 1;
    addSet.mutate(
      {
        id: session!.id,
        data: {
          sessionExerciseId: exerciseId,
          setNumber: nextSetNumber,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(params.id as string) });
        },
      }
    );
  };

  const handleDeleteSet = (_sessionId: string, setId: string) => {
    deleteSet.mutate(
      { id: setId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(params.id as string) });
        },
      }
    );
  };

  const isMutating = useIsMutating();

  const handleFinish = () => {
    toast({ title: "Workout saved!", description: "Great job." });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    setLocation("/history");
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground font-mono">Loading session...</div>;
  }

  if (!session) {
    return <div className="p-8 text-center text-destructive">Session not found</div>;
  }

  const sortedExercises = session.exercises.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between sticky top-14 bg-background/95 backdrop-blur z-40 py-4 border-b border-border -mx-4 px-4 sm:-mx-8 sm:px-8">
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight text-primary truncate" data-testid="text-session-name">
            {session.name}
          </h1>
          <p className="text-sm text-muted-foreground">Recording active workout</p>
        </div>
        <Button
          onClick={handleFinish}
          disabled={isMutating > 0}
          data-testid="button-finish-session"
          className="font-bold shrink-0 shadow-md"
          title={isMutating > 0 ? "Saving changes..." : undefined}
        >
          <Check className="h-4 w-4 mr-2" />
          {isMutating > 0 ? "Saving..." : "Finish"}
        </Button>
      </div>

      <div className="space-y-8">
        {sortedExercises.map((exercise, index) => (
          <div key={exercise.id} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold tracking-tight">
                <span className="text-primary/60 mr-2">{index + 1}.</span>
                {exercise.name}
              </h2>
              {(exercise.targetSets || exercise.targetReps) && (
                <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded-md">
                  Target: {exercise.targetSets || "—"}×{exercise.targetReps || "—"}{exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ""}
                </span>
              )}
            </div>

            <Card className="overflow-hidden border-border/50">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted/30 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                <div className="col-span-2">Set</div>
                <div className="col-span-4">kg</div>
                <div className="col-span-4">Reps</div>
                <div className="col-span-2"></div>
              </div>

              <div className="divide-y divide-border/30">
                {exercise.sets.slice().sort((a, b) => a.setNumber - b.setNumber).map((set) => (
                  <SetRow
                    key={set.id}
                    sessionId={session.id}
                    set={set}
                    targetReps={exercise.targetReps}
                    targetWeight={exercise.targetWeightKg}
                    onDelete={() => handleDeleteSet(session.id, set.id)}
                  />
                ))}

                {exercise.sets.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No sets logged yet.
                  </div>
                )}
              </div>

              <div className="p-2 bg-muted/10">
                <Button
                  variant="ghost"
                  className="w-full text-primary hover:text-primary hover:bg-primary/10 h-10 font-medium"
                  onClick={() => handleAddSet(exercise.id, exercise.sets)}
                  data-testid={`button-add-set-${exercise.id}`}
                >
                  + Add Set
                </Button>
              </div>
            </Card>
          </div>
        ))}

        <AddExerciseRow
          onAdd={(name) =>
            addExercise.mutate({
              id: params.id as string,
              data: { name, sortOrder: session?.exercises.length ?? 0 },
            })
          }
          isPending={addExercise.isPending}
        />
      </div>
    </div>
  );
}

function AddExerciseRow({
  onAdd,
  isPending,
}: {
  onAdd: (name: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Add Exercise
      </h3>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Exercise name (e.g. Pull-ups)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={isPending}
          data-testid="input-add-exercise-name"
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={isPending || !name.trim()}
          data-testid="button-add-exercise-to-session"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          {isPending ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}

function SetRow({
  sessionId,
  set,
  targetReps,
  targetWeight,
  onDelete,
}: {
  sessionId: string;
  set: SetRecord;
  targetReps?: number | null;
  targetWeight?: number | null;
  onDelete: () => void;
}) {
  const updateSet = useUpdateSet();
  const queryClient = useQueryClient();

  const [reps, setReps] = useState(set.reps?.toString() || "");
  const [weight, setWeight] = useState(set.weightKg?.toString() || "");

  const lastSavedReps = useRef(reps);
  const lastSavedWeight = useRef(weight);

  const handleSave = () => {
    if (reps === lastSavedReps.current && weight === lastSavedWeight.current) {
      return;
    }

    lastSavedReps.current = reps;
    lastSavedWeight.current = weight;

    updateSet.mutate(
      {
        id: set.id,
        data: {
          reps: reps ? parseInt(reps, 10) : null,
          weightKg: weight ? parseFloat(weight) : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
      (e.target as HTMLElement).blur();
    }
  };

  const isCompleted = reps !== "" && weight !== "";

  return (
    <div className={`grid grid-cols-12 gap-2 p-2 items-center transition-colors ${isCompleted ? "bg-primary/5" : ""}`}>
      <div className="col-span-2 text-center font-mono text-sm font-bold text-muted-foreground">
        {set.setNumber}
      </div>
      <div className="col-span-4">
        <Input
          type="number"
          step="0.5"
          className={`h-12 text-center text-lg font-bold border-0 bg-transparent shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:bg-background ${isCompleted ? "text-primary" : ""}`}
          placeholder={targetWeight ? targetWeight.toString() : "—"}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          data-testid={`input-set-${set.id}-weight`}
        />
      </div>
      <div className="col-span-4">
        <Input
          type="number"
          className={`h-12 text-center text-lg font-bold border-0 bg-transparent shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:bg-background ${isCompleted ? "text-primary" : ""}`}
          placeholder={targetReps ? targetReps.toString() : "—"}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          data-testid={`input-set-${set.id}-reps`}
        />
      </div>
      <div className="col-span-2 flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onDelete}
          tabIndex={-1}
          data-testid={`button-delete-set-${set.id}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
