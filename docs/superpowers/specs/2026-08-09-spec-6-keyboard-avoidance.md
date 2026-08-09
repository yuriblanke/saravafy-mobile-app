# Spec 6 — Keyboard avoidance (pilot)

**Date:** 2026-08-09
**Source:** user report, 2026-08-09 — fields at the bottom of a form get covered by the keyboard; a fixed-height "filler" image was added as a workaround so the user could always scroll.
**Backlog:** `D14` (new).
**Process:** follows [`CONVENTIONS.md`](../CONVENTIONS.md). Plan: `plans/2026-08-09-spec-6-keyboard-avoidance.md`.

> **This spec deliberately fixes ONE screen.** User decision, 2026-08-09: prove the approach on a
> single surface, validate it by hand, and only then roll it out. The rollout is **Spec 7**, which
> must not start until this pilot is validated.

## 1. Goal

Prove that `react-native-keyboard-controller` solves the problem on one representative screen —
focused input scrolls into view above the keyboard, using the keyboard's **real** height — and that
it composes correctly with this app's existing `BottomSheet` gestures.

Nothing else changes. Eight other screens keep their current workaround until the pilot is signed
off.

## 2. The current workaround and why it fails

Nine files render `assets/images/filler.png` — the Saravafy symbol — as dead space at the end of a
form so the content can always be scrolled clear of the keyboard.

The image is styled **identically in all nine**:

```ts
filler: { width: "100%", height: 290, marginTop: spacing.lg }
```

`290` is a fixed guess against a variable quantity. Keyboard height varies by device, OS version,
language, third-party keyboard (Gboard/SwiftKey), and whether a suggestion strip or emoji row is
showing. So:

- keyboard **taller** than 290 → the field is still covered; the bug reproduces
- keyboard **shorter** than 290 → a large empty gap below the form
- the user must scroll **manually** in every case; nothing moves on its own

There is **no `KeyboardAvoidingView` anywhere in the codebase** — the filler is the entire strategy.

**Why this matters for the rollout (Spec 7):** 8 of the 9 files render their form inside the shared
`src/components/BottomSheet.tsx`, which already wraps children in a `ScrollView`. One shared change
will eventually fix eight screens. That leverage is exactly why the pilot must not touch the shared
default — see §4.2.

## 3. Scope

### 3.1 In scope

1. Add `react-native-keyboard-controller` and its root provider.
2. Add an **opt-in, default-off** prop to `BottomSheet` that swaps its internal `ScrollView` for
   `KeyboardAwareScrollView`.
3. Enable that prop on exactly one screen: **`src/components/AddMediumTagSheet.tsx`**.
4. Remove the filler from that one screen only.

### 3.2 Out of scope — deferred to Spec 7 (gated on human validation of this pilot)

- The other 8 filler usages and their screens.
- Making keyboard-awareness the `BottomSheet` default and removing the opt-in flag.
- `ReviewSubmission.tsx` (the one form that owns its container rather than using `BottomSheet`).
- Deleting `assets/images/filler.png`.
- Re-examining `scrollEnabled={false}` call sites.

### 3.3 Also out of scope (not just deferred)

- `KeyboardToolbar` (prev/next/done accessory bar) — a real improvement but a new feature.
- Any change to form fields, validation, submission, or sheet layout beyond removing this screen's
  filler.
- Redesigning `BottomSheet`'s gesture/snap behavior.

### 3.4 Why `AddMediumTagSheet` is the pilot

- **Simplest possible repro:** one text input, then action buttons, then the 290px filler.
- Uses the shared `BottomSheet`, so it exercises the exact integration Spec 7 will depend on —
  including any pan-gesture conflict — while remaining opt-in.
- The user has just exercised this sheet during the 2026-08-08/09 validation pass (queue item 3.5),
  so its current behavior is fresh for comparison.

### 3.5 Known constraints

- **Native module.** Requires a rebuild (`npm run android:dev`); it will not work over a JS reload.
  Install via `npx expo install` so the version matches Expo SDK 54.
- **Android prerequisite already met:** `android/app/src/main/AndroidManifest.xml:19` already sets
  `windowSoftInputMode="adjustResize"`.
- **New Architecture is enabled** (`app.config.ts:76`). The library ships a Fabric example, so it is
  expected to work — **verify at install time** rather than assuming.
