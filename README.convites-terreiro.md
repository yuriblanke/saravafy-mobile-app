# Fluxo — Convidar alguém para ser Admin/Editor de um Terreiro

Este documento descreve **exatamente o que está implementado hoje** no app Saravafy para:

- Convidar alguém para colaborar em um terreiro como **Admin** ou **Editor**
- Compartilhar o convite (WhatsApp/Instagram/cópia)
- Aceitar ou recusar o convite (lado de quem foi convidado)
- O que muda no app **depois do aceite** (gates e permissões de UI)

> Fonte da implementação:
>
> - Tela de edição/admin do terreiro: [src/screens/TerreiroEditor/TerreiroEditor.tsx](src/screens/TerreiroEditor/TerreiroEditor.tsx)
> - Gate global de convites (banner + modal): [src/components/InviteGate.tsx](src/components/InviteGate.tsx)
> - Montagem global do gate: [app/\_layout.tsx](app/_layout.tsx)
> - Uso do role no contexto do terreiro: [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx)
> - Fonte de “terreiros que administro” (switch de contexto): [contexts/PreferencesContext.tsx](contexts/PreferencesContext.tsx)

---

## Conceitos e papéis

### Papéis existentes

- `admin`: pode editar dados do terreiro e gerenciar pessoas/permissões
- `editor`: pode colaborar com coleções/pontos, mas **não** gerencia pessoas/permissões
- `follower`: papel usado no app para consumo/seguimento (não entra no fluxo de convite)

No contexto de preferências, o tipo é `TerreiroRole = "admin" | "editor" | "follower"`: [contexts/PreferencesContext.tsx](contexts/PreferencesContext.tsx)

### Tabelas / entidades usadas pelo fluxo

**1) `terreiro_invites`**

- Usada para criar convites (lado do admin) e para listar convites pendentes (lado do convidado).
- Campos lidos/escritos pelo app:
  - `id` (string)
  - `terreiro_id` (string)
  - `email` (string)
  - `role` ("admin" | "editor")
  - `status` (string; o app usa: `pending`, `accepted`, `rejected`)
  - `created_at` (string | null)
  - `created_by` (string; setado no insert)

**2) `terreiro_members`**

- Usada para conceder acesso após o aceite do convite.
- Campos lidos/escritos:
  - `terreiro_id` (string)
  - `user_id` (string)
  - `role` ("admin" | "editor" | "follower" dependendo do contexto)
  - `created_at` (string | null)
  - `status` pode existir no banco e é usado como filtro quando disponível.

**3) `profiles`**

- Usada apenas para:
  - Exibir nome/avatar de membros
  - Checar duplicidade de convite por e-mail (se o membro já tem acesso)
- Campos usados: `id`, `full_name`, `avatar_url`, `email`

---

## Fluxo A — Convidar alguém (lado do Admin)

### Entry point / onde fica

- O fluxo de convite fica dentro da tela **Editar terreiro** (TerreiroEditor), na seção de administração (membros + convites).

### Pré-condições

- O convite só está disponível quando o terreiro já existe (**modo edit**):

  - `isEdit` precisa ser `true`.
  - UI exibe aviso quando ainda não salvou: “Salve o terreiro para poder convidar pessoas.”

- Apenas **Admin** pode ver e usar o bloco de convites:
  - Admin é definido como: usuário é `created_by` do terreiro **OU** seu `terreiro_members.role` é `admin`.
  - Editors não têm acesso ao convite.

### Seções envolvidas

**1) “Pessoas com acesso”**

- Lista `members` (`terreiro_members`) com nome/avatar (de `profiles`) e o papel (`Admin`/`Editor`).

**2) “Convites pendentes” (somente Admin)**

- Lista convites em `terreiro_invites` com `status = "pending"`.
- Para cada convite:
  - mostra `email`
  - mostra `role` (renderizado via `roleLabel`)
  - botão “Compartilhar”

**3) CTA “Convidar pessoas da curimba”**

- Abre um formulário inline para criar um novo convite.

### Formulário: campos e validações

**Campo 1 — E-mail**

