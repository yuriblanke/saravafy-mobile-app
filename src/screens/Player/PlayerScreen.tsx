import { useCuratorMode } from "@/contexts/CuratorModeContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { AddMediumTagSheet } from "@/src/components/AddMediumTagSheet";
import { BottomSheet } from "@/src/components/BottomSheet";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import { RemoveMediumTagSheet } from "@/src/components/RemoveMediumTagSheet";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import {
  PontoUpsertModal,
  type PontoUpsertInitialValues,
} from "@/src/components/pontos/PontoUpsertModal";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { useApprovedPontoAudioSubmission } from "@/src/queries/pontoSubmissions";
import { useTerreiroPontosCustomTagsMap } from "@/src/queries/terreiroPontoCustomTags";
import { colors, spacing } from "@/src/theme";
import { buildShareMessageForPonto } from "@/src/utils/shareContent";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  AudioPlayerFooter,
  type PlayerAudioState,
} from "./components/AudioPlayerFooter";
import { PlayerContent } from "./components/PlayerContent";
import { PlayerSearchModal } from "./components/PlayerSearchModal";
import {
  useCollectionPlayerData,
  type CollectionPlayerItem,
} from "./hooks/useCollectionPlayerData";

const LYRICS_FONT_MIN = 14;
const LYRICS_FONT_MAX = 26;

const curimbaOnPng = require("@/assets/images/curimba-on.png");
const curimbaOffOnDarkPng = require("@/assets/images/curimba-off-on-dark.png");
const curimbaOffOnLightPng = require("@/assets/images/curimba-off-on-light.png");

