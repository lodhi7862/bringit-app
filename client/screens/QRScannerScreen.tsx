import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform, Alert, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { sendConnectionRequestByCode, getState } from "@/lib/store";

export default function QRScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const scannedCode = result.data;
    
    if (scannedCode.startsWith("bringit://connect/")) {
      const userId = scannedCode.replace("bringit://connect/", "");
      handleConnectByCode(userId);
    } else {
      handleConnectByCode(scannedCode);
    }
  };

  const handleConnectByCode = (code: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) {
      Alert.alert(
        "Setup Required",
        "Please create your profile first before scanning QR codes.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (code === currentUser.id) {
      Alert.alert(
        "That's You",
        "You scanned your own QR code. Scan a family member's code instead.",
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
      return;
    }

    const result = sendConnectionRequestByCode(code);
    if (result) {
      Alert.alert(
        "Request Sent",
        "A connection request has been sent. They will need to accept it on their device.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(
        "Already Connected",
        "You already have a pending request or connection with this person.",
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    }
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.closeButton, { backgroundColor: "rgba(0,0,0,0.3)" }]}
          >
            <Feather name="x" size={24} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={[styles.webMessage, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="smartphone" size={48} color={theme.primary} />
            <ThemedText type="h3" style={styles.instructionTitle}>
              Use Expo Go
            </ThemedText>
            <ThemedText type="body" style={[styles.instructionText, { color: theme.textSecondary }]}>
              QR code scanning requires a real device. Scan the QR code in Replit to open this app in Expo Go on your phone.
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  }

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="body">Loading camera...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.closeButton, { backgroundColor: "rgba(0,0,0,0.3)" }]}
          >
            <Feather name="x" size={24} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={[styles.permissionBox, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="camera-off" size={48} color={theme.primary} />
            <ThemedText type="h3" style={styles.instructionTitle}>
              Camera Access Required
            </ThemedText>
            <ThemedText type="body" style={[styles.instructionText, { color: theme.textSecondary }]}>
              We need camera access to scan QR codes from your family members.
            </ThemedText>
            
            {permission.status === "denied" && !permission.canAskAgain ? (
              <Pressable
                style={[styles.permissionButton, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  try {
                    await Linking.openSettings();
                  } catch (error) {
                  }
                }}
              >
                <ThemedText type="body" style={{ color: "#FFF" }}>
                  Open Settings
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.permissionButton, { backgroundColor: theme.primary }]}
                onPress={requestPermission}
              >
                <ThemedText type="body" style={{ color: "#FFF" }}>
                  Enable Camera
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.closeButton, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <Feather name="x" size={24} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.overlay}>
        <View style={styles.scanAreaContainer}>
          <View style={[styles.scanArea]}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
        
        <View style={[styles.instructions, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
          <ThemedText type="body" style={{ color: "#FFF", textAlign: "center" }}>
            Position the QR code within the frame
          </ThemedText>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
          Ask your family member to show their QR code from the Family tab
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanAreaContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: Colors.light.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructions: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    maxWidth: 300,
  },
  instructionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  instructionText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  webMessage: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    maxWidth: 320,
  },
  permissionBox: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    maxWidth: 320,
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});
