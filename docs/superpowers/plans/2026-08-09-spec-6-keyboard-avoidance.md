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

- [x] **Step 1: Confirm a clean starting point**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero `tsc` output**, **0 failures**.

- [x] **Step 2: Record the filler inventory you must NOT touch**

```
grep -rn "filler" src/ | wc -l
grep -rln "filler" src/
```

Record both numbers. Task 6 asserts the pilot's usages are gone and **everything else is
unchanged** — you need the "before" to prove the "after".

> **CORRECTION — the "nine files" figure in this spec and in `D14` is wrong.** Measured 2026-08-09:
> `grep -rn "filler" src/` → **39 hits across 14 files**; `grep -rl "filler.png" src/` → **13 files**
> that actually render the image. The 14th is `src/components/BottomSheet.tsx`, which only mentions
> "filler" in a doc comment.
>
> So Task 6's expected post-pilot count is **12 files still rendering `filler.png`**, not 8. The
> leverage argument is unchanged and if anything stronger — most of the 13 still sit behind the
> shared `BottomSheet`.

(No commit — read-only.)

---

## Task 2: Install the native module and prove it builds

**Files:** `package.json`, `package-lock.json`

- [x] **Step 1: Install via Expo so the version matches SDK 54**

```
npx expo install react-native-keyboard-controller
```

Do **not** use a bare `npm install` — `expo install` resolves the version compatible with the
installed SDK. Getting this wrong is the same class of mistake as the `jest-expo` drift fixed in
commit `6d08cdb`.

- [x] **Step 2: Check for peer/version complaints**

```
npx expo-doctor
```

Compare against the known-issue list in [`../BACKLOG.md`](../BACKLOG.md) `P0.5` (`N1`–`N5`). New
entries caused by this install must be resolved now or recorded; pre-existing ones stay as they are.

- [x] **Step 3: Prove the native module actually links — before writing any UI code**

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

> ## ✅ **GATE PASSED 2026-08-09 — but not the way this step says. Read this before re-running it.**
>
> **`./gradlew assembleDebug` cannot pass on this machine, and never will without changing the
> machine.** The native module was instead proven to link by an **EAS build on Linux**:
> `3f9666b9-e57b-4500-b7fe-83b14edf6c31`, profile `development`, commit `e8339b9`, status
> `finished`, APK produced. That is the gate this step exists to be — it just ran somewhere else.
>
> ### Why the local build is unreachable
>
> First attempt: **BUILD FAILED in 5m 34s**, on a Windows `MAX_PATH` limit:
>
> ```
> ninja: error: Stat(reactnativekeyboardcontroller_autolinked_build/CMakeFiles/
> react_codegen_reactnativekeyboardcontroller.dir/C_/saravafy/saravafy-mobile-app/node_modules/
> react-native-keyboard-controller/common/cpp/react/renderer/components/
> reactnativekeyboardcontroller/RNKCKeyboardBackgroundViewShadowNode.cpp.o):
> Filename longer than 260 characters
> ```
>
> CMake mirrors the full absolute source path underneath an already-deep `.cxx` directory, so the
> repo path appears **twice** and `reactnativekeyboardcontroller` **three times** — 367 characters
> against a 260 limit. The enabling condition is
> `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 0` on this machine, confirmed
> directly.
>
> Evidence it is environmental, not the library: every ninja error names a keyboard-controller path,
> **zero other modules failed**, and CMake configure *and* generate both succeeded — so autolinking
> wired the module up correctly. `npx expo install` resolved **1.18.5** (npm `latest` is 1.22.3), so
> it did consult the SDK 54 list rather than taking newest, and `expo-doctor` after the install was
> **byte-identical** to a pre-install control run: zero new complaints, `N1`–`N5` untouched.
>
> **`LongPathsEnabled` was then set to `1`** (via UAC, with the user's approval — it is still set,
> and is harmless and useful for git and node). **It did not help, and a reboot would not have
> helped either.** Windows also requires the *binary* to opt in via a `longPathAware` manifest
> element, and neither `ninja.exe` nor `cmake.exe` in the Android SDK's CMake 3.22.1 declares one —
> verified by grepping both binaries (`requestedExecutionLevel` is present, `longPathAware` is not).
> **Do not re-litigate this by rebooting and retrying.**
>
> ### No workarounds were applied
>
> New Architecture untouched (`newArchEnabled=true`), library not downgraded, no
> `KeyboardAvoidingView` fallback — the three anti-patterns this plan names. Nor was a fourth one
> improvised: Gradle/CMake config surgery to route around a machine setting is the same category of
> quiet hack.
>
> That option is also worse than it looks, which is why it was rejected rather than merely avoided:
> **`android/` is in `.gitignore` with zero tracked files.** The project uses Continuous Native
> Generation, so the folder is regenerated by `expo prebuild`. A `CMAKE_OBJECT_PATH_MAX` or
> `gradle.properties` edit would be untracked, invisible to CI and teammates, and lost on the next
> prebuild. Persisting it would mean writing and maintaining a config plugin in `app.config.ts`.
> Relocating the repo was checked too and is **insufficient alone** — the path contributes twice, so
> even `C:\sv` recovers only ~52 of the 107 excess characters.
>
> ### How the gate actually ran
>
> **User decision, 2026-08-09: verify on EAS.** `npm run eas:dev` builds on Linux, where `MAX_PATH`
> does not exist, and produces an installable APK directly. WSL was considered and rejected: it
> needs a duplicate Linux JDK/SDK/NDK, the repo would have to leave `/mnt/c` for tolerable build
> speed (colliding with [`CONVENTIONS.md`](../CONVENTIONS.md) §2, which bans `/mnt/c` paths), and it
> still would not help the device-side validation that actually gates the rollout.
>
> **Consequences for the rest of this plan, applied as it ran:**
> - Tasks 3 and 5 also call for `./gradlew assembleDebug`. Those calls were **waived** — the Agent
>   DoD for both became `tsc` clean plus Jest green, and native re-verification was **batched into a
>   single EAS build after Task 5** rather than run per task, to conserve the user's build quota.
> - The queued human checks now open with "install the EAS APK", not `npm run android:dev`.
>
> **What EAS proves and what it does not.** It proves the module compiles, links, and packages under
> SDK 54 with New Architecture. It does **not** prove the module *registers* at runtime — that is
> queue item 0.2, and it is a human check by necessity, exactly as this plan already said of Gradle.
>
> **For any future spec adding a native module here: the agent-side gate is a green EAS build, not
> `./gradlew`.** Budget for it — it costs build minutes and takes several minutes, so batch
> native-dependent work into as few builds as possible.
>
> Full transcript, including the pre-install `expo-doctor` control run:
> `.superpowers/sdd/2026-08-09-spec-6-keyboard-avoidance/task-2-report.md`.

