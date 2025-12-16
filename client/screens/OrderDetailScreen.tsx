import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { 
  getState, 
  subscribe, 
  markItemCompleted,
  completeOrder,
  Order,
  OrderItem,
} from "@/lib/store";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteParams = RouteProp<RootStackParamList, "OrderDetail">;

function OrderItemCard({
  item,
  orderId,
  isReceiver,
  onMarkCompleted,
}: {
  item: OrderItem;
  orderId: string;
  isReceiver: boolean;
  onMarkCompleted: (itemId: string, note?: string) => void;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [clarificationNote, setClarificationNote] = useState("");

  const handleToggle = () => {
    if (!isReceiver) return;
    
    if (item.completed) {
      return;
    }

    if (expanded) {
      onMarkCompleted(item.id, clarificationNote || undefined);
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  };

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View style={[styles.itemImage, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="image" size={32} color={theme.textTertiary} />
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              {item.name ? (
                <ThemedText type="h4">{item.name}</ThemedText>
              ) : null}
              <ThemedText type="body">
                Qty: {item.quantity}
              </ThemedText>
              {item.note ? (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {item.note}
                </ThemedText>
              ) : null}
            </View>
            {isReceiver ? (
              <Pressable
                onPress={handleToggle}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: item.completed ? Colors.light.statusCompleted : "transparent",
                    borderColor: item.completed ? Colors.light.statusCompleted : theme.border,
                  },
                ]}
              >
                {item.completed ? (
                  <Feather name="check" size={18} color={Colors.light.buttonText} />
                ) : null}
              </Pressable>
            ) : (
              <View style={[
                styles.statusIndicator,
                { backgroundColor: item.completed ? Colors.light.statusCompleted : theme.backgroundSecondary },
              ]}>
                {item.completed ? (
                  <Feather name="check" size={16} color={Colors.light.buttonText} />
                ) : (
                  <Feather name="clock" size={16} color={theme.textTertiary} />
                )}
              </View>
            )}
          </View>

          {expanded && isReceiver && !item.completed ? (
            <View style={styles.expandedContent}>
              <TextInput
                style={[styles.clarificationInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Add clarification (optional)"
                placeholderTextColor={theme.textTertiary}
                value={clarificationNote}
                onChangeText={setClarificationNote}
              />
              <Pressable
                onPress={() => {
                  onMarkCompleted(item.id, clarificationNote || undefined);
                  setExpanded(false);
                }}
                style={[styles.markDoneButton, { backgroundColor: Colors.light.statusCompleted }]}
              >
                <Feather name="check" size={16} color={Colors.light.buttonText} />
                <ThemedText type="small" style={{ color: Colors.light.buttonText, fontWeight: "600" }}>
                  Mark as Found
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {item.clarificationNote ? (
            <View style={[styles.clarificationBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="message-circle" size={14} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {item.clarificationNote}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export default function OrderDetailScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { orderId, mode } = route.params;
  const isReceiver = mode === "received";

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const foundOrder = getState().orders.find(o => o.id === orderId);
    setOrder(foundOrder || null);

    const unsubscribe = subscribe(() => {
      const updated = getState().orders.find(o => o.id === orderId);
      setOrder(updated || null);
    });
    return unsubscribe;
  }, [orderId]);

  useEffect(() => {
    if (order) {
      navigation.setOptions({
        headerTitle: isReceiver 
          ? `${order.senderName}'s Order`
          : `Order for ${order.receiverName}`,
      });
    }
  }, [order, isReceiver, navigation]);

  const handleMarkItemCompleted = (itemId: string, note?: string) => {
    markItemCompleted(orderId, itemId, note);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleCompleteOrder = () => {
    Alert.alert(
      "Complete Order",
      "Are you sure you want to mark this order as complete?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () => {
            completeOrder(orderId);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!order) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centered, { paddingTop: headerHeight }]}>
          <ThemedText type="body">Order not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const completedCount = order.items.filter(i => i.completed).length;
  const totalCount = order.items.length;
  const allCompleted = completedCount === totalCount;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl + (isReceiver ? 80 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.progressCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.progressInfo}>
            <ThemedText type="h4">
              {completedCount} of {totalCount} items found
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {order.status === "completed" 
                ? "Order completed"
                : order.status === "in_progress"
                  ? "In progress"
                  : "Pending"}
            </ThemedText>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: allCompleted 
                    ? Colors.light.statusCompleted 
                    : Colors.light.statusInProgress,
                  width: `${(completedCount / totalCount) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.itemsList}>
          {order.items.map((item) => (
            <OrderItemCard
              key={item.id}
              item={item}
              orderId={orderId}
              isReceiver={isReceiver}
              onMarkCompleted={handleMarkItemCompleted}
            />
          ))}
        </View>
      </KeyboardAwareScrollViewCompat>

      {isReceiver && order.status !== "completed" ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
          <Button onPress={handleCompleteOrder} disabled={!allCompleted}>
            Mark Order Complete
          </Button>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  progressCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  itemsList: {
    gap: Spacing.md,
  },
  itemCard: {
    padding: Spacing.lg,
  },
  itemContent: {
    flexDirection: "row",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  itemDetails: {
    flex: 1,
    gap: Spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedContent: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  clarificationInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  markDoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  clarificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
});
