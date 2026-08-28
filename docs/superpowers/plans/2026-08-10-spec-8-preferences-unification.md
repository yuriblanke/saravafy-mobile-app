# Spec 8 — Uma implementação só de Preferências: Implementation Plan

**Spec:** [`2026-08-10-spec-8-preferences-unification.md`](../specs/2026-08-10-spec-8-preferences-unification.md)
**Status:** escrito, não executado. **Bloqueado por duas coisas:** a Spec 7 precisa ter caído, e a
pergunta 1 da spec (rota ou overlay?) precisa de resposta do usuário.

Ambiente: `C:\saravafy\saravafy-mobile-app`, Windows, PowerShell ou Git Bash.
Portão em toda task: `npx tsc --noEmit` sem saída, `npm test` com **zero falhas**.

---

## Task 1: Inventário — a task que decide se a fusão é segura

**Só leitura.** É o passo que impede a fusão de perder função em silêncio, e o `D12` já provou que
o overlay tem sites que a rota não tem.

1. Ler por inteiro `src/screens/Preferences/Preferences.tsx`, `components/ProfileSection.tsx`,
   `components/LogoutSection.tsx`, e a região de Preferências de `TabsHeaderWithPreferences.tsx`.
2. Montar **uma tabela** no plano, uma linha por função visível ao usuário, com três colunas:
   *função | existe na rota? | existe no overlay?*
3. Marcar explicitamente cada linha que existe em **um só** lado — são elas que a fusão pode perder.
4. Anotar as **entradas** de navegação para cada uma (quem abre o quê, de onde).

> **Portão.** Se a tabela mostrar divergência de comportamento (não só de presença) — a mesma ação
> fazendo coisas diferentes nos dois lados — **pare e pergunte** qual é a correta. Escolher sozinho
> aqui é decidir produto.

- [x] Task 1 concluída (2026-08-28, Task 10 da `2026-08-28-spec-10-safe-band-remainder`). **Portão
      acionado** — ver §1.4 abaixo. Sem commit (agente rodou em faixa read-only; controlador
      commita).

### 1.1 Achado central: o overlay está inalcançável hoje

Antes da tabela, o fato que muda a natureza da decisão do §5 da spec: **nada no código hoje chama
`openPreferences()`.**

- `openPreferences` é definida em `src/contexts/PreferencesOverlayContext.tsx:27-29`, mas um grep no
  repo inteiro por `openPreferences(` só acha essa definição — nenhuma chamada, em nenhum arquivo.
- `TabsHeaderWithPreferences.tsx:638` desestrutura `const { isOpen, closePreferences } =
  usePreferencesOverlay();` — **não importa `openPreferences`**.
- O único gatilho visível no header, o avatar (`TabsHeaderWithPreferences.tsx:496-562`), faz
  `router.push("/preferences" as any)` (linha 560) — empurra a **rota**, não abre o overlay.
- Logo `isOpen` fica permanentemente `false`, e `PreferencesModal.tsx:34-35` (`<Modal visible={isOpen
  && !shouldHideForRoute}>`) nunca fica visível.

`PreferencesOverlaySheets` está montado (via `GlobalOverlaysHost` → `PreferencesModal`, `app/_layout.tsx:157`)
e continua recebendo manutenção (guard do `D12`, `e85875b`), mas **nenhuma ação do usuário abre essa
UI hoje**. Isso não estava documentado em `docs/architecture/preferences.md:46,51`, que descreve o
avatar/sino do header como gatilho do overlay — essa descrição está desatualizada em relação ao
código lido agora.

### 1.2 Tabela de inventário

Uma linha por função visível ao usuário. `✅` = existe; `❌` = não existe; `⚠️` = existe nos dois mas
com comportamento ou conteúdo diferente (detalhado em §1.4).