- [x] **Step 4: Commit**

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

> **DEVIATION:** the message above was **not** used. It asserts the module was "verified to build and
> launch under New Architecture before any UI depends on it" — false at the moment of commit, since
> the local gate had just failed and the EAS build had not run. Commit `e8339b9` says instead what
> was actually true: the version resolution and `expo-doctor` results are verified, the local gate is
> unreachable and why, and verification moves to EAS. Writing the mandated message would have
> recorded a verification that never happened, which is the exact failure
> [`CONVENTIONS.md`](../CONVENTIONS.md) §3 exists to prevent.

---

## Task 3: Add the provider and prove it changes nothing

**File:** `app/_layout.tsx`

- [x] **Step 1: Check the library's documented provider placement**

Consult the library docs for where `KeyboardProvider` belongs relative to other providers. The
existing tree has `SafeAreaProvider` (~line 125) wrapping `QueryClientProvider` (~line 126), inside
a conditional `GestureHandlerRootView` (~line 85). Do not guess the nesting order — follow the docs.

> **RESULT — placement, and the one thing this cost two rounds to get right.**
>
> The prose docs are thin: they say only "wrap your app with `KeyboardProvider`" and name no other
> provider. The real ordering lives in the library's own example app, which nests
> `SafeAreaProvider > GestureHandlerRootView > KeyboardProvider > NavigationContainer`. That yields
> two invariants, and both hold here: **inside `SafeAreaProvider`, and inside the gesture root but
> above navigation.**
>
> ⚠️ **This app has `GestureHandlerRootView` *outside* `SafeAreaProvider` — the inverse of the
> example.** The docs never say that relative order matters, and `KeyboardProvider` lands inside both
> either way, so the placement is correct as-is and no existing provider was reordered. **But if the
> rollout spec hits inset weirdness, suspect this first.**
>
> **No props are passed — and the first stated reason for that was wrong.** The original note claimed
> the defaults are `false` and `false` is the layout-safe value. The library never forwards the raw
> props: `animated.tsx:246-248` passes `IS_EDGE_TO_EDGE || <prop>` for `statusBarTranslucent`,
> `navigationBarTranslucent` and `preserveEdgeToEdge`. On iOS `isEdgeToEdge()` is hardcoded `true`;
> on Android it reads the RN **core** `DeviceInfo.isEdgeToEdge` constant — not the
> `react-native-edge-to-edge` npm package that was originally checked for — and this app sets
> `edgeToEdgeEnabled: true` on RN 0.81.5. So those flags very likely arrive `true` regardless.
>
> Passing no props is still right, for a different reason: any value would be OR-ed away and would
> only trip a dev warning. Caught in review, corrected in `3d4a219`, and — more importantly — the
> **queued human check was repointed**: `true` is the expected state, so the validator is asked
> whether the native view does anything *beyond* the edge-to-edge the app already has, rather than
> hunting for a flag value that never appears.

