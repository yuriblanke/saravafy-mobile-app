# README.dev.md

========================
COMANDOS RÁPIDOS
========================

DEV (instala Saravafy Dev no celular via USB)

npm run android:dev

Inicia o bundler para o Dev Client

npm run start:dev

Build de produção local (APK)

npm run android:prod


========================
COMANDOS EAS (BUILD NA NUVEM)
========================

Build DEV (gera APK com Saravafy Dev)

npx eas build -p android --profile development

Build PREVIEW (APK para testes internos)

npx eas build -p android --profile preview

Build PRODUÇÃO (APK final)

npx eas build -p android --profile production

Ver status dos builds

npx eas build:list

Baixar APK gerado

npx eas build:download


========================
OBSERVAÇÃO IMPORTANTE
========================

A explicação completa está abaixo.
Os comandos ficam no topo para acesso rápido no dia a dia.


========================
VISÃO GERAL
========================

Este projeto utiliza ambientes separados (dev / preview / production)
controlados pela variável de ambiente APP_VARIANT.

Isso permite:
- Ter múltiplos apps instalados ao mesmo tempo
- Separar desenvolvimento e produção
- Evitar conflitos de cache, nome e identidade do app


========================
CONTROLE DE AMBIENTE
========================

Lógica usada no app.config.ts:

const PROFILE =
  process.env.APP_VARIANT ??
  process.env.EAS_BUILD_PROFILE ??
  "production";

const IS_DEV = PROFILE === "dev" || PROFILE === "development";

Resultado:

Ambiente: Dev  
Nome do app: Saravafy Dev  
Package: com.yuriblanke.saravafy.dev  

Ambiente: Preview  
Nome do app: Saravafy  
Package: com.yuriblanke.saravafy  

Ambiente: Produção  
Nome do app: Saravafy  
Package: com.yuriblanke.saravafy  


========================
SCRIPTS DISPONÍVEIS
========================

package.json:

{
  "scripts": {
    "android:dev": "cross-env APP_VARIANT=dev expo run:android",
    "android:prod": "cross-env APP_VARIANT=production expo run:android --variant=release",
    "start:dev": "cross-env APP_VARIANT=dev expo start --dev-client",
    "start": "cross-env APP_VARIANT=production expo start"
  }
}


========================
IMPORTANTE (ANDROID)
========================

O Android NÃO atualiza automaticamente:
- nome do app
- ícone
- identidade do pacote

Sempre que mudar qualquer um desses itens:
→ desinstale o app antes de reinstalar.


========================
AUTENTICAÇÃO (SUPABASE)
========================

Variáveis obrigatórias:

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

Deep link usado no projeto:

saravafy://auth/callback


========================
DICAS ÚTEIS
========================

Limpar cache do Expo:

npx expo start -c

Remover apps instalados:

adb uninstall com.yuriblanke.saravafy
adb uninstall com.yuriblanke.saravafy.dev


========================
RESUMO RÁPIDO
========================

Dev:
npm run android:dev

Start Dev:
npm run start:dev

Build Preview (EAS):
npx eas build -p android --profile preview

Build Produção (EAS):
npx eas build -p android --profile production
