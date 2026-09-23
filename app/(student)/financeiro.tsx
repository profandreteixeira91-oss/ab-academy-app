import { StyleSheet, Text, View } from 'react-native'

export default function FinanceiroScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Financeiro</Text>
      <Text style={styles.subtitle}>Suas mensalidades e pagamentos aparecerão aqui.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#667085' },
})
