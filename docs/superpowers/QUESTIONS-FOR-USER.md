# Perguntas acumuladas — decisões que precisam de você

**Criado:** 2026-08-10, durante a sessão autônoma do [`WORK-ORDER.md`](WORK-ORDER.md).

Regra desta sessão (decisão sua, 2026-08-10): *"qualquer coisa que precise de mim, anota pra me
perguntar depois, e segue para a próxima."* Este arquivo é essa pilha. Nada aqui foi executado.

Ordenado por urgência, não por ordem de descoberta.

---

## 🚨 1. Token do Supabase versionado no `saravafy-web-app` — rotacionar

**Fora do escopo do mobile-app.** Achado enquanto procurava as ferramentas MCP do Supabase.

| | |
|---|---|
| Arquivo | `saravafy-web-app/.env` — **versionado no git**, não ignorado |
| Segredo | `SUPABASE_ACCESS_TOKEN` — Personal Access Token, Management API, controle total do projeto |
| Desde | commit `0a29f9e`, 2026-02-14 (~6 meses) |
| Alcance | pushado em `origin/main` → `github.com/yuriblanke/saravafy-web-app` |
| Visibilidade do repo | **não confirmada** — o `gh` desta máquina está autenticado como `yuripl3`, que não resolve esse repositório. Privado ou renomeado |

O próprio arquivo carrega o comentário `# Supabase Personal Access Token (MCP / Management API).
Never commit; rotate if exposed.` — e está commitado.

O mesmo token também está em texto puro em `C:\saravafy\.mcp.json` (esse **não** é versionado: a
raiz do workspace não é um repositório git).

**Recomendação:**
1. Rotacionar o PAT no dashboard (Account → Access Tokens). Isso já neutraliza o risco, mesmo com o
   histórico sujo — é o passo que importa.
2. `git rm --cached .env` e adicionar ao `.gitignore` do `saravafy-web-app`.
3. Reescrever histórico é destrutivo (`filter-repo`/força push) — **não faço sem ordem explícita**, e
   só vale a pena se o repo for público.

**Não bloqueia nada do mobile-app.**

---

## 2. `X14` e `X17` — duas correções de policy RLS, ambas precisam de você

A faixa proibida do `WORK-ORDER.md` inclui *"alterar policy de RLS ou qualquer migration no
Supabase"*. Auditei em modo leitura (`SELECT` em `pg_policies` via Management API, zero escrita) e
os dois procedem. Detalhe completo nas linhas `X14` e `X17` do [`BACKLOG.md`](BACKLOG.md).

### `X17` é o mais sério — escalação de privilégio, uma linha pra corrigir

`collections_pontos_update_owner_or_terreiro_admin_editor` tem `USING` corretamente escopado e
`WITH CHECK` literalmente `true`. Como `WITH CHECK` valida o estado **pós-update**, nada valida o
`collection_id` novo: quem edita a coleção A pode mover linhas para a coleção B sem ter direito
sobre B, contornando a policy de INSERT.

Não é alcançável pelo app hoje (nenhum caminho do cliente troca `collection_id`), mas é um furo real
no backstop. As policies irmãs — INSERT, DELETE, e até a de `dev_masters` — todas repetem o
predicado corretamente; essa é a única com `true`.

**Correção:** trocar `WITH CHECK (true)` pelo mesmo predicado do `USING`. **Posso escrever o SQL
pronto pra você revisar e aplicar?**

### `X14` — assimetria de leitura, latente

INSERT não olha `visibility`; as três policies de SELECT olham. Coleção com
`owner_terreiro_id NOT NULL` + `owner_user_id IS NULL` + `visibility = 'private'` fica gravável por
curimba/editor e ilegível por todos. Zero linhas nessa forma hoje (24 coleções: 22 `public`+terreiro,
1 `public`+usuário, 1 `private`+usuário), mas `private` é valor válido do enum.

**Notícia boa que corrige a premissa do item 1 do `WORK-ORDER`:** ele temia que, se o `X14`
procedesse, o backstop RLS por trás do gate de permissão da Coleção (`8159160`, `5222c9a`) não
existisse. **Ele existe e está correto** — INSERT exige posse ou `admin|curimba|editor`, então
`member` comum e não-membro não escrevem. São problemas independentes.

