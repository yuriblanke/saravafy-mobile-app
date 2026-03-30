# Saravafy — Aplicativo Mobile

*Versão:* 0.1 — 28 de março de 2026  
*Inferido de:* análise do código-fonte (`saravafy-mobile-app`)

---

## 1. Problema

Comunidades de terreiro — grupos religiosos afro-brasileiros de tradições como Umbanda e Candomblé — mantêm um repertório oral e musical de **pontos** (músicas/cantos rituais) que historicamente são transmitidos de forma informal, sem registro centralizado, sem organização por coletivos nem preservação digital.

**Para quem:** Integrantes de terreiros (membros, curimba, administradores) e curadores culturais que precisam organizar, preservar e acessar esse repertório musical.

**Impacto de não resolver:**
- Pontos se perdem com o tempo por falta de registro
- Comunidades não conseguem organizar seu próprio acervo
- Novos membros não têm acesso fácil ao repertório do terreiro
- Sem um sistema de revisão, áudios incorretos ou sem consentimento circulam livremente

---

## 2. Objetivo

O Saravafy existe para ser uma **biblioteca digital colaborativa de pontos para terreiros**, onde:

- Qualquer membro autenticado pode **descobrir e ouvir** pontos
- Membros de terreiros podem **organizar pontos em coleções** próprias e de seu terreiro
- Contribuidores podem **submeter pontos novos** (áudio + letra + metadados)
- Curadores garantem a **qualidade e integridade editorial** do acervo (revisão, correção, auditoria)
- Administradores de terreiro gerem a sua **comunidade digital** dentro do app

---

## 3. Métricas de Sucesso

*Inferidas de funcionalidades e fluxos presentes no código:*

| Métrica | Indicador |
|---------|-----------|
| Adoção de submissões | Número de pontos enviados para revisão por mês |
| Taxa de aprovação | % de submissões aprovadas pelo curador (qualidade do envio) |
| Engajamento de coleções | Número de coleções criadas por terreiro |
| Retenção de membros | Usuários com terreiro associado que voltam a usar o app |
| Cobertura de acervo | Total de pontos ativos no sistema |
| Uso do player | Reproduções por sessão / por usuário |

*Nota: nenhum framework de analytics (Amplitude, Firebase, etc.) foi identificado no código — métricas precisarão ser implementadas.*

---

## 4. Contexto e Histórico

### O que já existe

O repositório apresenta um produto **funcional e em estágio avançado de desenvolvimento**, com:

- Autenticação via Google OAuth implementada e estável
- Feed de pontos com busca e filtragem operacional
- Player de áudio com letras integradas
- Sistema de submissão com fluxo completo de upload (assinado, validado, auditado)
- Gerenciamento de terreiros, membros e convites
- Controle de acesso por papéis (admin, curimba, membro)
- Fila de revisão para curadores
- Sistema de coleções (pessoal e por terreiro)

### Restrições e decisões anteriores identificadas

- **Backend exclusivamente Supabase**: PostgreSQL + Auth + Storage + Deno Functions. Não há servidor own-backend separado.
- **Sem suporte offline**: App é 100% dependente de conectividade.
- **Um único método de autenticação**: Google OAuth — sem e-mail/senha, Apple Sign-In ou outros provedores.
- **Mobile-first (React Native)**: Sem versão web equivalente identificada.
- **Orientação travada em retrato**: `orientation: "portrait"` definido no `app.config.ts`.
- **Tokens de design externos**: `@saravafy/design-tokens` hospedado como pacote privado no GitHub do mantenedor.
- **Desenvolvedor único**: Sem evidências de equipe — commit patterns e configs apontam para um único desenvolvedor (`yuriblanke`).

---

## 5. Personas e Casos de Uso

### Persona 1 — Membro do Terreiro

> Frequenta um terreiro, quer ouvir pontos do seu grupo e acessar letras durante ou fora das giras.

**Casos de uso:**
- Navegar pelo feed de pontos e ouvir áudios
- Buscar um ponto por título, letra ou tag
- Filtrar pontos do seu terreiro específico
- Salvar pontos em coleções pessoais
- Ver lista de membros do seu terreiro

---

### Persona 2 — Curimba

> Membro ativo do terreiro com responsabilidades na gira. Pode contribuir com pontos e editar conteúdo do terreiro.

**Casos de uso:**
- Todos os casos do Membro
- Submeter novos pontos (áudio + letra + metadados + consentimento)
- Sugerir correções em pontos existentes
- Gerenciar as coleções do terreiro

---

