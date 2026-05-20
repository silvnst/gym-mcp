import { useListPlans, useDeletePlan, getListPlansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Trash2, Dumbbell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { data: plans, isLoading } = useListPlans();
  const deletePlan = useDeletePlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this plan?")) {
      deletePlan.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
            toast({ title: "Plan deleted" });
          },
          onError: () => {
            toast({ title: "Failed to delete plan", variant: "destructive" });
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase tracking-tight text-primary">Your Plans</h1>
          <p className="text-muted-foreground">Manage your workout routines.</p>
        </div>
        <Link href="/plans/new">
          <Button data-testid="button-create-plan" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-muted h-24 border-0" />
          ))}
        </div>
      ) : plans?.length === 0 ? (
        <Card className="bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No plans yet</h3>
              <p className="text-sm text-muted-foreground">Create your first workout plan to get started.</p>
            </div>
            <Link href="/plans/new">
              <Button variant="outline" data-testid="button-create-first-plan">
                Create Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans?.map((plan) => (
            <Link key={plan.id} href={`/plans/${plan.id}/edit`}>
              <Card className="group hover:border-primary/50 transition-colors cursor-pointer" data-testid={`card-plan-${plan.id}`}>
                <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate" data-testid={`text-plan-name-${plan.id}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {plan.exercises.length} exercise{plan.exercises.length === 1 ? "" : "s"}
                      </span>
                      <span>•</span>
                      <span>Created {format(new Date(plan.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => handleDelete(plan.id, e)}
                      data-testid={`button-delete-plan-${plan.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
