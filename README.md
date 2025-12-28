# Saravafy Mobile App

Aplicativo mobile desenvolvido com **React Native**, **Expo** e **Supabase**, focado em autenticação segura, arquitetura modular e suporte a múltiplos ambientes (dev / preview / production).

---

## 📱 Visão Geral

O Saravafy é um aplicativo mobile estruturado com:

- Autenticação via Supabase
- Navegação baseada em Expo Router
- Separação clara entre rotas públicas e protegidas
- Arquitetura preparada para múltiplos ambientes
- Suporte a builds locais e via EAS

---

## 🧱 Estrutura do Projeto

```
app/
  ├── _layout.tsx           # Layout raiz + controle de autenticação
  ├── index.tsx             # Redirecionamento inicial
  ├── (auth)/               # Rotas públicas
  │   ├── _layout.tsx
  │   └── login.tsx         # Login com Google
  └── (app)/                # Rotas protegidas
      ├── _layout.tsx
      └── home.tsx          # Tela principal autenticada

contexts/
  └── AuthContext.tsx       # Gerenciamento global de autenticação

lib/
  └── supabase.ts           # Cliente Supabase configurado
```

---

## 🚀 Tecnologias

- React Native 0.81.x
- Expo SDK 54
- Expo Router
- TypeScript
- Supabase (Auth + Backend)
- AsyncStorage

---

## ⚙️ Configuração Inicial

### 1. Instalar dependências

```bash
npm install
```

---

## 🔐 Configuração do Supabase

### 1. Criar projeto

1. Acesse https://app.supabase.com
2. Crie um novo projeto
3. Copie:
   - Project URL
   - Anon Public Key

### 2. Variáveis de ambiente

Crie um arquivo `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

---

### 3. Autenticação com Google

No painel do Supabase:

1. Vá em Authentication → Providers
2. Ative Google
3. Configure OAuth no Google Cloud Console
4. Adicione o redirect:

```
saravafy://auth/callback
```

> Se usar Expo Go, adicione também:
> https://auth.expo.io/@yuriblanke/saravafy

---

## 🧭 Fluxo de autenticação

1. Usuário abre o app
2. Redirecionamento para `/login`
3. Login via Google
4. Sessão criada/restaurada
5. Redirecionamento para `/home`

---

## 📱 Rotas

- `/(auth)/login` – Login
- `/(app)/home` – Área autenticada

---

## 🧠 Arquitetura

### AuthContext

- Centraliza estado de autenticação
- Expõe `user`, `session`, `signInWithGoogle`, `signOut`

### Supabase Client

- Localizado em `lib/supabase.ts`
- Gerencia persistência e refresh automático

### Proteção de rotas

- Baseada em grupos `(auth)` e `(app)`
- Redirecionamento automático conforme sessão

---

## 🧪 Desenvolvimento e Builds

Os comandos de build, ambientes e EAS estão documentados em:

📄 **README.dev.md**

---

## 📌 Observações

- Supabase é a única fonte de autenticação
- Não versionar arquivos `.env`
- `app.config.ts` é a fonte única de configuração do app

---

## 📄 Documentação complementar

- `README.dev.md` – builds, ambientes, EAS, scripts
- `app.config.ts` – configuração do app
- `eas.json` – pipelines de build
