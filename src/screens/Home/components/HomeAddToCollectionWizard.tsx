import { EntidadePlaceholderSheet } from "@/src/components/collections/EntidadePlaceholderSheet";
import { lyricsHasEntidadePlaceholder } from "@/src/domain/entidadePlaceholder";
import type { EditableCollection } from "@/src/queries/collections";
import { useEntidadesCatalogQuery } from "@/src/queries/entidadesCatalog";
import { fetchActivePontoVersoesByPontoIds } from "@/src/queries/pontoVersoes";
import {
  getErrorMessage,
  resolveDefaultPontoVersaoId,
  versaoCardTitle,
  type ListPonto,
} from "@/src/screens/CollectionAddToCollection/addToCollectionModel";
import type { CollectionPontoEntidadeInput } from "@/src/screens/Home/data/collections_pontos";
import type { Ponto } from "@/src/screens/Home/data/ponto";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type HomeAddCommitPayload = {
  collectionId: string;
  pontoId: string;
  pontoVersaoId: string | null;
  entidade: CollectionPontoEntidadeInput | null;
  entidadeResolvedLabel: string | null;
  listPonto: ListPonto;
  homePontoSnapshot: Ponto;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  ponto: Ponto | null;
  userId: string | null;
  variant: "light" | "dark";
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  collectionsError: string | null;
  visibleCollections: EditableCollection[];
  /** Total de coleções editáveis (antes do filtro), para empty state “nenhuma nesse filtro”. */
  totalEditableCollectionsCount: number;
  collectionsLoading: boolean;
  getCollectionOwnerLabel: (c: EditableCollection) => string;
  isAdding: boolean;
  isCreatingCollection: boolean;
  addError: string | null;
  addSuccess: boolean;
  onRetryLoadCollections: () => void;
  onCommit: (payload: HomeAddCommitPayload) => Promise<void>;
  /** Filtro de coleções + “Nova coleção” (só no passo final). */
  colecaoToolbar?: ReactNode;
};

function homePontoToListPontoBase(p: Ponto): ListPonto {
  return {
    id: p.id,
    title: p.title,
    tags: Array.isArray(p.tags) ? p.tags : [],
    lyrics: p.lyrics,
    lyrics_preview_6: p.lyrics_preview_6 ?? null,
    entidadeNome: p.entidadeNome ?? null,
    orixaNome: p.orixaNome ?? null,
    versoes: [],
  };
}

function VersaoPickerRows(props: {
  ponto: ListPonto;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  defaultHighlightId: string | null;
  onPick: (versaoId: string, lp: ListPonto) => void;
}) {
  const {
    ponto,
    textPrimary,
    textSecondary,
    textMuted,
    borderColor,
    defaultHighlightId,
    onPick,
  } = props;
  const sheetPonto = ponto;

  return (
    <>
      {sheetPonto.versoes.map((v) => {
        const rowTitle = versaoCardTitle(v, sheetPonto.title);
        const lyricsBody =
          typeof v.lyrics === "string" && v.lyrics.length > 0 ? v.lyrics : "—";
        const highlighted =
          defaultHighlightId != null && defaultHighlightId === v.id;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityLabel={`Usar versão: ${rowTitle}`}
            onPress={() => onPick(v.id, sheetPonto)}
            style={({ pressed }) => [
              styles.versaoRow,
              {
                borderColor: highlighted ? textPrimary : borderColor,
                borderWidth: highlighted ? 2 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.versaoRowTitle, { color: textPrimary }]}
                numberOfLines={2}
              >
                {rowTitle}
                {v.is_canonical ? (
                  <Text style={{ color: textMuted, fontWeight: "600" }}>
                    {" "}
                    · canônica
                  </Text>
                ) : null}
              </Text>
              <Text style={[styles.versaoRowMeta, { color: textSecondary }]}>
                Versão {v.versao_num} de {sheetPonto.versoes.length}
              </Text>
              <Text
                style={[styles.versaoRowLyricsFull, { color: textSecondary }]}
              >
                {lyricsBody}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={textPrimary} />
          </Pressable>
        );
      })}
    </>
  );
}

