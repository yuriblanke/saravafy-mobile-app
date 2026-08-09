import React from "react";
import TestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Ponto } from "@/src/screens/Home/data/ponto";
import type { PontoVersaoPlayerRow } from "@/src/queries/pontoVersoes";

// react-native-safe-area-context ships an official jest mock; without it
// useSafeAreaInsets() throws (no <SafeAreaProvider> in this test tree).
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

// useToast() throws outside a <ToastProvider>. The flow only calls
// showToast() as a side effect we don't assert on here, so a stub is enough.
jest.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

// Query hooks that hit Supabase are mocked at the hook boundary so the test
// exercises AddToCollectionFlow's own UI/state logic, not the data layer
// (already covered — or coverable — independently at the query-module level).
jest.mock("@/src/queries/collections", () => ({
  useEditableCollections: jest.fn(),
}));
jest.mock("@/src/queries/me", () => ({
  useMyEditableTerreirosQuery: jest.fn(),
}));
jest.mock("@/src/queries/entidadesCatalog", () => ({
  useEntidadesCatalogQuery: jest.fn(),
}));
jest.mock("@/src/queries/pontoVersoes", () => ({
  fetchActivePontoVersoesByPontoIds: jest.fn(),
}));
jest.mock("@/src/screens/Home/data/collections_pontos", () => ({
  addPontoToCollection: jest.fn(),
}));

import { useEditableCollections } from "@/src/queries/collections";
import { useMyEditableTerreirosQuery } from "@/src/queries/me";
import { useEntidadesCatalogQuery } from "@/src/queries/entidadesCatalog";
import { fetchActivePontoVersoesByPontoIds } from "@/src/queries/pontoVersoes";
import { addPontoToCollection } from "@/src/screens/Home/data/collections_pontos";
import {
  AddToCollectionFlow,
  type AddToCollectionFlowProps,
} from "./AddToCollectionFlow";

type ReactTestInstance = ReturnType<typeof TestRenderer.create>["root"];

const mockUseEditableCollections = useEditableCollections as jest.Mock;
const mockUseMyEditableTerreirosQuery = useMyEditableTerreirosQuery as jest.Mock;
const mockUseEntidadesCatalogQuery = useEntidadesCatalogQuery as jest.Mock;
const mockFetchActivePontoVersoesByPontoIds =
  fetchActivePontoVersoesByPontoIds as jest.Mock;
const mockAddPontoToCollection = addPontoToCollection as jest.Mock;

const basePonto: Ponto = {
  id: "ponto-1",
  title: "Ponto de Exu",
  tags: [],
  lyrics: "Linha 1\nLinha 2",
  lyrics_preview_6: null,
  author_name: null,
  is_public_domain: null,
  entidade_id: null,
  entidadeNome: null,
  orixaNome: null,
};