| Função | Rota (`Preferences.tsx` + componentes) | Overlay (`PreferencesOverlaySheets`) |
|---|---|---|
| Avatar/foto do usuário | ✅ `ProfileSection.tsx:119-137` | ✅ `TabsHeaderWithPreferences.tsx:1527` |
| Nome de exibição | ✅ `ProfileSection.tsx:141-146` | ✅ `TabsHeaderWithPreferences.tsx:1478` |
| E-mail exibido | ✅ `ProfileSection.tsx:148-155` | ❌ nenhuma prop de e-mail no `PreferencesPageItem` do perfil (`1476-1531`) |
| Estado "deslogado": mensagem + botão Entrar **dentro** da tela | ✅ `ProfileSection.tsx:68-104` | ❌ `TabsHeaderWithPreferences.tsx:1475` — `{!userId ? null : (…)}`, nada é renderizado |
| Toggle "Modo Guardião" (curator mode) | ✅ `ProfileSection.tsx:180-191`, com texto descritivo | ⚠️ `TabsHeaderWithPreferences.tsx:1498-1522`, inline, sem texto descritivo |
| Ícone "ⓘ" explicando o Modo Guardião (`AccessRoleInfo`) | ❌ | ✅ `TabsHeaderWithPreferences.tsx:1507-1510` |
| Badge "Pessoa Guardiã do Acervo" | ✅ `ProfileSection.tsx:161-167` | ✅ `TabsHeaderWithPreferences.tsx:1501-1506` |
| Badge "Dev Master" | ✅ `ProfileSection.tsx:169-175` | ❌ `isDevMaster` só controla a linha "Administrar guardiões" (`1534`), nunca vira badge |
| Linha "Revisar envios" → `/review-submissions` | ✅ `ProfileSection.tsx:193-224` | ✅ `TabsHeaderWithPreferences.tsx:1559-1584` |
| Botão de editar perfil (lápis) | ❌ | ⚠️ `TabsHeaderWithPreferences.tsx:1481-1494` abre um bottom sheet **vazio** (`2259-2266`, comentário "placeholder silencioso" — stub sem função) |
| "Administrar guardiões" (criar/listar/cancelar convite de curador) | ❌ | ✅ `TabsHeaderWithPreferences.tsx:1534-1557` (gatilho) + `2063-2257` (painel), RPCs `create_curator_invite`/`cancel_curator_invite`, restrito a `isDevMaster` |
| Convite de curador pendente p/ o próprio usuário (aceitar/recusar) | ❌ | ✅ `TabsHeaderWithPreferences.tsx:1586-1664`, RPCs `accept_curator_invite`/`reject_curator_invite` |
| Lista "Meus terreiros" com badges de papel/tipo | ✅ `TerreirosSection.tsx:228-259` | ✅ `TabsHeaderWithPreferences.tsx:1787-1828` |
| Convites pendentes de terreiro (aceitar/recusar) | ✅ `TerreirosSection.tsx:152-226` | ✅ `TabsHeaderWithPreferences.tsx:1666-1753` |
| Botão criar terreiro → `/terreiro-editor` (mode create) | ✅ `TerreirosSection.tsx:86-116` | ✅ `TabsHeaderWithPreferences.tsx:1878-1894` |
| Tocar em terreiro → navega para `/terreiro` | ⚠️ `TerreirosSection.tsx:286-296`, com `from: "/preferences"` | ⚠️ `TabsHeaderWithPreferences.tsx:1858-1867`, **sem** o parâmetro `from` |
| Retry ao erro de carregar terreiros | ✅ `TerreirosSection.tsx:127-142` | ✅ `TabsHeaderWithPreferences.tsx:1762-1777` |
| Menu "…" de ações do terreiro (admin/curimba/member) | ✅ `TerreiroActionsSheet.tsx` (arquivo inteiro) | ✅ `TabsHeaderWithPreferences.tsx:2268-2445` |
| Sair do papel (admin/curimba → member) | ⚠️ ver §1.4-A | ⚠️ ver §1.4-A |
| Sair do terreiro (member) | ⚠️ ver §1.4-B | ⚠️ ver §1.4-B |
| Downloads offline (listar/sincronizar/remover) | ✅ `OfflineDownloadsSection.tsx` (arquivo inteiro) | ❌ nenhuma ocorrência de "offline"/"Offline"/"DOWNLOADS" em `TabsHeaderWithPreferences.tsx` |
| Seção "Aparência" (tema Sistema/Claro/Escuro) | ✅ `ThemeSection.tsx:34-46` | ✅ `TabsHeaderWithPreferences.tsx:1914-1935` |
| Seção "Página inicial" (Home ou terreiro configurado) | ❌ | ✅ `TabsHeaderWithPreferences.tsx:1900-1908`, **somente leitura** — sem UI de seleção nos dois lados (ver nota) |
| Toggle "Modo Curimba" | ✅ `CurimbaSection.tsx:26-34` | ✅ `TabsHeaderWithPreferences.tsx:1941-1948` |
| Explicador de Curimba na 1ª ativação | ⚠️ ver §1.4-F | ⚠️ ver §1.4-F |
| Botão "Sair" (logout) + confirmação | ⚠️ ver §1.4-E | ⚠️ ver §1.4-E |
| Cabeçalho fixo com seta de voltar + título "Preferências" | ✅ `PreferencesHeader.tsx` (arquivo inteiro) | ❌ overlay é bottom sheet, sem cabeçalho próprio — fecha arrastando, tocando fora, ou back físico do Android (`PreferencesModal.tsx:22-31`) |
| "Nav cover" anti-flash na transição para a tela | ✅ `Preferences.tsx:9,214-233` | N/A — overlay não navega, é modal instantâneo |

