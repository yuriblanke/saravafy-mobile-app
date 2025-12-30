\# Fluxo — Convites e níveis de acesso (Admin / Editora / Membro)

Este documento descreve **exatamente o que está implementado hoje** no app Saravafy para:

- Enviar convites para um terreiro com nível **Admin**, **Editora** ou **Membro**
- Cancelar convites enviados
- Aceitar ou recusar convites (lado de quem foi convidado)
- O que muda no app **depois do aceite** (permissões e acesso a conteúdo)

\> Fonte principal da implementação:
\>
\> - Tela “Gerenciar acesso” (gestão/membros/convites): [src/screens/AccessManager/AccessManager.tsx](src/screens/AccessManager/AccessManager.tsx)
\> - Modal “Convidar gestão / Convidar membro” (nível de acesso): [src/screens/AccessManager/InviteModal.tsx](src/screens/AccessManager/InviteModal.tsx)
\> - Linha (badge) de role com tooltip (i): [src/screens/AccessManager/InviteRow.tsx](src/screens/AccessManager/InviteRow.tsx)
\> - Gate global de convites (banner + overlay bloqueante): [src/components/InviteGate.tsx](src/components/InviteGate.tsx)
\> - Gatilho do gate após boot: [app/\_layout.tsx](app/_layout.tsx)
\> - Exemplo de conteúdo “só para membros” (coleção `visibility = 'members'`): [src/screens/Collection/Collection.tsx](src/screens/Collection/Collection.tsx)

---

## Conceitos e papéis

### Papéis existentes

- `admin` / **Admin**
- `editor` / **Editora**
- `member` / **Membro**

Existe também `follower` no app, mas ele **não faz parte do fluxo de convites** descrito aqui.

### Níveis de acesso (texto do app)

Os textos abaixo são os mesmos exibidos no app (tooltip “i” em “Nível de acesso”).

#### ADMIN — Administração

**Pode:**

- Convidar pessoas como Admin, Editora ou Membro
- Criar, editar e organizar coleções
- Criar e editar tags customizadas (usadas para adicionar o médium que traz a entidade)
- Definir se o terreiro é público ou privado

#### EDITOR — Edição

**Pode:**

- Criar, editar e organizar coleções
- Criar e editar tags customizadas (usadas para adicionar o médium que traz a entidade)

**Não pode:**

- Convidar pessoas
- Alterar a visibilidade do terreiro

#### MEMBRO

**São:**

- Pessoas da corrente
- Pessoas da assistência
- Visitantes do terreiro

**Pode:**

- Acessar os pontos do terreiro

---

## Tabelas / entidades usadas pelo fluxo

### 1) `terreiro_invites`

- Usada para criar convites (Admin) e para listar convites pendentes (lado do convidado).
- Campos usados pelo app (principais):
  - `id`
  - `terreiro_id`
  - `email`
  - `role` (`admin` | `editor` | `member`)
  - `status` (`pending`, `accepted`, `rejected`)
  - `created_at`
  - `activated_at`
  - `activated_by`
  - `created_by`

### 2) `terreiro_members`

- Usada para conceder acesso após o aceite do convite.
- Campos usados (principais):
  - `terreiro_id`
  - `user_id`
  - `role` (`admin` | `editor` | `member` | `follower` dependendo do contexto)
  - `status` (quando disponível no banco; o app trata `active` / `pending`)

### Restrições de segurança (RLS)

Este fluxo roda sob **RLS estrito**.

- A pessoa convidada consegue apenas **ler** seus convites.
- Para **aceitar/recusar**, o app chama RPCs `SECURITY DEFINER` no backend.

---

## Fluxo A — Enviar convite (lado do Admin)

### Entry point / onde fica

- A gestão de acesso fica na tela **Gerenciar acesso** (AccessManager).

### Seções

Dentro da tela, existem três blocos principais:

- **Gestão** (Admin/Editora)
- **Membros**
- **Convites enviados** (pendentes)

### Modal de convite

Ao convidar, o app abre um BottomSheet (`InviteModal`) em um dos modos:

- **Convidar gestão**: permite escolher **Admin** ou **Editora**
- **Convidar membro**: nível de acesso fica fixo em **Membro**

O campo “Nível de acesso” tem um ícone “i” que mostra a explicação do papel.

### Validações principais

- O e-mail é normalizado com `trim()` + `toLowerCase()`.
- O app evita convites duplicados pendentes para o mesmo e-mail.

### Persistência

Em sucesso, o app faz `insert` em `terreiro_invites` com:

- `terreiro_id`
- `email`
- `role` (`admin` | `editor` | `member`)
- `status = 'pending'`
- `created_by = auth.uid()`

---

## Fluxo B — Cancelar convite (lado do Admin)

- Em “Convites enviados”, cada convite pendente tem um menu de ações.
- A ação **Cancelar convite** remove o registro via `delete` em `terreiro_invites`.

---

## Fluxo C — Receber convite e aceitar/recusar (lado do Convidado)

### Onde o convite aparece

O `InviteGate` é montado globalmente em [app/\_layout.tsx](app/_layout.tsx) **após o boot do app** (`bootComplete`).

Na prática:

- O conteúdo principal (`<Slot />`) renderiza primeiro.
- Se existirem convites pendentes, o gate renderiza por cima como um **overlay bloqueante**.

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

- Ao iniciar (ou quando o usuário loga), o app faz refresh e abre o overlay se houver pendências.

**2) Foreground refresh**

- Ao voltar do background para active, refaz refresh e pode abrir o overlay.

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

> Na implementação atual, isso é um **overlay** (não um `Modal` do React Native), mas o comportamento para o usuário é de “modal bloqueante”.