- [x] **Step 2: Add `KeyboardProvider`**

Wrap per the documented placement. This step adds the provider **only** — no screen opts in yet.

- [x] **Step 3: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
cd android && ./gradlew assembleDebug
```

Expected: **zero output**, **0 failures**, `BUILD SUCCESSFUL`.

- [x] **Step 4: Queue the inertness check — you cannot perform it**

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

- [x] **Step 5: Commit**

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

- [x] **Step 1: Write the render-path tests first**

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

> ### 🔑 **The most valuable thing this pilot produced. Read before writing the rollout spec.**
>
> **The library's own shipped jest mock would have made the default-off test vacuous.**
> `node_modules/react-native-keyboard-controller/jest/index.js:106` reads
> `KeyboardAwareScrollView: ScrollView` — it aliases the component to React Native's *own*
> `ScrollView`. Under that mock the two branches are the **same object identity**, so the default-off
> test passes no matter which branch executes — *including if keyboard-aware silently became the
> default.* The one test guarding every other consumer would have been decoration.
>
> Fixed by keeping the library's mock as the base and overriding only that export with a distinct
> host component, then **proving it load-bearing by flipping the default to `true` and watching the
> test fail** (`Expected length: 1, Received length: 0`) before reverting. Confirmed independently at
> review against `node_modules`.
>
> **The rollout spec must not adopt the library's mock as-is** if it relies on distinguishing the two
> render paths.

- [x] **Step 2: Run and watch the opt-in test fail**

```
node node_modules/jest/bin/jest.js --testPathPattern=BottomSheet
```

Expected: the default and `wrapInScrollView={false}` tests pass (existing behavior); the
`keyboardAware` test fails (prop doesn't exist).

- [x] **Step 3: Implement the prop**

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

- [x] **Step 4: Verify**

```
node node_modules/jest/bin/jest.js
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

- [x] **Step 5: Commit**

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

- [x] **Step 1: Confirm this screen's filler is the workaround, not decoration**

```
grep -n "filler" src/components/AddMediumTagSheet.tsx
```

Expect three hits: the `require` (~25), the `<Image>` (~390), the style (~485). Confirm the image
renders **after** the form's action buttons and is `height: 290` — the signature of the workaround.
If it looks decorative instead, stop: the spec's premise is wrong for this screen.

- [x] **Step 2: Opt in**

Pass `keyboardAware` to this sheet's `BottomSheet`.

- [x] **Step 3: Delete the workaround from this screen only**

Remove all three: the `require`, the `<Image>`, the `filler` style entry.

Leave every other file's filler alone. Task 6 verifies exactly that.

> **FINDING — the pilot may be inert, and this is the first thing to check if it looks that way.**
> This screen passes **`scrollEnabled={false}`** to `BottomSheet`, alongside the new `keyboardAware`.
> In React Native that prop disables only *user dragging*; programmatic scrolling — which is what
> `KeyboardAwareScrollView` uses — still works. So it should be fine. **But this was not verified on
> a device**, and it is the most likely explanation if the field does not rise. If that turns out to
> be the cause, the library is not at fault: it is the combination of those two props, and it becomes
> a rollout-spec decision. Queued as item 0.3's named first suspect.
>
> Note this is exactly what Task 4 Step 3's `scrollEnabled` doc-comment update was gesturing at when
> it said the rollout revisits these call sites — the pilot screen turned out to be one of them.

> **DEVIATION (process, not outcome):** the implementing agent hit its session token limit
> mid-task — after making the code edit, before committing or touching the queue. The controller
> verified the uncommitted diff directly (all three filler pieces gone: the `require`, the `<Image>`,
> the style entry; `keyboardAware` added; the now-unused `Image` import removed; `tsc` clean, tests
> green) and committed it, then wrote the queue section itself. Recorded because the commit author
> and the agent that wrote the code are not the same actor here.