**Nota (Página inicial):** os setters `setStartPageTerreiro`/`clearStartPagePreference`
(`contexts/PreferencesContext.tsx:571,611`) não são chamados por nenhum dos dois lados nem por
qualquer outro arquivo do repo (confirmado por grep). É funcionalidade morta hoje,
independentemente de qual lado vencer — a seção do overlay só exibe o valor, nunca o edita pela UI.

**Achado à parte, fora do escopo do C5 mas real:** como "Administrar guardiões" só existe dentro do
overlay inalcançável, **hoje não existe nenhuma forma, na UI do app, de um dev master convidar um
novo curador** — a funcionalidade e as RPCs existem e funcionam, mas o único caminho até elas está
morto. Vale um item de backlog próprio independente da decisão desta spec.

### 1.3 Linhas que existem em um só lado (resumo)

**Só na rota** (perdido se o overlay vencer sem port): e-mail no card de perfil, estado "deslogado"
completo dentro da tela, badge "Dev Master", downloads offline (seção inteira), parâmetro `from` na
navegação ao terreiro, cabeçalho fixo com botão voltar, nav cover.

**Só no overlay** (perdido se a rota vencer sem port): ícone "ⓘ" do Modo Guardião, botão de editar
perfil (mas é um stub vazio — não há nada de funcional para portar), "Administrar guardiões" (painel
inteiro de convite de curador), card de convite de curador pendente, seção "Página inicial"
(display).

### 1.4 Divergências de comportamento (o portão)

A mesma ação faz coisas diferentes nos dois lados em pelo menos seis pontos. Isso aciona o portão do
passo 4 acima — **parando aqui, sem fundir**, e registrando a pergunta em
[`QUESTIONS-FOR-USER.md`](../QUESTIONS-FOR-USER.md).

**A. Sair do papel (admin/curimba → member).**
Rota (`TerreiroActionsSheet.tsx:96-170`): `.update({ role: "member" })` direto na tabela
`terreiro_members` (linha 110-114); confirmação via `ConfirmModal` genérico, sem digitação; sem
pré-checagem de "último admin" — só trata o erro `cannot_remove_last_admin` depois de tentar
(linha 158-166).
Overlay (`TabsHeaderWithPreferences.tsx:871-990`): RPC `fn_remove_terreiro_member` (linha 924-927);
exige digitar literalmente `"sair"` para habilitar o botão de confirmar (linha 2496-2512,
`canConfirmLeaveRole`); faz **pré-checagem** de admin único (`countActiveAdmins`, linha 843-869)
**antes** de abrir o modal, bloqueando com toast (linha 875-883) — nunca deixa o usuário chegar a
tentar.

**B. Sair do terreiro (member).**
Rota (`TerreiroActionsSheet.tsx:172-257`): `.delete()` direto, confirmado por `ConfirmModal`
customizado, com tratamento específico de erro de RLS/permissão (linha 198-210, mensagem própria).
Overlay (`TabsHeaderWithPreferences.tsx:992-1051`): mesmo `.delete()`, mas confirmado por
`Alert.alert` **nativo** do SO (linha 2417-2430), sem tratamento específico de erro de RLS (cai no
`getFriendlyActionError` genérico).

**C. Rótulo do menu de ações.** "Editar detalhes" (rota, `TerreiroActionsSheet.tsx:352-356`) vs.
"Renomear e editar detalhes" (overlay, `TabsHeaderWithPreferences.tsx:2359-2363`).

**D. Parâmetro `from` ao navegar para o terreiro.** Presente na rota
(`TerreirosSection.tsx:286-296`), ausente no overlay (`TabsHeaderWithPreferences.tsx:1858-1867`) —
afeta o destino do botão voltar na tela de Terreiro quando a origem é Preferências.

