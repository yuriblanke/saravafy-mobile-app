import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// TabsHeaderWithPreferences.tsx is ~3,164 lines and exports two components:
// `TabsHeaderWithPreferences` (the global tabs header, reachable, rendered
// on every screen) and the nested `PreferencesOverlaySheets` (an overlay
// whose `openPreferences` has zero call sites anywhere in the app, see
// task-5-report.md for the ambiguity this created and why this file tests
// the reachable one). The guard under test lives in
// `TabsHeaderWithPreferences` at the `{!user ? <LoginButton/> : <AvatarTrigger/>}`
// ternary: it decides whether the header shows a generic "Entrar" button or
// an avatar affordance that opens Preferences (an account action).
//
// Unlike ProfileSection, the avatar/initials shown here are computed
// directly from the live `user` object on every render: nothing is read
// from the QueryClient for this branch (prewarmPreferences only *writes* to
// the cache, on tap, after the guard has already decided what to show). So
// there is no cache key to poison for a meaningful "warm cache" test here;
// the QueryClientProvider below is present only because the component calls
// `useQueryClient()`, not because seeded data drives what's asserted. This
// is called out explicitly in task-5-report.md.
//
// Both `TabsHeaderWithPreferences` and `PreferencesOverlaySheets` share this
// file's top-level imports, which is why several unrelated hooks/contexts
// are mocked below: importing the file at all evaluates those imports even
// though this test never renders `PreferencesOverlaySheets`. The known
// obstacle is `@/contexts/PreferencesContext`, which imports
// `@react-native-async-storage/async-storage`; `@/contexts/ToastContext`
// (via react-native-reanimated) and `@/lib/supabase` (via AsyncStorage) are
// mocked for the same reason.
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/contexts/CuratorModeContext", () => ({
  useCuratorMode: jest.fn(() => ({
    curatorModeEnabled: false,
    isLoading: false,
    isSaving: false,
    setCuratorModeEnabled: jest.fn(),
  })),
}));
jest.mock("@/contexts/PreferencesContext", () => ({
  usePreferences: jest.fn(() => ({
    themeMode: "light",
    setThemeMode: jest.fn(),
    effectiveTheme: "light",
    curimbaEnabled: false,
    setCurimbaEnabled: jest.fn(),
    curimbaOnboardingDismissed: false,
    setCurimbaOnboardingDismissed: jest.fn(),
    startPagePreference: null,
  })),
}));
jest.mock("@/contexts/TabControllerContext", () => ({
  useTabController: jest.fn(() => ({
    goToTab: jest.fn(),
    registerGoToTab: jest.fn(() => () => {}),
  })),
}));
jest.mock("@/contexts/ToastContext", () => ({
  useToast: jest.fn(() => ({
    showToast: jest.fn(),
    dismissToast: jest.fn(),
    clearToasts: jest.fn(),
  })),
}));
jest.mock("@/lib/supabase", () => ({
  supabase: {},
}));
jest.mock("@/src/contexts/GlobalSafeAreaInsetsContext", () => ({
  useGlobalSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
}));
jest.mock("@/src/contexts/LoginPromptContext", () => ({
  useLoginPrompt: jest.fn(() => ({ openLoginSheet: jest.fn() })),
}));
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), dismissTo: jest.fn() })),
  usePathname: jest.fn(() => "/"),
  useSegments: jest.fn(() => []),
}));
// `BottomSheet` (pulled in transitively for `PreferencesOverlaySheets`, the
// other export of this file, not for the component under test) imports
// `react-native-keyboard-controller`, which throws "doesn't seem to be
// linked" under Jest without its own shipped mock. Same fix as
// BottomSheet.test.tsx.
jest.mock("react-native-keyboard-controller", () => ({
  ...jest.requireActual("react-native-keyboard-controller/jest"),
}));

import { useAuth } from "@/contexts/AuthContext";

import { TabsHeaderWithPreferences } from "./TabsHeaderWithPreferences";

const mockUseAuth = useAuth as jest.Mock;

type ReactTestInstance = ReturnType<typeof TestRenderer.create>["root"];

function findByAccessibilityLabel(
  tree: ReactTestInstance,
  label: string
): ReactTestInstance[] {
  return tree.findAll(
    (node) =>
      typeof node.props?.onPress === "function" &&
      node.props?.accessibilityLabel === label
  );
}

const priorSessionUser = {
  id: "user-prev-1",
  email: "priorsession@example.com",
  user_metadata: {
    name: "Maria Prévia",
    avatar_url: "https://example.com/avatar.jpg",
  },
} as any;

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  let renderer!: ReturnType<typeof TestRenderer.create>;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <TabsHeaderWithPreferences />
      </QueryClientProvider>
    );
    // @expo/vector-icons' Icon loads its font asynchronously in
    // componentDidMount and then calls setState; draining here keeps that
    // inside this act(...) instead of firing after (see
    // AddToCollectionFlow.test.tsx for the same note).
    await flushPromises();
  });
  return { renderer, queryClient };
}

describe("TabsHeaderWithPreferences", () => {
  const activeRenderers: Array<ReturnType<typeof TestRenderer.create>> = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    while (activeRenderers.length) {
      const renderer = activeRenderers.pop()!;
      await act(async () => {
        renderer.unmount();
        await flushPromises();
      });
    }
  });

  it("logged out: shows the login affordance, not the account avatar", async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { renderer } = await renderHeader();
    activeRenderers.push(renderer);

    expect(findByAccessibilityLabel(renderer.root, "Entrar")).toHaveLength(1);
    expect(
      findByAccessibilityLabel(renderer.root, "Abrir preferências")
    ).toHaveLength(0);
  });

  it("logged in: shows the account avatar affordance, not the login button", async () => {
    mockUseAuth.mockReturnValue({ user: priorSessionUser });

    const { renderer } = await renderHeader();
    activeRenderers.push(renderer);

    expect(
      findByAccessibilityLabel(renderer.root, "Abrir preferências")
    ).toHaveLength(1);
    expect(findByAccessibilityLabel(renderer.root, "Entrar")).toHaveLength(0);
  });
});