**Correção:** ou adicionar uma quarta policy de SELECT para terreiro-owned + `private`, ou decidir
que `private` só é válido para coleções de usuário e restringir na escrita. **É decisão de produto —
o que `private` significa para uma coleção de terreiro?**

---

## 3. `X18` — reordenar coleção reescreve a autoria dos pontos. Corrijo?

Achado novo (2026-08-10). `CollectionEdit.tsx:62-74` manda `added_by: userId` no payload do `upsert`
de reordenação; em conflito isso vira `DO UPDATE SET … added_by = excluded.added_by`. Reordenar
troca o `added_by` de todos os pontos para quem arrastou a lista.

Sem sintoma visível hoje — `added_by` é escrito por quatro lugares e **lido por nenhum** no app nem
no backoffice. O dano é só ao significado da coluna, o que passa a importar no dia que alguém
renderizar "adicionado por X".

**O mesmo defeito está duplicado no `saravafy-web-app`** (`saveCollectionPontosOrder.ts:45,62`).

**Pergunta:** a correção é tirar `added_by` dos dois payloads de reordenação. É provável por teste
unitário (asserção sobre o payload), então cabe na faixa segura — mas mexe em caminho de escrita e
não estava na lista do `WORK-ORDER`. **Faço, ou deixo pra quando você puder validar?**

---

## 4. MCP do Supabase não carregou nesta sessão