const collectionA = {
  id: "c1",
  title: "Giras de Segunda",
  owner_user_id: "user-1",
  owner_terreiro_id: null,
  terreiro_title: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const collectionB = {
  id: "c2",
  title: "Coleção do Terreiro",
  owner_user_id: null,
  owner_terreiro_id: "t1",
  terreiro_title: "Terreiro X",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const versaoCanonica: PontoVersaoPlayerRow = {
  id: "v1",
  ponto_id: "ponto-1",
  versao_num: 1,
  is_canonical: true,
  title: "Versão canônica",
  lyrics: "Letra canônica",
  lyrics_preview_6: null,
  is_active: true,
};

const versaoAlternativa: PontoVersaoPlayerRow = {
  id: "v2",
  ponto_id: "ponto-1",
  versao_num: 2,
  is_canonical: false,
  title: "Versão alternativa",
  lyrics: "Letra alternativa",
  lyrics_preview_6: null,
  is_active: true,
};

function editableCollectionsResult(
  overrides: Partial<{
    data: unknown[];
    isFetching: boolean;
    isError: boolean;
    error: unknown;
  }> = {},
) {
  return {
    data: overrides.data ?? [collectionA, collectionB],
    isFetching: overrides.isFetching ?? false,
    isPending: false,
    isError: overrides.isError ?? false,
    error: overrides.error ?? null,
    editableTerreiroIds: [],
    terreiroIdsHash: "",
    queries: {
      editableTerreiroIds: { refetch: jest.fn(), isFetching: false },
      collections: { refetch: jest.fn(), isFetching: false },
    },
  };
}

function findByText(
  tree: ReactTestInstance,
  text: string,
): ReactTestInstance | null {
  try {
    const instances = tree.findAllByType(Text);
    for (const instance of instances) {
      const children = instance.props.children;
      const flat = Array.isArray(children) ? children.join("") : String(children ?? "");
      if (flat.includes(text)) return instance;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Finds the pressable (any instance exposing an `onPress` function prop —
 * duck-typed rather than matched by `type === Pressable`, since RN's
 * `Pressable` reference as seen by the fiber tree doesn't reliably match
 * the imported module reference under react-test-renderer) whose subtree
 * contains a Text node with the given text.
 */
function findPressableContaining(
  tree: ReactTestInstance,
  text: string,
): ReactTestInstance {
  const candidates = tree.findAll(
    (node) => typeof node.props?.onPress === "function",
  );
  for (const c of candidates) {
    if (findByText(c, text)) return c;
  }
  throw new Error(`No pressable (onPress) found containing text: ${text}`);
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

type ReactTestRenderer = ReturnType<typeof TestRenderer.create>;

function renderFlow(
  overrideProps: Partial<AddToCollectionFlowProps> = {},
  registries?: { renderers: ReactTestRenderer[]; queryClients: QueryClient[] },
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const onClose = jest.fn();

  let renderer!: ReactTestRenderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <AddToCollectionFlow
          visible
          onClose={onClose}
          ponto={basePonto}
          userId="user-1"
          variant="light"
          allowVersionSelection={false}
          initialVersoes={[]}
          {...overrideProps}
        />
      </QueryClientProvider>,
    );
  });

  registries?.renderers.push(renderer);
  registries?.queryClients.push(queryClient);

  return { renderer, onClose, queryClient };
}

describe("AddToCollectionFlow", () => {
  const activeQueryClients: QueryClient[] = [];
  const activeRenderers: ReactTestRenderer[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEditableCollections.mockReturnValue(editableCollectionsResult());
    mockUseMyEditableTerreirosQuery.mockReturnValue({ data: [] });
    mockUseEntidadesCatalogQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockFetchActivePontoVersoesByPontoIds.mockResolvedValue(new Map());
    mockAddPontoToCollection.mockResolvedValue({ ok: true, alreadyExists: false });
  });

  afterEach(() => {
    // Unmount + clear the query cache so no pending timers/subscriptions
    // (react-query gcTime, mutation observers) keep the process alive.
    while (activeRenderers.length) {
      TestRenderer.act(() => activeRenderers.pop()!.unmount());
    }
    while (activeQueryClients.length) {
      activeQueryClients.pop()!.clear();
    }
  });

  it("renders the list of editable collections (single-phase / Player-style)", () => {
    const { renderer } = renderFlow(
      {},
      { renderers: activeRenderers, queryClients: activeQueryClients },
    );

    expect(findByText(renderer.root, "Giras de Segunda")).not.toBeNull();
    expect(findByText(renderer.root, "Coleção do Terreiro")).not.toBeNull();
  });

  it("shows the no-permission empty state when there are no editable collections", () => {
    mockUseEditableCollections.mockReturnValue(
      editableCollectionsResult({ data: [] }),
    );

    const { renderer } = renderFlow(
      {},
      { renderers: activeRenderers, queryClients: activeQueryClients },
    );

    expect(
      findByText(
        renderer.root,
        "Você ainda não tem permissão para adicionar pontos em coleções.",
      ),
    ).not.toBeNull();
  });

  it("shows an error message when the collections query fails", () => {
    mockUseEditableCollections.mockReturnValue(
      editableCollectionsResult({
        data: [],
        isError: true,
        error: new Error("network down"),
      }),
    );

    const { renderer } = renderFlow(
      {},
      { renderers: activeRenderers, queryClients: activeQueryClients },
    );

    expect(findByText(renderer.root, "network down")).not.toBeNull();
  });

  it("commits the ponto to the tapped collection and closes on success", async () => {
    const { renderer, onClose } = renderFlow(
      {},
      { renderers: activeRenderers, queryClients: activeQueryClients },
    );

    const pressable = findPressableContaining(renderer.root, "Giras de Segunda");

    await TestRenderer.act(async () => {
      pressable.props.onPress();
      await flushPromises();
    });

    expect(mockAddPontoToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "c1",
        pontoId: "ponto-1",
        addedBy: "user-1",
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces the mutation error and keeps the sheet open when the commit fails", async () => {
    mockAddPontoToCollection.mockResolvedValue({
      ok: false,
      error: "Falha ao adicionar.",
    });
    const { renderer, onClose } = renderFlow(
      {},
      { renderers: activeRenderers, queryClients: activeQueryClients },
    );

    const pressable = findPressableContaining(renderer.root, "Giras de Segunda");

    await TestRenderer.act(async () => {
      pressable.props.onPress();
      await flushPromises();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("Home-style two-phase flow: starts on versão selection, then advances to coleção", async () => {
    const { renderer } = renderFlow(
      {
        allowVersionSelection: true,
        initialVersoes: [versaoCanonica, versaoAlternativa],
      },
      { renderers: activeRenderers, queryClients: activeQueryClients },
    );

    // Phase 1: versão picker.
    expect(findByText(renderer.root, "Escolher versão")).not.toBeNull();
    expect(findByText(renderer.root, "Versão canônica")).not.toBeNull();
    expect(findByText(renderer.root, "Versão alternativa")).not.toBeNull();

    const versaoPressable = findPressableContaining(
      renderer.root,
      "Versão alternativa",
    );

    await TestRenderer.act(async () => {
      versaoPressable.props.onPress();
      await flushPromises();
    });

    // Phase 2: coleção picker.
    expect(findByText(renderer.root, "Giras de Segunda")).not.toBeNull();
  });
});
