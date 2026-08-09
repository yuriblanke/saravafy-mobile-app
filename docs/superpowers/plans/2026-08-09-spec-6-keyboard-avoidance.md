# Spec 6 — Keyboard avoidance (pilot): Implementation Plan

> **For agentic workers:** use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use `- [ ]` checkboxes.
> **Read [`CONVENTIONS.md`](../CONVENTIONS.md) first** — §3 (exact verification), §4 (human checks
> queued, never blocking), §5 (reconciliation is the final task), §7 (tests encode the spec).

**Goal:** prove keyboard avoidance works on **one** screen — `AddMediumTagSheet` — without changing
any other.

**Spec source:** [`../specs/2026-08-09-spec-6-keyboard-avoidance.md`](../specs/2026-08-09-spec-6-keyboard-avoidance.md)

**Working directory:** `C:\saravafy\saravafy-mobile-app` (Windows; PowerShell or Git Bash).

> **The single most important constraint in this plan:** `BottomSheet` has 8 consumers. The new
> behavior is **opt-in and default-off**, and exactly one screen opts in. If at any point you find
> yourself changing the default "since it works anyway", stop — that is Spec 7, and it is gated on
> the user's hands-on validation of this pilot.

**Test command:** `npm test`, or `node node_modules/jest/bin/jest.js` if `jest` doesn't resolve on
PATH. The gate is **0 failures** — never a specific total.

**This one plan requires a native rebuild.** Unlike Specs 3-5, `npx tsc --noEmit` passing is not
sufficient evidence — a native module that fails to link compiles fine and crashes at launch.

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `package.json` / `package-lock.json` | edit | Add the dependency |
| `app/_layout.tsx` | edit | `KeyboardProvider` |
| `src/components/BottomSheet.tsx` | edit | Opt-in `keyboardAware` prop, default off |
| `src/components/BottomSheet.test.tsx` | create | Three render paths |
| `src/components/AddMediumTagSheet.tsx` | edit | Opt in; delete filler |

---

## Task 1: Baseline

- [ ] **Step 1: Confirm a clean starting point**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero `tsc` output**, **0 failures**.

- [ ] **Step 2: Record the filler inventory you must NOT touch**

```
grep -rn "filler" src/ | wc -l
grep -rln "filler" src/
```

Record both numbers. Task 6 asserts the pilot's usages are gone and **everything else is
unchanged** — you need the "before" to prove the "after".

(No commit — read-only.)

---

## Task 2: Install the native module and prove it builds

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install via Expo so the version matches SDK 54**

```
npx expo install react-native-keyboard-controller
```

Do **not** use a bare `npm install` — `expo install` resolves the version compatible with the
installed SDK. Getting this wrong is the same class of mistake as the `jest-expo` drift fixed in
commit `6d08cdb`.

- [ ] **Step 2: Check for peer/version complaints**

```
npx expo-doctor
```

Compare against the known-issue list in [`../BACKLOG.md`](../BACKLOG.md) `P0.5` (`N1`–`N5`). New
entries caused by this install must be resolved now or recorded; pre-existing ones stay as they are.

- [ ] **Step 3: Prove the native module actually links — before writing any UI code**

```
cd android && ./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL`.

> **Do not use `npm run android:dev` here.** `expo run:android` builds, installs, launches, and then
> **keeps Metro running in the foreground** — it never returns, so an agent invoking it hangs. Use
> Gradle directly for the build gate: it terminates, and it is what actually compiles and packages
> the new module's Android sources, which is what this gate is checking.

A native module that is missing, incompatible, or misconfigured fails **here**. (A module that
builds but fails to register at runtime under New Architecture would not be caught by Gradle —
that is covered by the human launch check queued in Task 5.)

**This is a stop-and-report gate** (spec §6). If the build fails, do not attempt workarounds, do not
disable New Architecture, do not pin an older version on your own initiative. Report the failure
with the actual Gradle output — the whole approach depends on this working, and a hack here would be
worse than the filler.

- [ ] **Step 4: Commit**

