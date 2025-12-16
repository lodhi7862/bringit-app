import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Platform, Image, RefreshControl } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/lib/toast";
import { 
  getState, 
  subscribe, 
  markNotificationRead, 
  markAllNotificationsRead,
  loadTasksFromServer,
  getParentAssignedTasks,
  getChildTasks,
  Task,
  Notification 
} from "@/lib/store";

type UpdateItem = 
  | { type: 'task'; data: Task }
  | { type: 'notification'; data: Notification };

function TaskCard({ task }: { task: Task }) {
  const { theme } = useTheme();
  const isPending = task.status === 'pending';

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
    <Card style={styles.taskCard}>
      <View style={styles.taskContent}>
        <View style={[styles.taskImage, { backgroundColor: theme.backgroundSecondary }]}>
          {task.itemSvgData ? (
            <Image source={{ uri: task.itemSvgData }} style={styles.itemImage} />
          ) : (
            <Feather name="image" size={24} color={theme.textTertiary} />
          )}
        </View>
        <View style={styles.taskInfo}>
          <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
            {task.itemName || "Item"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Assigned to {task.assignedToName}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textTertiary }}>
            {formatTime(task.createdAt)}
            {task.quantity > 1 ? ` • Qty: ${task.quantity}` : ""}
          </ThemedText>
        </View>
        <View style={[
          styles.statusBadge, 
          { 
            backgroundColor: isPending 
              ? Colors.light.statusPending + "20" 
              : Colors.light.statusCompleted + "20" 
          }
        ]}>
          <Feather 
            name={isPending ? "clock" : "check"} 
            size={16} 
            color={isPending ? Colors.light.statusPending : Colors.light.statusCompleted} 
          />
        </View>
      </View>
    </Card>
  );
}

function NotificationCard({ 
  notification, 
  onMarkRead 
}: { 
  notification: Notification; 
  onMarkRead: (id: string) => void;
}) {
  const { theme } = useTheme();

  const handlePress = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
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

  const getMessage = () => {
    if (notification.type === 'task_completed') {
      const itemText = notification.itemName || "an item";
      return `${notification.completedByName} completed "${itemText}"`;
    }
    return "New notification";
  };

  return (
    <Card 
      style={StyleSheet.flatten([
        styles.notificationCard,
        !notification.read && { borderLeftWidth: 3, borderLeftColor: Colors.light.primary },
      ])}
      onPress={handlePress}
    >
      <View style={styles.notificationContent}>
        <View style={[
          styles.iconContainer, 
          { 
            backgroundColor: notification.read 
              ? theme.backgroundSecondary 
              : Colors.light.statusCompleted + "20" 
          }
        ]}>
          <Feather 
            name="check-circle" 
            size={24} 
            color={notification.read ? theme.textTertiary : Colors.light.statusCompleted} 
          />
        </View>
        <View style={styles.notificationInfo}>
          <ThemedText 
            type="body" 
            style={{ fontWeight: notification.read ? "400" : "600" }}
          >
            {getMessage()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatTime(notification.createdAt)}
          </ThemedText>
        </View>
        {!notification.read ? (
          <View style={[styles.unreadDot, { backgroundColor: Colors.light.primary }]} />
        ) : null}
      </View>
    </Card>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="bell" size={64} color={theme.textTertiary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Updates
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Assign tasks from the Items tab and track their progress here
      </ThemedText>
    </View>
  );
}

export default function NotificationsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const state = getState();
    const currentUser = state.currentUser;
    
    if (currentUser) {
      const result = await loadTasksFromServer(currentUser.id);
      
      if (currentUser.role === 'parent' && result.newlyCompleted.length > 0) {
        for (const task of result.newlyCompleted) {
          showToast(`"${task.itemName}" was completed by ${task.assignedToName}`, "success");
        }
      }
    }
    
    const newState = getState();
    const user = newState.currentUser;
    setNotifications([...newState.notifications].reverse());
    
    if (user?.role === 'parent') {
      setTasks(getParentAssignedTasks(user.id));
    } else if (user?.role === 'child') {
      setTasks(getChildTasks(user.id));
    } else {
      setTasks([]);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const state = getState();
    const user = state.currentUser;
    setNotifications([...state.notifications].reverse());
    
    if (user?.role === 'parent') {
      setTasks(getParentAssignedTasks(user.id));
    } else if (user?.role === 'child') {
      setTasks(getChildTasks(user.id));
    } else {
      setTasks([]);
    }
    
    const unsubscribe = subscribe(() => {
      const newState = getState();
      const currentUser = newState.currentUser;
      setNotifications([...newState.notifications].reverse());
      
      if (currentUser?.role === 'parent') {
        setTasks(getParentAssignedTasks(currentUser.id));
      } else if (currentUser?.role === 'child') {
        setTasks(getChildTasks(currentUser.id));
      } else {
        setTasks([]);
      }
    });
    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleMarkRead = (notificationId: string) => {
    markNotificationRead(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const updateItems: UpdateItem[] = [
    ...pendingTasks.map(t => ({ type: 'task' as const, data: t })),
    ...notifications.map(n => ({ type: 'notification' as const, data: n })),
  ].sort((a, b) => {
    const timeA = a.type === 'task' ? a.data.createdAt : a.data.createdAt;
    const timeB = b.type === 'task' ? b.data.createdAt : b.data.createdAt;
    return timeB - timeA;
  });

  return (
    <ThemedView style={styles.container}>
      {unreadCount > 0 ? (
        <View style={[styles.header, { paddingTop: headerHeight + Spacing.md }]}>
          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => [
              styles.markAllButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.primary }}>
              Mark all as read
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      
      {pendingTasks.length > 0 ? (
        <View style={[
          styles.summaryBar, 
          { 
            marginTop: unreadCount > 0 ? 0 : headerHeight + Spacing.md,
            backgroundColor: Colors.light.statusPending + "15" 
          }
        ]}>
          <Feather name="clock" size={16} color={Colors.light.statusPending} />
          <ThemedText type="small" style={{ color: Colors.light.statusPending, marginLeft: Spacing.sm }}>
            {pendingTasks.length} pending task{pendingTasks.length !== 1 ? "s" : ""}
          </ThemedText>
        </View>
      ) : null}
      
      <FlatList
        data={updateItems}
        keyExtractor={(item) => item.type === 'task' ? `task-${item.data.id}` : `notif-${item.data.id}`}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: (unreadCount > 0 || pendingTasks.length > 0) ? Spacing.md : headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          item.type === 'task' 
            ? <TaskCard task={item.data} />
            : <NotificationCard notification={item.data} onMarkRead={handleMarkRead} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  markAllButton: {
    padding: Spacing.sm,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  taskCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  taskInfo: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  notificationCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  notificationInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["3xl"],
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
