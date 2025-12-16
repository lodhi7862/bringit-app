import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, Platform } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getState, subscribe, Order } from "@/lib/store";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Tab = "received" | "sent";

function StatusBadge({ status }: { status: Order["status"] }) {
  const colors = {
    pending: Colors.light.statusPending,
    in_progress: Colors.light.statusInProgress,
    completed: Colors.light.statusCompleted,
  };

  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <View style={[styles.badge, { backgroundColor: colors[status] + "20" }]}>
      <View style={[styles.badgeDot, { backgroundColor: colors[status] }]} />
      <ThemedText type="caption" style={{ color: colors[status] }}>
        {labels[status]}
      </ThemedText>
    </View>
  );
}

function OrderCard({ order, mode }: { order: Order; mode: Tab }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("OrderDetail", { orderId: order.id, mode });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card style={styles.orderCard} onPress={handlePress}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <ThemedText type="h4">
            {mode === "received" ? order.senderName : order.receiverName}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {mode === "received" ? "From" : "To"} • {formatTime(order.createdAt)}
          </ThemedText>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <View style={styles.orderItems}>
        <View style={styles.itemPreviews}>
          {order.items.slice(0, 3).map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemPreview,
                { backgroundColor: theme.backgroundSecondary, marginLeft: index > 0 ? -12 : 0 },
              ]}
            >
              <Feather name="image" size={16} color={theme.textTertiary} />
            </View>
          ))}
          {order.items.length > 3 ? (
            <View style={[styles.itemPreview, styles.moreItems, { marginLeft: -12 }]}>
              <ThemedText type="caption" style={{ color: Colors.light.buttonText }}>
                +{order.items.length - 3}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {order.items.length} {order.items.length === 1 ? "item" : "items"}
        </ThemedText>
      </View>

      {mode === "received" && order.status !== "completed" ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: Colors.light.statusInProgress,
                  width: `${(order.items.filter(i => i.completed).length / order.items.length) * 100}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {order.items.filter(i => i.completed).length}/{order.items.length} done
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="inbox" size={48} color={theme.textTertiary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No {tab === "received" ? "Received" : "Sent"} Orders
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        {tab === "received"
          ? "Orders from family members will appear here"
          : "Create an order to send to your family"}
      </ThemedText>
    </View>
  );
}

export default function OrdersScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("received");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(getState().orders.filter(o => o.status !== "completed"));
    const unsubscribe = subscribe(() => {
      setOrders([...getState().orders.filter(o => o.status !== "completed")]);
    });
    return unsubscribe;
  }, []);

  const currentUser = getState().currentUser;
  const filteredOrders = orders.filter((order) =>
    activeTab === "received"
      ? order.receiverId === currentUser?.id
      : order.senderId === currentUser?.id
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.tabContainer, { paddingTop: headerHeight + Spacing.lg }]}>
        <View style={[styles.tabs, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            onPress={() => setActiveTab("received")}
            style={[
              styles.tab,
              activeTab === "received" && { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.tabText,
                activeTab === "received" && { fontWeight: "600" },
              ]}
            >
              Received
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("sent")}
            style={[
              styles.tab,
              activeTab === "sent" && { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.tabText,
                activeTab === "sent" && { fontWeight: "600" },
              ]}
            >
              Sent
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing["3xl"] },
        ]}
        ListEmptyComponent={<EmptyState tab={activeTab} />}
        renderItem={({ item }) => <OrderCard order={item} mode={activeTab} />}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  tabText: {},
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  orderCard: {
    padding: Spacing.lg,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  orderInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  orderItems: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemPreviews: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPreview: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  moreItems: {
    backgroundColor: Colors.light.primary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["4xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 260,
  },
});
