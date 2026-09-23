import { StyleSheet, Text, View } from 'react-native'

export default function AulasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aulas</Text>
      <Text style={styles.subtitle}>Sua agenda de aulas aparecerá aqui.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#667085' },
})
