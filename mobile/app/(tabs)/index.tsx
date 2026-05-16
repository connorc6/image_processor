import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/lib/colors";
import { api, RoommateSummary } from "@/lib/api";

export default function SummaryScreen() {
  const [data, setData] = useState<RoommateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingName, setAddingName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const summary = await api.getSummary();
      setData(summary);
    } catch {
      // Server not running yet — show empty state
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const addRoommate = async () => {
    const name = addingName.trim();
    if (!name) return;
    try {
      await api.createRoommate(name);
      setAddingName("");
      setShowAdd(false);
      load();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not add roommate");
    }
  };

  const confirmDelete = (r: RoommateSummary) => {
    Alert.alert(
      `Remove ${r.name}?`,
      "This will also delete all their sessions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await api.deleteRoommate(r.id);
            load();
          },
        },
      ]
    );
  };

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

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
        <Text style={styles.title}>Dinner Pot</Text>
        <TouchableOpacity onPress={() => setShowAdd((v) => !v)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{showAdd ? "✕" : "+ Add"}</Text>
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Roommate name"
            value={addingName}
            onChangeText={setAddingName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={addRoommate}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={addRoommate}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>No roommates yet</Text>
          <Text style={styles.emptySubtitle}>Tap "+ Add" to get started</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardTotal}>${item.total.toFixed(2)}</Text>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(item.total / maxTotal) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.cardSub}>
                {item.session_count} dinner{item.session_count !== 1 ? "s" : ""}
              </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.green,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.white },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: { color: Colors.white, fontWeight: "600", fontSize: 14 },
  addRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: "center",
  },
  saveBtnText: { color: Colors.white, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  cardName: { fontSize: 17, fontWeight: "600", color: Colors.text },
  cardTotal: { fontSize: 20, fontWeight: "700", color: Colors.green },
  barBg: {
    height: 6,
    backgroundColor: Colors.greenLight,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: { height: "100%", backgroundColor: Colors.green, borderRadius: 3 },
  cardSub: { fontSize: 12, color: Colors.textMuted },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted },
});