function parseIntSafe(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (!Number.isFinite(i)) return null;
  return i;
}

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { showToast } = useToast();

  const { isCurator } = useIsCurator();
  const { curatorModeEnabled } = useCuratorMode();
  const canEditPontos = isCurator && curatorModeEnabled === true;

  const source = typeof params.source === "string" ? params.source : null;
  const searchQuery = typeof params.q === "string" ? params.q : "";
  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  const collectionId = String(params.collectionId ?? "");
  const initialPontoId =
    typeof params.initialPontoId === "string"
      ? params.initialPontoId
      : typeof params.pontoId === "string"
        ? params.pontoId
        : null;
  const initialPosition =
    typeof params.initialPosition === "string"
      ? parseIntSafe(params.initialPosition)
      : null;

  const { width } = useWindowDimensions();

  const {
    effectiveTheme,
    curimbaEnabled,
    setCurimbaEnabled,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
  } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const borderColor =
    variant === "light"
      ? colors.surfaceCardBorderLight
      : colors.surfaceCardBorder;

  const { items, isLoading, error, isEmpty, reload, patchPontoById } =
    useCollectionPlayerData(
      source === "all" ? { mode: "all", query: searchQuery } : { collectionId },
    );

  const membership = useTerreiroMembershipStatus(terreiroId);
  // Leituras são públicas em contexto de terreiro (sem gate de role/membership).
  const canSeeMediumTags = !!terreiroId;

  const myTerreiroRole = membership.data.role;
  const canEditCustomTags =
    !!terreiroId &&
    membership.data.isActiveMember &&
    (myTerreiroRole === "admin" || myTerreiroRole === "curimba");

  const pontoIds = useMemo(() => {
    return items.map((it) => it.ponto.id).filter(Boolean);
  }, [items]);

  const customTagsMapQuery = useTerreiroPontosCustomTagsMap(
    { terreiroId, pontoIds },
    { enabled: canSeeMediumTags && pontoIds.length > 0 },
  );
  const customTagsMap = customTagsMapQuery.data ?? {};

  const [lyricsFontSize, setLyricsFontSize] = useState(20);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isNoAudioOpen, setIsNoAudioOpen] = useState(false);
  const [isAudioInReviewOpen, setIsAudioInReviewOpen] = useState(false);
  const [mediumTargetPontoId, setMediumTargetPontoId] = useState<string | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<null | {
    pontoId: string;
    tagId: string;
    tagLabel: string;
  }>(null);

  // If permissions change while the screen is open, close editing sheets immediately.
  useEffect(() => {
    if (canEditCustomTags) return;
    if (mediumTargetPontoId) setMediumTargetPontoId(null);
    if (deleteTarget) setDeleteTarget(null);
  }, [canEditCustomTags, deleteTarget, mediumTargetPontoId]);

  const flatListRef = useRef<FlatList<CollectionPlayerItem> | null>(null);

  const initialIndex = useMemo(() => {
    if (items.length === 0) return 0;

    if (initialPontoId) {
      const idx = items.findIndex((it) => it.ponto.id === initialPontoId);
      if (idx >= 0) return idx;
    }

    if (initialPosition != null) {
      const idx = items.findIndex((it) => it.position === initialPosition);
      if (idx >= 0) return idx;
    }

    return 0;
  }, [items, initialPontoId, initialPosition]);

  useEffect(() => {
    setActiveIndex(initialIndex);

    if (items.length > 0 && flatListRef.current) {
      // Espera 1 tick para garantir layout
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      });
    }
  }, [items.length, initialIndex]);

  const activePonto = items[activeIndex]?.ponto ?? null;

  const approvedAudioSubmissionQuery = useApprovedPontoAudioSubmission(
    activePonto?.id,
    { enabled: !!activePonto?.id },
  );

  const approvedPontoAudioId =
    approvedAudioSubmissionQuery.data?.approvedPontoAudioId ?? null;
  const hasPendingFromSubmission =
    approvedAudioSubmissionQuery.data?.hasPendingAudioSubmission ?? false;

  const audioState: PlayerAudioState = useMemo(() => {
    if (approvedPontoAudioId) return "AUDIO_APPROVED";
    if (hasPendingFromSubmission) return "AUDIO_IN_REVIEW";
    return "NO_AUDIO";
  }, [approvedPontoAudioId, hasPendingFromSubmission]);

  const editingInitialValues: PontoUpsertInitialValues | undefined =
    useMemo(() => {
      if (!activePonto?.id) return undefined;
      return {
        id: activePonto.id,
        title: activePonto.title,
        author_name:
          typeof (activePonto as any).author_name === "string"
            ? (activePonto as any).author_name
            : null,
        is_public_domain:
          typeof (activePonto as any).is_public_domain === "boolean"
            ? (activePonto as any).is_public_domain
            : null,
        lyrics: activePonto.lyrics,
        tags: activePonto.tags,
      };
    }, [activePonto]);

  const openCorrection = useCallback(async () => {
    if (!activePonto?.id || !editingInitialValues?.id) {
      showToast("Não foi possível abrir a correção deste ponto.");
      return;
    }

    setIsReportOpen(false);
    // Micro-delay para evitar overlap visual com o fechamento do sheet.
    await new Promise((r) => setTimeout(r, 120));
    setIsCorrectionOpen(true);
  }, [activePonto?.id, editingInitialValues?.id, showToast]);

  const openAudioUpload = useCallback(() => {
    if (!activePonto?.id) {
      showToast("Ponto inválido para envio de áudio.");
      return;
    }

    setIsReportOpen(false);
    setIsNoAudioOpen(false);
    setIsAudioInReviewOpen(false);

    router.push({
      pathname: "/ponto-audio-upload" as any,
      params: {
        pontoId: activePonto.id,
        pontoTitle:
          typeof (activePonto as any)?.title === "string"
            ? (activePonto as any).title
            : "",
      },
    } as any);
  }, [activePonto, router, showToast]);

  const handleShare = useCallback(async () => {
    if (!activePonto?.id) {
      showToast("Não foi possível compartilhar este ponto.");
      return;
    }

    const message = buildShareMessageForPonto({
      pontoId: activePonto.id,
      pontoTitle: activePonto.title ?? "Ponto",
    });

    try {
      await Share.share({ message });
    } catch (e) {
      if (__DEV__) {
        console.info("[Player] erro ao abrir share sheet", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }, [activePonto?.id, activePonto?.title, showToast]);

  const onDecreaseFont = useCallback(() => {
    setLyricsFontSize((prev) => Math.max(LYRICS_FONT_MIN, prev - 2));
  }, []);

  const onIncreaseFont = useCallback(() => {
    setLyricsFontSize((prev) => Math.min(LYRICS_FONT_MAX, prev + 2));
  }, []);

  const onToggleCurimba = useCallback(() => {
    const next = !curimbaEnabled;
    setCurimbaEnabled(next);

    if (__DEV__) {
      console.info("[Curimba] toggle (player)", { enabled: next });
      console.info("[Curimba] áudio", { blocked: next });
    }

    if (next && !curimbaOnboardingDismissed) {
      setIsCurimbaExplainerOpen(true);
    }
  }, [curimbaEnabled, curimbaOnboardingDismissed, setCurimbaEnabled]);

  const getItemLayout = useCallback(
    (_: ArrayLike<CollectionPlayerItem> | null | undefined, index: number) => {
      return { length: width, offset: width * index, index };
    },
    [width],
  );

  if (isLoading) {
    return (
      <SaravafyScreen theme={variant} variant="stack">
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textPrimary} />
            </Pressable>
          </View>
          <View style={styles.loadingCenter}>
            <ActivityIndicator />
            <Text style={[styles.loadingText, { color: textSecondary }]}>
              Carregando…
            </Text>
          </View>
        </View>
      </SaravafyScreen>
    );
  }

  if (error) {
    return (
      <SaravafyScreen theme={variant} variant="stack">
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textPrimary} />
            </Pressable>
          </View>

          <View style={styles.loadingCenter}>
            <Text style={[styles.errorText, { color: textSecondary }]}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={reload}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.retryBtnPressed,
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
        </View>
      </SaravafyScreen>
    );
  }

  if (isEmpty) {
    return (
      <SaravafyScreen theme={variant} variant="stack">
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textPrimary} />
            </Pressable>
          </View>
          <View style={styles.loadingCenter}>
            <Text style={[styles.errorText, { color: textSecondary }]}>
              Collection vazia.
            </Text>
          </View>
        </View>
      </SaravafyScreen>
    );
  }

  return (
    <SaravafyScreen theme={variant} variant="stack">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textPrimary} />
          </Pressable>

          <View style={styles.headerRight}>
            {canEditPontos && activePonto ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar ponto"
                onPress={() => setIsEditOpen(true)}
                hitSlop={10}
                style={styles.headerIconBtn}
              >
                <Ionicons name="pencil" size={18} color={textPrimary} />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reportar problema"
              onPress={() => setIsReportOpen(true)}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <MaterialCommunityIcons
                name="email-alert-outline"
                size={18}
                color={textPrimary}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartilhar"
              onPress={() => {
                void handleShare();
              }}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="share-outline" size={18} color={textPrimary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                curimbaEnabled
                  ? "Desativar Modo Curimba"
                  : "Ativar Modo Curimba"
              }
              onPress={onToggleCurimba}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Image
                source={
                  curimbaEnabled
                    ? curimbaOnPng
                    : variant === "light"
                      ? curimbaOffOnLightPng
                      : curimbaOffOnDarkPng
                }
                style={styles.curimbaIcon}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Diminuir fonte"
              onPress={onDecreaseFont}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Text style={[styles.fontBtnText, { color: textPrimary }]}>
                A-
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aumentar fonte"
              onPress={onIncreaseFont}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Text style={[styles.fontBtnText, { color: textPrimary }]}>
                A+
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buscar ponto"
              onPress={() => setIsSearchOpen(true)}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="search" size={18} color={textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <FlatList
            ref={(node) => {
              flatListRef.current = node;
            }}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={items}
            keyExtractor={(it) => `${it.position}-${it.ponto.id}`}
            renderItem={({ item }) => (
              <View style={{ width }}>
                <PlayerContent
                  ponto={item.ponto}
                  variant={variant}
                  lyricsFontSize={lyricsFontSize}
                  mediumTags={
                    canSeeMediumTags ? (customTagsMap[item.ponto.id] ?? []) : []
                  }
                  canAddMediumTag={canEditCustomTags}
                  onPressAddMediumTag={() =>
                    setMediumTargetPontoId(item.ponto.id)
                  }
                  canDeleteMediumTag={canEditCustomTags}
                  onLongPressMediumTag={(t) => {
                    if (!canEditCustomTags) return;
                    setDeleteTarget({
                      pontoId: item.ponto.id,
                      tagId: t.id,
                      tagLabel: t.tagText,
                    });
                  }}
                />
              </View>
            )}
            onMomentumScrollEnd={(e) => {
              const nextIndex = Math.round(
                e.nativeEvent.contentOffset.x / width,
              );
              if (Number.isFinite(nextIndex)) setActiveIndex(nextIndex);
            }}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
          />
        </View>

        <AudioPlayerFooter
          ponto={activePonto}
          variant={variant}
          curimbaEnabled={curimbaEnabled}
          audioState={audioState}
          approvedPontoAudioId={approvedPontoAudioId}
          onOpenNoAudioModal={() => setIsNoAudioOpen(true)}
          onOpenAudioInReviewModal={() => setIsAudioInReviewOpen(true)}
        />

        <PlayerSearchModal
          visible={isSearchOpen}
          variant={variant}
          onClose={() => setIsSearchOpen(false)}
        />

        <AddMediumTagSheet
          visible={!!mediumTargetPontoId}
          variant={variant}
          terreiroId={terreiroId}
          pontoId={mediumTargetPontoId ?? ""}
          canShowRemoveHint={canEditCustomTags}
          onClose={() => setMediumTargetPontoId(null)}
        />

        <RemoveMediumTagSheet
          visible={!!deleteTarget}
          variant={variant}
          terreiroId={terreiroId}
          pontoId={deleteTarget?.pontoId ?? ""}
          tagId={deleteTarget?.tagId ?? ""}
          tagLabel={deleteTarget?.tagLabel ?? ""}
          onClose={() => setDeleteTarget(null)}
        />

        <CurimbaExplainerBottomSheet
          visible={isCurimbaExplainerOpen}
          variant={variant}
          dontShowAgain={curimbaOnboardingDismissed}
          onChangeDontShowAgain={setCurimbaOnboardingDismissed}
          onClose={() => setIsCurimbaExplainerOpen(false)}
        />

        <BottomSheet
          visible={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          variant={variant}
          scrollEnabled={false}
          bounces={false}
        >
          <View style={{ paddingBottom: 16 }}>
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                Tem algo de errado nesse ponto?
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsReportOpen(false)}
                hitSlop={10}
                style={styles.sheetCloseBtn}
              >
                <Text style={[styles.sheetCloseText, { color: textPrimary }]}>
                  ×
                </Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openCorrection();
              }}
              style={({ pressed }) => [
                styles.sheetOption,
                pressed ? styles.sheetOptionPressed : null,
              ]}
            >
              <Text style={[styles.sheetOptionText, { color: textPrimary }]}>
                Letra ou dados
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                openAudioUpload();
              }}
              style={({ pressed }) => [
                styles.sheetOption,
                pressed ? styles.sheetOptionPressed : null,
              ]}
            >
              <Text style={[styles.sheetOptionText, { color: textPrimary }]}>
                Enviar áudio deste ponto
              </Text>
            </Pressable>
          </View>
        </BottomSheet>

        <BottomSheet
          visible={isNoAudioOpen}
          onClose={() => setIsNoAudioOpen(false)}
          variant={variant}
          snapPoints={[300]}
        >
          <View style={styles.simpleModalWrap}>
            <Text style={[styles.simpleModalTitle, { color: textPrimary }]}>
              Sem áudio
            </Text>
            <Text style={[styles.simpleModalBody, { color: textSecondary }]}>
              Esse ponto ainda não tem áudio.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar áudio deste ponto"
              onPress={() => {
                openAudioUpload();
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                Enviar áudio deste ponto
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Entendi"
              onPress={() => setIsNoAudioOpen(false)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor },
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: textPrimary }]}>
                Entendi
              </Text>
            </Pressable>
          </View>
        </BottomSheet>

        <BottomSheet
          visible={isAudioInReviewOpen}
          onClose={() => setIsAudioInReviewOpen(false)}
          variant={variant}
          snapPoints={[380]}
        >
          <View style={styles.simpleModalWrap}>
            <Text style={[styles.simpleModalTitle, { color: textPrimary }]}>
              Áudio em revisão
            </Text>
            <Text style={[styles.simpleModalBody, { color: textSecondary }]}>
              Existe um áudio para esse ponto aguardando aprovação pelos
              guardiões do acervo do Saravafy. O áudio ficará disponível assim
              que aprovado pela equipe.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Entendi"
              onPress={() => setIsAudioInReviewOpen(false)}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Entendi</Text>
            </Pressable>
          </View>
        </BottomSheet>

        <PontoUpsertModal
          visible={isCorrectionOpen}
          variant={variant}
          mode="correction"
          initialValues={editingInitialValues}
          onCancel={() => setIsCorrectionOpen(false)}
          onSuccess={() => {
            showToast("Correção enviada.");
          }}
        />

        <PontoUpsertModal
          visible={isEditOpen}
          variant={variant}
          mode="edit"
          initialValues={editingInitialValues}
          onCancel={() => setIsEditOpen(false)}
          onSuccess={(updated) => {
            if (!updated) return;
            patchPontoById(updated);
          }}
        />
      </View>
    </SaravafyScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "900",
    paddingRight: spacing.md,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  sheetOption: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetOptionPressed: {
    opacity: 0.86,
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  simpleModalWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  simpleModalTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  simpleModalBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brass600,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimaryOnDark,
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnPressed: {
    opacity: 0.9,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  fontBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  curimbaIcon: {
    width: 18,
    height: 18,
  },
  body: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  retryBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryBtnDark: {
    borderColor: colors.surfaceCardBorder,
    backgroundColor: "transparent",
  },
  retryBtnLight: {
    borderColor: colors.surfaceCardBorderLight,
    backgroundColor: "transparent",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