- [x] **Step 4: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
cd android && ./gradlew assembleDebug
```

Expected: **zero output**, **0 failures**, `BUILD SUCCESSFUL`.

- [x] **Step 5: Queue the human check — do not attempt to judge it yourself**

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

- [x] **Step 6: Commit**

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

- [x] **Step 1: Final verification**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [x] **Step 2: Prove the blast radius was exactly one screen**

```
grep -rln "filler" src/
```

Expected: **8 files**, and `AddMediumTagSheet.tsx` is **not** among them. Compare against Task 1
Step 2's inventory. Any other difference is an accidental change — investigate before committing.

> **RESULT — the expected number was wrong, and the first correction was wrong too.**
> `grep -rln "images/filler.png" src/` returns **11**; twelve rendered it before the pilot.
> `AddMediumTagSheet.tsx` is out of the list and nothing else changed.
>
> ⚠️ **Never size this from `grep -rln "filler" src/`.** That returns 13, because it also catches
> `BottomSheet.tsx`'s doc comment and `Terreiros.tsx:345`'s `image_cover_filler.png`, an unrelated
> cover placeholder. A correction published here on 2026-08-09 did exactly that and claimed
> "13 files / 12 remaining" — repeating, inside the fix, the error being fixed. Match on the asset
> path, not the word.
> `grep -rn "keyboardAware" src/` returns the prop definition, its tests, and **exactly one** call
> site — `AddMediumTagSheet.tsx:268`.
>
> **Second count correction, and it matters more than the first.** This plan's headline constraint
> says `BottomSheet` has **8 consumers**. The real figure is **19 files**, containing **35**
> `<BottomSheet` JSX sites — the 8 was the filler-form subset. The pilot's safety argument is
> unaffected (the default is off, and the default path is tested), but the rollout inherits those
> numbers, not 8.
>
> **DEVIATION — commit messages.** Task 4 Step 5's and Task 5 Step 6's mandated messages were not
> used verbatim. `a406520` carries the then-current 13/12 figures (now known to be 12/11) and adds
> the `scrollEnabled={false}` warning; `e82548c` permanently records "8 consumers" and "the other 7
> sheets", the pre-correction figure, now frozen in history. Nothing to do about the commits —
> noted so a reader of `git log` is not misled.
>
> **Rollout hazard not visible in this pilot: `onScroll` may not survive the swap.**
> `scrollProps.onScroll` feeds `scrollYRef`, which is the **only** gate on content-area
> swipe-to-close (`BottomSheet.tsx:389-393` requires offset ≤ 1px). In the aware branch that handler
> is forwarded into the library's Reanimated scroll view, which drives the same ref via
> `useScrollViewOffset` — mixing a JS `onScroll` with a Reanimated scroll subscription on one
> component is known-fragile. If `onScroll` is dropped, `scrollYRef` stays 0 and swipe-to-close stays
> armed mid-scroll. **Inert here** (the pilot screen disables scrolling, so the offset never leaves
> 0), but a real question for the rollout's scrollable sheets. Queue item 0.6 now asks for it.

```
grep -rn "keyboardAware" src/
```

Expected: the prop definition in `BottomSheet.tsx`, its tests, and **exactly one** call site.

- [x] **Step 3: Tick this plan and record deviations**

Mark completed steps `- [x]`. Record inline `> **DEVIATION:**` notes — especially:
- the provider placement you settled on, and why (Task 3 Step 1);
- **any gesture conflict between `KeyboardAwareScrollView` and `BottomSheet`'s pan handler**, even
  if you resolved it. Spec 7 depends on knowing this, and it is the single most valuable thing this
  pilot can discover.

- [x] **Step 4: Update the backlog**

Add `D14` to [`../BACKLOG.md`](../BACKLOG.md) if not already present, with the analysis from spec §2
(uniform `height: 290`, 9 files, 8 behind the shared `BottomSheet`). Mark the pilot done and note
that **Spec 7 is blocked on human sign-off**, not merely unstarted.

- [x] **Step 5: Update the spec's Agent DoD**

Tick §9's Agent DoD in
[`../specs/2026-08-09-spec-6-keyboard-avoidance.md`](../specs/2026-08-09-spec-6-keyboard-avoidance.md)
and add the completion date. Leave the Human DoD open — it is the gate.

- [x] **Step 6: Commit**

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
