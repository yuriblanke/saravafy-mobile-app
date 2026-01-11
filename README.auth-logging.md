# Logging Robusto de Tentativas de Login Google (OAuth)

## Visão Geral

Implementação de observabilidade completa para diagnosticar edge cases no fluxo de login Google via Supabase OAuth, especialmente casos onde o usuário trava na tela de consentimento do Google.

## Componentes Implementados

### 1. AuthLogger (`src/utils/authLogger.ts`)

Utilitário centralizado para logging estruturado e persistente:

- **Geração de attempt_id**: UUID único por tentativa de login
- **Inserção no Supabase**: Tabela `public.auth_login_attempts`
- **Metadados coletados**:
  - Platform (iOS/Android)
  - OS version
  - App version e build number
  - Network type (quando disponível)
  - Timestamps precisos
- **Segurança**: Nunca loga tokens sensíveis (access_token, refresh_token, code)
- **Dedupe/Debounce**: Evita logs duplicados em janela de 1s
- **Best-effort**: Falhas no logging não quebram o fluxo de autenticação
- **Debug local**: Mantém últimos 50 eventos em memória

#### Funções principais:

```typescript
// Gerar novo attempt_id
generateAttemptId(): string

// Logar evento
logAuthEvent(attemptId, event, details, userId?): Promise<void>

// Classificar URL (auth_callback, dev_client, metro, other)
classifyUrl(url): { urlKind, urlHost?, urlPath? }

// Obter logs recentes para debug
getRecentAuthLogs(): Array<{ attemptId, event, timestamp, details }>

// Classe para gerenciar tentativa
class AuthAttempt {
  attemptId: string
  setUserId(userId): void
  log(event, details?): Promise<void>
}
```

### 2. AuthContext Instrumentado (`contexts/AuthContext.tsx`)

O contexto de autenticação foi completamente instrumentado com logs em todos os marcos do fluxo:

#### Eventos de Boot/Inicialização:

- `boot_auth_context_mounted`: Context montado
- `boot_get_session_success/error`: Resultado da sessão inicial
- `boot_get_initial_url_start/result/error`: Verificação de deep link inicial
- `boot_linking_listener_registered`: Listener de deep links registrado
- `boot_supabase_onAuthStateChange_registered`: Listener de auth state registrado

#### Eventos de Login (signInWithGoogle):

- `oauth_start`: Início do fluxo OAuth
- `oauth_redirect_uri_built`: Redirect URI construído
- `oauth_signInWithOAuth_called`: Chamada ao Supabase
- `oauth_signInWithOAuth_success/error`: Resultado da chamada
- `oauth_browser_open_start`: Antes de abrir browser
- `oauth_browser_open_result`: Resultado do browser (success/cancel/dismiss)
- `oauth_browser_cancelled`: Usuário cancelou
- `oauth_timeout`: Timeout de 12s atingido (watchdog)
- `oauth_error`: Erro não tratado

#### Eventos de Deep Link (processDeepLink):

- `deep_link_received`: Deep link capturado
- `deep_link_ignored`: Deep link ignorado (reason: duplicate/dev_client/metro/not_auth_callback)
- `deep_link_oauth_error`: Erro retornado pelo OAuth
- `deep_link_exchange_code_start/success/error`: Troca de code por sessão (PKCE)
- `deep_link_set_session_start/success/error`: Estabelecimento de sessão via tokens
- `deep_link_error`: Erro não tratado

#### Eventos de Auth State Change:

- `auth_state_change`: Mudança de estado de auth (evento, hasSession, userId)
- `auth_session_set`: Sessão estabelecida com sucesso

### 3. Watchdog de Timeout (12s)

Sistema de timeout para capturar casos onde o usuário fica travado:

- Inicia ao chamar `signInWithGoogle()`
- Cancela quando:
  - `auth_state_change` com sessão válida
  - `processDeepLink` concluir com sucesso
  - Browser retornar com cancel/dismiss
- Se expirar (12s sem conclusão):
  - Loga evento `oauth_timeout` com detalhes
  - Define `authError` com mensagem amigável
  - Remove estado de loading (`authInProgress = false`)

### 4. Novos Estados UX

Para evitar loading infinito e permitir retry:

```typescript
interface AuthContextType {
  // ... estados existentes
  authInProgress: boolean; // true durante login
  authError: string | null; // mensagem de erro amigável
  clearAuthError: () => void; // limpar erro
  getRecentAuthLogs: () => any[]; // debug logs
}
```

## Estrutura da Tabela (Backend)

A tabela `public.auth_login_attempts` já existe no backend com a seguinte estrutura:

```sql
CREATE TABLE public.auth_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  provider text NOT NULL,
  event text NOT NULL,
  client_ts timestamptz NOT NULL,
  server_ts timestamptz DEFAULT now(),
  platform text,
  os_version text,
  app_version text,
  build_number text,
  network_type text,
  network_details jsonb,
  browser_details jsonb,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS permite insert anon com user_id NULL
-- e insert authenticated com user_id = auth.uid()
```

