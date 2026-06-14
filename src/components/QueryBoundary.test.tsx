import React from "react";
import TestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { QueryBoundary } from "./QueryBoundary";

type ReactTestInstance = ReturnType<typeof TestRenderer.create>["root"];
type ReactTestRenderer = ReturnType<typeof TestRenderer.create>;

type Q<T> = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
};

function q<T>(over: Partial<Q<T>>): Q<T> {
  return { isLoading: false, isError: false, error: null, data: undefined, ...over };
}

function findByTestId(tree: ReactTestInstance, testID: string): ReactTestInstance | null {
  try {
    return tree.findByProps({ testID });
  } catch {
    return null;
  }
}

function findByText(tree: ReactTestInstance, text: string): ReactTestInstance | null {
  try {
    return tree.findByProps({ children: text });
  } catch {
    // Try to find Text component containing this text
    try {
      const instances = tree.findAllByType(Text);
      for (const instance of instances) {
        const children = instance.props.children;
        const childrenStr = Array.isArray(children) ? children.join("") : String(children || "");
        if (childrenStr.includes(text)) {
          return instance;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

describe("QueryBoundary", () => {
  it("renders default loading when isLoading=true and no data", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary query={q<string>({ isLoading: true })}>
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByTestId(result!.root, "query-boundary-loading")).not.toBeNull();
  });

  it("renders default error when isError=true and no data", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary query={q<string>({ isError: true, error: new Error("boom") })}>
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "boom")).not.toBeNull();
  });

  it("renders children when data is present", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary query={q<string>({ data: "hello" })}>
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "hello")).not.toBeNull();
  });

  it("renders emptyState when empty predicate returns true", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary
          query={q<string[]>({ data: [] })}
          empty={(d) => d.length === 0}
          emptyState={<Text>nothing</Text>}
        >
          {(d) => <Text>{d.join(",")}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "nothing")).not.toBeNull();
  });

  it("stale-while-revalidate: renders children when data present even if isLoading=true", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary query={q<string>({ isLoading: true, data: "stale" })}>
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "stale")).not.toBeNull();
    expect(findByTestId(result!.root, "query-boundary-loading")).toBeNull();
  });

  it("renders children when isError=true but data is present", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary
          query={q<string>({ isError: true, error: new Error("x"), data: "cached" })}
        >
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "cached")).not.toBeNull();
  });

  it("uses custom loading slot when provided", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary
          query={q<string>({ isLoading: true })}
          loading={<Text>custom-loading</Text>}
        >
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "custom-loading")).not.toBeNull();
  });

  it("uses custom error renderer when provided", () => {
    let result: ReactTestRenderer | undefined;
    TestRenderer.act(() => {
      result = TestRenderer.create(
        <QueryBoundary
          query={q<string>({ isError: true, error: new Error("e") })}
          error={(e) => <Text>err:{(e as Error).message}</Text>}
        >
          {(d) => <Text>{d}</Text>}
        </QueryBoundary>,
      );
    });
    expect(findByText(result!.root, "err:e")).not.toBeNull();
  });
});
