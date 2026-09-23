import { PropsWithChildren } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { colors, radius, shadow } from '@/constants/theme'

type Props = PropsWithChildren<{ style?: ViewStyle; elevated?: boolean }>

export function AppCard({ children, style, elevated = false }: Props) {
  return <View style={[styles.card, elevated && shadow.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 20 },
})
