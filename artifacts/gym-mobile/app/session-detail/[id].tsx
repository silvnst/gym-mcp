import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useGetSession } from "@workspace/api-client-react";
import type { SessionExerciseWithSets, SetRecord } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function SetRow({ set }: { set: SetRecord }) {
  const colors = useColors();
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
      <Text
        style={[
          styles.setValue,
          { color: colors.foreground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {set.weightKg != null ? `${set.weightKg} kg` : "—"}
      </Text>
      <Text
        style={[
          styles.setValue,
          { color: colors.foreground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {set.reps != null ? `${set.reps} reps` : "—"}
      </Text>
    </View>
  );
}

function ExerciseCard({ exercise }: { exercise: SessionExerciseWithSets }) {
  const colors = useColors();
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
      {(exercise.sets ?? []).length > 0 && (
        <>
          <View style={[styles.setHeader, { borderBottomColor: colors.border }]}>
            <Text
              style={[
                styles.setHeaderText,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              SET
            </Text>
            <Text
              style={[
                styles.setHeaderText,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              WEIGHT
            </Text>
            <Text
              style={[
                styles.setHeaderText,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              REPS
            </Text>
          </View>
          {exercise.sets.map((set) => (
            <SetRow key={set.id} set={set} />
          ))}
        </>
      )}
      {(exercise.sets ?? []).length === 0 && (
        <Text
          style={[
            styles.noSets,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          No sets logged
        </Text>
      )}
    </View>
  );
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { data: session, isLoading } = useGetSession(id as string, {
    query: { queryKey: ["session-detail", id] },
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Session not found.</Text>
      </View>
    );
  }

  const totalSets = (session.exercises ?? []).reduce(
    (sum, ex) => sum + (ex.sets?.length ?? 0),
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          {Platform.OS === "ios" ? (
            <SymbolView name="chevron.left" tintColor={colors.primary} size={22} />
          ) : (
            <Feather name="chevron-left" size={24} color={colors.primary} />
          )}
        </Pressable>
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.headerDate,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            {new Date(session.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).toUpperCase()}
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
            ]}
          >
            {session.name}
          </Text>
          <Text
            style={[
              styles.headerMeta,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {(session.exercises ?? []).length} exercises · {totalSets} sets
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {(session.exercises ?? []).length === 0 ? (
          <View style={styles.center}>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: "CormorantGaramond_400Regular" },
              ]}
            >
              No exercises logged
            </Text>
          </View>
        ) : (
          (session.exercises ?? []).map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { marginBottom: 8 },
  headerContent: { gap: 2 },
  headerDate: { fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 32, lineHeight: 38 },
  headerMeta: { fontSize: 13, marginTop: 2 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  center: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 24 },
  exerciseCard: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  exerciseName: { fontSize: 22, lineHeight: 28 },
  setHeader: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  setHeaderText: { fontSize: 9, letterSpacing: 1.5, flex: 1 },
  setRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setNum: { fontSize: 14, width: 28, textAlign: "center" },
  setValue: { flex: 1, fontSize: 15 },
  noSets: { fontSize: 13, fontStyle: "italic" },
});