- `BottomSheet`'s `wrapInScrollView` prop (default true) exists for children containing a
  `FlatList`. The new prop only affects the wrapped branch.
- `BottomSheet`'s `scrollEnabled` prop is documented as *"Useful for sheets that rely on static
  layout + filler spacing"* — a direct reference to this workaround. Leave it alone in this spec;
  Spec 7 revisits it.

## 4. Acceptance criteria

### 4.1 Provider

- `KeyboardProvider` wraps the app in `app/_layout.tsx`.
- Placement relative to `SafeAreaProvider` / `QueryClientProvider` follows the library's documented
  guidance — verify at implementation time, do not guess the nesting order.
- The provider alone must cause **no visible change** anywhere. If adding it shifts layout on any
  screen, stop and report — that is a finding, not something to absorb.

### 4.2 `BottomSheet` gains an opt-in prop

- **File:** `src/components/BottomSheet.tsx`
- New prop, e.g. `keyboardAware?: boolean`, **default `false`**.
- When `true` **and** `wrapInScrollView` is true → render `KeyboardAwareScrollView` with a
  `bottomOffset` of `spacing.lg`.
- When `false` (every existing call site) → byte-identical behavior to today.
- **This default-off design is the whole point of the pilot.** A shared component with 8 consumers
  cannot be changed in place and still be called a pilot.

### 4.3 `AddMediumTagSheet` opts in and drops its filler

- **File:** `src/components/AddMediumTagSheet.tsx`
- Passes `keyboardAware` to its `BottomSheet`.
- The `filler.png` `<Image>` (~line 390) and the `filler` style entry (~line 485) are deleted.
- The `fillerPng` require (~line 25) is deleted.
- **Behavior contract:**
  - Focusing the médium-name input when the keyboard would cover it scrolls it into view
    automatically, with no manual scrolling.
  - The gap tracks the **actual** keyboard height, including suggestion/emoji rows.
  - Dismissing the keyboard leaves no leftover empty space.
  - Swipe-to-close, backdrop tap, and submit still work.

### 4.4 Everything else is untouched

- `grep -rn "filler" src/` still shows the other 8 usages, unchanged.
- No other screen's rendering changes in any way.

## 5. Non-goals

- Do NOT flip the `BottomSheet` default, however tempting once it works. That is Spec 7, and it is
  gated on the user's validation of this screen.
- Do NOT remove any other filler.
- Do NOT tune `bottomOffset` per screen — one shared value, adjusted from observed results.
- Do NOT keep a filler "just in case" on the pilot screen. A fallback that hides the real behavior
  is what produced this situation.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Native module doesn't build under New Architecture / SDK 54 | Verify with a rebuild **immediately after install**, before touching any screen. If it fails, stop and report — do not work around it. |
| `KeyboardAwareScrollView` conflicts with `BottomSheet`'s pan gesture (both handle vertical movement) | This is the primary thing the pilot exists to discover. The library supports a custom `ScrollViewComponent` for gesture-handler integration if needed. Record whatever is found — a conflict here would change Spec 7's whole approach. |
| The provider changes layout globally even with the prop off | §4.1 makes that an explicit stop-and-report condition rather than something to quietly compensate for. |
| Removing 290px changes this sheet's height and reveals layout tuned around the filler | Single screen, single commit, trivially revertable. |
| Regression is invisible to agents — this is a purely visual fix | Accepted and explicit: the Agent DoD proves it compiles, builds, and breaks no tests. Correctness is the human check. No test will be written that pretends to verify visual keyboard behavior. |

## 7. Testing

- **Automated:** limited by nature. Required:
  - `npx tsc --noEmit` clean; suite green.
  - A test asserting `BottomSheet` renders children in all three paths — `keyboardAware` off (the
    default, protecting the 8 untouched screens), `keyboardAware` on, and
    `wrapInScrollView={false}`.
  - **Do not write a test that mocks the keyboard and asserts a scroll offset.** It would encode the
    mock's behavior, not the platform's ([`CONVENTIONS.md`](../CONVENTIONS.md) §7).
- **Human (deferred, and the real gate for Spec 7):** appended to
  [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md).

## 8. Deliverables

