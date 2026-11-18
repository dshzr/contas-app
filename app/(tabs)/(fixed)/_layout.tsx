import { Stack } from 'expo-router';
import React from 'react';
import { useAppleTheme } from '../../../src/theme/appleColors';

export default function FixedStackLayout() {
  const colors = useAppleTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Fixas' }} />
    </Stack>
  );
}