## Fluxo de Eventos Típico

### Login bem-sucedido:

1. `oauth_start`
2. `oauth_redirect_uri_built`
3. `oauth_signInWithOAuth_called`
4. `oauth_signInWithOAuth_success`
5. `oauth_browser_open_start`
6. `oauth_browser_open_result` (type: success)
7. `deep_link_received`
8. `deep_link_exchange_code_start` (ou `deep_link_set_session_start`)
9. `deep_link_exchange_code_success` (ou `deep_link_set_session_success`)
10. `auth_session_set`
11. `auth_state_change` (event: SIGNED_IN)

### Login travado (timeout):

1. `oauth_start`
2. `oauth_redirect_uri_built`
3. `oauth_signInWithOAuth_called`
4. `oauth_signInWithOAuth_success`
5. `oauth_browser_open_start`
6. ... **12 segundos de silêncio** ...
7. `oauth_timeout` ⚠️

### Login cancelado pelo usuário:

1. `oauth_start`
2. `oauth_redirect_uri_built`
3. `oauth_signInWithOAuth_called`
4. `oauth_signInWithOAuth_success`
5. `oauth_browser_open_start`
6. `oauth_browser_open_result` (type: cancel)
7. `oauth_browser_cancelled`

## Consultas Úteis (Supabase Dashboard)

### Ver tentativas de um usuário específico:

```sql
SELECT
  attempt_id,
  event,
  client_ts,
  details
FROM public.auth_login_attempts
WHERE user_id = 'USER_UUID_AQUI'
ORDER BY client_ts DESC
LIMIT 50;
```

### Ver tentativas travadas (com timeout):

```sql
SELECT
  attempt_id,
  user_id,
  client_ts,
  details
FROM public.auth_login_attempts
WHERE event = 'oauth_timeout'
ORDER BY client_ts DESC;
```

### Ver fluxo completo de uma tentativa:

```sql
SELECT
  event,
  client_ts,
  details,
  user_id
FROM public.auth_login_attempts
WHERE attempt_id = 'ATTEMPT_UUID_AQUI'
ORDER BY client_ts ASC;
```

### Ver tentativas sem conclusão (sem auth_session_set):

```sql
WITH attempts_with_session AS (
  SELECT DISTINCT attempt_id
  FROM public.auth_login_attempts
  WHERE event = 'auth_session_set'
)
SELECT DISTINCT
  a.attempt_id,
  MIN(a.client_ts) as started_at,
  MAX(a.client_ts) as last_event_at,
  array_agg(DISTINCT a.event ORDER BY a.event) as events
FROM public.auth_login_attempts a
LEFT JOIN attempts_with_session s ON a.attempt_id = s.attempt_id
WHERE s.attempt_id IS NULL
  AND a.event LIKE 'oauth_%'
  AND a.client_ts > now() - interval '24 hours'
GROUP BY a.attempt_id
ORDER BY started_at DESC;
```

## Debug Local

Para acessar logs recentes em tempo de execução:

```typescript
import { useAuth } from "@/contexts/AuthContext";

function DebugScreen() {
  const { getRecentAuthLogs } = useAuth();

  const logs = getRecentAuthLogs();

  return (
    <View>
      {logs.map((log, i) => (
        <Text key={i}>
          {log.timestamp} - {log.event}
        </Text>
      ))}
    </View>
  );
}
```

## Próximos Passos (Opcional)

1. **NetInfo**: Adicionar `@react-native-community/netinfo` para coletar informações precisas de rede
2. **Analytics**: Integrar com plataforma de analytics (Amplitude, Mixpanel) para dashboards
3. **Alertas**: Configurar alertas automáticos quando taxa de timeout > X%
4. **UI de Debug**: Criar tela oculta (shake gesture?) para mostrar logs recentes
5. **Retry inteligente**: Sugerir retry automático após timeout com backoff exponencial

## Critérios de Aceite ✅

- [x] Ao iniciar login Google, attempt_id é criado e eventos são gravados
- [x] Se usuário não retornar em 12s, `oauth_timeout` é gravado
- [x] App não fica preso em loading infinito (authInProgress + authError)
- [x] Deep links logam eventos sem incluir tokens
- [x] `auth_state_change` é gravado com contexto
- [x] Falhas de logging não quebram o fluxo
- [x] Tokens sensíveis nunca são armazenados
- [x] Logs recentes disponíveis via `getRecentAuthLogs()`

## Segurança

⚠️ **IMPORTANTE**: Este sistema **NUNCA** loga:

- `access_token`
- `refresh_token`
- `id_token`
- `code` (OAuth authorization code)
- Qualquer outro token sensível

Apenas flags booleanas são logadas:

- `hasCode: boolean`
- `hasAccessToken: boolean`
- `hasRefreshToken: boolean`

URLs são classificadas e sanitizadas antes do log (apenas host/path, sem query/fragment com tokens).