O `WORK-ORDER.md` item 1 diz "Ferramentas MCP do Supabase disponíveis", mas nenhuma ferramenta
`mcp__supabase__*` estava no meu conjunto. O `.mcp.json` existe em `C:\saravafy\` e está bem
formado — provavelmente falta aprovar o servidor na sessão.

Contornei usando a Management API direto com `curl` (`POST /v1/projects/{ref}/database/query`,
**apenas `SELECT`**), que é a mesma operação que o MCP faria. Funcionou.

**Se preferir que eu não use o token por `curl`, me diga** — aí o caminho é aprovar o MCP.

---

## 5. Faixa proibida que apareceu no caminho (só registro, não pergunta)

Nada aqui foi tocado, listado para você não achar que passou despercebido:

- `D13` (foto de perfil) — precisa de coluna nova, decisão de produto.
- `D2`, `D3`, `D5` — dependem de comportamento de backend não verificado.
- `S-3c`, `S-4d`, `S-4e` — mudam layout/comportamento visual.
- Pull-to-refresh em `AccessManager` e `TerreiroMembersList` — o segundo usa `useInfiniteQuery` e
  precisa de decisão (recarregar todas as páginas ou voltar à página 1).
- Disparar build EAS.

---

## 6. `C5` — rota ou overlay de Preferências? (inventário pronto, decisão sua)

**Contexto:** [`Spec 8`](plans/2026-08-10-spec-8-preferences-unification.md) §5 propunha manter a
rota (`Preferences.tsx`) e absorver o overlay (`TabsHeaderWithPreferences.tsx`). A Task 1 do plano
(inventário campo a campo, só leitura) está feita — tabela completa em
[`plans/2026-08-10-spec-8-preferences-unification.md` §1](plans/2026-08-10-spec-8-preferences-unification.md).
Isto não é a fusão (Tasks 3-5, ainda bloqueadas por esta pergunta) — é o levantamento que a Spec 8
pediu antes de fundir.

### O achado que muda a pergunta

**O overlay está inalcançável hoje.** `openPreferences()` (`src/contexts/PreferencesOverlayContext.tsx:27-29`)
não é chamada em nenhum lugar do código — confirmado por grep no repo inteiro. O avatar do header
(`TabsHeaderWithPreferences.tsx:496-562`) hoje empurra a **rota** (`router.push("/preferences")`,
linha 560), não abre o overlay. `TabsHeaderWithPreferences.tsx:638` nem importa `openPreferences` do
contexto. Resultado: `PreferencesModal` está montado (`app/_layout.tsx:157`) mas seu `<Modal
visible={isOpen && …}>` nunca fica `true` — nenhuma ação do usuário abre essa UI em produção hoje.
`docs/architecture/preferences.md:46,51`, que descreve o avatar como gatilho do overlay, está
desatualizado nisso.

Isso não é só um detalhe técnico: muda a pergunta de "qual você prefere usar" (nenhuma das duas —
você só consegue abrir a rota) para "o que fazer com um bloco de lógica morto que ainda contém
funcionalidade real que a rota não tem".

### O que cada lado tem que o outro não tem (resumo — tabela completa no plano)

**Só na rota**, perdido se o overlay vencer sem port: e-mail no card de perfil, estado "deslogado"
completo dentro da tela, badge "Dev Master", **seção inteira de downloads offline**, parâmetro `from`
na navegação ao terreiro (afeta o botão voltar), cabeçalho fixo com seta de voltar, nav cover
anti-flash.

**Só no overlay**, perdido se a rota vencer sem port: **painel "Administrar guardiões"** (criar/
listar/cancelar convite de curador, RPCs `create_curator_invite`/`cancel_curator_invite`, restrito a
dev master), card de convite de curador pendente para o próprio usuário, ícone "ⓘ" explicando o Modo
Guardião, seção "Página inicial" (só leitura — o setter também está morto nos dois lados). O botão de
editar perfil (lápis) só existe no overlay, mas abre um bottom sheet **vazio** — não há nada
funcional para portar aí.

**Achado à parte, fora desta decisão mas real:** como "Administrar guardiões" só existe dentro do
overlay inalcançável, hoje **não existe nenhuma forma, na UI do app, de convidar um novo curador** —
a funcionalidade e as RPCs funcionam, só o caminho até elas está morto. Pode valer um item de
backlog próprio, independente de qual lado você escolher aqui.

### Divergências de comportamento encontradas (não só de presença — a mesma ação faz coisas diferentes)

1. **Sair do papel** (admin/curimba → member): rota faz `update` direto na tabela, sem pré-checagem
   de último admin; overlay faz RPC `fn_remove_terreiro_member`, exige digitar `"sair"`, e
   **pré-checa** admin único antes de deixar o usuário tentar.
2. **Sair do terreiro** (member): rota confirma com modal customizado com mensagem específica para
   erro de RLS; overlay confirma com `Alert.alert` nativo, sem essa mensagem específica.
3. **Logout redireciona só no overlay.** A rota (`LogoutSection.tsx:28-40`) só chama `signOut()`. O
   overlay (`TabsHeaderWithPreferences.tsx:904-915`) chama `signOut()` **e depois**
   `router.replace("/login")`. Textos da confirmação também diferem ("Sair da conta?" vs. "Sair do
   Saravafy"). Isso corrige uma frase do §2 da Spec 8 ("nenhuma das duas redireciona... no logout") —
   vale só para a rota, não para o overlay como está hoje.
4. Explicador de Curimba mostra o texto errado no overlay (não passa `context="preferences"`, cai no
   texto padrão que manda o usuário "ir em Preferências" estando já lá).
5. Rótulo do menu de ações do terreiro difere ("Editar detalhes" vs. "Renomear e editar detalhes").

### A pergunta

**Mantemos a proposta original da Spec 8 (rota vence, overlay é absorvido e depois deletado), ou
você quer outra direção agora que sabemos que o overlay já está morto em produção?**

Se a resposta for "mantém a proposta original" (rota vence): a Task 3 do plano precisa portar as
funções "só no overlay" listadas acima que você quiser manter — meu palpite é que "Administrar
guardiões" e o convite de curador pendente valem a pena (são as únicas com lógica de negócio real
por trás; o resto do overlay é ícone informativo, stub vazio, ou display morto), mas isso também é
decisão sua, não só técnica. E as cinco divergências de comportamento acima precisam de uma escolha
explícita de qual das duas versões vira a única (ex.: a pré-checagem de admin único do overlay
parece estritamente melhor que o "trata o erro depois" da rota — mas é você quem decide, não eu).
