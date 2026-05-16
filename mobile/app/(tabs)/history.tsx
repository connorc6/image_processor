import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/lib/colors";
import { api, Session } from "@/lib/api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const confirmDelete = (s: Session) => {
    Alert.alert(
      "Delete session?",
      `Remove "${s.label || formatDate(s.created_at)}" from ${s.roommate_name}'s pot?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await api.deleteSession(s.id);
            load();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySubtitle}>Scan a receipt to get started</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push("/(tabs)/scan")}
          >
            <Text style={styles.scanBtnText}>Scan Receipt</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onLongPress={() => confirmDelete(item)}
              onPress={() => router.push({ pathname: "/session-detail", params: { id: item.id } })}
              activeOpacity={0.85}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel} numberOfLines={1}>
                  {item.label || "Dinner"}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.roommate_name} · {formatDate(item.created_at)}
                </Text>
              </View>
              <Text style={styles.cardTotal}>${item.total.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.green,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.white },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardLabel: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: Colors.textMuted },
  cardTotal: { fontSize: 18, fontWeight: "700", color: Colors.green },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted },
  scanBtn: {
    marginTop: 12,
    backgroundColor: Colors.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanBtnText: { color: Colors.white, fontWeight: "600", fontSize: 15 },
});