- Título fixo: “Você foi convidada para colaborar em um terreiro”
- Corpo fixo:
  - “Você recebeu um convite para ajudar a cuidar dos pontos de um terreiro no Saravafy.\nEscolha agora se deseja participar.”
- Botões:
  - Primário: “Aceitar convite”
  - Secundário: “Recusar convite”
- Enquanto processa:
  - desabilita botões
- Android (botão voltar):
  - enquanto o overlay estiver visível, o botão de voltar é bloqueado (BackHandler intercepta)
- Backdrop:
  - bloqueia interações com a tela por baixo
  - **não fecha** ao tocar no fundo (sem dismiss)

### Ação: “Aceitar convite”

**Passo 1 — Aceitar via RPC (backend)**

- O app chama:

  - `await supabase.rpc('accept_terreiro_invite', { invite_id })`

- A RPC valida auth + email do JWT, trava o invite (`SELECT ... FOR UPDATE`), atualiza:
  - `status = 'accepted'`
  - `activated_at = now()`
  - `activated_by = auth.uid()`
- E faz upsert em `terreiro_members` (PK composta) para conceder o acesso.
  - Se a coluna `status` existir, grava `status = 'active'`.

**Resultado UX**

- Toast: “Convite aceito.”
- Refresh da fila; se houver mais convites, avança para o próximo; senão fecha o modal.

### Ação: “Recusar convite”

**Via RPC (backend)**

- O app chama:

  - `await supabase.rpc('reject_terreiro_invite', { invite_id })`

- A RPC valida auth + email do JWT, trava o invite (`SELECT ... FOR UPDATE`) e atualiza:
  - `status = 'rejected'`
  - `activated_at = now()`
  - `activated_by = auth.uid()`

**Resultado UX**

- Toast: “Convite recusado.”
- Refresh da fila; avança ou fecha.

### Tratamento de erro e “modo degradado”

- Se o Supabase retornar erro de **recursão infinita de RLS** ao consultar convites pendentes:

  - o gate entra em “fail open” (não bloqueia o usuário)
  - interrompe novas tentativas automáticas para não martelar o backend
  - mostra um toast único: “Convites indisponíveis no momento. Tente novamente mais tarde.”

- Em falhas genéricas de rede/servidor:
  - mostra mensagem no modal: “Não foi possível concluir agora. Verifique sua conexão e tente novamente.”
  - mantém o modal aberto para tentar de novo.

---

## Conteúdo privado / “members only” (estado atual)

Hoje, a restrição de acesso no app aparece de forma prática no conteúdo de **coleções**:

- `collections.visibility = 'members'` exige que o usuário seja **membro ativo** do terreiro para carregar os pontos.
- Se a pessoa não for membro, o app mostra um fluxo de **pedido de acesso** e bloqueia o conteúdo.

Na prática, isso é o que o produto trata como “conteúdo do terreiro privado” (a permissão vem de `terreiro_members`).

---

## Seed manual (para testar)

1. Criar um terreiro e um admin (precisa existir um admin em `terreiro_members`).
2. Criar um convite `pending` em `terreiro_invites`:

- `terreiro_id`: do terreiro
- `email`: do usuário convidado (normalizado por trigger)
- `role`: `admin` | `editor` | `member`
- `status`: `pending`
- `created_by`: user_id do admin

3. Logar no app com o usuário convidado:

- A Home renderiza (bootComplete), e o InviteGate aparece por cima exigindo aceitar/recusar.

---

## O que muda no app depois de aceitar (efeitos do role)

> Observação: o aceite grava `terreiro_members`. A partir daí, o app precisa **buscar** essa relação em algum momento para refletir o acesso em UI.

### 1) O role entra na lista “Meus terreiros” (navegação por rota)

- A UI de preferências lista terreiros onde o usuário é **Admin** (membership ativa quando existe coluna `status`).
- Ao tocar em um terreiro, o app navega para a rota `/terreiro` com `terreiroId`/`terreiroTitle`: [src/components/AppHeaderWithPreferences.tsx](src/components/AppHeaderWithPreferences.tsx)

Isso impacta diretamente permissões na tela do terreiro.

### 2) No “Terreiro” (coleções), `canEdit` depende do role da membership

Na tela do terreiro:

- A tela resolve `terreiroId` por params de rota.
- A permissão de edição é derivada de `useTerreiroMembershipStatus(terreiroId)`.
- `canEdit = isActiveMember && (role === "admin" || role === "editor")`.

Quando `canEdit` é falso, a tela:

- cancela automaticamente edição/criação em andamento
- não abre actions de coleção
- não permite operações de escrita (criar/editar/excluir coleções) por UI

Fonte: [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx)

### 3) Diferenciação Admin vs Editora vs Membro

- **Admin**: gerencia pessoas (convida/remove) e também cria/edita conteúdo.
- **Editora**: cria/edita conteúdo, mas não gerencia pessoas.
- **Membro**: acessa os pontos do terreiro (inclui corrente/assistência/visitantes).

---

## Estados, mensagens e cópias (inventário rápido)

### Admin (AccessManager)

- “Salve o terreiro para poder convidar pessoas.”
-- “Convites enviados” / “Nenhum convite pendente.”
-- “Convidar gestão” / “Convidar membro”
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
  - “Convite aceito.”
  - “Convite recusado.”

---

## Observações técnicas que afetam o produto

- O convite é por **email** (não por `user_id`). O usuário precisa estar logado com o mesmo e-mail convidado.
- O modal não abre automaticamente na chegada realtime; abre via banner CTA ou no próximo foreground refresh.
- Se as policies de RLS em `terreiro_members` estiverem em recursão, o fluxo pode ficar indisponível; o app tenta “falhar aberto” (não travar UX).
