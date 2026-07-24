import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppStateProvider, useAppState } from './src/AppState';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScansScreen from './src/screens/ScansScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors } from './src/theme';
import { t } from './src/i18n';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.graphite,
    border: colors.border,
    primary: colors.accent,
  },
};

const TAB_ICONS = {
  Home: { outline: 'home-outline', solid: 'home' },
  Scans: { outline: 'documents-outline', solid: 'documents' },
  Medicines: { outline: 'medical-outline', solid: 'medical' },
  Chat: { outline: 'chatbubble-ellipses-outline', solid: 'chatbubble-ellipses' },
  Profile: { outline: 'person-outline', solid: 'person' },
};

function MainTabs() {
  const { language } = useAppState();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.graphite,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          const name = focused ? icons.solid : icons.outline;
          return <Ionicons name={name} size={size} color={color} />;
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

function Root() {
  const { ready, profile } = useAppState();
  if (!ready) {
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
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="dark" />
        <Root />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  bootText: { marginTop: 12, color: colors.graphite, fontWeight: '800', fontSize: 18 },
});