```
git add package.json package-lock.json
git commit -m "chore: add react-native-keyboard-controller

Foundation for replacing the fixed-height \"filler\" keyboard workaround
with real keyboard avoidance. Installed via expo install so the version
tracks SDK 54, and verified to build and launch under New Architecture
before any UI depends on it.

No behavior change yet - the provider and the first adoption land
separately."
```

---

## Task 3: Add the provider and prove it changes nothing

**File:** `app/_layout.tsx`

- [ ] **Step 1: Check the library's documented provider placement**

Consult the library docs for where `KeyboardProvider` belongs relative to other providers. The
existing tree has `SafeAreaProvider` (~line 125) wrapping `QueryClientProvider` (~line 126), inside
a conditional `GestureHandlerRootView` (~line 85). Do not guess the nesting order — follow the docs.

- [ ] **Step 2: Add `KeyboardProvider`**

Wrap per the documented placement. This step adds the provider **only** — no screen opts in yet.

- [ ] **Step 3: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
cd android && ./gradlew assembleDebug
```

Expected: **zero output**, **0 failures**, `BUILD SUCCESSFUL`.

- [ ] **Step 4: Queue the inertness check — you cannot perform it**

Per spec §4.1, adding the provider must produce **no visible change** anywhere, since nothing has
opted in yet. That is a claim about rendered layout, and **an agent cannot verify it** — no amount
of `tsc` or Gradle output says whether insets shifted.

Append to [`../HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md), in the Spec 6 section, as
the **first** item to check after the next rebuild:

> Provider mounted, nothing opted in yet: Home, the médium-tag sheet, and any sheet with inputs
> must look exactly as before — no shifted insets, sheet heights, or status bar. **If anything
> moved, stop and report before trusting any later keyboard result** — a provider that changes
> layout on its own would make every subsequent visual observation unattributable.

**Commit regardless** — [`CONVENTIONS.md`](../CONVENTIONS.md) §4.

- [ ] **Step 5: Commit**

```
git add app/_layout.tsx
git commit -m "chore: mount KeyboardProvider at the app root

Required by react-native-keyboard-controller. Inert on its own: no screen
opts into keyboard-aware scrolling yet, and the provider must not shift
any layout by itself - verified before continuing, so that later visual
results are attributable to the opt-in and not to this."
```

---

## Task 4: Opt-in prop on `BottomSheet` (default off) — TDD

**Files:** `src/components/BottomSheet.tsx`, `src/components/BottomSheet.test.tsx`

- [ ] **Step 1: Write the render-path tests first**

Create `src/components/BottomSheet.test.tsx`. Model the harness on
`src/components/QueryBoundary.test.tsx`, which already renders components in this repo.

Harness notes, pre-checked so you don't rediscover them:
- `BottomSheet` uses React Native's built-in `Animated` + `PanResponder`, **not** Reanimated — so no
  Reanimated jest mock is needed (there is none configured, and none should be added for this).
- It reads `useRootPagerOptional()`, which is optional by design and tolerates no provider.
- It also calls `dismissAllTooltips` from `TooltipPopover` — mock that import if it drags in
  anything awkward.
- Pass `visible` — the component short-circuits when closed, and a test asserting on children of a
  hidden sheet would pass vacuously.

Three paths, and the **first one is the one that protects the other 8 screens**:

```tsx
it("renders children in a plain ScrollView by default", /* keyboardAware omitted */);
it("renders children in a keyboard-aware scroll view when opted in", /* keyboardAware */);
it("renders children without a scroll wrapper when wrapInScrollView is false", /* FlatList path */);
```

Assert on the rendered tree, not on internal state.

**Do not write a test that mocks the keyboard and asserts a scroll offset** — it would encode the
mock, not the platform ([`CONVENTIONS.md`](../CONVENTIONS.md) §7). The visual behavior is a human
check by design.

- [ ] **Step 2: Run and watch the opt-in test fail**

```
node node_modules/jest/bin/jest.js --testPathPattern=BottomSheet
```

