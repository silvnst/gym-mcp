import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetSession,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useAddSessionExercise,
  getGetSessionQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useIsMutating } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const nextSetNumber =
      existingSets.length === 0 ? 1 : Math.max(...existingSets.map((s) => s.setNumber)) + 1;
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

  const seededExercises = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session) return;
    for (const exercise of session.exercises) {
      const target = exercise.targetSets;
      if (!target || exercise.sets.length >= target) continue;
      if (seededExercises.current.has(exercise.id)) continue;
      seededExercises.current.add(exercise.id);
      const existingMax =
        exercise.sets.length === 0
          ? 0
          : Math.max(...exercise.sets.map((s) => s.setNumber));
      for (let i = existingMax + 1; i <= target; i++) {
        const setNumber = i;
        addSet.mutate(
          { id: session.id, data: { sessionExerciseId: exercise.id, setNumber } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({
                queryKey: getGetSessionQueryKey(session.id),
              });
            },
          }
        );
      }
    }
  }, [session]);

  const isMutating = useIsMutating();

  const handleFinish = () => {
    toast({ title: "Workout saved", description: "Great job." });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    setLocation("/history");
  };

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground font-serif italic">Loading session…</div>;
  }

  if (!session) {
    return <div className="py-16 text-center text-destructive font-serif italic">Session not found</div>;
  }

  const sortedExercises = session.exercises.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="-mt-10 -mx-6">
      {/* Sticky editorial header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex justify-between items-center">
        <div className="min-w-0">
          <h2 className="text-[10px] font-medium tracking-widest uppercase text-primary mb-0.5">Active</h2>
          <h1
            className="text-xl font-serif font-medium truncate"
            data-testid="text-session-name"
          >
            {session.name}
          </h1>
        </div>
        <button
          onClick={handleFinish}
          disabled={isMutating > 0}
          data-testid="button-finish-session"
          title={isMutating > 0 ? "Saving changes…" : undefined}
          className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-sm text-sm font-medium shrink-0 disabled:opacity-60"
        >
          {isMutating > 0 ? "Saving…" : "Finish"}
        </button>
      </div>

      <div className="px-6 pt-8 pb-8 space-y-12">
        {sortedExercises.map((exercise, index) => (
          <div key={exercise.id}>
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-serif text-muted-foreground">{index + 1}.</span>
                <h3 className="text-2xl font-serif truncate">{exercise.name}</h3>
              </div>
              {(exercise.targetSets || exercise.targetReps || exercise.targetWeightKg) && (
                <p className="text-sm text-primary font-medium mt-1">
                  Target: {exercise.targetSets || "—"} × {exercise.targetReps || "—"}
                  {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ""}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 px-2 text-[10px] font-medium text-muted-foreground tracking-widest uppercase mb-1">
                <div className="text-center">Set</div>
                <div className="text-center">kg</div>
                <div className="text-center">Reps</div>
                <div></div>
              </div>

              {exercise.sets.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground italic">
                  No sets logged yet.
                </div>
              ) : (
                exercise.sets
                  .slice()
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((set) => (
                    <SetRow
                      key={set.id}
                      sessionId={session.id}
                      set={set}
                      targetReps={exercise.targetReps}
                      targetWeight={exercise.targetWeightKg}
                      onDelete={() => handleDeleteSet(session.id, set.id)}
                    />
                  ))
              )}

              <button
                className="mt-3 text-sm font-medium text-muted-foreground flex items-center gap-1 mx-auto py-2 px-4 hover:text-primary transition-colors"
                onClick={() => handleAddSet(exercise.id, exercise.sets)}
                data-testid={`button-add-set-${exercise.id}`}
              >
                <Plus className="w-4 h-4" /> Add Set
              </button>
            </div>
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
    <div className="border-t border-dashed border-border pt-6">
      <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
        Add Exercise
      </h3>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={isPending}
          data-testid="input-add-exercise-name"
          className="flex-1 h-11 rounded-sm"
        />
        <Button
          onClick={handleSubmit}
          disabled={isPending || !name.trim()}
          data-testid="button-add-exercise-to-session"
          className="shrink-0 h-11 rounded-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          {isPending ? "Adding…" : "Add"}
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
    if (reps === lastSavedReps.current && weight === lastSavedWeight.current) return;

    lastSavedReps.current = reps;
    lastSavedWeight.current = weight;

    const parsedReps = reps ? parseInt(reps, 10) : null;
    const parsedWeight = weight ? parseFloat(weight) : null;
    updateSet.mutate(
      {
        id: set.id,
        data: {
          reps: parsedReps !== null && Number.isFinite(parsedReps) ? parsedReps : null,
          weightKg: parsedWeight !== null && Number.isFinite(parsedWeight) ? parsedWeight : null,
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

  const baseInput =
    "h-11 w-full text-center text-lg bg-transparent border-b outline-none transition-colors text-foreground";
  const inputState = isCompleted
    ? "border-transparent font-medium"
    : "border-border focus:border-primary";

  return (
    <div
      className={`grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center p-2 rounded-sm transition-colors ${
        isCompleted ? "bg-card" : ""
      }`}
    >
      <div className="text-center text-sm font-medium font-serif">{set.setNumber}</div>

      <input
        type="text"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={targetWeight ? targetWeight.toString() : "—"}
        data-testid={`input-set-${set.id}-weight`}
        className={`${baseInput} ${inputState} placeholder:text-muted-foreground/40`}
      />

      <input
        type="text"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={targetReps ? targetReps.toString() : "—"}
        data-testid={`input-set-${set.id}-reps`}
        className={`${baseInput} ${inputState} placeholder:text-muted-foreground/40`}
      />

      <div className="flex items-center justify-center gap-1">
        {isCompleted ? (
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Check className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full border border-border flex items-center justify-center">
            <Check className="w-3.5 h-3.5 opacity-20" />
          </div>
        )}
        <button
          onClick={onDelete}
          data-testid={`button-delete-set-${set.id}`}
          className="ml-1 h-8 w-8 -mr-2 flex items-center justify-center text-muted-foreground/40 hover:text-destructive"
          aria-label="Delete set"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
