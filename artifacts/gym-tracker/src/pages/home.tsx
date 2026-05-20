import { useListPlans, useDeletePlan, getListPlansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { data: plans, isLoading } = useListPlans();
  const deletePlan = useDeletePlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Library</h2>
          <h1 className="text-4xl font-serif text-foreground">Your Plans</h1>
        </div>
        <Link
          href="/plans/new"
          data-testid="button-create-plan"
          className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="New plan"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-card border border-border h-24 rounded-sm" />
          ))}
        </div>
      ) : plans?.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-sm flex flex-col items-center justify-center h-56 text-center space-y-4 px-6">
          <div className="rounded-full bg-primary/10 p-4">
            <Dumbbell className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-serif">No plans yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first workout plan to get started.</p>
          </div>
          <Link
            href="/plans/new"
            data-testid="button-create-first-plan"
            className="text-sm font-medium px-5 py-2.5 border border-border rounded-sm hover:border-primary transition-colors"
          >
            Create Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans?.map((plan) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}/edit`}
              data-testid={`card-plan-${plan.id}`}
              className="block group bg-card border border-border p-5 rounded-sm hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-serif text-foreground truncate" data-testid={`text-plan-name-${plan.id}`}>
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.exercises.length} exercise{plan.exercises.length === 1 ? "" : "s"} • Created {format(new Date(plan.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(plan.id, e)}
                  data-testid={`button-delete-plan-${plan.id}`}
                  className="text-muted-foreground hover:text-destructive p-2 -m-2 h-10 w-10 flex items-center justify-center shrink-0"
                  aria-label="Delete plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
