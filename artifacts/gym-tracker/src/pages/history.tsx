import { useState } from "react";
import {
  useListSessions,
  useDeleteSession,
  useGetTopExercises,
  useGetExerciseProgress,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Calendar, Trash2, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Dot,
} from "recharts";

const PAGE_SIZE = 10;
type View = "history" | "progress";
type Metric = "maxWeight" | "totalVolume";

export default function HistoryPage() {
  const [view, setView] = useState<View>("history");

  return (
    <div>
      {/* Editorial header */}
      <div className="mb-8">
        <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Logbook</h2>
        <h1 className="text-4xl font-serif text-foreground">History</h1>
      </div>

      {/* Pill toggle */}
      <div className="flex mb-8 bg-muted rounded-sm p-0.5 w-fit">
        <button
          onClick={() => setView("history")}
          data-testid="toggle-view-history"
          className={`px-5 py-1.5 text-xs font-medium tracking-widest uppercase rounded-sm transition-colors ${
            view === "history"
              ? "bg-secondary text-secondary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          History
        </button>
        <button
          onClick={() => setView("progress")}
          data-testid="toggle-view-progress"
          className={`px-5 py-1.5 text-xs font-medium tracking-widest uppercase rounded-sm transition-colors ${
            view === "progress"
              ? "bg-secondary text-secondary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Progress
        </button>
      </div>

      {view === "history" ? <HistoryView /> : <ProgressView />}
    </div>
  );
}

function HistoryView() {
  const [offset, setOffset] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useListSessions(
    { limit: PAGE_SIZE, offset },
    { query: { queryKey: ["/api/sessions", { limit: PAGE_SIZE, offset }] } }
  );

  const deleteSession = useDeleteSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Workout deleted" });
        setConfirmId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete workout", variant: "destructive" });
        setConfirmId(null);
      },
    },
  });

  const hasPrev = offset > 0;
  const hasNext = (sessions?.length ?? 0) === PAGE_SIZE;
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-card border border-border h-20 rounded-sm" />
        ))}
      </div>
    );
  }

  if (sessions?.length === 0 && offset === 0) {
    return (
      <div className="text-center py-14 px-6 text-muted-foreground bg-card rounded-sm border border-dashed border-border">
        <Calendar className="h-10 w-10 mx-auto mb-4 opacity-30" />
        <p className="text-sm">No sessions recorded yet. Start a workout to see it here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {sessions?.map((session) => {
          const d = parseISO(session.date);
          const timeD = new Date(session.createdAt);
          const isConfirming = confirmId === session.id;

          return (
            <div key={session.id} className="flex gap-4 items-start">
              {/* Date column */}
              <div className="flex-shrink-0 w-12 pt-1 text-center">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                  {format(d, "MMM")}
                </div>
                <div className="text-2xl font-serif text-foreground leading-tight">
                  {format(d, "d")}
                </div>
              </div>

              {/* Card */}
              <div className="flex-1 min-w-0">
                {isConfirming ? (
                  <div className="bg-card border border-destructive/40 p-4 rounded-sm flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground font-serif">Delete this workout?</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs font-medium text-muted-foreground px-3 py-1.5 border border-border rounded-sm hover:border-primary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteSession.mutate({ id: session.id })}
                        disabled={deleteSession.isPending}
                        className="text-xs font-medium text-destructive-foreground bg-destructive px-3 py-1.5 rounded-sm disabled:opacity-60"
                      >
                        {deleteSession.isPending ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Link
                      href={`/history/${session.id}`}
                      data-testid={`card-session-${session.id}`}
                      className="block bg-card border border-border p-4 rounded-sm hover:border-primary transition-colors"
                    >
                      <h3
                        className="text-lg font-serif text-foreground truncate pr-10"
                        data-testid={`text-session-name-${session.id}`}
                      >
                        {session.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span>{format(timeD, "h:mm a")}</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => setConfirmId(session.id)}
                      data-testid={`button-delete-session-${session.id}`}
                      aria-label="Delete workout"
                      className="absolute top-3 right-3 p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sessions?.length === 0 && offset > 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No more sessions.</div>
        )}
      </div>

      {(hasPrev || hasNext) && (
        <div className="mt-12 flex justify-between items-center text-sm font-medium text-foreground border-t border-border pt-6">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!hasPrev}
            data-testid="button-history-prev"
            className="py-2 px-4 border border-border rounded-sm text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:border-primary transition-colors"
          >
            Previous
          </button>
          <span className="font-serif">Page {page}</span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasNext}
            data-testid="button-history-next"
            className="py-2 px-4 border border-border rounded-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:border-primary transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

function ProgressView() {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("maxWeight");

  const { data: topExercises, isLoading: loadingTop } = useGetTopExercises({ limit: 5 });

  const activeExercise = selectedExercise ?? topExercises?.[0]?.name ?? null;

  const { data: progressData, isLoading: loadingProgress } = useGetExerciseProgress(
    activeExercise ?? "",
    { metric },
    {
      query: {
        enabled: !!activeExercise,
        queryKey: ["/api/progress", activeExercise, metric],
      },
    }
  );

  if (loadingTop) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-card border border-border rounded-sm w-2/3" />
        <div className="animate-pulse h-48 bg-card border border-border rounded-sm" />
      </div>
    );
  }

  if (!topExercises || topExercises.length === 0) {
    return (
      <div className="text-center py-14 px-6 text-muted-foreground bg-card rounded-sm border border-dashed border-border">
        <TrendingUp className="h-10 w-10 mx-auto mb-4 opacity-30" />
        <p className="text-sm">Log a few workouts to see your progress here.</p>
      </div>
    );
  }

  const chartData = (progressData ?? []).map((p) => ({
    date: format(parseISO(p.date), "MMM d"),
    value: p.value,
    rawDate: p.date,
  }));

  const hasData = chartData.length > 0;
  const yLabel = metric === "maxWeight" ? "kg" : "kg·vol";

  return (
    <div className="space-y-6">
      {/* Exercise chips */}
      <div className="flex flex-wrap gap-2">
        {topExercises.map((ex) => {
          const isActive = (selectedExercise ?? topExercises[0]?.name) === ex.name;
          return (
            <button
              key={ex.name}
              onClick={() => { setSelectedExercise(ex.name); }}
              data-testid={`chip-exercise-${ex.name}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {ex.name}
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      <div className="bg-card border border-border rounded-sm p-4">
        <div className="mb-3">
          <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
            {metric === "maxWeight" ? "Max weight (kg)" : "Total volume (kg·rep)"}
          </p>
          <p className="text-xl font-serif text-foreground">{activeExercise}</p>
        </div>

        {loadingProgress ? (
          <div className="animate-pulse h-40 bg-muted rounded-sm" />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">Not enough data yet for this exercise.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}${yLabel === "kg" ? "" : ""}`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 2 }}
                formatter={(value: number) => [`${value} ${yLabel}`, activeExercise ?? ""]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={<Dot r={4} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />}
                activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Metric toggle */}
      <div className="flex bg-muted rounded-sm p-0.5 w-fit">
        <button
          onClick={() => setMetric("maxWeight")}
          data-testid="toggle-metric-maxWeight"
          className={`px-4 py-1 text-[11px] font-medium rounded-sm transition-colors ${
            metric === "maxWeight"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Max weight
        </button>
        <button
          onClick={() => setMetric("totalVolume")}
          data-testid="toggle-metric-totalVolume"
          className={`px-4 py-1 text-[11px] font-medium rounded-sm transition-colors ${
            metric === "totalVolume"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Volume
        </button>
      </div>
    </div>
  );
}
