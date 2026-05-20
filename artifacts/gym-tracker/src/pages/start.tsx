import { useListPlans, useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Play, Activity, Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
          date: new Date().toISOString(),
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
          date: new Date().toISOString(),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight text-primary">Start Workout</h1>
        <p className="text-muted-foreground">Choose a plan or start an empty session.</p>
      </div>

      <Button
        size="lg"
        className="w-full h-16 text-lg font-bold shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-secondary-border"
        onClick={handleStartAdhoc}
        disabled={createSession.isPending}
        data-testid="button-start-empty"
      >
        <Plus className="mr-2 h-5 w-5" />
        Start Empty Session
      </Button>

      <div className="space-y-4">
        <h2 className="text-xl font-bold font-mono uppercase text-muted-foreground mt-8 mb-4">From Plan</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse bg-muted h-24 border-0" />
            ))}
          </div>
        ) : plans?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-card/50">
            No plans available. Go to the Plans tab to create one.
          </div>
        ) : (
          <div className="grid gap-4">
            {plans?.map((plan) => (
              <Card key={plan.id} className="group border-border hover:border-primary/50 transition-colors bg-card">
                <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate" data-testid={`text-plan-name-${plan.id}`}>
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {plan.exercises.length} exercise{plan.exercises.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleStartPlan(plan.id)}
                    disabled={createSession.isPending}
                    data-testid={`button-start-plan-${plan.id}`}
                    className="shrink-0 rounded-full h-12 w-12 p-0"
                  >
                    <Play className="h-5 w-5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
