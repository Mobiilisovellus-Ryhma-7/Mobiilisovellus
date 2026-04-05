import * as React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

export default function Screen({ children, style, edges = ['top', 'bottom'] }: ScreenProps) {
  return React.createElement(SafeAreaView, {
    style,
    edges,
    children,
  });
}