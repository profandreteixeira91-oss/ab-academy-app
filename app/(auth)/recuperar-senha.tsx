import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function RecoverPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRecover() {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'abacademy://recuperar-senha',
    })

    setLoading(false)

    if (error) {
      Alert.alert('Não foi possível enviar', error.message)
      return
    }

    Alert.alert(
      'E-mail enviado',
      'Verifique sua caixa de entrada para continuar a recuperação da senha.'
    )
    router.back()
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail cadastrado na AB Academy.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#8b93a1"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Pressable style={styles.button} onPress={handleRecover} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Enviar link'}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Voltar para o login</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#667085',
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#d9dde5',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: '#111827',
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  back: {
    textAlign: 'center',
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 18,
  },
})
