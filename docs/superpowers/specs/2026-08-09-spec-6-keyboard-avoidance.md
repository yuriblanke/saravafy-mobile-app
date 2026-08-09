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

### Agent DoD

- [ ] `npx tsc --noEmit` → **zero output**.
- [ ] Test suite → **0 failures**.
- [ ] `npm run android:dev` completes and the app launches (the native module actually builds).
- [ ] `grep -rn "filler" src/` shows **exactly 8 remaining usages** — the pilot's is gone, the
      others are untouched.
- [ ] Backlog updated: `D14` recorded, pilot marked done, Spec 7 noted as blocked on human sign-off.

### Human DoD — the gate for Spec 7

On the médium-tag sheet (Collection → add médium tag):
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
