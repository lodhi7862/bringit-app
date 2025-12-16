import React from "react";
import { View, StyleSheet, Pressable, Platform, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getState } from "@/lib/store";

export default function QRCodeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const currentUser = getState().currentUser;

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await Share.share({
        message: `Connect with me on BringIt! My code is: ${currentUser?.id || "---"}`,
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.qrContainer}>
          <View style={[styles.qrCode, { backgroundColor: "#FFFFFF" }]}>
            {currentUser?.id ? (
              <QRCode
                value={currentUser.id}
                size={240}
                color="#000000"
                backgroundColor="#FFFFFF"
                ecl="H"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Feather name="loader" size={40} color={theme.textTertiary} />
              </View>
            )}
          </View>
          
          <ThemedText type="h3" style={styles.name}>
            {currentUser?.name || "Your Name"}
          </ThemedText>
          
          <View style={[styles.codeContainer, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Your Code
            </ThemedText>
            <ThemedText type="h4" style={{ fontFamily: "monospace" }}>
              {currentUser?.id?.slice(0, 8) || "--------"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.instructions}>
          <View style={styles.instructionRow}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText type="caption" style={{ color: Colors.light.buttonText, fontWeight: "600" }}>
                1
              </ThemedText>
            </View>
            <ThemedText type="body" style={{ flex: 1 }}>
              Ask your family member to open BringIt
            </ThemedText>
          </View>
          <View style={styles.instructionRow}>
            <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
              <ThemedText type="caption" style={{ color: Colors.light.buttonText, fontWeight: "600" }}>
                2
              </ThemedText>
            </View>
            <ThemedText type="body" style={{ flex: 1 }}>
              They tap "Add Family Member" and scan this code
            </ThemedText>
          </View>
        </View>

        <Button onPress={handleShare} style={styles.shareButton}>
          Share Code
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "space-between",
  },
  qrContainer: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  qrCode: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  codeContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    gap: Spacing.xs,
  },
  instructions: {
    width: "100%",
    gap: Spacing.lg,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    width: "100%",
  },
});
