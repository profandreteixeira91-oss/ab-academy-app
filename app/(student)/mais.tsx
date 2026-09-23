import { StyleSheet, Text, View } from 'react-native'

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mais</Text>
      <Text style={styles.subtitle}>Solicitações, perfil e outras opções.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#667085' },
})
