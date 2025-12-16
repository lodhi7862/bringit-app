import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import SavedItemsScreen from "@/screens/SavedItemsScreen";
import TasksScreen from "@/screens/TasksScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import FamilyScreen from "@/screens/FamilyScreen";
import { useTheme } from "@/hooks/useTheme";
import { HeaderTitle } from "@/components/HeaderTitle";
import { Colors } from "@/constants/theme";
import { getState, subscribe, getUnreadNotificationCount, getUnseenPendingTaskCount, markTasksAsSeen, markAllNotificationsRead } from "@/lib/store";

export type MainTabParamList = {
  SavedItemsTab: undefined;
  TasksTab: undefined;
  NotificationsTab: undefined;
  HistoryTab: undefined;
  FamilyTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();


function NotificationBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <View style={styles.badge}>
      <View style={styles.badgeDot} />
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const [userRole, setUserRole] = useState(getState().currentUser?.role || 'parent');
  const [unreadCount, setUnreadCount] = useState(getUnreadNotificationCount());
  const [unseenTaskCount, setUnseenTaskCount] = useState(getUnseenPendingTaskCount());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setUserRole(getState().currentUser?.role || 'parent');
      setUnreadCount(getUnreadNotificationCount());
      setUnseenTaskCount(getUnseenPendingTaskCount());
    });
    return unsubscribe;
  }, []);

  const isParent = userRole === 'parent';

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName={isParent ? "SavedItemsTab" : "TasksTab"}
        screenOptions={{
          tabBarActiveTintColor: theme.tabIconSelected,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: Platform.select({
              ios: "transparent",
              android: theme.backgroundRoot,
            }),
            borderTopWidth: 0,
            elevation: 0,
            height: Platform.OS === "ios" ? 88 : 64,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerTintColor: theme.text,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
          sceneStyle: {
            backgroundColor: theme.backgroundRoot,
          },
        }}
      >
        {isParent ? (
          <>
            <Tab.Screen
              name="SavedItemsTab"
              component={SavedItemsScreen}
              options={{
                title: "Items",
                headerTitle: () => <HeaderTitle title="BringIt" />,
                tabBarIcon: ({ color, size }) => (
                  <Feather name="grid" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="NotificationsTab"
              component={NotificationsScreen}
              options={{
                title: "Updates",
                headerTitle: "Notifications",
                tabBarIcon: ({ color, size }) => (
                  <View>
                    <Feather name="bell" size={size} color={color} />
                    <NotificationBadge visible={unreadCount > 0} />
                  </View>
                ),
              }}
              listeners={{
                focus: () => {
                  markAllNotificationsRead();
                },
              }}
            />
            <Tab.Screen
              name="HistoryTab"
              component={HistoryScreen}
              options={{
                title: "History",
                headerTitle: "History",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="clock" size={size} color={color} />
                ),
              }}
            />
          </>
        ) : (
          <>
            <Tab.Screen
              name="TasksTab"
              component={TasksScreen}
              options={{
                title: "Tasks",
                headerTitle: () => <HeaderTitle title="BringIt" />,
                tabBarIcon: ({ color, size }) => (
                  <View>
                    <Feather name="check-square" size={size} color={color} />
                    <NotificationBadge visible={unseenTaskCount > 0} />
                  </View>
                ),
              }}
              listeners={{
                focus: () => {
                  markTasksAsSeen();
                },
              }}
            />
            <Tab.Screen
              name="HistoryTab"
              component={HistoryScreen}
              options={{
                title: "Completed",
                headerTitle: "Completed Tasks",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="check-circle" size={size} color={color} />
                ),
              }}
            />
          </>
        )}
        <Tab.Screen
          name="FamilyTab"
          component={FamilyScreen}
          options={{
            title: "Family",
            headerTitle: "Family Network",
            tabBarIcon: ({ color, size }) => (
              <Feather name="users" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.statusError,
  },
});