### Persona 3 — Administrador de Terreiro

> Responsável pela gestão da comunidade digital. Controla quem faz parte e em qual papel.

**Casos de uso:**
- Todos os casos do Curimba
- Criar e editar o perfil do terreiro (nome, sobre, endereço, Instagram, foto de capa)
- Convidar novos membros por e-mail com papel pré-definido
- Aceitar/rejeitar pedidos de associação
- Remover membros
- Gerenciar papéis (promover/despromover curimba/admin)
- Gerenciar coleções do terreiro

---

### Persona 4 — Curador

> Papel global (não restrito a um terreiro). Responsável pela qualidade do acervo de pontos do sistema.

**Casos de uso:**
- Revisar fila de submissões pendentes
- Aprovar ou rejeitar submissões (com ou sem áudio)
- Editar qualquer ponto no sistema
- Adicionar/remover tags de contexto ("tags de médium") por terreiro
- Acessar trilha de auditoria de pontos (`ponto_change_logs`)

---

## 6. Telas e Fluxos Principais

### Mapa de Telas

```
/ (root — providers globais)
│
├── (auth)/
│   └── login                       ← Tela de login (Google OAuth)
│
└── (app)/                          ← Rotas protegidas (requer sessão)
    │
    ├── (tabs)/
    │   ├── (pontos)/index           ← Feed principal de pontos [Tab 1]
    │   └── (terreiros)/index        ← Lista de terreiros        [Tab 2]
    │
    ├── player                       ← Player de áudio full-screen
    ├── preferences                  ← Configurações do usuário
    ├── terreiro-editor              ← Criar / Editar terreiro (modal)
    ├── terreiro-members             ← Gerenciar membros (modal)
    ├── terreiro-members-list        ← Visualizar membros (leitura)
    ├── access-manager               ← Controle de acesso
    ├── l/[tipo]/[id]                ← Deep links (resolver de rota)
    │
    └── review-submissions/
        ├── index                    ← Fila do curador
        └── [submissionId]           ← Detalhe da submissão
    │
    ├── (fullscreen)/
    │   └── collection/[id]          ← Visualizar coleção
    │
    └── (fullscreen-collection)/
        ├── collection/[id]          ← Editar coleção
        └── terreiro/[id]            ← Biblioteca do terreiro
```

---

### Fluxo 1 — Login

1. Usuário abre o app sem sessão → redirecionado para **Login**
2. Toca em "Entrar com Google"
3. Browser nativo abre fluxo OAuth do Supabase/Google
4. Redirect para `saravafy://auth/callback`
5. Sessão registrada no AsyncStorage
6. Usuário redirecionado para o **Feed de Pontos**

**Estados:**
- `idle`: botão disponível
- `loading`: indicador de carregamento após toque
- `error`: mensagem de erro OAuth (timeout de 12s, falha de rede)
- `success`: navegação automática para app

---

### Fluxo 2 — Feed de Pontos (Home)

1. Usuário vê lista de pontos paginada
2. Pode buscar por texto (título / letra / tags)
3. Pode filtrar pelo terreiro associado
4. Toca em um ponto → abre **Player**
5. Toca em "+" → abre modal de adição à coleção
6. FAB (se curimba/curator) → abre **PontoUpsertModal**

**Estados:**
- `loading`: esqueleto/spinner durante busca inicial
- `empty`: placeholder + call-to-action de submissão
- `error`: toast com mensagem de falha de rede
- `results`: lista de `SurfaceCard` com título + tags preview

---

### Fluxo 3 — Player de Áudio

1. Navegar para `player` com `pontoId` ou `collectionId`
2. App busca URL assinada de reprodução (Supabase Storage)
3. Áudio carrega no `react-native-track-player`
4. Letra exibida em sincronia com a reprodução
5. Usuário pode ajustar tamanho da fonte
6. Controles: play/pause, pular, voltar, fila de reprodução
7. Botão de compartilhar gera link profundo
8. Curador vê botão de editar (se curator mode ativo)

**Estados:**
- `loading`: buffering/seeking
- `playing`: controles ativos, animação
- `paused`: controles pausados
- `error`: URL expirada — precisa recarregar
- `ended`: próxima faixa automática (se coleção)

---

### Fluxo 4 — Submissão de Ponto

1. Usuário (curimba+) toca FAB no Feed
2. PontoUpsertModal abre:
   - Preenche: título, letra, tags
   - Seleciona arquivo de áudio (expo-document-picker)
   - Informa: nome do autor, consentimento do autor/intérprete
   - Aceita termos (versão registrada)
