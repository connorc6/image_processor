import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/lib/colors";
import { api, ParsedItem } from "@/lib/api";

export default function ScanScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });

    if (result.canceled) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    parseReceipt(asset.uri);
  };

  const parseReceipt = async (uri: string) => {
    setParsing(true);
    try {
      const items = await api.parseReceipt(uri);
      if (items.length === 0) {
        Alert.alert(
          "No Items Found",
          "Claude couldn't extract any items from this receipt. Try a clearer photo.",
          [{ text: "OK" }]
        );
        setImageUri(null);
        return;
      }
      // Navigate to review screen with items as a URL param (JSON encoded)
      router.push({
        pathname: "/review",
        params: { items: JSON.stringify(items) },
      });
    } catch (e: unknown) {
      Alert.alert(
        "Parse Failed",
        e instanceof Error ? e.message : "Something went wrong",
        [{ text: "OK" }]
      );
    } finally {
      setParsing(false);
      setImageUri(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan Receipt</Text>
      </View>

      <View style={styles.body}>
        {parsing ? (
          <View style={styles.parsingBox}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            )}
            <ActivityIndicator color={Colors.green} size="large" style={{ marginTop: 24 }} />
            <Text style={styles.parsingText}>Reading receipt with Claude…</Text>
            <Text style={styles.parsingSubtext}>This takes a few seconds</Text>
          </View>
        ) : (
          <>
            <View style={styles.illustrationBox}>
              <Text style={styles.illustration}>🧾</Text>
              <Text style={styles.illustrationTitle}>Upload a receipt</Text>
              <Text style={styles.illustrationSub}>
                Claude will automatically extract all items and prices
              </Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => pickImage(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>📷  Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => pickImage(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>🖼  Choose from Library</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.green,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.white },
  body: { flex: 1, justifyContent: "center", padding: 24 },
  illustrationBox: { alignItems: "center", marginBottom: 48 },
  illustration: { fontSize: 72, marginBottom: 16 },
  illustrationTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  illustrationSub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  buttonGroup: { gap: 12 },
  primaryBtn: {
    backgroundColor: Colors.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  secondaryBtnText: { color: Colors.green, fontSize: 16, fontWeight: "600" },
  parsingBox: { alignItems: "center" },
  preview: { width: "100%", height: 260, borderRadius: 12 },
  parsingText: { fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 16 },
  parsingSubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
