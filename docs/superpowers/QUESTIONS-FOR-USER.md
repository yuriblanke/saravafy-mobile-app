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
