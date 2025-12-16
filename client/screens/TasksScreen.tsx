import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, Alert, Platform, Image } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getState, subscribe, markTaskDone, loadTasksFromServer, Task } from "@/lib/store";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "@/lib/toast";
import { wsClient } from "@/lib/websocket";

function TaskCard({ 
  task, 
  onMarkDone 
}: { 
  task: Task; 
  onMarkDone: (id: string) => void;
}) {
  const { theme } = useTheme();

  const handleMarkDone = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Mark as Done",
      `Did you complete "${task.itemName || "this item"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Done",
          style: "default",
          onPress: () => {
            onMarkDone(task.id);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
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
    <Card style={styles.taskCard}>
      <View style={[styles.taskImageLarge, { backgroundColor: theme.backgroundSecondary }]}>
        {task.itemSvgData ? (
          <Image source={{ uri: task.itemSvgData }} style={styles.itemImageLarge} resizeMode="cover" />
        ) : (
          <Feather name="image" size={64} color={theme.textTertiary} />
        )}
      </View>
      <View style={styles.taskDetails}>
        <View style={styles.taskInfo}>
          <ThemedText type="h3" numberOfLines={2}>
            {task.itemName || "Item"}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            From {task.assignedByName} • {formatTime(task.createdAt)}
          </ThemedText>
          {task.quantity > 1 ? (
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
              Quantity: {task.quantity}
            </ThemedText>
          ) : null}
          {task.note ? (
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Note: {task.note}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={handleMarkDone}
          style={({ pressed }) => [
            styles.doneButtonLarge,
            {
              backgroundColor: Colors.light.statusCompleted,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Feather name="check" size={28} color={Colors.light.buttonText} />
          <ThemedText type="body" style={{ color: Colors.light.buttonText, fontWeight: "600", marginLeft: Spacing.sm }}>
            Done
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="check-circle" size={64} color={theme.textTertiary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Tasks Yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        When a parent assigns items to you, they will appear here
      </ThemedText>
    </View>
  );
}

export default function TasksScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateTasksFromState = () => {
    const state = getState();
    const currentUserId = state.currentUser?.id;
    if (currentUserId) {
      setTasks([...state.tasks.filter(t => t.assignedToId === currentUserId && t.status === 'pending')]);
    }
  };

  const loadTasks = async () => {
    const currentState = getState();
    const userId = currentState.currentUser?.id;
    if (userId) {
      setIsLoading(true);
      await loadTasksFromServer(userId);
      updateTasksFromState();
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      updateTasksFromState();
    });
    
    updateTasksFromState();
    loadTasks();
    
    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadTasks();
    });

    // Listen for real-time task updates via WebSocket
    const unsubscribeNewTask = wsClient.on('new_task', async (message) => {
      if (message.task) {
        await loadTasks();
        showToast(`New task: ${message.task.itemName || 'Task'}`, "info");
      }
    });

    const unsubscribeTaskCompleted = wsClient.on('task_completed', async () => {
      await loadTasks();
    });
    
    return () => {
      unsubscribe();
      unsubscribeFocus();
      unsubscribeNewTask();
      unsubscribeTaskCompleted();
    };
  }, [navigation, showToast]);

  const handleMarkDone = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    await markTaskDone(taskId);
    showToast(`"${task?.itemName || "Task"}" marked as done`, "success");
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <TaskCard task={item} onMarkDone={handleMarkDone} />
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
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  taskCard: {
    padding: 0,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  taskImageLarge: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImageLarge: {
    width: "100%",
    height: "100%",
  },
  taskDetails: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  taskInfo: {
    gap: Spacing.xs,
  },
  doneButtonLarge: {
    flexDirection: "row",
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
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
