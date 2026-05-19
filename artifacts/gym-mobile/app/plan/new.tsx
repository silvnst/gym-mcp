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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreatePlan } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";

type ExerciseDraft = {
  name: string;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
};

function ExerciseRow({
  index,
  draft,
  onChange,
  onRemove,
}: {
  index: number;
  draft: ExerciseDraft;
  onChange: (field: keyof ExerciseDraft, val: string) => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const inputStyle = [
    styles.input,
    {
      borderColor: colors.border,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: "Inter_400Regular",
    },
  ];

  return (
    <View
      style={[
        styles.exerciseRow,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <View style={styles.exRowHeader}>
        <Text
          style={[
            styles.exNum,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          {index + 1}
        </Text>
        <TextInput
          style={[inputStyle, styles.exNameInput]}
          value={draft.name}
          onChangeText={(v) => onChange("name", v)}
          placeholder="Exercise name…"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="next"
        />
        <Pressable onPress={onRemove} hitSlop={12}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <View style={styles.exMetaRow}>
        <View style={styles.exMetaField}>
          <Text
            style={[
              styles.exMetaLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            SETS
          </Text>
          <TextInput
            style={[inputStyle, styles.exMetaInput]}
            value={draft.targetSets}
            onChangeText={(v) => onChange("targetSets", v)}
            placeholder="3"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
        <View style={styles.exMetaField}>
          <Text
            style={[
              styles.exMetaLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            REPS
          </Text>
          <TextInput
            style={[inputStyle, styles.exMetaInput]}
            value={draft.targetReps}
            onChangeText={(v) => onChange("targetReps", v)}
            placeholder="10"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
        <View style={styles.exMetaField}>
          <Text
            style={[
              styles.exMetaLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            KG
          </Text>
          <TextInput
            style={[inputStyle, styles.exMetaInput]}
            value={draft.targetWeightKg}
            onChangeText={(v) => onChange("targetWeightKg", v)}
            placeholder="—"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
      </View>
    </View>
  );
}

export default function NewPlanScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createPlan = useCreatePlan();

  const [planName, setPlanName] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    { name: "", targetSets: "3", targetReps: "10", targetWeightKg: "" },
  ]);

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { name: "", targetSets: "3", targetReps: "10", targetWeightKg: "" },
    ]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExercise(index: number, field: keyof ExerciseDraft, val: string) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: val } : ex))
    );
  }

  function handleSave() {
    const name = planName.trim();
    if (!name) {
      Alert.alert("Name required", "Please enter a plan name.");
      return;
    }
    const validExercises = exercises.filter((e) => e.name.trim());
    if (!validExercises.length) {
      Alert.alert("No exercises", "Add at least one exercise.");
      return;
    }

    createPlan.mutate(
      {
        data: {
          name,
          exercises: validExercises.map((e, i) => ({
            name: e.name.trim(),
            sortOrder: i,
            targetSets: parseInt(e.targetSets, 10) || 3,
            targetReps: parseInt(e.targetReps, 10) || 10,
            targetWeightKg: e.targetWeightKg ? parseFloat(e.targetWeightKg) : null,
          })),
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () => {
          Alert.alert("Error", "Could not save plan.");
        },
      }
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            NEW PLAN
          </Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={createPlan.isPending}
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: createPlan.isPending ? 0.7 : 1 },
          ]}
        >
          {createPlan.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text
              style={[
                styles.saveBtnText,
                { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        bottomOffset={60}
      >
        {/* Plan name */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          PLAN NAME
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.planNameInput,
            {
              borderColor: colors.border,
              color: colors.foreground,
              backgroundColor: colors.card,
              fontFamily: "CormorantGaramond_400Regular",
            },
          ]}
          value={planName}
          onChangeText={setPlanName}
          placeholder="e.g. Push Day, Full Body…"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="next"
          autoFocus
        />

        {/* Exercises */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 20 },
          ]}
        >
          EXERCISES
        </Text>

        {exercises.map((ex, i) => (
          <ExerciseRow
            key={i}
            index={i}
            draft={ex}
            onChange={(field, val) => updateExercise(i, field, val)}
            onRemove={() => removeExercise(i)}
          />
        ))}

        <Pressable
          onPress={addExercise}
          style={[
            styles.addExBtn,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text
            style={[
              styles.addExText,
              { color: colors.primary, fontFamily: "Inter_500Medium" },
            ]}
          >
            Add Exercise
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  eyebrow: { fontSize: 10, letterSpacing: 2 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { fontSize: 14 },
  scrollContent: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 12,
  },
  planNameInput: {
    height: 48,
    fontSize: 22,
  },
  exerciseRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    padding: 12,
    gap: 10,
  },
  exRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exNum: { fontSize: 14, width: 20, textAlign: "center" },
  exNameInput: { flex: 1, height: 36, fontSize: 16 },
  exMetaRow: { flexDirection: "row", gap: 10 },
  exMetaField: { flex: 1, gap: 4 },
  exMetaLabel: { fontSize: 9, letterSpacing: 1.5 },
  exMetaInput: { height: 36, fontSize: 15, textAlign: "center" },
  addExBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    borderStyle: "dashed",
  },
  addExText: { fontSize: 15 },
});
