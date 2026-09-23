import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/theme'

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
        <Text style={styles.brand}>AB Academy</Text>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail cadastrado na AB Academy.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textTertiary}
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  back: {
    textAlign: 'center',
    color: colors.accent,
    fontWeight: '600',
    marginTop: 18,
  },
})
