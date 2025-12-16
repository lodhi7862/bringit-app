import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import ProfileSetupScreen from "@/screens/ProfileSetupScreen";
import CreateOrderScreen from "@/screens/CreateOrderScreen";
import OrderDetailScreen from "@/screens/OrderDetailScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import QRCodeScreen from "@/screens/QRCodeScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { getState, subscribe } from "@/lib/store";

export type RootStackParamList = {
  Main: undefined;
  ProfileSetup: undefined;
  CreateOrder: undefined;
  OrderDetail: { orderId: string; mode: "received" | "sent" };
  QRScanner: undefined;
  QRCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const [hasProfile, setHasProfile] = useState(!!getState().currentUser);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setHasProfile(!!getState().currentUser);
    });
    return unsubscribe;
  }, []);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!hasProfile ? (
        <Stack.Screen
          name="ProfileSetup"
          component={ProfileSetupScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateOrder"
            component={CreateOrderScreen}
            options={{
              presentation: "modal",
              headerTitle: "New Order",
            }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{
              headerTitle: "Order",
            }}
          />
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="QRCode"
            component={QRCodeScreen}
            options={{
              presentation: "modal",
              headerTitle: "Your QR Code",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
