import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf="checklist" />
        <NativeTabs.Trigger.Label>Contas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(fixed)">
        <NativeTabs.Trigger.Icon sf="repeat.circle" />
        <NativeTabs.Trigger.Label>Fixas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" />
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Icon sf="gearshape" />
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
