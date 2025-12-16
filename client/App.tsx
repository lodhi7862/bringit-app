import React, { useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { Feather } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/lib/toast";
import { 
  registerForPushNotifications, 
  registerDeviceToken, 
  setupNotificationListeners 
} from "@/lib/notifications";
import { getState, subscribe, loadTasksFromServer } from "@/lib/store";
import { wsClient } from "@/lib/websocket";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [fontError, setFontError] = React.useState<Error | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(Feather.font);
        setFontsLoaded(true);
      } catch (error) {
        console.error("Font loading error:", error);
        setFontError(error as Error);
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const initNotifications = async () => {
      const currentUser = getState().currentUser;
      if (currentUser) {
        const token = await registerForPushNotifications();
        if (token) {
          await registerDeviceToken(token);
        }
        // Connect WebSocket
        wsClient.connect(currentUser.id);
      }
    };

    initNotifications();

    const unsubscribe = subscribe(() => {
      const user = getState().currentUser;
      if (user) {
        registerForPushNotifications().then((token) => {
          if (token) {
            registerDeviceToken(token);
          }
        });
        // Connect/reconnect WebSocket when user changes
        if (!wsClient.isConnected()) {
          wsClient.connect(user.id);
        }
      } else {
        // Disconnect WebSocket when user logs out
        wsClient.disconnect();
      }
    });

    const cleanupListeners = setupNotificationListeners();

    // Set up WebSocket message handlers
    const unsubscribeNewTask = wsClient.on('new_task', async (message) => {
      const currentUser = getState().currentUser;
      if (currentUser && message.task) {
        // Reload tasks from server to get the new task
        await loadTasksFromServer(currentUser.id);
      }
    });

    const unsubscribeTaskCompleted = wsClient.on('task_completed', async (message) => {
      const currentUser = getState().currentUser;
      if (currentUser && message.task) {
        // Reload tasks from server to get updated status
        await loadTasksFromServer(currentUser.id);
      }
    });

    return () => {
      unsubscribe();
      cleanupListeners();
      unsubscribeNewTask();
      unsubscribeTaskCompleted();
      wsClient.disconnect();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <ToastProvider>
                <NavigationContainer>
                  <RootStackNavigator />
                </NavigationContainer>
                <StatusBar style="auto" />
              </ToastProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
