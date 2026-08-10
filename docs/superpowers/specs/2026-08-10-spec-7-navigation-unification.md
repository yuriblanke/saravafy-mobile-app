# Spec 7 — Unificar navegação: um caminho só para toque e swipe (`S-4a`)

**Data:** 2026-08-10
**Status:** escrita, **não implementada**. Aguarda aprovação.
**Cobre:** `S-4a` do [`BACKLOG.md`](../BACKLOG.md). Encerra estruturalmente o `D15`.

> **Leia o `D15` no backlog antes de começar.** Ele já entregou metade desta investigação,
> incluindo os suspeitos **eliminados**. Não reinvestigue: `navCover` é um `<Modal transparent={false}>`
> (opaco — um cover preso seria tela em branco, não touch-eater invisível, e tem failsafe de 8s), e
> `AppTabSwipeOverlay` era código morto, **já removido** em 2026-08-10.

---

## 1. Goal

Fazer com que **tocar numa aba e arrastar para a aba** percorram o mesmo caminho de código.

Hoje são caminhos disjuntos, e é por construção que o `D15` foi possível: o toque atravessa um
`ref` mutável num contexto (`TabControllerContext`), o swipe fala direto com o pager do
`material-top-tabs`. Quando o `ref` apontava para a instância errada, o toque morria e o swipe
continuava vivo — uma assimetria que nenhum dos dois lados consegue detectar sozinho.

**A barra de aceite acordada com o usuário (2026-08-09) é mais forte que "não ter bug":**
`src/utils/navCover.ts` e suas ferramentas de debug podem ser **deletados por inteiro** e a
transição continua sem piscar. Enquanto o cover for necessário, a causa não foi corrigida — foi
mascarada, e essa máscara já é a segunda camada de mascaramento nesta área.

---

## 2. Estado atual

### 2.1 Os quatro contextos

| Contexto | Papel hoje | Observação |
|---|---|---|
| `RootPagerContext` | Pager raiz | |
| `TabControllerContext` | `goToTabRef` mutável + `goToTab()` | O `D15` nasceu aqui |
| `GestureBlockContext` | Janela de bloqueio de toque | **Só era escrita pelo `AppTabSwipeOverlay`**, que era código morto e foi removido. `shouldBlockPress()` é permanentemente `false` |
| `GestureGateContext` | Portão de gesto | Mesma situação: sem escritor vivo |

**Dois dos quatro contextos já não têm escritor.** Isso não é uma suposição desta spec — é
consequência direta da remoção do `AppTabSwipeOverlay`, e precisa ser reconfirmado por grep na
Task 1, não assumido.

### 2.2 A assimetria concreta

- **Toque:** `TabsHeaderWithPreferences.tsx` → `tabController.goToTab()` → lê `goToTabRef.current`
  → se nulo, **no-op silencioso** (há um `console.warn`, mas só em `__DEV__`).
- **Swipe:** `app/(app)/(tabs)/_layout.tsx` → pager do `material-top-tabs` da instância visível.
  Nunca toca o contexto.

O `D15` layer 2 (`8c8e962`) fez o slot ter dono identificado e registrar por foco. Isso **cura o
sintoma** — o toque sobrevive ao pop da instância duplicada. Não remove a assimetria: continuam
sendo dois caminhos, e o próximo defeito que atingir só um deles vai se parecer exatamente com o
`D15`.

O layer 1 (`11427e4`) removeu a **causa** daquele caso específico, trocando `router.replace(<tabs>)`
por `router.dismissTo(...)` em 11 lugares, então o `(tabs)` duplicado não é mais criado. Esta spec
não desfaz nada disso.

### 2.3 Por que isso é suspeito do flicker

O `C5` (duas UIs de Preferências) e o `S-4a` são os dois suspeitos do flicker de transição. O layer 1
do `D15` já eliminou uma fonte real de trabalho duplicado (duas árvores `(tabs)` montadas, com
header, queries e render duplicados). Se a transição melhorou, é sinal — está registrado como item a
observar na seção 10 da fila de validação.

---

## 3. Escopo

### 3.1 Dentro

1. **Deletar `GestureBlockContext` e `GestureGateContext`** se a Task 1 confirmar que continuam sem
   escritor. Provedor, consumidores e chamadas a `shouldBlockPress()`.
2. **Eliminar a indireção `registerGoToTab`/`goToTabRef`.** Toque e swipe passam a pedir a troca de
   aba ao mesmo objeto de navegação — o do pager visível — sem `ref` mutável no meio.
3. **Encolher ou remover `TabControllerContext`.** Se depois de (2) ele não guardar estado, ele deixa
   de existir; se guardar (ex.: aba corrente para o header), fica como leitura derivada, sem escrita.
4. **Deletar `src/utils/navCover.ts`** e suas ferramentas de debug (`__saravafyDebugGhostAmplifyUntil`,
   `__saravafyDebugPrefsCoverEnabled`), junto com `showNavCover`/`prewarmPreferences` em
   `TabsHeaderWithPreferences.tsx` e `setNavCoverVisible`/`useNavCoverState` em `Preferences.tsx`.
   **Esta é a barra de aceite, não um bônus.**