- Input de texto (keyboard email).
- Normalização: `trim()` + `toLowerCase()`.
- Validação de formato:
  - sem espaços
  - regex simples `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Mensagens de erro:
  - “Informe um e-mail válido.”

**Campo 2 — Papel**

- Select que abre um modal.
- Valores possíveis:
  - `admin`
  - `editor`
- Default do formulário: `editor`.

### Modal: selecionar papel

- Modal `SelectModal` (título: “Papel”) com duas opções:
  - “Admin” → value `admin`
  - “Editor” → value `editor`

### Regras de bloqueio antes do envio

Antes de criar o convite, a tela valida:

- Não permitir convite duplicado pendente:

  - se já existe `terreiro_invites` com o mesmo `email` e `status === "pending"`
  - erro: “Este e-mail já tem um convite pendente.”

- Não permitir convidar quem já tem acesso:
  - se o email do membro (via `profilesById[user_id].email`) bater com o email digitado
  - erro: “Esta pessoa já tem acesso ao terreiro.”

### Ação: “Enviar convite” (persistência)

- Insert em `terreiro_invites` com payload:
  - `terreiro_id`: id do terreiro
  - `email`: email normalizado
  - `role`: papel escolhido (`admin` | `editor`)
  - `created_by`: id do usuário atual
  - `status`: `pending`

**Em sucesso:**

- limpa e-mail
- fecha o formulário
- recarrega a seção admin (members + convites)

**Em erro:**

- abre um `Alert` com título “Erro” e a mensagem do backend (quando disponível).

---

## Fluxo B — Compartilhar convite (lado do Admin)

### Entry point

- Botão “Compartilhar” em um convite pendente.

### BottomSheet: opções de compartilhamento

Abre um `BottomSheet` com as ações (nesta ordem):

1. “Copiar mensagem”
2. “Mais opções…”

### Mensagem de convite (conteúdo do produto)

A mensagem é gerada por `buildInviteShareMessage(invite)` e inclui:

- Nome do terreiro
- Aviso de que não está oficialmente na Play Store
- Link de instalação: `APP_INSTALL_URL`
- Passo explícito: “Entre com o e-mail <emailConvidado>”
- Explicação: “Assim que entrar, o convite vai aparecer para você aceitar ou recusar.”

### Comportamento por opção

**1) Copiar mensagem**

- Copia para o clipboard.
- Toast “Mensagem copiada.” (ou equivalente)
- Fecha o sheet.

**2) Mais opções…**

- Abre o share nativo (`Share.share({ message })`)
- Fecha o sheet.

---

## Fluxo C — Receber convite e aceitar/recusar (lado do Convidado)

### Onde o convite aparece

O `InviteGate` é montado globalmente em [app/\_layout.tsx](app/_layout.tsx), então o usuário pode receber o convite em qualquer tela.

### Regra de elegibilidade

Para o gate funcionar, precisa existir:

- `user.id`
- `user.email` (normalizado para lowercase/trim)

A query de convites pendentes é:

- tabela: `terreiro_invites`
- filtros:
  - `status = "pending"`
  - `email = <user.email normalizado>`
- ordenação: `created_at` asc

### Canais de “notificação”

**1) Startup refresh**

- Ao iniciar (ou quando o usuário loga), o app faz refresh e abre o modal se houver pendências.

**2) Foreground refresh**

- Ao voltar do background para active, refaz refresh e pode abrir o modal.

**3) Realtime**

- Inscreve em `postgres_changes` para INSERT em `terreiro_invites`.
- Quando chega um convite do email do usuário:
  - se o app está “active”, mostra **um banner** (não abre modal automaticamente para não interromper)
  - mantém a fila local atualizada

### UI 1: Banner

- Texto: “Você recebeu um convite para colaborar em um terreiro”
- Botão: “Ver convite”
- Ao tocar:
  - prioriza o invite recém-chegado (se houver)
  - abre o gate (modal)

### UI 2: Modal do convite

- Título fixo: “Você foi convidada para colaborar em um terreiro”
- Corpo fixo:
  - “Você recebeu um convite para ajudar a cuidar dos pontos de um terreiro no Saravafy.\nEscolha agora se deseja participar.”
- Botões:
  - Primário: “Aceitar convite”
  - Secundário: “Recusar convite”
- Enquanto processa:
  - desabilita botões
  - bloqueia botão de voltar do Android (BackHandler intercepta)

### Ação: “Aceitar convite”

**Passo 1 — Aceitar via RPC (backend)**

- Chama a função RPC `accept_terreiro_invite(invite_id)` no Supabase.
- A RPC valida que o convite pertence ao e-mail do usuário autenticado e, em seguida:
  - marca `terreiro_invites.status = "accepted"`
  - cria/atualiza a linha em `terreiro_members` para o `auth.uid()` com o `role` do convite

> Motivo: com RLS estrito, o usuário convidado não pode inserir direto em `terreiro_members`.

**Resultado UX**

- Toast: “Convite aceito. Você já pode colaborar.”
- Refresh da fila; se houver mais convites, avança para o próximo; senão fecha o modal.

### Ação: “Recusar convite”

- Update `terreiro_invites`:
  - `status = "rejected"`
  - filtro: `id = <invite.id>`

**Resultado UX**

- Toast: “Convite recusado.”
- Refresh da fila; avança ou fecha.

### Tratamento de erro e “modo degradado”

- Se o Supabase retornar erro de **recursão infinita de RLS** em `terreiro_members`, o gate:

  - desliga o fluxo (não bloqueia o usuário)
  - em DEV, mostra toast informando que as policies precisam ser ajustadas

- Em falhas genéricas de rede/servidor:
  - mostra mensagem no modal: “Não foi possível concluir agora. Verifique sua conexão e tente novamente.”
  - mantém o modal aberto para tentar de novo.

---

## O que muda no app depois de aceitar (efeitos do role)

> Observação: o aceite grava `terreiro_members`. A partir daí, o app precisa **buscar** essa relação em algum momento para refletir o acesso em UI.

### 1) O role entra na lista “Terreiros que administro” (switch de contexto)

- A UI de preferências lista terreiros onde o usuário tem `terreiro_members.role in (admin, editor)`.
- A query tenta filtrar também `status = active` quando o campo existe.
- Ao trocar o contexto para um terreiro, o app seta `activeContext` com `role`: [src/components/AppHeaderWithPreferences.tsx](src/components/AppHeaderWithPreferences.tsx)

Isso impacta diretamente permissões na tela do terreiro.

### 2) No “Terreiro” (coleções), `canEdit` depende do role do contexto ativo

Na tela do terreiro:

- `activeTerreiroRole` vem de `activeContext.role`.
- `canEdit = (role === "admin" || role === "editor")`.

Quando `canEdit` é falso, a tela:

- cancela automaticamente edição/criação em andamento
- não abre actions de coleção
- não permite operações de escrita (criar/editar/excluir coleções) por UI

Fonte: [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx)

### 3) Diferenciação Admin vs Editor

No app (neste fluxo), a distinção prática é:

- **Admin**: consegue convidar pessoas (apenas no editor do terreiro) e tem permissões descritas no sheet “Papéis no terreiro”.
- **Editor**: consegue colaborar com coleções/pontos, mas não gerencia pessoas/permissões.

A tela `TerreiroEditor` também tem um BottomSheet informativo “Papéis no terreiro” com essas regras de produto (texto fixo):

- Admin: “Alterar todos os dados do terreiro”, “Convidar e remover pessoas”, “Definir quem pode colaborar”
- Editor: “Criar e editar coleções”, “Organizar e adicionar pontos”; não pode “Alterar dados do terreiro” nem “Gerenciar pessoas ou permissões”.

---

## Estados, mensagens e cópias (inventário rápido)

### Admin (TerreiroEditor)

- “Salve o terreiro para poder convidar pessoas.”
- “Convites pendentes” / “Nenhum convite pendente.”
- “Convidar pessoas da curimba”
- Erros inline:
  - “Informe um e-mail válido.”
  - “Este e-mail já tem um convite pendente.”
  - “Esta pessoa já tem acesso ao terreiro.”

### Convidado (InviteGate)

- Banner: “Você recebeu um convite para colaborar em um terreiro”
- CTA banner: “Ver convite”
- Título modal: “Você foi convidada para colaborar em um terreiro”
- Corpo modal: “Você recebeu um convite para ajudar a cuidar dos pontos de um terreiro no Saravafy.\nEscolha agora se deseja participar.”
- Botões:
  - “Aceitar convite”
  - “Recusar convite”
- Toasts:
  - “Convite aceito. Você já pode colaborar.”
  - “Convite recusado.”

---

## Observações técnicas que afetam o produto

- O convite é por **email** (não por user_id). O usuário precisa estar logado com o mesmo email convidado.
- O modal não abre automaticamente na chegada realtime; abre via banner CTA ou no próximo foreground refresh.
- Se as policies de RLS em `terreiro_members` estiverem em recursão, o fluxo pode ficar indisponível; o app tenta “falhar aberto” (não travar UX).
