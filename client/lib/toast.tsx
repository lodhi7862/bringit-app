import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export type ToastType = "success" | "error" | "info";

type ToastListener = (message: string, type: ToastType, duration?: number) => void;

let globalToastListener: ToastListener | null = null;

export function showGlobalToast(message: string, type: ToastType = "info", duration?: number) {
  if (globalToastListener) {
    globalToastListener(message, type, duration);
  }
}

export function setGlobalToastListener(listener: ToastListener | null) {
  globalToastListener = listener;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { theme } = useTheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 200 });

    const timeout = setTimeout(() => {
      dismiss();
    }, toast.duration || 3000);

    return () => clearTimeout(timeout);
  }, []);

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-100, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)(toast.id);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getIconName = (): keyof typeof Feather.glyphMap => {
    switch (toast.type) {
      case "success":
        return "check-circle";
      case "error":
        return "alert-circle";
      default:
        return "info";
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return Colors.light.statusCompleted;
      case "error":
        return Colors.light.statusError;
      default:
        return theme.primary;
    }
  };

  return (
    <Animated.View style={[styles.toastContainer, animatedStyle]}>
      <Pressable
        onPress={dismiss}
        style={[styles.toast, { backgroundColor: getBackgroundColor() }]}
      >
        <Feather name={getIconName()} size={20} color="#FFFFFF" />
        <ThemedText type="body" style={styles.toastText} numberOfLines={2}>
          {toast.message}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();
  const idCounter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${++idCounter.current}`;
    
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    
    if (Platform.OS !== "web") {
      if (type === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === "error") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, []);

  useEffect(() => {
    setGlobalToastListener(showToast);
    return () => setGlobalToastListener(null);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.toastWrapper, { top: insets.top + Spacing.md }]} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  toastContainer: {
    marginBottom: Spacing.sm,
    width: "100%",
    maxWidth: 400,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastText: {
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "500",
  },
});
