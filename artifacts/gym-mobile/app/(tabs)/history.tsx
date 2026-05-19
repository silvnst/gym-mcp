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
import * as Haptics from "expo-haptics";
import { useListSessions, useDeleteSession } from "@workspace/api-client-react";
import type { SessionSummary } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const PAGE_SIZE = 15;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: SessionSummary;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[styles.datePill, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        <Text
          style={[
            styles.dateMonth,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          {new Date(session.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
        </Text>
        <Text
          style={[
            styles.dateDay,
            { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
          ]}
        >
          {new Date(session.date).getDate()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text
          style={[
            styles.sessionName,
            { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
          ]}
        >
          {session.name}
        </Text>
        <Text
          style={[
            styles.sessionDate,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {formatDate(session.date)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const deleteSession = useDeleteSession();

  const { data: sessions, isLoading, refetch } = useListSessions({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const hasNext = (sessions?.length ?? 0) >= PAGE_SIZE;
  const hasPrev = page > 0;

  function handleDelete(session: SessionSummary) {
    Alert.alert(`Delete "${session.name}"?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteSession.mutate(
            { id: session.id },
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
        <Text
          style={[
            styles.eyebrow,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          LOGBOOK
        </Text>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
          ]}
        >
          History
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !sessions?.length && page === 0 ? (
        <View style={styles.center}>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.foreground, fontFamily: "CormorantGaramond_400Regular" },
            ]}
          >
            No sessions yet
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Start a workout from the Start tab.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push(`/session-detail/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={() => (
            <View style={styles.pagination}>
              <Pressable
                onPress={() => setPage((p) => p - 1)}
                disabled={!hasPrev}
                style={[
                  styles.pageBtn,
                  {
                    borderColor: colors.border,
                    opacity: hasPrev ? 1 : 0.3,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pageBtnText,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  ← Previous
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.pageNum,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                Page {page + 1}
              </Text>
              <Pressable
                onPress={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                style={[
                  styles.pageBtn,
                  {
                    borderColor: colors.border,
                    opacity: hasNext ? 1 : 0.3,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pageBtnText,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  Next →
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 28 },
  emptySubtitle: { fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  list: { paddingTop: 16, paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePill: {
    width: 44,
    alignItems: "center",
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  dateMonth: { fontSize: 9, letterSpacing: 1 },
  dateDay: { fontSize: 28, lineHeight: 32 },
  cardBody: { flex: 1 },
  sessionName: { fontSize: 20, lineHeight: 26 },
  sessionDate: { fontSize: 12, marginTop: 2 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  pageBtnText: { fontSize: 14 },
  pageNum: { fontSize: 13 },
});
