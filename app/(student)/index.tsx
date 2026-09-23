import { StyleSheet, Text, View } from 'react-native'

export default function StudentHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AB Academy</Text>
      <Text style={styles.subtitle}>Portal do aluno</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bem-vindo!</Text>
        <Text style={styles.cardText}>
          Esta será a página inicial do aplicativo. Na próxima etapa vamos conectar
          os dados reais do aluno ao mesmo Supabase usado pelo portal web.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 24, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#667085', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 24 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardText: { marginTop: 8, lineHeight: 22, color: '#667085' },
})
