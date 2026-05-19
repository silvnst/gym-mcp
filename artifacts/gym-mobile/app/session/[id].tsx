import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  useGetSession,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useAddSessionExercise,
} from "@workspace/api-client-react";
import type { SetRecord, SessionExerciseWithSets } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";

function SetRow({
  set,
  onUpdate,
  onDelete,
}: {
  set: SetRecord;
  onUpdate: (data: { reps?: number; weightKg?: number }) => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const [weight, setWeight] = useState(set.weightKg != null ? String(set.weightKg) : "");
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : "");

  function save() {
    const w = weight ? parseFloat(weight) : undefined;
    const r = reps ? parseInt(reps, 10) : undefined;
    if (w !== set.weightKg || r !== set.reps) {
      onUpdate({ weightKg: w, reps: r });
    }
  }

  return (
    <View style={[styles.setRow, { borderBottomColor: colors.border }]}>
      <Text
        style={[
          styles.setNum,
          { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {set.setNumber}
      </Text>
      <View style={styles.inputGroup}>
        <TextInput
          style={[
            styles.numInput,
            {
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
              backgroundColor: colors.background,
            },
          ]}
          value={weight}
          onChangeText={setWeight}
          onBlur={save}
          placeholder="—"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          returnKeyType="next"
          selectTextOnFocus
        />
        <Text
          style={[
            styles.unitLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          kg
        </Text>
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={[
            styles.numInput,
            {
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
              backgroundColor: colors.background,
            },
          ]}
          value={reps}
          onChangeText={setReps}
          onBlur={save}
          placeholder="—"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text
          style={[
            styles.unitLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          reps
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
        <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}

function ExerciseSection({
  exercise,
  sessionId,
  onRefetch,
}: {
  exercise: SessionExerciseWithSets;
  sessionId: string;
  onRefetch: () => void;
}) {
  const colors = useColors();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();
  const addSet = useAddSet();

  function handleAddSet() {
    const nextNum = (exercise.sets?.length ?? 0) + 1;
    addSet.mutate(
      { id: sessionId, data: { sessionExerciseId: exercise.id, setNumber: nextNum } },
      { onSuccess: onRefetch }
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View
      style={[
        styles.exerciseCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.exerciseName,
          { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
        ]}
      >
        {exercise.name}
      </Text>
      {(exercise.targetSets || exercise.targetReps) && (
        <Text
          style={[
            styles.exerciseTarget,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Target: {exercise.targetSets} × {exercise.targetReps} reps
          {exercise.targetWeightKg ? ` @ ${exercise.targetWeightKg}kg` : ""}
        </Text>
      )}
      {(exercise.sets ?? []).length > 0 && (
        <View style={[styles.setHeader, { borderBottomColor: colors.border }]}>
          <Text
            style={[
              styles.setHeaderCell,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 28 },
            ]}
          >
            SET
          </Text>
          <Text
            style={[
              styles.setHeaderCell,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium", flex: 1 },
            ]}
          >
            WEIGHT
          </Text>
          <Text
            style={[
              styles.setHeaderCell,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium", flex: 1 },
            ]}
          >
            REPS
          </Text>
          <View style={{ width: 28 }} />
        </View>
      )}
      {(exercise.sets ?? []).map((set) => (
        <SetRow
          key={set.id}
          set={set}
          onUpdate={(data) =>
            updateSet.mutate({ id: set.id, data }, { onSuccess: onRefetch })
          }
          onDelete={() => {
            deleteSet.mutate({ id: set.id }, { onSuccess: onRefetch });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        />
      ))}
      <Pressable
        onPress={handleAddSet}
        style={[styles.addSetBtn, { borderTopColor: colors.border }]}
      >
        <Text
          style={[
            styles.addSetText,
            { color: colors.primary, fontFamily: "Inter_500Medium" },
          ]}
        >
          + Add Set
        </Text>
      </Pressable>
    </View>
  );
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [newExName, setNewExName] = useState("");
  const addExercise = useAddSessionExercise();

  const {
    data: session,
    isLoading,
    refetch,
  } = useGetSession(id as string, {
    query: { queryKey: ["session", id] },
  });

  function handleFinish() {
    Alert.alert(
      "Finish Workout?",
      "Your sets are saved automatically.",
      [
        { text: "Keep Going", style: "cancel" },
        {
          text: "Finish",
          style: "default",
          onPress: () => router.replace("/(tabs)/history"),
        },
      ]
    );
  }

  function handleAddExercise() {
    const name = newExName.trim();
    if (!name) return;
    const sortOrder = session?.exercises?.length ?? 0;
    addExercise.mutate(
      { id: id as string, data: { name, sortOrder } },
      {
        onSuccess: () => {
          setNewExName("");
          refetch();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.foreground, fontFamily: "Inter_400Regular" }}>
          Session not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.headerEyebrow,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            {new Date(session.date)
              .toLocaleDateString("en-US", { month: "short", day: "numeric" })
              .toUpperCase()}
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
            ]}
            numberOfLines={1}
          >
            {session.name}
          </Text>
        </View>
        <Pressable
          onPress={handleFinish}
          style={[styles.finishBtn, { backgroundColor: colors.primary }]}
        >
          <Text
            style={[
              styles.finishBtnText,
              { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Finish
          </Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        bottomOffset={20}
      >
        {(session.exercises ?? []).length === 0 && (
          <View style={styles.emptyExercises}>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: "CormorantGaramond_400Regular" },
              ]}
            >
              No exercises yet
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Add your first exercise below.
            </Text>
          </View>
        )}

        {(session.exercises ?? []).map((exercise) => (
          <ExerciseSection
            key={exercise.id}
            exercise={exercise}
            sessionId={id as string}
            onRefetch={refetch}
          />
        ))}

        {/* Add Exercise */}
        <View
          style={[
            styles.addExSection,
            { borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.addExLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            ADD EXERCISE
          </Text>
          <View style={styles.addExRow}>
            <TextInput
              style={[
                styles.addExInput,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={newExName}
              onChangeText={setNewExName}
              placeholder="Exercise name…"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={handleAddExercise}
            />
            <Pressable
              onPress={handleAddExercise}
              disabled={!newExName.trim()}
              style={[
                styles.addExBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: newExName.trim() ? 1 : 0.4,
                },
              ]}
            >
              <Text
                style={[
                  styles.addExBtnText,
                  { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerEyebrow: { fontSize: 10, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 26, lineHeight: 30 },
  finishBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  finishBtnText: { fontSize: 14 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  emptyExercises: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: { fontSize: 24 },
  emptySubtext: { fontSize: 14 },
  exerciseCard: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  exerciseName: { fontSize: 22, lineHeight: 28 },
  exerciseTarget: { fontSize: 12, letterSpacing: 0.3 },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  setHeaderCell: { fontSize: 9, letterSpacing: 1.5 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  setNum: { width: 28, textAlign: "center", fontSize: 14 },
  inputGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  numInput: {
    flex: 1,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 16,
    textAlign: "center",
  },
  unitLabel: { fontSize: 11, width: 26 },
  deleteBtn: { width: 28, alignItems: "center" },
  addSetBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  addSetText: { fontSize: 14, letterSpacing: 0.5 },
  addExSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  addExLabel: { fontSize: 9, letterSpacing: 1.5 },
  addExRow: { flexDirection: "row", gap: 8 },
  addExInput: {
    flex: 1,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  addExBtn: { paddingHorizontal: 16, borderRadius: 4, justifyContent: "center" },
  addExBtnText: { fontSize: 14 },
});