### 3.2 Fora — e por quê

- **Não desfazer o `D15` layer 1 nem layer 2.** Layer 1 é semântica de "voltar" já validada por
  humano; layer 2 vira redundante quando (2) acontecer, mas remover as duas coisas na mesma passada
  torna impossível atribuir uma regressão.
- **O `C5`** (duas Preferências) é spec própria. As duas se tocam em `TabsHeaderWithPreferences.tsx`
  e por isso a ordem importa — ver §9.
- **Redesenho do player** (`N1`) — sem relação.

### 3.3 Restrições conhecidas

- `(tabs)` é um `Stack.Screen` comum em `app/(app)/_layout.tsx:199`. Esta spec **não** muda isso.
- `AndroidBackBehavior` (`app/(app)/_layout.tsx:49-68`) chama `goToTab("pontos")` quando ambas as
  raízes resolvem para `pathname === "/"`. É consumidor do caminho que (2) reescreve.
- Nem `freezeOnBlur` nem `unmountOnBlur` estão setados. A afirmação de que o native-stack mantém a
  árvore JS montada com efeitos não limpos foi **lida, não executada** — o passo 3 da verificação de
  aparelho do `D15` confirma de graça.

---

## 4. Critérios de aceite

1. **Um caminho só.** Existe exatamente uma função que troca de aba, e tanto o toque no header
   quanto o swipe do pager chegam nela. Provado por teste que exercita as duas entradas e observa o
   mesmo efeito.
2. **`navCover` não existe.** `grep -rn "navCover" src/ app/` volta vazio.
3. **`GestureBlock`/`GestureGate` não existem**, ou têm escritor vivo e justificado por escrito.
4. **Sem `ref` mutável de navegação.** `grep -rn "goToTabRef\|registerGoToTab"` volta vazio.
5. **Nenhum aviso de handler ausente.** Numa sessão longa e aleatória (15–20 navegações quicando
   entre terreiro, coleção e player, tocando na barra a cada 3 voltas), `[TabController] goToTab
   called without registered handler` nunca é impresso — porque o código que o imprimia deixou de
   existir.
6. **Semântica de "voltar" inalterada** em relação ao que o humano validou na seção 10 da fila.

---

## 5. Não-objetivos

- Não é para deixar a navegação "mais bonita" nem para trocar de biblioteca.
- Não é para introduzir animação nova.
- Não é para resolver o flicker **por adição**. Se ao final a transição ainda piscar, a resposta é
  investigar, e não reintroduzir um cover — foi assim que se chegou à situação atual.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Deletar o `navCover` revela um flicker que ele escondia | É o resultado esperado do experimento, não uma falha. Registrar o que aparece e tratar como achado novo, com o cover **fora** |
| `GestureBlock`/`GestureGate` terem ganhado escritor desde a leitura | Task 1 é grep, não memória |
| Regressão em "voltar" no Android | Task de verificação separada, com os mesmos itens 10.5–10.9 já usados |
| Atribuição impossível se `C5` andar junto | Uma spec de cada vez (§9) |

---

## 7. Testes

**O que dá para provar sem aparelho:** que toque e swipe chamam a mesma função (teste de unidade
sobre o módulo de navegação extraído); que os greps de aceite voltam vazios; que `tsc` e a suíte
seguem limpos.

**O que exige aparelho** vai para a fila, não para o plano ([`CONVENTIONS.md`](../CONVENTIONS.md) §4):
sessão longa aleatória, comparação toque × swipe, semântica de voltar nas 5 telas do layer 1, e a
observação do flicker com o cover removido.

---

## 8. Definition of done

**Agent DoD:** `npx tsc --noEmit` limpo; suíte com zero falhas; os quatro greps de aceite vazios;
um commit por task; reconciliação feita (§5 do `CONVENTIONS.md`).

**Human DoD:** nova seção na [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md) cobrindo os
itens acima. **O item que mais importa é o flicker sem cover** — é a barra de aceite acordada.

---

## 9. Ordem em relação ao `C5`

**Fazer o `S-4a` primeiro.** Os dois tocam `TabsHeaderWithPreferences.tsx` (3.164 linhas), mas em
regiões diferentes: o `S-4a` mexe no caminho de troca de aba e no `navCover`, o `C5` funde as duas
implementações de Preferências. Fundir primeiro significaria mexer no arquivo maior enquanto o
caminho de navegação ainda tem duas rotas — e qualquer regressão de transição ficaria sem dono
entre as duas mudanças.

---

## 10. Perguntas em aberto

1. `TabControllerContext` some por inteiro ou vira leitura derivada? Depende de o header precisar
   saber a aba corrente para algo além de estilo — a Task 1 responde.
2. Se o flicker persistir sem o cover, ele é desta spec ou vira item próprio? **Proposta:** item
   próprio, com o que a remoção revelou anexado, para esta spec não virar guarda-chuva.
