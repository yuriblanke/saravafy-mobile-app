# Build & Instalação (Determinístico)

Este documento descreve **o único fluxo suportado e validado** para build, instalação e alternância de variantes do app Saravafy, garantindo que o **nome exibido do app seja sempre previsível e consistente**.

---

## Instalar Saravafy Dev (USB / Dev Client)

```sh
npm install
npm run android:dev
npm run start:dev
```

Nome exibido: **Saravafy Dev**  
Rebuild nativo: **NÃO**

Observação:
Se o projeto já estiver na variante `dev`, reinstalações não exigem rebuild nativo.

---

## Reinstalar Saravafy Dev (sem rebuild)

```sh
npm run android:dev
```

Nome exibido: **Saravafy Dev**  
Rebuild nativo: **NÃO**

Comportamento esperado:
Reinstalações sucessivas **não alteram o nome do app**.

---

## Rebuild nativo (obrigatório ao alternar Saravafy ↔ Saravafy Dev)

```sh
npx cross-env APP_VARIANT=dev npx expo prebuild --clean
npm run android:dev
```

Nome exibido: **Saravafy Dev**  
Rebuild nativo: **SIM**

Motivo:
A troca de variante altera configurações nativas. O `prebuild --clean` garante consistência total.

---

## Rebuild nativo (obrigatório ao alternar Saravafy Dev ↔ Saravafy)

```sh
npx cross-env APP_VARIANT=production npx expo prebuild --clean
npm run android
```

Nome exibido: **Saravafy**  
Rebuild nativo: **SIM**

---

## APK release local (Saravafy)

```sh
npm run android:prod
```

Nome exibido: **Saravafy**  
Rebuild nativo: **SIM**

Observação:
Este fluxo gera um artefato nativo de release local.

---

## EAS build development (Dev Client)

```sh
npm run eas:dev
```

Nome exibido: **Saravafy Dev**  
Rebuild nativo: **SIM**

Observação:
O EAS sempre gera builds limpos, independentemente do estado local.

---

## EAS build preview

```sh
npm run eas:preview
```

Nome exibido: **Saravafy**  
Rebuild nativo: **SIM**

---

## EAS build production

```sh
npm run eas:prod
```

Nome exibido: **Saravafy**  
Rebuild nativo: **SIM**

---

## EAS: listar builds

```sh
npm run eas:build:list
```

Rebuild nativo: **NÃO**

---

## EAS: baixar um build

```sh
npm run eas:build:download
```

Rebuild nativo: **NÃO**

---

## Desinstalar (Android)

```sh
adb uninstall com.yuriblanke.saravafy
adb uninstall com.yuriblanke.saravafy.dev
```

Rebuild nativo: **NÃO**

---

## Variáveis obrigatórias (Supabase)

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Deep link utilizado no projeto

```txt
saravafy://auth/callback
```

---

## Resumo rápido

DEV local (USB):

```sh
npm run android:dev
```

Start Dev Client:

```sh
npm run start:dev
```

Build DEV (EAS):

```sh
npx eas build -p android --profile development
```

Build PREVIEW (EAS):

```sh
npx eas build -p android --profile preview
```

Build PRODUÇÃO (EAS):

```sh
npx eas build -p android --profile production
```
