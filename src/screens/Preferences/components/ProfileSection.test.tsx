import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

// ProfileSection's `!user` guard is what stops a logged-out render from
// showing the previous session's identity (name/email/avatar) and account
// actions (curator badges, "Modo Guardião" toggle, "Revisar envios" row).
// Those role/curator fields do not come from `user` directly: they come
// from useIsCurator / useIsDevMaster / useCuratorMode, hooks that each keep
// their own (react-query-backed) cache. Mocking those hooks to keep
// reporting "yes, curator" while `useAuth()` reports `user: null` is the
// per-hook analog of "warm QueryClient cache": it proves the guard, not the
// mere absence of data, is what keeps the account surface hidden. A test
// that only emptied everything (including these hooks) would pass with the
// guard deleted too, see task-5-report.md for the guard-removed run that
// proves this test fails for the right reason.
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/contexts/CuratorModeContext", () => ({
  useCuratorMode: jest.fn(),
}));
jest.mock("@/src/contexts/LoginPromptContext", () => ({
  useLoginPrompt: jest.fn(),
}));
jest.mock("@/src/hooks/useIsCurator", () => ({
  useIsCurator: jest.fn(),
}));
jest.mock("@/src/hooks/useIsDevMaster", () => ({
  useIsDevMaster: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { useLoginPrompt } from "@/src/contexts/LoginPromptContext";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useIsDevMaster } from "@/src/hooks/useIsDevMaster";

import { ProfileSection } from "./ProfileSection";

const mockUseAuth = useAuth as jest.Mock;
const mockUseCuratorMode = useCuratorMode as jest.Mock;
const mockUseLoginPrompt = useLoginPrompt as jest.Mock;
const mockUseIsCurator = useIsCurator as jest.Mock;
const mockUseIsDevMaster = useIsDevMaster as jest.Mock;

type ReactTestInstance = ReturnType<typeof TestRenderer.create>["root"];

function findByText(
  tree: ReactTestInstance,
  text: string
): ReactTestInstance | null {
  try {
    const instances = tree.findAllByType(Text);
    for (const instance of instances) {
      const children = instance.props.children;
      const flat = Array.isArray(children)
        ? children.join("")
        : String(children ?? "");
      if (flat.includes(text)) return instance;
    }
  } catch {
    // ignore
  }
  return null;
}

// A previous session's user, plus role hooks warmed as if that session was
// (and, without the guard, would remain) a curator/dev-master. This is the
// data the guard has to suppress.
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

async function renderProfileSection(variant: "light" | "dark" = "light") {
  let renderer!: ReturnType<typeof TestRenderer.create>;
  await act(async () => {
    renderer = TestRenderer.create(<ProfileSection variant={variant} />);
    // @expo/vector-icons' Icon loads its font asynchronously in
    // componentDidMount and then calls setState; draining here keeps that
    // inside this act(...) instead of firing after the test process has
    // torn down (see AddToCollectionFlow.test.tsx for the same note).
    await flushPromises();
  });
  return renderer;
}

describe("ProfileSection", () => {
  const activeRenderers: Array<ReturnType<typeof TestRenderer.create>> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoginPrompt.mockReturnValue({ openLoginSheet: jest.fn() });
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

  it("logged out with warm role cache: shows no identity and no account action", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    // Warm cache: role hooks still resolve "yes" even though auth is null,
    // simulating stale/cached data from before logout.
    mockUseIsCurator.mockReturnValue({
      isCurator: true,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseIsDevMaster.mockReturnValue({ isDevMaster: true, isLoading: false });
    mockUseCuratorMode.mockReturnValue({
      curatorModeEnabled: true,
      isSaving: false,
      setCuratorModeEnabled: jest.fn(),
    });

    const renderer = await renderProfileSection();
    activeRenderers.push(renderer);

    expect(findByText(renderer.root, "priorsession@example.com")).toBeNull();
    expect(findByText(renderer.root, "Maria Prévia")).toBeNull();
    expect(findByText(renderer.root, "Pessoa Guardiã do Acervo")).toBeNull();
    expect(findByText(renderer.root, "Dev Master")).toBeNull();
    expect(findByText(renderer.root, "Modo Guardião")).toBeNull();
    expect(findByText(renderer.root, "Revisar envios")).toBeNull();

    // The guard's own safe fallback content is what should show instead.
    expect(
      findByText(renderer.root, "Entre para ver suas preferências e terreiros.")
    ).not.toBeNull();
    expect(findByText(renderer.root, "Entrar")).not.toBeNull();
  });

  it("logged in: renders identity and account actions normally", async () => {
    mockUseAuth.mockReturnValue({ user: priorSessionUser });
    mockUseIsCurator.mockReturnValue({
      isCurator: true,
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseIsDevMaster.mockReturnValue({ isDevMaster: true, isLoading: false });
    mockUseCuratorMode.mockReturnValue({
      curatorModeEnabled: true,
      isSaving: false,
      setCuratorModeEnabled: jest.fn(),
    });

    const renderer = await renderProfileSection();
    activeRenderers.push(renderer);

    expect(findByText(renderer.root, "Maria Prévia")).not.toBeNull();
    expect(findByText(renderer.root, "priorsession@example.com")).not.toBeNull();
    expect(findByText(renderer.root, "Pessoa Guardiã do Acervo")).not.toBeNull();
    expect(findByText(renderer.root, "Dev Master")).not.toBeNull();
    expect(findByText(renderer.root, "Modo Guardião")).not.toBeNull();
    expect(findByText(renderer.root, "Revisar envios")).not.toBeNull();
    expect(findByText(renderer.root, "Entrar")).toBeNull();
  });
});
