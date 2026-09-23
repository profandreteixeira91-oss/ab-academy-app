# AB Academy App

Aplicativo nativo iOS/Android do portal do aluno AB Academy.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase

## Backend

O aplicativo usa o mesmo projeto Supabase do portal web. Não existe banco separado para o aplicativo.

## Desenvolvimento

1. Copie .env.example para .env.
2. Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie:
   ```bash
   npx expo start
   ```

O Supabase recomenda persistir a sessão localmente no aplicativo e usar variáveis EXPO_PUBLIC_ para as credenciais públicas do cliente. Nunca coloque service_role keys no aplicativo.
