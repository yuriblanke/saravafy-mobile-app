# Deep links (Opção A) — saravafy.com.br

## Formato dos links

Links compartilháveis (HTTPS):

- `https://saravafy.com.br/l/<tipo>/<id>`

Onde:

- `<tipo>`: `terreiro` | `collection` (ou `colecao`) | `ponto`
- `<id>`: UUID/ID do recurso

## Comportamento esperado

- **Com app instalado**: abrir o app diretamente (Universal Links no iOS / App Links no Android) e redirecionar para a rota interna correta via Expo Router.
- **Sem app instalado**: abrir a landing web (no domínio) com CTA de instalação.

Observação explícita: **não há deferred deep linking**. É aceitável: “instalou, toca no link novamente”.

## Rota bridge no app

Rota pública:

- `/(app)/l/[tipo]/[id]`

Ela lê `tipo/id` e faz `router.replace()` para:

- `terreiro` → `/(app)/terreiro?terreiroId=<id>`
- `collection`/`colecao` → `/(app)/collection/<id>`
- `ponto` → `/(app)/player?source=all&pontoId=<id>`

Tipo desconhecido → volta para `/(app)` e mostra toast amigável.

## Landing web (fallback)

A landing está em:

- `web-landing/`

Requisitos atendidos:

- Título: “Abrir no Saravafy”
- Botão “Instalar app” busca `app_install_url` via Supabase (`public_app_config`, key `app_install_url`).
- Falha no fetch não quebra a página (mostra mensagem e mantém o botão desabilitado).
- Preserva `tipo/id` no path.

### Configuração do Supabase na landing

A landing usa o REST do Supabase (público) e precisa de:

- `web-landing/config.js` com:
  - `window.SARAVAFY_SUPABASE_URL`
  - `window.SARAVAFY_SUPABASE_ANON_KEY`

Existe um template em `web-landing/config.example.js`.

## Publicação dos arquivos .well-known

Os seguintes arquivos precisam ser publicados no domínio:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

No repo eles estão em:

- `web-landing/.well-known/apple-app-site-association`
- `web-landing/.well-known/assetlinks.json`

### Preencher placeholders

- iOS: no `apple-app-site-association`
  - `<IOS_TEAM_ID>`
  - `<IOS_BUNDLE_ID>`

- Android: no `assetlinks.json`
  - `<ANDROID_PACKAGE_NAME>`
  - `<SHA256_CERT_FINGERPRINT>`

## App config (Expo)

Em `app.config.ts`:

- iOS: `associatedDomains: ["applinks:saravafy.com.br"]`
- Android: `intentFilters` para `https://saravafy.com.br` com `pathPrefix: "/l"` e `autoVerify: true`

## Deploy da landing

Esse repo só inclui os arquivos estáticos. Para servir corretamente:

- O host precisa servir `web-landing/index.html` como fallback para rotas `/l/*` (rewrite) para o roteamento simples funcionar.
- Os arquivos em `.well-known/` precisam ser servidos exatamente nesses paths.

## Checklist de validação manual

### iOS (Universal Links)

1. Instale uma build que contenha `associatedDomains` configurado.
2. Confirme que `https://saravafy.com.br/l/terreiro/<id>` abre o app.
3. Confirme que o app redireciona para a tela correta.
4. Remova o app e abra o link novamente: deve abrir a landing web.

### Android (App Links)

1. Instale uma build assinada conforme o fingerprint configurado no `assetlinks.json`.
2. Confirme que `https://saravafy.com.br/l/collection/<id>` abre o app.
3. Confirme redirecionamento correto.
4. Remova o app e abra o link novamente: deve abrir a landing web.

## Observação sobre instalação

Sem deferred deep linking: após instalar, o usuário precisa **tocar no link novamente**.
