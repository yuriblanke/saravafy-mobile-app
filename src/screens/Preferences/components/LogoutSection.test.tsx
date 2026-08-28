import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";

// LogoutSection's `!user` guard is what stops a logged-out render from
// showing the "Sair" (log out) account action. Unlike ProfileSection, the
// guarded content here does not come from any query cache at all: the
// button is either rendered or it isn't, purely based on `user`. So the
// "warm cache" analog for this component is simpler: keep everything else
// (mocks, environment) identical between the two tests and only flip
// `user`, proving the guard alone (not an emptied environment) is what
// hides the button. See task-5-report.md for the guard-removed run.
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/contexts/ToastContext", () => ({
  useToast: jest.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import { LogoutSection } from "./LogoutSection";

const mockUseAuth = useAuth as jest.Mock;
const mockUseToast = useToast as jest.Mock;

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

function findPressablesWithAccessibilityLabel(
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
} as any;

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderLogoutSection(variant: "light" | "dark" = "light") {
  let renderer!: ReturnType<typeof TestRenderer.create>;
  await act(async () => {
    renderer = TestRenderer.create(<LogoutSection variant={variant} />);
    // @expo/vector-icons' Icon loads its font asynchronously in
    // componentDidMount and then calls setState; draining here keeps that
    // inside this act(...) instead of firing after the test process has
    // torn down (which otherwise logs a stray "Jest environment has been
    // torn down" error, see AddToCollectionFlow.test.tsx for the same
    // note).
    await flushPromises();
  });
  return renderer;
}

describe("LogoutSection", () => {
  const activeRenderers: Array<ReturnType<typeof TestRenderer.create>> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
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

  it("logged out: shows no logout action (nothing rendered at all)", async () => {
    mockUseAuth.mockReturnValue({ user: null, signOut: jest.fn() });

    const renderer = await renderLogoutSection();
    activeRenderers.push(renderer);

    expect(findByText(renderer.root, "Sair")).toBeNull();
    expect(
      findPressablesWithAccessibilityLabel(renderer.root, "Sair")
    ).toHaveLength(0);
    // The guard is a bare `return null`: the component contributes nothing
    // to the tree at all when logged out. (`toJSON` isn't in this repo's
    // hand-rolled react-test-renderer.d.ts shim, so it's read off the
    // renderer untyped rather than widening that ambient declaration.)
    expect((renderer as any).toJSON()).toBeNull();
  });

  it("logged in: renders the logout action normally", async () => {
    mockUseAuth.mockReturnValue({ user: priorSessionUser, signOut: jest.fn() });

    const renderer = await renderLogoutSection();
    activeRenderers.push(renderer);

    expect(findByText(renderer.root, "Sair")).not.toBeNull();
    expect(
      findPressablesWithAccessibilityLabel(renderer.root, "Sair")
    ).toHaveLength(1);
  });
});
