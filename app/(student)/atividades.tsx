import { StyleSheet, Text, View } from 'react-native'

export default function AtividadesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atividades</Text>
      <Text style={styles.subtitle}>Suas atividades aparecerão aqui.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#667085' },
})
