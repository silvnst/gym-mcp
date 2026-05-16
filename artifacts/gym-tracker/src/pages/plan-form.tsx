import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import { useCreatePlan, useUpdatePlan, useGetPlan, getListPlansQueryKey, getGetPlanQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  targetSets: z.coerce.number().min(1, "Min 1 set"),
  targetReps: z.coerce.number().min(1, "Min 1 rep"),
  targetWeightKg: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().optional().nullable()
  ),
  notes: z.string().optional().nullable(),
});

const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  notes: z.string().optional().nullable(),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise"),
});

type PlanFormValues = z.infer<typeof planSchema>;

export default function PlanFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isEditing = !!params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingPlan, isLoading: isFetching } = useGetPlan(params.id as string, {
    query: {
      enabled: isEditing,
      queryKey: getGetPlanQueryKey(params.id as string),
    },
  });

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      notes: "",
      exercises: [{ name: "", targetSets: 3, targetReps: 10, targetWeightKg: null, notes: "" }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  useEffect(() => {
    if (existingPlan && isEditing) {
      form.reset({
        name: existingPlan.name,
        notes: existingPlan.notes || "",
        exercises: existingPlan.exercises.sort((a, b) => a.sortOrder - b.sortOrder).map(e => ({
          name: e.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetWeightKg: e.targetWeightKg,
          notes: e.notes || "",
        })),
      });
    }
  }, [existingPlan, isEditing, form]);

  const onSubmit = (data: PlanFormValues) => {
    const formattedData = {
      name: data.name,
      notes: data.notes || undefined,
      exercises: data.exercises.map((e, index) => ({
        ...e,
        sortOrder: index,
      })),
    };

    if (isEditing) {
      updatePlan.mutate(
        { id: params.id as string, data: formattedData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey(params.id as string) });
            toast({ title: "Plan updated successfully" });
            setLocation("/");
          },
          onError: () => toast({ title: "Failed to update plan", variant: "destructive" }),
        }
      );
    } else {
      createPlan.mutate(
        { data: formattedData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
            toast({ title: "Plan created successfully" });
            setLocation("/");
          },
          onError: () => toast({ title: "Failed to create plan", variant: "destructive" }),
        }
      );
    }
  };

  if (isEditing && isFetching) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight text-primary">
            {isEditing ? "Edit Plan" : "New Plan"}
          </h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardContent className="pt-6 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Push Day, Full Body" {...field} data-testid="input-plan-name" className="text-lg font-medium" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any focus areas or instructions?"
                        className="resize-none h-20"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-mono uppercase">Exercises</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", targetSets: 3, targetReps: 10, targetWeightKg: null, notes: "" })}
                data-testid="button-add-exercise"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Exercise
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="relative group">
                <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0 gap-2">
                  <div className="flex flex-col gap-1 shrink-0 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      data-testid={`button-move-up-${index}`}
                      aria-label="Move exercise up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      data-testid={`button-move-down-${index}`}
                      aria-label="Move exercise down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Exercise name" {...field} data-testid={`input-exercise-name-${index}`} className="font-bold border-0 bg-muted/50 focus-visible:ring-1 text-base px-3" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
                    onClick={() => remove(index)}
                    data-testid={`button-remove-exercise-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-4 pl-16">
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.targetSets`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Sets</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} data-testid={`input-sets-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.targetReps`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Reps</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} data-testid={`input-reps-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.targetWeightKg`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Weight (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="Optional"
                              {...field}
                              value={field.value || ""}
                              data-testid={`input-weight-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-3">
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Notes (e.g. tempo, focus)..."
                              className="text-sm h-8 bg-transparent border-dashed"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No exercises added yet.
              </div>
            )}

            {form.formState.errors.exercises?.root && (
              <p className="text-sm font-medium text-destructive mt-2">
                {form.formState.errors.exercises.root.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isPending} data-testid="button-save-plan">
            {isPending ? "Saving..." : "Save Plan"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
