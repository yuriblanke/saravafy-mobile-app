import React from "react";
import TestRenderer from "react-test-renderer";
import { ScrollView, Text } from "react-native";

import { spacing } from "@/src/theme";
import { BottomSheet } from "./BottomSheet";

// `react-native-keyboard-controller` ships its own jest mock, and we use it as the
// base here. It does have one property that defeats this file, though: it aliases
// `KeyboardAwareScrollView` straight to RN's `ScrollView`, so under that mock the
// two render paths are literally the same component and the default-off test below
// could never fail. That test is the whole point of the flag — it is what proves
// the other 7 BottomSheet consumers are untouched by the pilot — so we keep the
// library's mock for everything else and override only that one export with a
// distinct host component, so the tree tells the two paths apart.
jest.mock("react-native-keyboard-controller", () => ({
  ...jest.requireActual("react-native-keyboard-controller/jest"),
  KeyboardAwareScrollView: "KeyboardAwareScrollView",
}));

// BottomSheet only wants `dismissAllTooltips`, but importing TooltipPopover for it
// pulls in PreferencesContext -> AsyncStorage, whose native module is null under
// jest. Nothing in these tests fires a scroll, so a no-op is faithful.
jest.mock("@/src/components/TooltipPopover", () => ({
  dismissAllTooltips: jest.fn(),
}));

type ReactTestRenderer = ReturnType<typeof TestRenderer.create>;

const KEYBOARD_AWARE = "KeyboardAwareScrollView";
const CHILD_TEXT = "sheet-child";

function render(ui: React.ReactElement): ReactTestRenderer {
  let result: ReactTestRenderer | undefined;
  TestRenderer.act(() => {
    result = TestRenderer.create(ui);
  });
  return result!;
}

describe("BottomSheet render paths", () => {
  it("renders children in a plain ScrollView by default", () => {
    const result = render(
      // `keyboardAware` deliberately omitted: this is the path every existing
      // call site takes, and it must stay a plain ScrollView.
      <BottomSheet visible onClose={() => {}} variant="dark">
        <Text>{CHILD_TEXT}</Text>
      </BottomSheet>,
    );

    const plainScrolls = result.root.findAllByType(ScrollView);
    expect(plainScrolls).toHaveLength(1);
    expect(result.root.findAllByType(KEYBOARD_AWARE)).toHaveLength(0);

    // No keyboard-aware tuning leaks into the default path.
    expect(plainScrolls[0].props.bottomOffset).toBeUndefined();

    // Children land inside that ScrollView, not merely somewhere in the tree.
    const texts = plainScrolls[0].findAllByType(Text);
    expect(texts).toHaveLength(1);
    expect(texts[0].props.children).toBe(CHILD_TEXT);
  });

  it("renders children in a keyboard-aware scroll view when opted in", () => {
    const result = render(
      <BottomSheet visible onClose={() => {}} variant="dark" keyboardAware>
        <Text>{CHILD_TEXT}</Text>
      </BottomSheet>,
    );

    const awareScrolls = result.root.findAllByType(KEYBOARD_AWARE);
    expect(awareScrolls).toHaveLength(1);
    expect(result.root.findAllByType(ScrollView)).toHaveLength(0);

    expect(awareScrolls[0].props.bottomOffset).toBe(spacing.lg);

    // The swap forwards the props the plain ScrollView already received.
    expect(awareScrolls[0].props.scrollEnabled).toBe(true);
    expect(awareScrolls[0].props.showsVerticalScrollIndicator).toBe(false);

    const texts = awareScrolls[0].findAllByType(Text);
    expect(texts).toHaveLength(1);
    expect(texts[0].props.children).toBe(CHILD_TEXT);
  });

  it("renders children without a scroll wrapper when wrapInScrollView is false", () => {
    const result = render(
      <BottomSheet
        visible
        onClose={() => {}}
        variant="dark"
        wrapInScrollView={false}
      >
        <Text>{CHILD_TEXT}</Text>
      </BottomSheet>,
    );

    expect(result.root.findAllByType(ScrollView)).toHaveLength(0);
    expect(result.root.findAllByType(KEYBOARD_AWARE)).toHaveLength(0);

    const texts = result.root.findAllByType(Text);
    expect(texts).toHaveLength(1);
    expect(texts[0].props.children).toBe(CHILD_TEXT);
  });
});