3. Toca "Enviar"
4. Upload assíncrono para Supabase Storage (URL assinada)
5. Função `ponto-audio-complete-upload` finaliza o upload
6. Submissão criada com `status: "pending"`
7. Toast: "Obrigado! Enviado para revisão."

**Estados:**
- `idle`: formulário em branco
- `uploading`: progresso de upload
- `success`: toast + modal fecha
- `error`: mensagem contextual (arquivo muito grande, rede, etc.)

---

### Fluxo 5 — Revisão de Curador

1. Curador acessa fila em `review-submissions/`
2. Vê lista de submissões pendentes (ordenado por data)
3. Toca em submissão → detalhe
4. Ouve áudio via URL pré-buscada (pré-carregamento)
5. Visualiza metadados (título, letra, tags, consentimentos)
6. Aprova ou rejeita
7. Ponto publicado no feed (se aprovado)

**Estados:**
- `loading`: pré-busca URL de áudio
- `reviewing`: áudio tocando, metadados visíveis
- `approved`/`rejected`: status atualizado, próxima submissão

---

### Fluxo 6 — Gestão de Terreiro

1. Admin acessa terreiro via aba Terreiros → ações
2. Editar perfil → **TerreiroEditor** (nome, sobre, localização, contato, capa)
3. Gerenciar membros → **TerreiroMembers**:
   - Ver lista de membros ativos com papéis
   - Convidar por e-mail (select de papel)
   - Aceitar/rejeitar pedidos pendentes
   - Remover membro
4. Controle de acesso → **AccessManager**

---

## 7. Requisitos de UI/UX

### Interações Globais

| Comportamento | Especificação |
|---------------|---------------|
| Temas | Light / Dark / Sistema — troca em tempo real sem restart |
| Haptic feedback | Feedback tátil em ações confirmativas |
| Toasts | Notificações temporárias no topo/base da tela via `ToastContext` |
| BottomSheets | Modais surgindo de baixo com gesture de dismiss (arrastar) |
| Swipe entre abas | Gesto horizontal para alternar entre Feed de Pontos e Terreiros |
| Deep links | `saravafy://` URL scheme resolve telas específicas (`l/ponto/[id]`, etc.) |
| Orientação | Apenas retrato (portrait locked) |

### Validação de Formulários

- **PontoUpsertModal**: título e letra obrigatórios; arquivo de áudio com limite de 50 MB; consentimento obrigatório
- **TerreiroEditor**: nome obrigatório; estado (UF) com seletor de lista; WhatsApp com máscara numérica; Instagram handle sem `@`
- **Convite de Membro**: e-mail com validação de formato; papel obrigatório

### Estados Visuais Padronizados

- **Loading**: `ActivityIndicator` centralizado ou overlay semi-transparente
- **Empty**: imagem placeholder + texto orientativo (ex: "Nenhum ponto encontrado")
- **Error**: toast vermelho com descrição do erro
- **Success**: toast verde + animação de fechamento do modal

### Acessibilidade

- `accessibilityLabel` presente em componentes críticos (parcial — não sistemático)
- Suporte a screen readers: incompleto, não verificado como prioridade atual
- Contraste de cores: gerenciado via design tokens (light/dark)

---

## 8. Referências Visuais

### Sistema de Design

O app usa o pacote proprietário `@saravafy/design-tokens` (GitHub: `yuriblanke/saravafy-design-tokens#v0.1.0`) como fonte única de verdade para tokens visuais.

### Paleta de Cores

| Token | Uso |
|-------|-----|
| `colors.textPrimaryOnLight / Dark` | Texto principal |
| `colors.textSecondaryOnLight / Dark` | Texto secundário / subtítulos |
| `colors.textMutedOnLight / Dark` | Texto inativo / placeholder |
| `colors.surfaceCardBgLight / Dark` | Fundo de cards |
| `colors.surfaceCardBorderLight / Dark` | Borda de cards |
| `colors.paper50–100` | Superfícies claras (light mode) |
| `colors.forest900` | Superfície escura (dark mode) |
| `colors.brass600` | Acento dourado (destaque, avisos) |

### Tipografia

- Fontes customizadas carregadas via `expo-font` no root layout
- Tamanho de fonte do player ajustável pelo usuário (preferência salva)

### Biblioteca de Componentes

- Não usa biblioteca externa (ex: NativeBase, UI Kitten, Tamagui)
- Componentes totalmente customizados sobre primitivos React Native
- Gradientes via `expo-linear-gradient` (fundos das telas — `SaravafyBackgroundLayers`)
- Ícones via `@expo/vector-icons` (Ionicons, FontAwesome, etc.)
- Componente de textura de fundo sobreposta ao gradiente