export function HomeAddToCollectionWizard(props: Props) {
  const {
    visible,
    onClose,
    ponto,
    userId,
    variant,
    textPrimary,
    textSecondary,
    textMuted,
    borderColor,
    collectionsError,
    visibleCollections,
    totalEditableCollectionsCount,
    collectionsLoading,
    getCollectionOwnerLabel,
    isAdding,
    isCreatingCollection,
    addError,
    addSuccess,
    onRetryLoadCollections,
    onCommit,
    colecaoToolbar,
  } = props;

  const [phase, setPhase] = useState<"versao" | "colecao">("versao");
  const [entidadePickerCtx, setEntidadePickerCtx] = useState<{
    ponto: ListPonto;
    pontoVersaoId: string;
  } | null>(null);
  const [pendingCommit, setPendingCommit] = useState<{
    listPonto: ListPonto;
    pontoVersaoId: string | null;
    entidade: CollectionPontoEntidadeInput | null;
    entidadeResolvedLabel: string | null;
  } | null>(null);

  const pontoId = ponto?.id ?? "";

  const versoesQuery = useQuery({
    queryKey: ["pontos", "versoesBatch", "homeAddWizard", pontoId] as const,
    queryFn: () => fetchActivePontoVersoesByPontoIds([pontoId]),
    enabled: visible && !!pontoId,
    staleTime: 60_000,
  });

  const listPonto: ListPonto | null = useMemo(() => {
    if (!ponto) return null;
    const base = homePontoToListPontoBase(ponto);
    const map = versoesQuery.data;
    if (!map) return base;
    const versoes = map.get(ponto.id) ?? [];
    const canonical = versoes.find((v) => v.is_canonical) ?? versoes[0] ?? null;
    const lyrics = canonical?.lyrics ?? base.lyrics;
    const lyrics_preview_6 =
      typeof canonical?.lyrics_preview_6 === "string"
        ? canonical.lyrics_preview_6
        : base.lyrics_preview_6;
    return { ...base, lyrics, lyrics_preview_6, versoes };
  }, [ponto, versoesQuery.data]);

  const versoesStillLoading = visible && !!pontoId && versoesQuery.isLoading;

  const defaultVersaoHighlightId = useMemo(() => {
    if (!listPonto?.versoes?.length) return null;
    return resolveDefaultPontoVersaoId(listPonto.versoes);
  }, [listPonto]);

  useEffect(() => {
    if (!visible) {
      setPhase("versao");
      setEntidadePickerCtx(null);
      setPendingCommit(null);
    }
  }, [visible]);

  const entidadesCatalogQuery = useEntidadesCatalogQuery({
    enabled: !!entidadePickerCtx,
  });

  const goToColecaoStep = useCallback(
    (payload: {
      listPonto: ListPonto;
      pontoVersaoId: string | null;
      entidade: CollectionPontoEntidadeInput | null;
      entidadeResolvedLabel: string | null;
    }) => {
      setPendingCommit(payload);
      setPhase("colecao");
    },
    [],
  );

  const proceedAfterVersaoChosen = useCallback(
    async (lp: ListPonto, pontoVersaoId: string | null) => {
      const v = pontoVersaoId
        ? lp.versoes.find((x) => x.id === pontoVersaoId) ?? null
        : null;
      const lyricsForCheck = v?.lyrics ?? lp.lyrics;
      if (lyricsHasEntidadePlaceholder(lyricsForCheck) && pontoVersaoId) {
        setEntidadePickerCtx({
          ponto: lp,
          pontoVersaoId,
        });
        return;
      }
      goToColecaoStep({
        listPonto: lp,
        pontoVersaoId,
        entidade: null,
        entidadeResolvedLabel: null,
      });
    },
    [goToColecaoStep],
  );

  const onPickVersao = useCallback(
    async (versaoId: string, lp: ListPonto) => {
      await proceedAfterVersaoChosen(lp, versaoId);
    },
    [proceedAfterVersaoChosen],
  );

  const onConfirmEntidadePlaceholder = useCallback(
    (choice: CollectionPontoEntidadeInput) => {
      const ctx = entidadePickerCtx;
      if (!ctx) return;
      setEntidadePickerCtx(null);
      const label =
        choice.kind === "custom"
          ? choice.texto.trim()
          : entidadesCatalogQuery.data?.find((o) => o.id === choice.entidadeId)
              ?.label ?? "";
      goToColecaoStep({
        listPonto: ctx.ponto,
        pontoVersaoId: ctx.pontoVersaoId,
        entidade: choice,
        entidadeResolvedLabel: label,
      });
    },
    [entidadePickerCtx, entidadesCatalogQuery.data, goToColecaoStep],
  );

  const handleBack = useCallback(() => {
    if (phase === "colecao") {
      setPhase("versao");
      setPendingCommit(null);
      return;
    }
    onClose();
  }, [phase, onClose]);

  if (!visible || !ponto || !listPonto) return null;

  return (
    <View style={styles.root}>
      <View style={styles.sheetHeaderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === "colecao" ? "Voltar" : "Fechar"}
          onPress={handleBack}
          hitSlop={10}
          style={styles.sheetBackBtn}
        >
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>
        <Text style={[styles.sheetTitle, { color: textPrimary, flex: 1 }]}>
          {phase === "versao" ? "Escolher versão" : "Escolher coleção"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          hitSlop={10}
          style={styles.sheetCloseBtn}
        >
          <Text style={[styles.sheetCloseText, { color: textPrimary }]}>×</Text>
        </Pressable>
      </View>

      {phase === "versao" ? (
        <>
          <Text style={[styles.hint, { color: textSecondary }]}>
            Toque na versão com a letra que você quer usar na coleção.
          </Text>

          {versoesStillLoading ? (
            <View style={styles.versaoLoading}>
              <ActivityIndicator color={textPrimary} />
            </View>
          ) : (
            <ScrollView
              style={styles.flexScroll}
              contentContainerStyle={styles.versaoScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {listPonto.versoes.length === 0 ? (
                <View style={styles.emptyVersoesBlock}>
                  <Text style={[styles.bodyText, { color: textSecondary }]}>
                    Nenhuma versão cadastrada para este ponto. A coleção usará a
                    letra principal do cartão.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continuar para escolher a coleção"
                    onPress={() =>
                      void proceedAfterVersaoChosen(listPonto, null)
                    }
                    style={({ pressed }) => [
                      styles.continuarBtn,
                      {
                        backgroundColor:
                          variant === "light"
                            ? colors.forest700
                            : colors.brass500,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.continuarBtnText}>Continuar</Text>
                  </Pressable>
                </View>
              ) : (
                <VersaoPickerRows
                  ponto={listPonto}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textMuted={textMuted}
                  borderColor={borderColor}
                  defaultHighlightId={defaultVersaoHighlightId}
                  onPick={(id, lp) => void onPickVersao(id, lp)}
                />
              )}
            </ScrollView>
          )}
        </>
      ) : (
        <>
          {colecaoToolbar ? (
            <View style={{ marginBottom: spacing.md }}>{colecaoToolbar}</View>
          ) : null}

          {collectionsError ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                {collectionsError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetryLoadCollections}
                style={[
                  styles.retryBtn,
                  variant === "light"
                    ? styles.retryBtnLight
                    : styles.retryBtnDark,
                ]}
              >
                <Text style={[styles.retryText, { color: textPrimary }]}>
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          ) : collectionsLoading && totalEditableCollectionsCount === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                Carregando coleções…
              </Text>
            </View>
          ) : totalEditableCollectionsCount === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                Você ainda não tem permissão…
              </Text>
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Você ainda não tem permissão para adicionar pontos em coleções.
              </Text>
            </View>
          ) : visibleCollections.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                Nenhuma coleção nesse filtro.
              </Text>
            </View>
          ) : (
            <>
              {isAdding ? (
                <Text style={[styles.bodyText, { color: textSecondary }]}>
                  Adicionando…
                </Text>
              ) : addSuccess ? (
                <Text style={[styles.bodyText, { color: colors.forest500 }]}>
                  Ponto adicionado à coleção
                </Text>
              ) : addError ? (
                <Text style={[styles.bodyText, { color: colors.brass600 }]}>
                  {addError}
                </Text>
              ) : (
                <Text style={[styles.bodyText, { color: textSecondary }]}>
                  Selecione a coleção (playlist).
                </Text>
              )}

              <ScrollView
                style={styles.flexScroll}
                contentContainerStyle={styles.colecaoScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <View style={styles.sheetList}>
                  {visibleCollections.map((c) => {
                    const title = (c.title ?? "").trim() || "Coleção";
                    const ownerLabel = getCollectionOwnerLabel(c);
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        disabled={isAdding || isCreatingCollection}
                        onPress={() => {
                          if (!userId || !pendingCommit) return;
                          void onCommit({
                            collectionId: c.id,
                            pontoId: ponto.id,
                            pontoVersaoId: pendingCommit.pontoVersaoId,
                            entidade: pendingCommit.entidade,
                            entidadeResolvedLabel:
                              pendingCommit.entidadeResolvedLabel,
                            listPonto: pendingCommit.listPonto,
                            homePontoSnapshot: ponto,
                          });
                        }}
                        style={({ pressed }) => [
                          styles.collectionRow,
                          {
                            borderColor,
                            opacity:
                              isAdding || isCreatingCollection
                                ? 0.5
                                : pressed
                                  ? 0.92
                                  : 1,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[
                              styles.collectionTitle,
                              { color: textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {ownerLabel ? (
                            <Text
                              style={[
                                styles.collectionOwner,
                                { color: textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {ownerLabel}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </>
      )}

      <EntidadePlaceholderSheet
        visible={!!entidadePickerCtx}
        variant={variant}
        onClose={() => setEntidadePickerCtx(null)}
        options={entidadesCatalogQuery.data ?? []}
        optionsLoading={entidadesCatalogQuery.isLoading}
        optionsError={
          entidadesCatalogQuery.error
            ? getErrorMessage(entidadesCatalogQuery.error)
            : null
        }
        onConfirm={onConfirmEntidadePlaceholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flexScroll: {
    flex: 1,
  },
  versaoScrollContent: {
    paddingBottom: spacing.xl,
  },
  colecaoScrollContent: {
    paddingBottom: spacing.xl,
  },
  versaoLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sheetBackBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.xs,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetCloseText: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "300",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  emptyVersoesBlock: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  continuarBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continuarBtnText: {
    color: colors.paper50,
    fontSize: 16,
    fontWeight: "800",
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyBlock: {
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  sheetList: {
    gap: 0,
    paddingTop: spacing.sm,
  },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  collectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  collectionOwner: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtnLight: {
    borderColor: colors.surfaceCardBorderLight,
  },
  retryBtnDark: {
    borderColor: colors.surfaceCardBorder,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  versaoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  versaoRowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  versaoRowMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  versaoRowLyricsFull: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
  },
});
