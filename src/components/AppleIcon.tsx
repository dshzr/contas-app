import { SymbolView, type SFSymbol } from 'expo-symbols';
import React from 'react';
import { Text, type ColorValue } from 'react-native';

interface AppleIconProps {
  name: string;
  size?: number;
  color: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export function AppleIcon({ name, size = 20, color, weight = 'regular' }: AppleIconProps) {
  return (
    <SymbolView
      name={name as SFSymbol}
      size={size}
      tintColor={color}
      weight={weight}
      fallback={<Text style={{ color, fontSize: size * 0.8 }}>•</Text>}
    />
  );
}
