# Saravafy Mobile App

Aplicativo móvel desenvolvido com React Native, Expo e Supabase Auth.

## 📁 Estrutura do Projeto

```
app/
  ├── _layout.tsx           # Layout raiz com AuthProvider e proteção de rotas
  ├── index.tsx             # Página inicial (redireciona para login)
  ├── (auth)/               # Grupo de rotas públicas
  │   ├── _layout.tsx
  │   └── login.tsx         # Tela de login com Google
  └── (app)/                # Grupo de rotas protegidas
      ├── _layout.tsx
      └── home.tsx          # Tela home (apenas usuários autenticados)

contexts/
  └── AuthContext.tsx       # Contexto de autenticação

lib/
  └── supabase.ts          # Cliente Supabase configurado

```

## 🚀 Tecnologias

- **React Native** 0.81.5
- **Expo** SDK 54
- **TypeScript** 5.9.2
- **Expo Router** 6.0.21
- **Supabase** (autenticação e backend)
- **AsyncStorage** (persistência de sessão via Supabase)

## ⚙️ Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

#### 2.1. Criar projeto no Supabase

1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Crie um novo projeto
3. Anote a **URL** e a **anon key** do projeto (Settings → API)

#### 2.2. Configurar variáveis de ambiente

Edite o arquivo `.env` e adicione suas credenciais:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

#### 2.3. Configurar Google Provider no Supabase

1. No painel do Supabase, vá em **Authentication** → **Providers**
2. Habilite **Google**
3. Configure o OAuth do Google:
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um projeto e ative a **Google+ API**
   - Crie credenciais OAuth 2.0 para aplicação Web
   - Adicione as URLs de redirect do Supabase (fornecidas no painel)
4. Cole o **Client ID** e **Client Secret** no painel do Supabase

#### 2.4. Configurar Redirect URLs no Supabase

No painel do Supabase, vá em **Authentication** → **URL Configuration** → **Redirect URLs** e adicione as seguintes URLs à allowlist:

**Para desenvolvimento (Expo Go):**

```
https://auth.expo.io/@yuriblanke/saravafy-mobile-app
```

**Para produção (build standalone):**

```
saravafy://login
```

**Importante:** O `app.json` já está configurado com:

- `"owner": "yuriblanke"`
- `"slug": "saravafy-mobile-app"`
- `"scheme": "saravafy"`

Essas configurações são necessárias para que o redirect funcione corretamente tanto no Expo Go quanto em builds.

## 🏃 Como executar

```bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios

# Executar na web
npm run web
```

## 🔐 Fluxo de Autenticação

1. **Usuário não autenticado**: Redirecionado automaticamente para `/login`
2. **Clica em "Entrar com Google"**: Supabase abre o fluxo OAuth do Google
3. **Após autenticação**: Supabase cria/autentica o usuário e gerencia a sessão
4. **Usuário autenticado**: Redirecionado automaticamente para `/home`
5. **Logout**: Supabase invalida a sessão e redireciona para `/login`

## 📱 Rotas

- `/(auth)/login` - Tela de login (pública)
- `/(app)/home` - Tela home (protegida)

## 🛠️ Funcionalidades Implementadas

- ✅ Autenticação com Google via Supabase Auth
- ✅ Proteção de rotas com Expo Router
- ✅ Persistência de sessão automática via Supabase
- ✅ Redirecionamento automático baseado no estado de autenticação
- ✅ Context API para gerenciamento de estado global
- ✅ TypeScript em todos os arquivos
- ✅ Gerenciamento de tokens e refresh automático

## 📝 Próximos Passos

- [ ] Adicionar mais telas ao app
- [ ] Implementar splash screen personalizada
- [ ] Adicionar tratamento de erros aprimorado
- [ ] Criar tabelas e policies no Supabase
- [ ] Adicionar testes
- [ ] Configurar deep linking para produção

## ⚠️ Notas Importantes

- **Supabase como única fonte de autenticação**: O app não conversa diretamente com o Google
- **Segurança**: Nunca commite o arquivo `.env` no repositório (já está no `.gitignore`)
- **Deep Linking**: O scheme `saravafy://` está configurado no `app.json` para o redirect após autenticação
- **Expo Go**: Funciona perfeitamente com Expo Go em desenvolvimento
- **Produção**: Configure os URLs de redirect adequados no Supabase para cada plataforma

## 🔧 Arquitetura

### AuthContext

- Gerencia estado global de autenticação
- Escuta mudanças via `onAuthStateChange`
- Expõe `session`, `user`, `signInWithGoogle()` e `signOut()`

### Supabase Client

- Configurado em `lib/supabase.ts`
- Usa AsyncStorage para persistência automática
- Auto-refresh de tokens habilitado

### Proteção de Rotas

- Implementada em `app/_layout.tsx`
- Baseada em grupos de rotas: `(auth)` e `(app)`
- Redireciona automaticamente conforme estado de autenticação
