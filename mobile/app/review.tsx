import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/lib/colors";
import { api, ParsedItem, Roommate } from "@/lib/api";

type SelectableItem = ParsedItem & { selected: boolean };

export default function ReviewScreen() {
  const { items: itemsParam } = useLocalSearchParams<{ items: string }>();
  const router = useRouter();

  const [items, setItems] = useState<SelectableItem[]>([]);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [selectedRoommate, setSelectedRoommate] = useState<Roommate | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRoommateModal, setShowRoommateModal] = useState(false);

  useEffect(() => {
    if (itemsParam) {
      const parsed: ParsedItem[] = JSON.parse(itemsParam);
      setItems(parsed.map((i) => ({ ...i, selected: true })));
    }
    api.getRoommates().then((r) => {
      setRoommates(r);
      if (r.length === 1) setSelectedRoommate(r[0]);
    }).catch(() => {});
  }, [itemsParam]);

  const toggleItem = useCallback((idx: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  const selectAll = () => setItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  const selectNone = () => setItems((prev) => prev.map((i) => ({ ...i, selected: false })));

  const selectedItems = items.filter((i) => i.selected);
  const dinnerTotal = selectedItems.reduce((sum, i) => sum + i.price, 0);

  const save = async () => {
    if (!selectedRoommate) {
      Alert.alert("Select a person", "Choose whose dinner pot to add these to.");
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert("No items selected", "Tap items to include them in the dinner pot.");
      return;
    }

    setSaving(true);
    try {
      await api.createSession({
        roommate_id: selectedRoommate.id,
        label: label.trim() || undefined,
        items: selectedItems.map(({ name, price }) => ({ name, price })),
      });
      router.replace("/(tabs)/");
    } catch (e: unknown) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Items</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Controls bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.controlLink}>Select all</Text>
        </TouchableOpacity>
        <Text style={styles.controlSep}>·</Text>
        <TouchableOpacity onPress={selectNone}>
          <Text style={styles.controlLink}>Clear</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={styles.countText}>{selectedItems.length} of {items.length} selected</Text>
      </View>

      {/* Items list */}
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.itemRow, item.selected && styles.itemRowSelected]}
            onPress={() => toggleItem(index)}
            activeOpacity={0.75}
          >
            <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
              {item.selected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.itemName, item.selected && styles.itemNameSelected]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.itemPrice, item.selected && styles.itemPriceSelected]}>
              ${item.price.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Dinner label */}
        <TextInput
          style={styles.labelInput}
          placeholder="Label (optional) — e.g. Taco Tuesday"
          placeholderTextColor={Colors.textMuted}
          value={label}
          onChangeText={setLabel}
        />

        {/* Roommate picker */}
        <TouchableOpacity
          style={styles.roommateBtn}
          onPress={() => setShowRoommateModal(true)}
        >
          <Text style={styles.roommateBtnLabel}>Add to pot of</Text>
          <Text style={styles.roommateBtnValue}>
            {selectedRoommate ? selectedRoommate.name : "Select person ▾"}
          </Text>
        </TouchableOpacity>

        {/* Total + Save */}
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Dinner total</Text>
            <Text style={styles.totalAmount}>${dinnerTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, (saving || selectedItems.length === 0) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving || selectedItems.length === 0}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save to Pot</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Roommate picker modal */}
      <Modal visible={showRoommateModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoommateModal(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Whose pot?</Text>
            <ScrollView>
              {roommates.length === 0 ? (
                <Text style={styles.modalEmpty}>
                  No roommates yet — add them on the Summary tab first.
                </Text>
              ) : (
                roommates.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.modalRow,
                      selectedRoommate?.id === r.id && styles.modalRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedRoommate(r);
                      setShowRoommateModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalRowText,
                        selectedRoommate?.id === r.id && styles.modalRowTextSelected,
                      ]}
                    >
                      {r.name}
                    </Text>
                    {selectedRoommate?.id === r.id && (
                      <Text style={styles.modalCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.green,
  },
  backBtn: { width: 60 },
  backText: { color: Colors.white, fontSize: 17 },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: Colors.white },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  controlLink: { color: Colors.green, fontSize: 14, fontWeight: "600" },
  controlSep: { color: Colors.textMuted },
  countText: { fontSize: 13, color: Colors.textMuted },
  list: { padding: 12, gap: 8 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  itemRowSelected: {
    borderColor: Colors.green,
    backgroundColor: Colors.selectedBg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: "700" },
  itemName: { flex: 1, fontSize: 15, color: Colors.textMuted },
  itemNameSelected: { color: Colors.text, fontWeight: "500" },
  itemPrice: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  itemPriceSelected: { color: Colors.green },
  footer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  labelInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  roommateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roommateBtnLabel: { fontSize: 13, color: Colors.textMuted },
  roommateBtnValue: { fontSize: 15, fontWeight: "600", color: Colors.green },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 12, color: Colors.textMuted },
  totalAmount: { fontSize: 24, fontWeight: "700", color: Colors.text },
  saveBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 140,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text, marginBottom: 16 },
  modalEmpty: { color: Colors.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 20 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalRowSelected: { backgroundColor: Colors.selectedBg },
  modalRowText: { fontSize: 16, color: Colors.text },
  modalRowTextSelected: { color: Colors.green, fontWeight: "600" },
  modalCheck: { color: Colors.green, fontSize: 16, fontWeight: "700" },
});
