import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import colors from "@/constants/colors";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) {
  setBaseUrl(`https://${domain}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const bg = colors.light.background;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: bg },
        headerTintColor: colors.light.primary,
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="session/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="session-detail/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="plan/new"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="plan/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
