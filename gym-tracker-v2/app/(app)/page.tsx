'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Trash2, Dumbbell } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

type PlanExercise = {
  id: string
  planId: string
  name: string
  sortOrder: number
  targetSets: number
  targetReps: number
  targetWeightKg: number | null
  notes: string | null
}

type Plan = {
  id: string
  name: string
  notes: string | null
  createdAt: string
  exercises: PlanExercise[]
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => fetch('/api/plans').then((r) => r.json()),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/plans/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast({ title: 'Plan deleted' })
    },
    onError: () => {
      toast({ title: 'Failed to delete plan', variant: 'destructive' })
    },
  })

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this plan?')) {
      deletePlan.mutate(id)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">
            Library
          </h2>
          <h1 className="text-4xl text-foreground" style={{ fontFamily: 'Georgia, serif' }}>
            Your Plans
          </h1>
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
            <h3 className="text-xl" style={{ fontFamily: 'Georgia, serif' }}>
              No plans yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first workout plan to get started.
            </p>
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
                  <h3
                    className="text-xl text-foreground truncate"
                    data-testid={`text-plan-name-${plan.id}`}
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.exercises.length} exercise{plan.exercises.length === 1 ? '' : 's'} •
                    Created {format(new Date(plan.createdAt), 'MMM d, yyyy')}
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
  )
}