---

## 9. API e Camada de Dados

### Backend

**Provedor:** Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)

### Principais Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados do usuário (espelho de `auth.users`) |
| `terreiros` | Comunidades/grupos |
| `terreiro_contatos` | Endereço e contatos de cada terreiro |
| `terreiro_members` | Membros de terreiros com papéis (`admin`, `curimba`, `member`) |
| `terreiro_invites` | Convites pendentes enviados por e-mail |
| `terreiro_membership_requests` | Pedidos de associação enviados por usuários |
| `pontos` | Pontos do acervo (título, letra, tags, status) |
| `ponto_audios` | Arquivos de áudio com metadados e status de upload |
| `pontos_submissions` | Submissões aguardando revisão de curador |
| `collections` | Coleções de pontos (pessoal ou de terreiro) |
| `collections_pontos` | Junção: pontos dentro de coleções |
| `curators` | Papéis globais de curador |
| `terreiro_ponto_custom_tags` | Tags de contexto adicionadas por curadores por terreiro |
| `ponto_change_logs` | Trilha de auditoria de alterações em pontos |

### Segurança de Dados (RLS)

Todas as queries passam por Row-Level Security do Supabase:
- Usuários acessam apenas os dados a que têm direito (próprio perfil, membros de terreiros associados, coleções próprias)
- Políticas de admin/curimba/curador separadas por tabela

### Edge Functions (Deno)

| Função | Responsabilidade |
|--------|-----------------|
| `ponto-audio-init` | Gera URL assinada de upload para Supabase Storage |
| `ponto-audio-complete-upload` | Valida upload, finaliza `ponto_audios`, cria submissão; também gera URLs de reprodução |

### Caching (React Query)

- Todas as queries server-side gerenciadas por TanStack React Query v5
- Chaves de cache centralizadas em `src/queries/queryKeys.ts`
- Invalidação de cache acionada após mutações relevantes
- Dados de terreiro sincronizados em tempo real via Supabase Realtime

### Endpoints / Operações Principais

| Operação | Método | Detalhes |
|----------|--------|---------|
| Login | OAuth | Google via Supabase Auth |
| Feed de Pontos | SELECT | `pontos` filtrado por status ativo + não restrito |
| Busca de Pontos | SELECT ILIKE | Título, letra e tags |
| Upload de Áudio | POST → PUT | Via URL assinada (Supabase Storage) |
| Completar Upload | POST (Edge Function) | `ponto-audio-complete-upload` |
| Criar Submissão | INSERT | `pontos_submissions` |
| Fila de Revisão | SELECT | `pontos_submissions` (status = pending) |
| URL de Reprodução | POST (Edge Function) | Retorna URL assinada válida por ~15 min |
| Criar/Editar Terreiro | INSERT/UPDATE | `terreiros` + `terreiro_contatos` |
| Convidar Membro | INSERT | `terreiro_invites` |
| Gerenciar Membros | SELECT/UPDATE/DELETE | `terreiro_members` |
| Criar Coleção | INSERT | `collections` |
| Adicionar Ponto à Coleção | INSERT | `collections_pontos` |

---

## 10. Escopo

### Em Escopo *(presente no código)*

- Autenticação via Google OAuth
- Feed de pontos com busca e filtro por terreiro
- Player de áudio com letras e controles de fila
- Submissão de pontos novos (áudio + metadados + consentimento)
- Submissão de correções em pontos existentes
- Fila de revisão de curador com aprovação/rejeição
- Coleções de pontos (pessoal e de terreiro)
- Reordenação de pontos em coleções (drag-and-drop)
- Criação e edição de terreiros (perfil, localização, contato, foto de capa)
- Gestão de membros (convite, aceite, remoção, papéis)
- Pedidos de associação (usuário solicita; admin aceita/rejeita)
- Sistema de papéis: global (curador) e por terreiro (admin, curimba, membro)
- Tags de contexto por terreiro para pontos (médium tags — curador)
- Trilha de auditoria de alterações em pontos
- Tema light/dark/sistema com troca em tempo real
- Preferências do usuário persistidas localmente
- Deep links para pontos, terreiros e coleções
- RLS (Row-Level Security) em todas as queries
- Política de privacidade in-app (markdown)
- Builds separados: dev / preview / production (EAS)

### Fora do Escopo *(ausente ou incompleto)*

