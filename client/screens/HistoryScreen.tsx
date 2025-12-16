import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Platform, Image, RefreshControl } from "react-native";
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
import { getState, subscribe, loadTasksFromServer, Task } from "@/lib/store";

interface GroupedTasks {
  title: string;
  data: Task[];
}

function groupTasksByDate(tasks: Task[]): GroupedTasks[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { [key: string]: Task[] } = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  tasks.forEach((task) => {
    const date = new Date(task.completedAt || task.createdAt);
    if (date >= today) {
      groups.Today.push(task);
    } else if (date >= yesterday) {
      groups.Yesterday.push(task);
    } else if (date >= lastWeek) {
      groups["This Week"].push(task);
    } else {
      groups.Earlier.push(task);
    }
  });

  return Object.entries(groups)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

function TaskCard({ task, isParent }: { task: Task; isParent: boolean }) {
  const { theme } = useTheme();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  return (
    <Card style={styles.taskCard}>
      <View style={styles.taskContent}>
        <View style={[styles.taskImage, { backgroundColor: theme.backgroundSecondary }]}>
          {task.itemSvgData ? (
            <Image source={{ uri: task.itemSvgData }} style={styles.itemImage} />
          ) : (
            <Feather name="image" size={32} color={theme.textTertiary} />
          )}
        </View>
        <View style={styles.taskInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {task.itemName || "Item"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {isParent 
              ? `Completed by ${task.assignedToName}`
              : `From ${task.assignedByName}`
            } • {formatTime(task.completedAt || task.createdAt)}
          </ThemedText>
          {task.quantity > 1 ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Qty: {task.quantity}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.completedBadge, { backgroundColor: Colors.light.statusCompleted + "20" }]}>
          <Feather name="check" size={16} color={Colors.light.statusCompleted} />
        </View>
      </View>
    </Card>
  );
}

function EmptyState({ isParent }: { isParent: boolean }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="check-circle" size={64} color={theme.textTertiary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Completed Tasks
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        {isParent 
          ? "When children complete assigned tasks, they will appear here"
          : "Tasks you complete will appear here"
        }
      </ThemedText>
    </View>
  );
}

export default function HistoryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isParent, setIsParent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const currentState = getState();
    const currentUser = currentState.currentUser;
    if (!currentUser) return;
    
    await loadTasksFromServer(currentUser.id);
    
    const newState = getState();
    const userIsParent = currentUser.role === 'parent';
    setIsParent(userIsParent);
    
    if (userIsParent) {
      setTasks(newState.tasks.filter(t => 
        t.assignedById === currentUser.id && t.status === 'completed'
      ));
    } else {
      setTasks(newState.tasks.filter(t => 
        t.assignedToId === currentUser.id && t.status === 'completed'
      ));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const state = getState();
    const currentUser = state.currentUser;
    const userIsParent = currentUser?.role === 'parent';
    setIsParent(userIsParent);
    
    if (userIsParent) {
      setTasks(state.tasks.filter(t => 
        t.assignedById === currentUser?.id && t.status === 'completed'
      ));
    } else {
      setTasks(state.tasks.filter(t => 
        t.assignedToId === currentUser?.id && t.status === 'completed'
      ));
    }
    
    const unsubscribe = subscribe(() => {
      const newState = getState();
      const user = newState.currentUser;
      const parentRole = user?.role === 'parent';
      setIsParent(parentRole);
      
      if (parentRole) {
        setTasks([...newState.tasks.filter(t => 
          t.assignedById === user?.id && t.status === 'completed'
        )]);
      } else {
        setTasks([...newState.tasks.filter(t => 
          t.assignedToId === user?.id && t.status === 'completed'
        )]);
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

  const groupedTasks = groupTasksByDate(tasks);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={groupedTasks}
        keyExtractor={(item) => item.title}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        ListEmptyComponent={<EmptyState isParent={isParent} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item: group }) => (
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {group.title}
            </ThemedText>
            {group.data.map((task) => (
              <TaskCard key={task.id} task={task} isParent={isParent} />
            ))}
          </View>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  taskCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
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
    gap: Spacing.xs / 2,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
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
