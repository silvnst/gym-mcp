import React from "react";
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
import { useListPlans, useDeletePlan } from "@workspace/api-client-react";
import type { PlanWithExercises } from "@workspace/api-client-react";
import { Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

function PlanCard({
  plan,
  onPress,
  onDelete,
}: {
  plan: PlanWithExercises;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.cardBody}>
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
          {plan.exercises?.length ?? 0}{" "}
          {(plan.exercises?.length ?? 0) === 1 ? "exercise" : "exercises"}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={12}
        style={styles.deleteBtn}
      >
        {Platform.OS === "ios" ? (
          <SymbolView name="trash" tintColor={colors.mutedForeground} size={18} />
        ) : (
          <Feather name="trash-2" size={18} color={colors.mutedForeground} />
        )}
      </Pressable>
    </Pressable>
  );
}

export default function PlansScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading, refetch } = useListPlans();
  const deletePlan = useDeletePlan();

  function handleDelete(plan: PlanWithExercises) {
    Alert.alert(`Delete "${plan.name}"?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePlan.mutate(
            { id: plan.id },
            {
              onSuccess: () => {
                refetch();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            }
          );
        },
      },
    ]);
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
        <View>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            LIBRARY
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
            ]}
          >
            Your Plans
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/plan/new")}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Text
            style={[
              styles.newBtnText,
              { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            + New
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !plans?.length ? (
        <View style={styles.center}>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
            ]}
          >
            No plans yet
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Tap + New to create your first plan.
          </Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              onPress={() => router.push(`/plan/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: { fontSize: 10, letterSpacing: 2, marginBottom: 2 },
  title: { fontSize: 36 },
  newBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  newBtnText: { fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 28 },
  emptySubtitle: { fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  list: { paddingTop: 16, paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardBody: { flex: 1 },
  planName: { fontSize: 22, lineHeight: 28 },
  planMeta: { fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 6 },
});