- Suporte offline (sem cache local de áudio ou banco SQLite)
- Push notifications (sem integração com serviço de push)
- Gravação de áudio diretamente no app (somente upload de arquivo)
- Múltiplos idiomas / internacionalização (UI 100% em português)
- Analytics e telemetria de uso
- Monetização ou camadas premium
- Versão web do produto
- Apple Sign-In ou login por e-mail/senha
- Busca avançada (facetada, relevância, fonética)
- Operações em lote (edição/exclusão em massa)
- Resolução de conflitos de sincronização
- Undo/redo em ações de curador

---

## 11. Dependências e Riscos

### Dependências Externas

| Dependência | Criticidade | Risco |
|-------------|-------------|-------|
| **Supabase** | Alta — todo o backend | Vendor lock-in; outage afeta 100% do produto |
| **Google OAuth** | Alta — único método de login | Mudança de política do Google bloqueia todos os usuários |
| **Expo + EAS** | Alta — build e distribuição | Mudanças de SDK exigem atualizações de app |
| **@saravafy/design-tokens** | Média — visual system | Pacote privado no GitHub do dev — risco de disponibilidade |
| **react-native-track-player** | Média — player de áudio | Patch customizado aplicado (`patches/`) — pode quebrar em upgrades |
| **Supabase Storage** | Alta — arquivos de áudio | Sem CDN externo — latência pode variar; custos de storage escalam com tamanho de acervo |

### Riscos Arquiteturais

| Risco | Descrição | Impacto |
|-------|-----------|---------|
| **URLs assinadas expiram em ~15 min** | Áudio pode parar se app ficou em background | Experiência de reprodução interrompida |
| **Sem paginação real** | Queries usam `.limit()` sem "load more" | Feed pode truncar silenciosamente com muitos pontos |
| **Falha parcial no upload** | Se upload OK mas `complete-upload` falha, estado fica inconsistente | Áudios "órfãos" no Storage sem submissão associada |
| **Curador único ponto de falha** | Nenhum fluxo de escalonamento ou aprovações distribuídas | Fila pode travar se curador ficar inativo |
| **AsyncStorage para sessão** | Tokens de sessão em storage não criptografado no Android | Risco de segurança em dispositivos com root |
| **Dependência de desenvolvedor único** | Um único owner para código, tokens, infra | Risco de continuidade do projeto |

### Variáveis de Ambiente

O projeto consome variáveis de ambiente via `app.config.ts` no momento do build (EAS):

- `EXPO_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Chave pública de acesso
- Outras potencialmente definidas em profiles de EAS (`eas.json`)

---

## 12. Questões em Aberto

| # | Questão | Área | Prioridade |
|---|---------|------|------------|
| 1 | Qual é o critério de aprovação de pontos pelo curador? Existe rubrica documentada? | Produto / Curador | Alta |
| 2 | Como usuários que não têm conta Google devem acessar o app? Login por e-mail está previsto? | Auth | Alta |
| 3 | O que acontece com o áudio no Storage se o curador rejeita uma submissão? É deletado automaticamente? | Backend | Alta |
| 4 | URLs de reprodução expiram em ~15 min. Qual é a estratégia para sessões longas de escuta? | Produto / Backend | Alta |
| 5 | Existe limite de tamanho de acervo por terreiro ou por usuário? | Backend | Média |
| 6 | O campo `member_kind` (corrente/assistência) está sendo deprecated? Deve ser removido do schema? | Dados | Média |
| 7 | Pontos com `restricted: true` ainda aparecem para algum grupo de usuários? A lógica de restrição está completa? | Produto | Média |
| 8 | Qual é o modelo de convite para usuários que ainda não têm conta Saravafy? O fluxo de on-boarding existe? | UX | Média |
| 9 | Há planos para suporte a iOS? A configuração atual compila para iOS (não foi verificada distribuição via App Store)? | Plataforma | Média |
| 10 | O ponto pode ter múltiplos áudios (versões)? A estrutura atual suporta, mas a UI não expõe essa opção. | Produto | Baixa |
| 11 | Existe intenção de adicionar métricas de uso (analytics)? Qual serviço seria utilizado? | Produto | Baixa |
| 12 | Push notifications para convites e aprovações estão planejadas? Qual seria o provedor (FCM/APNs via Expo)? | Produto | Baixa |
| 13 | O curador pode editar pontos antes de aprovar uma submissão, ou apenas aprovar/rejeitar "como está"? | Produto / UX | Baixa |
| 14 | Existe estratégia de backup dos áudios armazenados no Supabase Storage? | Infra | Baixa |
