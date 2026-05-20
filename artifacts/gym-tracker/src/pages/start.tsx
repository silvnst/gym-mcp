import { useListPlans, useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Play } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function StartSessionPage() {
  const { data: plans, isLoading } = useListPlans();
  const createSession = useCreateSession();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleStartPlan = (planId: string) => {
    const plan = plans?.find((p) => p.id === planId);
    if (!plan) return;

    createSession.mutate(
      {
        data: {
          planId: plan.id,
          name: plan.name,
          date: format(new Date(), "yyyy-MM-dd"),
          exercises: plan.exercises.map((e) => ({
            name: e.name,
            sortOrder: e.sortOrder,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            targetWeightKg: e.targetWeightKg,
            planExerciseId: e.id,
          })),
        },
      },
      {
        onSuccess: (session) => {
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          setLocation(`/session/${session.id}`);
        },
        onError: () => toast({ title: "Failed to start session", variant: "destructive" }),
      }
    );
  };

  const handleStartAdhoc = () => {
    createSession.mutate(
      {
        data: {
          name: "Free Session",
          date: format(new Date(), "yyyy-MM-dd"),
          exercises: [],
        },
      },
      {
        onSuccess: (session) => {
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          setLocation(`/session/${session.id}`);
        },
        onError: () => toast({ title: "Failed to start session", variant: "destructive" }),
      }
    );
  };

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Train</h2>
        <h1 className="text-4xl font-serif text-foreground">Start Workout</h1>
      </div>

      <button
        onClick={handleStartAdhoc}
        disabled={createSession.isPending}
        data-testid="button-start-empty"
        className="w-full bg-primary text-primary-foreground font-medium py-4 px-6 rounded-sm shadow-sm flex justify-between items-center mb-12 disabled:opacity-60"
      >
        <span className="text-lg">Start Empty Session</span>
        <Play className="w-5 h-5 fill-current" />
      </button>

      <div>
        <h3 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4 border-b border-border pb-2">
          From Plan
        </h3>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-card border border-border h-20 rounded-sm" />
            ))}
          </div>
        ) : plans?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-sm bg-card/50 mt-6 text-sm">
            No plans available. Go to the Plans tab to create one.
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {plans?.map((plan) => (
              <div
                key={plan.id}
                className="flex justify-between items-center bg-card border border-border p-4 rounded-sm"
                data-testid={`card-start-plan-${plan.id}`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <h4 className="text-lg font-serif text-foreground truncate" data-testid={`text-plan-name-${plan.id}`}>
                    {plan.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.exercises.length} exercise{plan.exercises.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => handleStartPlan(plan.id)}
                  disabled={createSession.isPending}
                  data-testid={`button-start-plan-${plan.id}`}
                  className="h-12 w-12 flex items-center justify-center rounded-full bg-background border border-border text-foreground hover:border-primary transition-colors shrink-0 disabled:opacity-60"
                  aria-label={`Start ${plan.name}`}
                >
                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