**E. Logout — a divergência mais grave.**
Rota (`LogoutSection.tsx:28-40`): chama só `await signOut()`; em sucesso, fecha o modal de
confirmação e não navega para lugar nenhum. Título "Sair da conta?", corpo "Você precisará entrar
novamente para acessar seus terreiros e preferências." (linha 72-73).
Overlay (`TabsHeaderWithPreferences.tsx:904-915`): chama `signOut()` e, no `finally`, **também**
`closePreferences()` **e** `router.replace("/login")` (linha 912-913) — um redirecionamento
explícito que a rota não tem. Título "Sair do Saravafy", corpo "Você será desconectada(o) desta
conta neste dispositivo. Você pode entrar novamente quando quiser." (linha 2013,2019-2020).
`AuthContext.signOut()` (`contexts/AuthContext.tsx:695-712`) não navega nada por conta própria — o
redirecionamento é comportamento acrescentado só pelo overlay.
Isso também corrige uma premissa do §2 desta spec: "Nenhuma das duas redireciona nem fecha no
logout" não é verdade para o overlay como lido hoje — é verdade só para a rota. (Como o overlay está
inalcançável — §1.1 — isso não muda o estado quebrado observado em produção, que só a rota pode
produzir; mas é relevante se o overlay for escolhido como sobrevivente.)

**F. Explicador de Curimba com texto errado no overlay.**
Rota (`Preferences.tsx:332-338`): passa `context="preferences"`.
Overlay (`TabsHeaderWithPreferences.tsx:2554-2560`): não passa `context`, cai no default
`"player"` (`CurimbaExplainerBottomSheet.tsx:23`), e mostra o texto "Você também pode ligar e
desligar esse modo em Preferências" (linha 53) — instruindo o usuário a ir para uma tela em que ele
já está.

### 1.5 Entradas de navegação

- **Rota `/preferences`:** único ponto de entrada no código-fonte é o avatar do header
  (`TabsHeaderWithPreferences.tsx:496-562`, `router.push("/preferences" as any)` na linha 560) —
  confirmado por grep: nenhum outro arquivo do app faz `push` para `/preferences`. Saída:
  `router.back()` via a seta do `PreferencesHeader.tsx:34-37`.
- **Overlay:** entrada seria `openPreferences()`, mas — §1.1 — nada chama essa função hoje. Se fosse
  aberto, sairia por `closePreferences()` (toque fora do sheet, botão físico voltar do Android via
  `PreferencesModal.tsx:22-31`, ou qualquer um dos `closeThen`/`closePreferences` espalhados pelo
  próprio `PreferencesOverlaySheets`).
- **De dentro de Preferências (ambos os lados, quando aplicável):** `/terreiro` (tocar terreiro),
  `/terreiro-members`, `/access-manager`, `/terreiro-editor` (menu de ações / criar terreiro),
  `/review-submissions` (linha do curador).

---

## Task 2: Testes de render dos guards — antes de qualquer fusão

Isto é o `X12`. Vem **antes** porque é a rede que torna a fusão verificável.

1. Escrever testes de render para os guards de auth da implementação **sobrevivente** (`ProfileSection`,
   `LogoutSection`, e o equivalente no overlay se ele for o escolhido).
2. Cobrir: com usuário, sem usuário, e a transição logado → deslogado.
3. Os guards da Spec 3 são sensíveis à ordem de hooks — a quebra que passa no `tsc` e na suíte atual
   e explode em runtime. É exatamente isso que estes testes precisam pegar.
4. **Provar que os testes falham** removendo um guard temporariamente. Teste que nunca falhou não é
   rede.

- [ ] Task 2 concluída. Commit: `test: cobrir os guards de auth de Preferencias com teste de render`

---

## Task 3: Fundir

1. Levar para a sobrevivente cada linha marcada como "existe em um só lado" na Task 1.
2. Conferir **item a item** contra a tabela, não por impressão.
3. Manter as entradas de navegação funcionando (Task 1 passo 4).

- [ ] Task 3 concluída. Commit: `refactor: absorver a implementacao perdedora de Preferencias`

---

## Task 4: Deletar a perdedora

1. Remover o componente, e todo estado/contexto que só ela usava.
2. `grep -rn "Sair"` e `grep -rn "logout"` em `src/` precisam apontar para **um** arquivo.
3. Justificar cada remoção no commit ([`CLAUDE.md`](../../../CLAUDE.md)).

- [ ] Task 4 concluída. Commit: `chore: deletar a segunda implementacao de Preferencias`

---

## Task 5: Reconciliar ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

1. Ticar só o que foi feito; desvios inline com `> **DEVIATION:**`.
2. Corrigir a spec onde divergiu.
3. Fila de validação: seção nova cujo roteiro **é a tabela da Task 1**, linha por linha.
4. Fechar `C5` e `X12` no [`BACKLOG.md`](../BACKLOG.md), ou dizer o que sobrou de cada um.
5. Anotar no `D12` que o defeito virou impossível de duplicar.

- [ ] Task 5 concluída. Commit: `docs: reconciliar o Spec 8`
