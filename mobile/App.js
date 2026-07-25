import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AppStateProvider, useAppState } from './src/AppState';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScansScreen from './src/screens/ScansScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors, fonts } from './src/theme';
import { t } from './src/i18n';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.onSurface,
    border: colors.border,
    primary: colors.graphite,
  },
};

const TAB_ICONS = {
  Home: { outline: 'home-outline', solid: 'home' },
  Scans: { outline: 'scan-outline', solid: 'scan' },
  Medicines: { outline: 'medical-outline', solid: 'medical' },
  Chat: { outline: 'chatbubble-outline', solid: 'chatbubble' },
  Profile: { outline: 'person-outline', solid: 'person' },
};

function MainTabs() {
  const { language } = useAppState();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.graphite,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 52 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 10,
          marginBottom: 0,
        },
        tabBarIconStyle: { marginTop: 0 },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          const name = focused ? icons.solid : icons.outline;
          return (
            <View
              style={{
                backgroundColor: focused ? colors.tabActivePill : 'transparent',
                width: 40,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={name} size={20} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t(language, 'home') }} />
      <Tab.Screen name="Scans" component={ScansScreen} options={{ title: t(language, 'scans') }} />
      <Tab.Screen
        name="Medicines"
        component={MedicinesScreen}
        options={{ title: t(language, 'medicines') }}
      />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: t(language, 'chat') }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t(language, 'profile') }}
      />
    </Tab.Navigator>
  );
}

function Root({ fontsReady }) {
  const { ready, profile } = useAppState();
  if (!ready || !fontsReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.bootText}>RxLens AI</Text>
      </View>
    );
  }
  if (!profile.onboardingDone) return <OnboardingScreen />;
  return (
    <NavigationContainer theme={navTheme}>
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Epilogue_600SemiBold,
    Epilogue_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="dark" />
        <Root fontsReady={fontsLoaded} />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  bootText: {
    marginTop: 12,
    color: colors.onSurface,
    fontSize: 18,
    fontFamily: fonts.displayBold,
  },
});