Expected: the default and `wrapInScrollView={false}` tests pass (existing behavior); the
`keyboardAware` test fails (prop doesn't exist).

- [ ] **Step 3: Implement the prop**

In `src/components/BottomSheet.tsx`, add to `Props`:

```ts
  /**
   * When true, the internal ScrollView becomes a KeyboardAwareScrollView, so a
   * focused input scrolls above the keyboard using its real height.
   *
   * Default false while this is piloted on a single screen (Spec 6). Spec 7
   * makes it the default and removes the flag.
   */
  keyboardAware?: boolean;
```

In the `wrapInScrollView === true` branch, choose the component based on the flag and pass
`bottomOffset: spacing.lg` when keyboard-aware. Every other prop already passed to the `ScrollView`
must be forwarded unchanged — `KeyboardAwareScrollView` inherits the `ScrollView` props, so this is
a swap, not a rewrite.

Also update the `scrollEnabled` doc comment, which currently reads *"Useful for sheets that rely on
static layout + filler spacing"* — note that the filler pattern is being retired and that Spec 7
revisits these call sites. Leave the prop's behavior alone.

- [ ] **Step 4: Verify**

```
node node_modules/jest/bin/jest.js
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

- [ ] **Step 5: Commit**

```
git add src/components/BottomSheet.tsx src/components/BottomSheet.test.tsx
git commit -m "feat: opt-in keyboard-aware scrolling in BottomSheet

Adds a keyboardAware prop, defaulting to false. BottomSheet has 8
consumers, so a shared change here would not be a pilot - the flag lets
exactly one screen adopt the new behavior while the rest stay
byte-identical.

Tests cover all three render paths, including the default one, which is
what guarantees the other 7 sheets are untouched.

Spec 7 flips the default and deletes the flag, once the pilot is
validated by hand."
```

---

## Task 5: Adopt on the pilot screen and delete its filler

**File:** `src/components/AddMediumTagSheet.tsx`

- [ ] **Step 1: Confirm this screen's filler is the workaround, not decoration**

```
grep -n "filler" src/components/AddMediumTagSheet.tsx
```

Expect three hits: the `require` (~25), the `<Image>` (~390), the style (~485). Confirm the image
renders **after** the form's action buttons and is `height: 290` — the signature of the workaround.
If it looks decorative instead, stop: the spec's premise is wrong for this screen.

- [ ] **Step 2: Opt in**

Pass `keyboardAware` to this sheet's `BottomSheet`.

- [ ] **Step 3: Delete the workaround from this screen only**

Remove all three: the `require`, the `<Image>`, the `filler` style entry.

Leave every other file's filler alone. Task 6 verifies exactly that.

- [ ] **Step 4: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
cd android && ./gradlew assembleDebug
```

Expected: **zero output**, **0 failures**, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Queue the human check — do not attempt to judge it yourself**

Append a new section to [`../HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md), flagged
clearly as **the gate for Spec 7**. Open it with the rebuild instruction, because this is the one
spec whose changes cannot reach the device over a JS reload:

> **Requires a native rebuild — run `npm run android:dev` yourself.** The agent cannot: that command
> starts Metro in the foreground and never returns. The agent verified the build with
> `./gradlew assembleDebug`; everything below needs the app actually running.

- The app **launches without crashing** (Gradle proves the module links, not that it registers at
  runtime under New Architecture).
- The provider inertness check queued in Task 3 Step 4 — do this one **first**.
- Collection → add médium tag → focus the input → the field sits above the keyboard with no manual
  scrolling.
- Try a third-party keyboard, and/or open the emoji row — height variation is the entire point.
- Dismiss the keyboard → no leftover empty space where the filler used to be.
- Swipe-to-close, backdrop tap, and submit all still work.
- Open any other sheet still using the filler (e.g. the invite sheet) to feel the difference
  directly.

**Commit regardless** — [`CONVENTIONS.md`](../CONVENTIONS.md) §4. This is a visual fix; an agent
cannot sign it off.

- [ ] **Step 6: Commit**

```
git add src/components/AddMediumTagSheet.tsx
git commit -m "feat: real keyboard avoidance on the médium-tag sheet (pilot)

Replaces this screen's 290px filler image with keyboard-aware scrolling.
The filler was a fixed guess against a variable quantity - identical
height: 290 in all 9 files that use it - so a keyboard taller than 290px
still covered the field and a shorter one left a gap, and the user had to
scroll by hand either way.

Pilot only: the other 8 usages are untouched and BottomSheet still
defaults to the old behavior. Rollout is Spec 7, gated on hands-on
validation of this screen."
```

---

## Task 6: Reconcile ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

- [ ] **Step 1: Final verification**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [ ] **Step 2: Prove the blast radius was exactly one screen**

```
grep -rln "filler" src/
```

Expected: **8 files**, and `AddMediumTagSheet.tsx` is **not** among them. Compare against Task 1
Step 2's inventory. Any other difference is an accidental change — investigate before committing.

```
grep -rn "keyboardAware" src/
```

Expected: the prop definition in `BottomSheet.tsx`, its tests, and **exactly one** call site.

- [ ] **Step 3: Tick this plan and record deviations**

Mark completed steps `- [x]`. Record inline `> **DEVIATION:**` notes — especially:
- the provider placement you settled on, and why (Task 3 Step 1);
- **any gesture conflict between `KeyboardAwareScrollView` and `BottomSheet`'s pan handler**, even
  if you resolved it. Spec 7 depends on knowing this, and it is the single most valuable thing this
  pilot can discover.

- [ ] **Step 4: Update the backlog**

Add `D14` to [`../BACKLOG.md`](../BACKLOG.md) if not already present, with the analysis from spec §2
(uniform `height: 290`, 9 files, 8 behind the shared `BottomSheet`). Mark the pilot done and note
that **Spec 7 is blocked on human sign-off**, not merely unstarted.

- [ ] **Step 5: Update the spec's Agent DoD**

Tick §9's Agent DoD in
[`../specs/2026-08-09-spec-6-keyboard-avoidance.md`](../specs/2026-08-09-spec-6-keyboard-avoidance.md)
and add the completion date. Leave the Human DoD open — it is the gate.

- [ ] **Step 6: Commit**

```
git add docs/
git commit -m "docs: reconcile Spec 6 — keyboard avoidance pilot landed

One screen converted, 8 untouched, BottomSheet still defaults to the old
behavior. Records the provider placement and whether the keyboard-aware
scroll view conflicted with BottomSheet's pan gesture - the finding Spec
7's approach depends on.

Spec 7 (rollout) is blocked on hands-on validation, not merely
unstarted."
```

---

## Implementation notes

**Tasks:** 6 (Task 1 read-only). **Commits:** 5.

**Why this plan is unusually cautious about verification:** it is the only one in this effort that
adds a native module, and the only one whose correctness an agent genuinely cannot observe. `tsc`
and Jest prove nothing about whether a keyboard covers a field. Hence the Gradle gate in Task 2, the
queued inertness check in Task 3, and the blast-radius grep in Task 6.

**The agent/human split in this plan, stated plainly** — every item on the right is queued, never
attempted:

| Agent can verify | Only a human can verify |
|---|---|
| `tsc` clean, tests green | The app launches without crashing |
| Native module **links** (`./gradlew assembleDebug`) | The provider changed no layout |
| Exactly 8 fillers remain, 1 call site opted in | The field clears the keyboard |
| | No leftover gap on dismiss |
| | Swipe-to-close still works |

**Never run `npm run android:dev` from an agent.** It builds, installs, launches, and then holds
Metro in the foreground — it does not return. Use `./gradlew assembleDebug` for build verification
and queue everything that needs a running app.

**If a step fails:**
- Native build fails (Task 2 Step 3) → stop and report with the real Gradle output. Do not disable
  New Architecture, do not downgrade the library unilaterally, do not fall back to
  `KeyboardAvoidingView`. The approach hinges on this, and a quiet workaround here would recreate
  the very problem this spec exists to remove.
- The provider shifts layout (reported back from the queued check) → stop. Do not compensate with
  padding tweaks; that would bury a global change under a local patch.
- The sheet can no longer be swiped closed (reported back from the queued check) → the pan gesture
  and the scroll view are fighting. The library supports a custom `ScrollViewComponent` for
  gesture-handler integration. Record the conflict and the resolution as a deviation — Spec 7's
  approach depends on knowing this.

**Out of scope reminders:** the other 8 fillers, `ReviewSubmission.tsx`, deleting `filler.png`,
flipping the `BottomSheet` default, `KeyboardToolbar`, and the `scrollEnabled={false}` call sites.
All belong to Spec 7, after the user validates this screen.