| File | Type | Note |
|---|---|---|
| `package.json` / `package-lock.json` | edit | `npx expo install react-native-keyboard-controller` |
| `app/_layout.tsx` | edit | `KeyboardProvider` |
| `src/components/BottomSheet.tsx` | edit | opt-in `keyboardAware` prop, default off |
| `src/components/BottomSheet.test.tsx` | create | three render paths |
| `src/components/AddMediumTagSheet.tsx` | edit | opt in; remove filler + require + style |

## 9. Definition of done

### Agent DoD — ✅ complete 2026-08-09

- [x] `npx tsc --noEmit` → **zero output**.
- [x] Test suite → **0 failures** (61 passing; 3 added by this spec, covering all three
      `BottomSheet` render paths).
- [x] ~~`cd android && ./gradlew assembleDebug`~~ → **replaced by an EAS build, and not by choice.**
      The local Gradle gate is unreachable on this machine: `ninja.exe` and `cmake.exe` carry no
      `longPathAware` manifest element, so Windows truncates the codegen object paths at 260
      characters even with `LongPathsEnabled=1`. The module was proven to link by EAS build
      `3f9666b9` (profile `development`, SDK 54, New Architecture, APK produced). See the plan's
      Task 2 Step 3 for why every in-repo workaround was rejected.
- [x] `grep -rln "filler" src/` → **13**: twelve files still rendering `filler.png` plus
      `BottomSheet.tsx`, which only mentions the word in a doc comment. The pilot's usage is gone,
      the others are untouched. `keyboardAware` appears at **exactly one** call site.
- [x] Backlog updated: `D14` recorded, pilot marked done, the rollout noted as blocked on human
      sign-off.

**Two counts in this spec were wrong.** It says nine files use the filler — thirteen do, so twelve
remain rather than eight. And it says `BottomSheet` has 8 consumers — **19 files render
`<BottomSheet>`**; the 8 was the filler-form subset. Neither weakens the pilot (the default is off
and the default render path is tested), but the rollout inherits the larger numbers.

**The most valuable thing this pilot produced is a testing hazard, not a UI result.** The library's
shipped jest mock aliases `KeyboardAwareScrollView` to React Native's own `ScrollView`, so under it
both render branches share an identity and the default-off test — the one guarding every other
consumer — passes even if keyboard-aware becomes the default. It was overridden and proven
load-bearing here. **The rollout spec must not adopt that mock as-is.**

### Human DoD — the gate for Spec 7

**Requires installing the APK from the EAS build** — a JS reload cannot pick up a new native module,
and `npm run android:dev` does not work on this machine (see the Agent DoD above). The current dev
client will **not** show this change.

⚠️ **If the field does not rise, suspect this first:** the pilot screen passes `scrollEnabled={false}`
alongside `keyboardAware`. In React Native that disables only user dragging — programmatic scrolling,
which is what `KeyboardAwareScrollView` uses, should still work — but it is unverified on a device.
If that is the cause, it is the combination of the two props, not the library.

First, before anything keyboard-related:
- The app **launches without crashing** (Gradle proves the module links, not that it registers at
  runtime under New Architecture).
- **Provider inertness:** screens with inputs look exactly as before — no shifted insets, sheet
  heights, or status bar. If anything moved, stop: a provider that changes layout on its own makes
  every later observation unattributable.

Then, on the médium-tag sheet (Collection → add médium tag):
- Focus the input → it sits visible above the keyboard, no manual scrolling.
- Try a third-party keyboard and/or one with the emoji row open — height variation is the entire
  point of the fix.
- Dismiss the keyboard → no leftover empty space.
- Swipe-to-close, backdrop tap, and submit still work.
- Compare against any other sheet still using the filler, to feel the difference directly.

**Only after this passes does Spec 7 (rollout) get written and executed.**

## 10. Open questions

- **Q1:** Should `bottomOffset` be shared or per-screen? **A:** Shared. Per-screen values are how a
  codebase ends up with nine hardcoded `290`s again. Diverge only where validation proves it
  necessary, and record why.
- **Q2:** Do sheets using `snapPoints` need different treatment? **A:** Unknown — a fixed-height
  sheet may clip rather than scroll. `AddMediumTagSheet` does not use them, so the pilot will not
  answer this. Spec 7 must test it explicitly.
- **Q3:** Keep the opt-in prop after rollout? **A:** No — Spec 7 should make it the default and
  delete the flag, so no screen can silently opt out of correct behavior.
