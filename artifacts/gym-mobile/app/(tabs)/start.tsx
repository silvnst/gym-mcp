import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useListPlans,
  useCreateSession,
  getPlan,
} from "@workspace/api-client-react";
import type { PlanWithExercises } from "@workspace/api-client-react";
import { Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function StartScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading } = useListPlans();
  const createSession = useCreateSession();
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);

  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  async function handleStartEmpty() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createSession.mutate(
      {
        data: {
          name: "Workout",
          date: todayISO(),
          exercises: [],
        },
      },
      {
        onSuccess: (session) => {
          router.push(`/session/${session.id}`);
        },
        onError: () => {
          Alert.alert("Error", "Could not start session. Is the server running?");
        },
      }
    );
  }

  async function handleStartFromPlan(plan: PlanWithExercises) {
    setStartingPlanId(plan.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const detail = await getPlan(plan.id);
      createSession.mutate(
        {
          data: {
            planId: plan.id,
            name: plan.name,
            date: todayISO(),
            exercises: detail.exercises.map((e, i) => ({
              name: e.name,
              sortOrder: e.sortOrder ?? i,
              targetSets: e.targetSets ?? undefined,
              targetReps: e.targetReps ?? undefined,
              targetWeightKg: e.targetWeightKg ?? undefined,
              planExerciseId: e.id,
            })),
          },
        },
        {
          onSuccess: (session) => {
            setStartingPlanId(null);
            router.push(`/session/${session.id}`);
          },
          onError: () => {
            setStartingPlanId(null);
            Alert.alert("Error", "Could not start session.");
          },
        }
      );
    } catch {
      setStartingPlanId(null);
      Alert.alert("Error", "Could not load plan details.");
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, borderBottomColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.eyebrow,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          TRAIN
        </Text>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
          ]}
        >
          Start Workout
        </Text>
      </View>

      <FlatList
        data={plans ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListHeaderComponent={() => (
          <View style={styles.topSection}>
            {/* Start Empty */}
            <Pressable
              onPress={handleStartEmpty}
              disabled={createSession.isPending}
              style={({ pressed }) => [
                styles.emptyBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || createSession.isPending ? 0.8 : 1,
                },
              ]}
            >
              {createSession.isPending && !startingPlanId ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : Platform.OS === "ios" ? (
                <SymbolView name="play.fill" tintColor={colors.primaryForeground} size={20} />
              ) : (
                <Feather name="play" size={20} color={colors.primaryForeground} />
              )}
              <Text
                style={[
                  styles.emptyBtnText,
                  { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Start Empty Session
              </Text>
            </Pressable>

            {plans && plans.length > 0 && (
              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text
                  style={[
                    styles.dividerLabel,
                    { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  FROM PLAN
                </Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : null
        }
        renderItem={({ item: plan }) => (
          <Pressable
            onPress={() => handleStartFromPlan(plan)}
            disabled={!!startingPlanId}
            style={({ pressed }) => [
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed || startingPlanId === plan.id ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.planCardBody}>
              <Text
                style={[
                  styles.planName,
                  { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
                ]}
              >
                {plan.name}
              </Text>
              <Text
                style={[
                  styles.planMeta,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {plan.exercises?.length ?? 0} exercises
              </Text>
            </View>
            {startingPlanId === plan.id ? (
              <ActivityIndicator color={colors.primary} />
            ) : Platform.OS === "ios" ? (
              <SymbolView name="play.circle.fill" tintColor={colors.primary} size={28} />
            ) : (
              <Feather name="play-circle" size={28} color={colors.primary} />
            )}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: { fontSize: 10, letterSpacing: 2, marginBottom: 2 },
  title: { fontSize: 36 },
  scrollContent: { paddingHorizontal: 16 },
  topSection: { paddingTop: 20, gap: 20, marginBottom: 4 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 6,
  },
  emptyBtnText: { fontSize: 17 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 10, letterSpacing: 2 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planCardBody: { flex: 1 },
  planName: { fontSize: 22, lineHeight: 28 },
  planMeta: { fontSize: 13, marginTop: 2 },
});
