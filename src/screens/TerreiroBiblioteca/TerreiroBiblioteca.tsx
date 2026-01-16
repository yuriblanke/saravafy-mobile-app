import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { JoinTerreiroButton } from "@/src/components/JoinTerreiroButton";
import { Separator } from "@/src/components/Separator";
import { SurfaceCard } from "@/src/components/SurfaceCard";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import {
  cancelQueries,
  patchById,
  removeById,
  replaceId,
  rollbackQueries,
  setQueriesDataSafe,
  snapshotQueries,
} from "@/src/queries/mutationUtils";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  useCollectionsByTerreiroQuery,
  type TerreiroCollectionCard,
} from "@/src/queries/terreirosCollections";
import { colors, spacing } from "@/src/theme";
import { buildShareMessageForTerreiro } from "@/src/utils/shareContent";
import {
  applyTerreiroLibraryOrder,
  loadTerreiroLibraryOrder,
} from "@/src/utils/terreiroLibraryOrder";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const fillerPng = require("@/assets/images/filler.png");

type TerreiroRow = {
  id: string;
  title?: string | null;
  cover_image_url?: string | null;
};

function hexToRgba(input: string, alpha: number) {
  const raw = String(input ?? "").trim();
  if (!raw) return `rgba(0,0,0,${alpha})`;

  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  const norm =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  if (norm.length !== 6) return `rgba(0,0,0,${alpha})`;

  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(0,0,0,${alpha})`;

  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}

function isColumnMissingError(error: unknown, columnName: string) {
  const msg =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message ?? ""
      : "";

  const m = msg.toLowerCase();
  return (
    m.includes(columnName.toLowerCase()) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

export default function TerreiroBiblioteca() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    terreiroId?: string;
    terreiroTitle?: string;
    bootStart?: string;
    bootOffline?: string;
    from?: string;
  }>();

  const { shouldBlockPress } = useGestureBlock();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { effectiveTheme, clearStartPageSnapshotOnly } = usePreferences();
  const variant: "light" | "dark" = effectiveTheme;

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;

  const { width: windowWidth } = useWindowDimensions();
  const coverSize = useMemo(() => {
    const contentWidth = Math.max(0, windowWidth - spacing.lg * 2);
    return Math.max(220, Math.round(contentWidth * 0.8));
  }, [windowWidth]);

  // Pinned cover animation: image shrinks while staying pinned, then scrolls
  const imageMaxSize = coverSize;
  const imageMinSize = Math.round(coverSize * 0.3); // 30% of original size
  const shrinkRange = imageMaxSize - imageMinSize; // scroll distance to reach minSize
  const fadeStart = shrinkRange; // start fade when reaching min size
  const fadeRange = 60; // fade over 60px
  const coverTopMargin = spacing.lg; // margin above cover
  const coverBottomMargin = spacing.lg; // margin below cover

  const scrollY = useSharedValue(0);

  const terreiroId =
    Array.isArray(params.terreiroId) && params.terreiroId.length > 0
      ? params.terreiroId[0]
      : typeof params.terreiroId === "string"
      ? params.terreiroId
      : "";

  const from =
    Array.isArray(params.from) && params.from.length > 0
      ? params.from[0]
      : typeof params.from === "string"
      ? params.from
      : "";

  const returnTo = typeof from === "string" ? from.trim() : "";

  const insets = useGlobalSafeAreaInsets();
  const safeAreaInsets = useSafeAreaInsets();
  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);
  const listBottomInset =
    (safeAreaInsets.bottom ?? 0) + spacing.lg + shrinkRange;

  const imageSize = useDerivedValue(() => {
    return interpolate(
      scrollY.value,
      [0, shrinkRange],
      [imageMaxSize, imageMinSize],
      Extrapolation.CLAMP
    );
  }, [imageMaxSize, shrinkRange]);

  const imageOpacity = useDerivedValue(() => {
    return interpolate(
      scrollY.value,
      [fadeStart, fadeStart + fadeRange],
      [1, 0.2],
      Extrapolation.CLAMP
    );
  }, [fadeRange, fadeStart]);

  const imageTranslateY = useDerivedValue(() => {
    // Pin the image while it shrinks (0 → shrinkRange)
    // After shrinkRange, let it scroll naturally with content
    if (scrollY.value <= shrinkRange) {
      // Compensate scroll to keep image pinned vertically
      return scrollY.value;
    }

    // Keep compensation fixed after shrink is complete
    return shrinkRange;
  }, [shrinkRange]);

  // Content below image should "stick" to the bottom edge of the shrinking image
  const contentTranslateY = useDerivedValue(() => {
    if (scrollY.value <= shrinkRange) {
      // Keep content pinned at the same vertical position on screen
      // The image is pinned and shrinking, so content stays at its initial position
      // which visually looks like it's glued to the bottom edge of the image
      return scrollY.value;
    }

    // After shrink is complete, release the pin - content scrolls normally
    return shrinkRange;
  }, [shrinkRange]);

  const coverAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: imageSize.value,
      height: imageSize.value,
      opacity: imageOpacity.value,
      transform: [{ translateY: imageTranslateY.value }],
      marginTop: coverTopMargin,
      marginBottom: coverBottomMargin,
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: contentTranslateY.value }],
    };
  });

  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;
  const myRole = membership.role;
  const canEdit =
    membership.isActiveMember && (myRole === "admin" || myRole === "editor");

  // Se não tiver terreiroId e não for bootStart, mantém o comportamento atual de fallback.
  useEffect(() => {
    if (terreiroId) return;
    if (params.bootStart === "1") return;

    router.replace((returnTo || "/(app)/(tabs)/(pontos)") as any);
  }, [params.bootStart, router, terreiroId]);

  // Boot offline: se abrimos via snapshot e o fetch falhar, volta para Pontos.
  const collectionsQuery = useCollectionsByTerreiroQuery(terreiroId || null);
  useEffect(() => {
    if (!terreiroId) return;
    if (params.bootOffline !== "1") return;
    if (!collectionsQuery.isError) return;

    clearStartPageSnapshotOnly().catch(() => undefined);
    router.replace((returnTo || "/(app)/(tabs)/(pontos)") as any);
  }, [
    clearStartPageSnapshotOnly,
    collectionsQuery.isError,
    params.bootOffline,
    router,
    terreiroId,
  ]);

  const terreiroQuery = useQuery({
    queryKey: terreiroId ? queryKeys.terreiros.byId(terreiroId) : [],
    enabled: !!terreiroId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      if (!terreiroId) throw new Error("Terreiro inválido.");

      let res: any = await supabase
        .from("terreiros")
        .select("id, title, cover_image_url")
        .eq("id", terreiroId)
        .single();

      if (res.error && isColumnMissingError(res.error, "cover_image_url")) {
        res = await supabase
          .from("terreiros")
          .select("id, title")
          .eq("id", terreiroId)
          .single();
      }

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar o terreiro."
        );
      }

      return res.data as TerreiroRow;
    },
  });

  const terreiroName = useMemo(() => {
    const fromParams =
      typeof params.terreiroTitle === "string" && params.terreiroTitle.trim()
        ? params.terreiroTitle.trim()
        : "";

    const fromQuery =
      typeof terreiroQuery.data?.title === "string" &&
      terreiroQuery.data.title.trim()
        ? terreiroQuery.data.title.trim()
        : "";

    return fromQuery || fromParams || "Terreiro";
  }, [params.terreiroTitle, terreiroQuery.data?.title]);

  const terreiroCoverImageUrl =
    typeof terreiroQuery.data?.cover_image_url === "string" &&
    terreiroQuery.data.cover_image_url.trim()
      ? terreiroQuery.data.cover_image_url.trim()
      : "";

  const handleShare = useCallback(async () => {
    let message = "";

    try {
      message = await buildShareMessageForTerreiro({
        terreiroId,
        terreiroName,
      });
    } catch (e) {
      if (__DEV__) {
        console.info("[TerreiroBiblioteca] erro ao gerar mensagem de share", {
          error: e instanceof Error ? e.message : String(e),
        });
      }

      message = `Olha o terreiro “${terreiroName}” no Saravafy.`;
    }

    try {
      await Share.share({ message });
    } catch (e) {
      if (__DEV__) {
        console.info("[TerreiroBiblioteca] erro ao abrir share sheet", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }, [terreiroId, terreiroName]);

  // --- Shell de Collection (scroll/header) ---
  const [titleBlockY, setTitleBlockY] = useState<number | null>(null);
  const [actionsBottomY, setActionsBottomY] = useState<number | null>(null);
  const [pontosTopY, setPontosTopY] = useState<number | null>(null);
  const headerTitleOpacity = useRef(new Animated.Value(0)).current;
  const headerTitleVisibleRef = useRef(false);
  const [isHeaderTitleVisible, setIsHeaderTitleVisible] = useState(false);
  const headerGradientOpacity = useRef(new Animated.Value(0)).current;
  const headerGradientVisibleRef = useRef(false);

  const setHeaderTitleVisible = useCallback(
    (visible: boolean) => {
      if (headerTitleVisibleRef.current === visible) return;
      headerTitleVisibleRef.current = visible;
      setIsHeaderTitleVisible(visible);
      Animated.timing(headerTitleOpacity, {
        toValue: visible ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    },
    [headerTitleOpacity]
  );

  const setHeaderGradientVisible = useCallback(
    (visible: boolean) => {
      if (headerGradientVisibleRef.current === visible) return;
      headerGradientVisibleRef.current = visible;
      Animated.timing(headerGradientOpacity, {
        toValue: visible ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    },
    [headerGradientOpacity]
  );

  const headerBackdropOpacity = useMemo(() => {
    return headerGradientOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.75],
      extrapolate: "clamp",
    });
  }, [headerGradientOpacity]);

  const topGradientHeight = useMemo(() => {
    const h =
      typeof pontosTopY === "number" && pontosTopY > 0 ? pontosTopY : 220;
    return Math.max(160, Math.min(360, h));
  }, [pontosTopY]);

  const headerGoldColor =
    variant === "light" ? colors.brass500 : colors.brass600;
  const headerFgColor =
    variant === "light"
      ? textPrimary
      : isHeaderTitleVisible
      ? colors.paper50
      : textPrimary;

  const headerGradientThreshold = useMemo(() => {
    const topGradientNoLongerBehindHeader = Math.max(
      0,
      topGradientHeight - headerTotalHeight
    );

    if (typeof actionsBottomY === "number" && actionsBottomY > 0) {
      const actionsBottomReachedHeader = Math.max(
        0,
        actionsBottomY - headerTotalHeight
      );
      return Math.max(
        actionsBottomReachedHeader,
        topGradientNoLongerBehindHeader
      );
    }

    return topGradientNoLongerBehindHeader;
  }, [actionsBottomY, headerTotalHeight, topGradientHeight]);

  const titleShareOpacity = useMemo(() => {
    return headerTitleOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
  }, [headerTitleOpacity]);

  const headerTitleThreshold = useMemo(() => {
    // Calcular posição do título manualmente ao invés de usar onLayout
    // porque onLayout dentro de Reanimated.View com translateY retorna 0

    // Posição do título = margens da imagem + tamanho da imagem
    // Não precisa adicionar coverBottomMargin nem spacing.lg porque o título
    // está visualmente muito próximo da borda inferior da imagem
    const calculatedTitleY = coverTopMargin + imageMaxSize;

    if (__DEV__) {
      console.log("[TerreiroBiblioteca] headerTitleThreshold calculated:", {
        coverTopMargin,
        imageMaxSize,
        calculatedTitleY,
        shrinkRange,
        headerTotalHeight,
      });
    }

    // O título deve migrar apenas DEPOIS da imagem ter encolhido completamente
    // e o título realmente atingir o header
    // Ajuste fino de -66px para compensar espaçamentos internos do título
    const threshold = Math.max(
      0,
      calculatedTitleY + shrinkRange - headerTotalHeight - 40
    );

    if (__DEV__) {
      console.log("[TerreiroBiblioteca] threshold final:", threshold);
    }

    return threshold;
  }, [headerTotalHeight, shrinkRange, imageMaxSize, coverTopMargin]);

  const headerTitleThresholdSV = useSharedValue(headerTitleThreshold);
  const headerGradientThresholdSV = useSharedValue(headerGradientThreshold);

  useEffect(() => {
    headerTitleThresholdSV.value = headerTitleThreshold;
  }, [headerTitleThreshold, headerTitleThresholdSV]);

  useEffect(() => {
    headerGradientThresholdSV.value = headerGradientThreshold;
  }, [headerGradientThreshold, headerGradientThresholdSV]);

  useAnimatedReaction(
    () => {
      const shouldShow = scrollY.value >= headerTitleThresholdSV.value;

      if (__DEV__ && scrollY.value > 0 && scrollY.value % 50 < 5) {
        console.log("[TerreiroBiblioteca] scroll check:", {
          scrollY: Math.round(scrollY.value),
          threshold: Math.round(headerTitleThresholdSV.value),
          shouldShow,
        });
      }

      return shouldShow;
    },
    (visible: boolean, prev: boolean | null) => {
      if (prev === null || visible === prev) return;

      if (__DEV__) {
        console.log("[TerreiroBiblioteca] title visibility changed:", {
          visible,
        });
      }

      runOnJS(setHeaderTitleVisible)(visible);
    },
    [setHeaderTitleVisible]
  );

  useAnimatedReaction(
    () => scrollY.value >= headerGradientThresholdSV.value,
    (visible: boolean, prev: boolean | null) => {
      if (prev === null || visible === prev) return;
      runOnJS(setHeaderGradientVisible)(visible);
    },
    [setHeaderGradientVisible]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e: any) => {
      const y = e.contentOffset.y;
      scrollY.value = y < 0 ? 0 : y;
    },
  });

  const goBack = useCallback(() => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.back();
  }, [returnTo, router]);

  useEffect(() => {
    if (!returnTo) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace(returnTo as any);
      return true;
    });

    return () => sub.remove();
  }, [returnTo, router]);

  // --- Biblioteca (ordenação + ações) ---
  const accentColor = colors.brass600;
  const dangerColor = colors.danger;
  const warningColor = colors.warning;
  const titleInputBg =
    variant === "light" ? colors.inputBgLight : colors.inputBgDark;
  const titleInputBorder =
    variant === "light" ? colors.inputBorderLight : colors.inputBorderDark;

  const [libraryOrder, setLibraryOrder] = useState<string[]>([]);
  useEffect(() => {
    if (!terreiroId) return;
    loadTerreiroLibraryOrder(terreiroId)
      .then(setLibraryOrder)
      .catch(() => setLibraryOrder([]));
  }, [terreiroId]);

  const orderedCollections = useMemo(() => {
    const arr = Array.isArray(collectionsQuery.data)
      ? (collectionsQuery.data as TerreiroCollectionCard[])
      : [];
    return applyTerreiroLibraryOrder(arr, libraryOrder);
  }, [collectionsQuery.data, libraryOrder]);

  const collectionsCountText = useMemo(() => {
    const n = orderedCollections.length;
    return n > 0 ? `${n} coleções` : "";
  }, [orderedCollections.length]);

  const membersCountQuery = useQuery({
    queryKey: terreiroId ? queryKeys.terreiroMembersCount(terreiroId) : [],
    enabled: !!terreiroId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!terreiroId) return null;

      const res = await supabase.rpc("get_terreiro_members_count", {
        p_terreiro_id: terreiroId,
      });

      if (res.error) {
        if (__DEV__) {
          console.info("[TerreiroBiblioteca] erro ao contar membros (rpc)", {
            terreiroId,
            error: res.error.message,
          });
        }
        return null;
      }

      const data: any = res.data;
      if (typeof data === "number" && Number.isFinite(data)) return data;
      if (data && typeof data === "object" && typeof data.count === "number") {
        return data.count;
      }
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        if (typeof first === "number" && Number.isFinite(first)) return first;
        if (
          first &&
          typeof first === "object" &&
          typeof (first as any).count === "number"
        ) {
          return (first as any).count;
        }
      }

      return null;
    },
    placeholderData: (prev) => prev,
  });

  const membersCountText = useMemo(() => {
    if (!terreiroId) return null as string | null;
    const n = membersCountQuery.data;
    if (typeof n === "number") return `${n} membros`;
    if (membersCountQuery.isLoading && n == null) return "— membros";
    return null;
  }, [membersCountQuery.data, membersCountQuery.isLoading, terreiroId]);

  const [isCollectionActionsOpen, setIsCollectionActionsOpen] = useState(false);
  const [collectionActionsTarget, setCollectionActionsTarget] =
    useState<TerreiroCollectionCard | null>(null);

  const [isConfirmDeleteCollectionOpen, setIsConfirmDeleteCollectionOpen] =
    useState(false);
  const [collectionPendingDelete, setCollectionPendingDelete] =
    useState<TerreiroCollectionCard | null>(null);

  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  const openCollectionActions = (collection: TerreiroCollectionCard) => {
    if (!canEdit) return;
    setCollectionActionsTarget(collection);
    setIsCollectionActionsOpen(true);
  };

  const canDeleteCollection = useCallback(
    (collection: TerreiroCollectionCard | null) => {
      if (!canEdit) return false;
      const ownerTerreiroId =
        typeof collection?.owner_terreiro_id === "string"
          ? collection.owner_terreiro_id
          : "";
      if (!ownerTerreiroId) return false;
      if (!terreiroId) return false;
      return ownerTerreiroId === terreiroId;
    },
    [canEdit, terreiroId]
  );

  const closeCollectionActions = () => {
    setIsCollectionActionsOpen(false);
    setCollectionActionsTarget(null);
  };

  const closeConfirmDeleteCollection = () => {
    setIsConfirmDeleteCollectionOpen(false);
    setCollectionPendingDelete(null);
  };

  const deleteCollectionMutation = useMutation({
    mutationFn: async (collection: TerreiroCollectionCard) => {
      const res = await supabase.rpc("delete_collection", {
        p_collection_id: collection.id,
      });

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Não foi possível excluir a coleção."
        );
      }

      const data: any = res.data;
      const ok =
        data === true ||
        (data && typeof data === "object" && "ok" in data && data.ok === true);

      if (!ok) {
        const message =
          data &&
          typeof data === "object" &&
          typeof data.error === "string" &&
          data.error.trim()
            ? data.error
            : "Não foi possível excluir a coleção.";
        throw new Error(message);
      }

      return { id: collection.id };
    },
    onMutate: async (vars) => {
      if (!terreiroId) return null;

      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => removeById(old ?? [], vars.id)
      );

      return { snapshot, id: vars.id };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);

      if (__DEV__) {
        console.info("[TerreiroBiblioteca] erro ao excluir coleção", {
          error: err instanceof Error ? err.message : String(err),
          id: vars?.id,
        });
      }

      showToast(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a coleção."
      );
    },
    onSettled: (_data, _err, vars) => {
      if (!terreiroId) return;

      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });

      if (vars?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.byId(vars.id),
        });
      }

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.accountable(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }
    },
  });

  const deleteCollection = async (collection: TerreiroCollectionCard) => {
    if (!canDeleteCollection(collection)) {
      showToast("Você não tem permissão para excluir esta coleção.");
      return;
    }
    setIsDeletingCollection(true);
    try {
      await deleteCollectionMutation.mutateAsync(collection);
    } finally {
      setIsDeletingCollection(false);
    }
  };

  const [isNewCollectionSheetOpen, setIsNewCollectionSheetOpen] =
    useState(false);
  const [newCollectionSheetMode, setNewCollectionSheetMode] = useState<
    "create" | "rename"
  >("create");
  const [renamingCollectionId, setRenamingCollectionId] = useState<
    string | null
  >(null);
  const [newCollectionTitleDraft, setNewCollectionTitleDraft] = useState("");
  const [newCollectionError, setNewCollectionError] = useState("");
  const [isSubmittingCollectionTitle, setIsSubmittingCollectionTitle] =
    useState(false);

  const newCollectionTitleInputRef = useRef<TextInput | null>(null);
  const pendingInitialTitleSelectionRef = useRef<{
    start: number;
    end: number;
  } | null>(null);

  const openCreateCollectionSheet = () => {
    if (!canEdit) return;
    setNewCollectionSheetMode("create");
    setRenamingCollectionId(null);
    setNewCollectionTitleDraft("");
    setNewCollectionError("");
    pendingInitialTitleSelectionRef.current = null;
    setIsNewCollectionSheetOpen(true);
  };

  const openRenameCollectionSheet = (collection: TerreiroCollectionCard) => {
    if (!canEdit) return;
    const current =
      (typeof collection.title === "string" && collection.title.trim()) || "";
    setNewCollectionSheetMode("rename");
    setRenamingCollectionId(collection.id);
    setNewCollectionTitleDraft(current);
    setNewCollectionError("");
    const end = current.length;
    pendingInitialTitleSelectionRef.current = { start: end, end };
    setIsNewCollectionSheetOpen(true);
  };

  useEffect(() => {
    if (!isNewCollectionSheetOpen) return;
    const id = setTimeout(() => {
      newCollectionTitleInputRef.current?.focus();

      const sel = pendingInitialTitleSelectionRef.current;
      if (sel) {
        (newCollectionTitleInputRef.current as any)?.setNativeProps({
          selection: sel,
        });
        pendingInitialTitleSelectionRef.current = null;
      }
    }, 80);
    return () => clearTimeout(id);
  }, [isNewCollectionSheetOpen]);

  // If permissions change while the screen is open, close edit surfaces immediately.
  useEffect(() => {
    if (canEdit) return;

    if (isCollectionActionsOpen) {
      closeCollectionActions();
    }

    if (isConfirmDeleteCollectionOpen) {
      closeConfirmDeleteCollection();
    }

    if (isNewCollectionSheetOpen) {
      setIsNewCollectionSheetOpen(false);
    }

    setNewCollectionSheetMode("create");
    setRenamingCollectionId(null);
    setNewCollectionTitleDraft("");
    setNewCollectionError("");
    setIsSubmittingCollectionTitle(false);
    pendingInitialTitleSelectionRef.current = null;
    setIsDeletingCollection(false);
  }, [
    canEdit,
    closeCollectionActions,
    closeConfirmDeleteCollection,
    isCollectionActionsOpen,
    isConfirmDeleteCollectionOpen,
    isNewCollectionSheetOpen,
  ]);

  const createCollectionMutation = useMutation({
    mutationFn: async (vars: { title: string; tempId: string }) => {
      const res = await supabase
        .from("collections")
        .insert({
          title: vars.title,
          owner_terreiro_id: terreiroId,
          owner_user_id: null,
        })
        .select("id, title, description, visibility, owner_terreiro_id")
        .single();

      if (res.error || !res.data?.id) {
        throw new Error(res.error?.message || "Erro ao criar coleção");
      }

      return {
        id: res.data.id as string,
        title: typeof res.data.title === "string" ? res.data.title : vars.title,
        description:
          typeof (res.data as any).description === "string"
            ? ((res.data as any).description as string)
            : null,
        visibility:
          typeof (res.data as any).visibility === "string"
            ? ((res.data as any).visibility as string)
            : null,
        owner_terreiro_id:
          typeof (res.data as any).owner_terreiro_id === "string"
            ? ((res.data as any).owner_terreiro_id as string)
            : terreiroId,
      };
    },
    onMutate: async (vars) => {
      if (!terreiroId) return null;

      const optimistic: TerreiroCollectionCard = {
        id: vars.tempId,
        title: vars.title,
        description: null,
        visibility: null,
        owner_terreiro_id: terreiroId,
        pontosCount: 0,
      };

      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => [optimistic, ...(old ?? [])]
      );

      return { snapshot, tempId: vars.tempId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);
      setNewCollectionError(
        err instanceof Error ? err.message : "Erro ao criar coleção"
      );
    },
    onSuccess: (data, _vars, ctx) => {
      if (!terreiroId) return;
      const tempId = ctx?.tempId;
      if (!tempId) return;

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => {
          const replaced = replaceId(old ?? [], tempId, data.id);
          return patchById(replaced, data.id, {
            title: data.title,
            description: data.description,
            visibility: data.visibility,
            owner_terreiro_id: data.owner_terreiro_id,
          });
        }
      );
      setNewCollectionError("");
    },
    onSettled: (_data, _err, _vars, ctx) => {
      if (!terreiroId) return;

      if (ctx?.tempId) {
        setQueriesDataSafe<TerreiroCollectionCard[]>(
          queryClient,
          { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
          (old) => removeById(old ?? [], ctx.tempId)
        );
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });
    },
  });

  const updateCollectionTitleMutation = useMutation({
    mutationFn: async (vars: { collectionId: string; title: string }) => {
      const res = await supabase
        .from("collections")
        .update({ title: vars.title })
        .eq("id", vars.collectionId)
        .select("id, title")
        .single();

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao atualizar título da coleção"
        );
      }

      const savedTitle =
        (typeof res.data?.title === "string" && res.data.title.trim()) ||
        vars.title;

      return { id: vars.collectionId, title: savedTitle };
    },
    onMutate: async (vars) => {
      if (!terreiroId) return null;
      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => patchById(old ?? [], vars.collectionId, { title: vars.title })
      );

      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);

      if (__DEV__) {
        console.info("[TerreiroBiblioteca] erro ao salvar título da coleção", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      Alert.alert(
        "Erro",
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o título da coleção."
      );
    },
    onSuccess: (data) => {
      if (!terreiroId) return;
      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => patchById(old ?? [], data.id, { title: data.title })
      );
    },
    onSettled: () => {
      if (!terreiroId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });
    },
  });

  const createNewCollectionFromSheet = async () => {
    if (!canEdit) return;
    const title = (newCollectionTitleDraft ?? "").trim();
    if (!title) {
      setNewCollectionError("O título não pode ficar vazio.");
      return;
    }

    setIsSubmittingCollectionTitle(true);
    setNewCollectionError("");

    try {
      const tempId = `new-${Date.now()}`;
      await createCollectionMutation.mutateAsync({ title, tempId });

      setIsNewCollectionSheetOpen(false);
      setNewCollectionTitleDraft("");
      setNewCollectionError("");
      pendingInitialTitleSelectionRef.current = null;
    } finally {
      setIsSubmittingCollectionTitle(false);
    }
  };

  const renameCollectionFromSheet = async () => {
    if (!canEdit) return;
    if (!renamingCollectionId) return;

    const title = (newCollectionTitleDraft ?? "").trim();
    if (!title) {
      setNewCollectionError("O título não pode ficar vazio.");
      return;
    }

    setIsSubmittingCollectionTitle(true);
    setNewCollectionError("");

    try {
      await updateCollectionTitleMutation.mutateAsync({
        collectionId: renamingCollectionId,
        title,
      });

      setIsNewCollectionSheetOpen(false);
      setNewCollectionSheetMode("create");
      setRenamingCollectionId(null);
      setNewCollectionTitleDraft("");
      setNewCollectionError("");
      pendingInitialTitleSelectionRef.current = null;
    } finally {
      setIsSubmittingCollectionTitle(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: baseBgColor }]}>
      <BottomSheet
        visible={isNewCollectionSheetOpen}
        variant={variant}
        onClose={() => {
          if (isSubmittingCollectionTitle) return;
          setIsNewCollectionSheetOpen(false);
          setNewCollectionSheetMode("create");
          setRenamingCollectionId(null);
          setNewCollectionTitleDraft("");
          setNewCollectionError("");
          pendingInitialTitleSelectionRef.current = null;
        }}
      >
        <View style={styles.newCollectionSheet}>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>
            {newCollectionSheetMode === "rename" ? "Renomear" : "Nova coleção"}
          </Text>

          <View
            style={[
              styles.newCollectionInputWrap,
              {
                borderColor: titleInputBorder,
                backgroundColor: titleInputBg,
              },
            ]}
          >
            <TextInput
              ref={(node) => {
                newCollectionTitleInputRef.current = node;
              }}
              value={newCollectionTitleDraft}
              onChangeText={setNewCollectionTitleDraft}
              style={[styles.newCollectionInput, { color: textPrimary }]}
              placeholder="Nome da coleção"
              placeholderTextColor={textSecondary}
              selectionColor={accentColor}
              editable={!isSubmittingCollectionTitle}
              autoCorrect={false}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (newCollectionSheetMode === "rename") {
                  void renameCollectionFromSheet();
                } else {
                  void createNewCollectionFromSheet();
                }
              }}
            />
          </View>

          {newCollectionError ? (
            <Text style={[styles.newCollectionError, { color: dangerColor }]}>
              {newCollectionError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              newCollectionSheetMode === "rename"
                ? "Renomear coleção"
                : "Criar coleção"
            }
            disabled={isSubmittingCollectionTitle}
            onPress={() => {
              if (newCollectionSheetMode === "rename") {
                void renameCollectionFromSheet();
              } else {
                void createNewCollectionFromSheet();
              }
            }}
            style={({ pressed }) => [
              styles.newCollectionCreateButton,
              pressed ? styles.primaryButtonPressed : null,
              isSubmittingCollectionTitle ? styles.iconButtonDisabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {newCollectionSheetMode === "rename" ? "Renomear" : "Criar"}
            </Text>
          </Pressable>

          <Image
            source={fillerPng}
            style={styles.newCollectionFiller}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={isCollectionActionsOpen}
        variant={variant}
        onClose={closeCollectionActions}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>Ações</Text>
          {collectionActionsTarget?.title ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {collectionActionsTarget.title}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Renomear coleção"
              hitSlop={10}
              onPress={() => {
                const target = collectionActionsTarget;
                closeCollectionActions();
                if (!target) return;
                setTimeout(() => {
                  openRenameCollectionSheet(target);
                }, 80);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
              ]}
            >
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Renomear
              </Text>
            </Pressable>

            <Separator variant={variant} />

            {canDeleteCollection(collectionActionsTarget) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Excluir coleção"
                hitSlop={10}
                onPress={() => {
                  const target = collectionActionsTarget;
                  closeCollectionActions();
                  if (!target) return;
                  setCollectionPendingDelete(target);
                  setTimeout(() => {
                    setIsConfirmDeleteCollectionOpen(true);
                  }, 80);
                }}
                style={({ pressed }) => [
                  styles.sheetActionRow,
                  pressed ? styles.sheetActionPressed : null,
                ]}
              >
                <Ionicons name="trash" size={18} color={dangerColor} />
                <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                  Excluir
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={isConfirmDeleteCollectionOpen}
        variant={variant}
        onClose={closeConfirmDeleteCollection}
      >
        <View>
          <Text style={[styles.sheetTitle, { color: warningColor }]}>
            Excluir coleção?
          </Text>
          {collectionPendingDelete?.title ? (
            <Text style={[styles.sheetSubtitle, { color: textSecondary }]}>
              {collectionPendingDelete.title}
            </Text>
          ) : null}

          <Text style={[styles.confirmText, { color: textSecondary }]}>
            Esta ação é permanente. Deseja prosseguir?
          </Text>

          <View style={styles.sheetActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              hitSlop={10}
              onPress={closeConfirmDeleteCollection}
              disabled={isDeletingCollection}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isDeletingCollection ? styles.sheetActionDisabled : null,
              ]}
            >
              <Ionicons name="close" size={18} color={textMuted} />
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>

            <Separator variant={variant} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirmar exclusão"
              hitSlop={10}
              disabled={
                isDeletingCollection ||
                !canDeleteCollection(collectionPendingDelete)
              }
              onPress={() => {
                if (!collectionPendingDelete) return;
                void deleteCollection(collectionPendingDelete);
              }}
              style={({ pressed }) => [
                styles.sheetActionRow,
                pressed ? styles.sheetActionPressed : null,
                isDeletingCollection ||
                !canDeleteCollection(collectionPendingDelete)
                  ? styles.sheetActionDisabled
                  : null,
              ]}
            >
              <Ionicons name="trash" size={18} color={dangerColor} />
              <Text style={[styles.sheetActionText, { color: dangerColor }]}>
                Excluir
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <View style={styles.headerAndBody}>
        <View
          style={[
            styles.fixedHeader,
            {
              height: headerTotalHeight,
              paddingTop: insets.top ?? 0,
            },
          ]}
        >
          <View pointerEvents="none" style={styles.headerGradientWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: baseBgColor,
                  opacity: headerBackdropOpacity,
                },
              ]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { opacity: headerGradientOpacity },
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[hexToRgba(headerGoldColor, 0.22), baseBgColor]}
                locations={[0, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            hitSlop={10}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={headerFgColor} />
          </Pressable>

          <Animated.View
            style={[
              styles.headerInlineTitleWrap,
              { opacity: headerTitleOpacity },
            ]}
            pointerEvents={isHeaderTitleVisible ? "auto" : "none"}
          >
            <Text
              style={[styles.headerInlineTitle, { color: headerFgColor }]}
              numberOfLines={1}
            >
              {terreiroName}
            </Text>
          </Animated.View>

          <Animated.View
            style={{ opacity: headerTitleOpacity }}
            pointerEvents={isHeaderTitleVisible ? "auto" : "none"}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartilhar"
              onPress={() => {
                void handleShare();
              }}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="share-outline" size={20} color={headerFgColor} />
            </Pressable>
          </Animated.View>
        </View>

        <Reanimated.ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: headerTotalHeight, paddingBottom: listBottomInset },
          ]}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              hexToRgba(headerGoldColor, 0.95),
              hexToRgba(headerGoldColor, 0.45),
              baseBgColor,
            ]}
            locations={[0, 0.55, 1]}
            style={[
              styles.topGradient,
              {
                top: -headerTotalHeight,
                height: topGradientHeight + headerTotalHeight,
              },
            ]}
          />

          <Reanimated.View
            style={[
              styles.coverBanner,
              { backgroundColor: baseBgColor, alignSelf: "center" },
              coverAnimatedStyle,
            ]}
          >
            {terreiroCoverImageUrl ? (
              <Image
                source={{ uri: terreiroCoverImageUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View
                style={[
                  styles.coverBannerFallback,
                  { backgroundColor: baseBgColor },
                ]}
              >
                <Ionicons name="home-outline" size={40} color={textMuted} />
              </View>
            )}

            <LinearGradient
              pointerEvents="none"
              colors={[hexToRgba("#000", 0.0), hexToRgba("#000", 0.25)]}
              locations={[0, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Reanimated.View>

          <Reanimated.View style={contentAnimatedStyle}>
            <View
              style={styles.titleBlock}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;

                if (__DEV__) {
                  console.log("[TerreiroBiblioteca] titleBlock onLayout:", {
                    y,
                    previous: titleBlockY,
                  });
                }

                setTitleBlockY(y);
              }}
            >
              <Animated.Text
                style={[
                  styles.kicker,
                  { color: textMuted, opacity: titleShareOpacity },
                ]}
              >
                Biblioteca de
              </Animated.Text>

              <Animated.View
                style={[styles.titleRow, { opacity: titleShareOpacity }]}
                pointerEvents={isHeaderTitleVisible ? "none" : "auto"}
              >
                <Text style={[styles.h1, { color: textPrimary }]}>
                  {terreiroName}
                </Text>

                <Animated.View
                  style={[
                    styles.titleShareWrap,
                    { opacity: titleShareOpacity },
                  ]}
                  pointerEvents={isHeaderTitleVisible ? "none" : "auto"}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Compartilhar"
                    onPress={() => {
                      void handleShare();
                    }}
                    hitSlop={10}
                    style={styles.headerIconBtn}
                  >
                    <Ionicons
                      name="share-outline"
                      size={20}
                      color={textPrimary}
                    />
                  </Pressable>
                </Animated.View>
              </Animated.View>

              {collectionsCountText || membersCountText ? (
                <View style={styles.countsRow}>
                  {collectionsCountText ? (
                    <Text style={[styles.countText, { color: textMuted }]}>
                      {collectionsCountText}
                    </Text>
                  ) : null}

                  {collectionsCountText && membersCountText ? (
                    <Text style={[styles.countText, { color: textMuted }]}>
                      {" "}
                      •{" "}
                    </Text>
                  ) : null}

                  {membersCountText ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ver membros"
                      onPress={() => {
                        if (shouldBlockPress()) return;
                        if (!terreiroId) return;
                        router.push({
                          pathname: "/terreiro-members-list" as any,
                          params: { terreiroId },
                        });
                      }}
                      disabled={!terreiroId}
                      hitSlop={10}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text style={[styles.countText, { color: textMuted }]}>
                        {membersCountText}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsRow}
                onLayout={(e: any) => {
                  const { y, height } = e.nativeEvent.layout;
                  setActionsBottomY(y + height);
                }}
              >
                {!membership.isActiveMember ? (
                  <JoinTerreiroButton
                    terreiroId={terreiroId}
                    variant={variant}
                  />
                ) : null}

                {canEdit ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Nova coleção"
                    onPress={openCreateCollectionSheet}
                    disabled={isSubmittingCollectionTitle}
                    style={({ pressed }) => [
                      styles.primaryActionBtn,
                      pressed ? styles.pressed : null,
                      isSubmittingCollectionTitle ? styles.disabled : null,
                    ]}
                  >
                    <Ionicons name="add" size={18} color={colors.paper50} />
                    <Text style={styles.primaryActionText}>Nova coleção</Text>
                  </Pressable>
                ) : null}

                {canEdit ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Editar"
                    onPress={() => {
                      if (shouldBlockPress()) return;
                      if (!terreiroId) return;
                      router.push({
                        pathname:
                          "/terreiro-collections/[terreiroId]/edit" as any,
                        params: { terreiroId },
                      });
                    }}
                    style={({ pressed }) => [
                      styles.secondaryActionBtn,
                      {
                        borderColor:
                          variant === "light"
                            ? colors.inputBorderLight
                            : colors.inputBorderDark,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Ionicons
                      name="reorder-three-outline"
                      size={18}
                      color={textPrimary}
                    />
                    <Text
                      style={[
                        styles.secondaryActionText,
                        { color: textPrimary },
                      ]}
                    >
                      Editar
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>

            <View
              onLayout={(e) => {
                setPontosTopY(e.nativeEvent.layout.y);
              }}
            />

            <View style={styles.cardsBlock}>
              {collectionsQuery.isLoading ? (
                <View style={styles.paddedBlock}>
                  <Text style={[styles.bodyText, { color: textSecondary }]}>
                    Carregando…
                  </Text>
                </View>
              ) : collectionsQuery.isError ? (
                <View style={styles.paddedBlock}>
                  <Text style={[styles.bodyText, { color: textSecondary }]}>
                    Erro ao carregar as coleções.
                  </Text>
                </View>
              ) : orderedCollections.length === 0 ? (
                <View style={styles.paddedBlock}>
                  <Text style={[styles.bodyText, { color: textSecondary }]}>
                    Nenhuma coleção ainda.
                  </Text>
                </View>
              ) : (
                orderedCollections.map((item) => {
                  const name =
                    (typeof item.title === "string" && item.title.trim()) ||
                    "Coleção";
                  const pontosCount =
                    typeof (item as any).pontosCount === "number"
                      ? ((item as any).pontosCount as number)
                      : 0;

                  const handlePress = () => {
                    const now = Date.now();
                    if (shouldBlockPress()) {
                      if (__DEV__) {
                        console.log("[PressGuard] blocked", {
                          screen: "TerreiroBiblioteca",
                          now,
                        });
                      }
                      return;
                    }

                    if (__DEV__) {
                      console.log("[PressGuard] allowed", {
                        screen: "TerreiroBiblioteca",
                        now,
                      });
                      console.log("[Navigation] click -> /collection/[id]", {
                        screen: "TerreiroBiblioteca",
                        now,
                        collectionId: item.id,
                      });
                    }

                    router.push({
                      pathname: "/collection/[id]",
                      params: {
                        id: item.id,
                        collectionId: item.id,
                        collectionTitle: name,
                        terreiroId: terreiroId || undefined,
                      },
                    });
                  };

                  return (
                    <View key={item.id} style={styles.cardGap}>
                      <SurfaceCard variant={variant}>
                        <Pressable onPress={handlePress} style={{ flex: 1 }}>
                          <View style={styles.cardHeaderRow}>
                            <Text
                              style={[styles.cardTitle, { color: textPrimary }]}
                              numberOfLines={2}
                            >
                              {name}
                            </Text>

                            {canEdit ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Abrir menu da coleção"
                                accessibilityHint="Opções: renomear ou excluir"
                                hitSlop={10}
                                onPress={() => {
                                  openCollectionActions(item);
                                }}
                                style={({ pressed }) => [
                                  styles.menuButton,
                                  pressed ? styles.iconButtonPressed : null,
                                ]}
                              >
                                <Ionicons
                                  name="ellipsis-vertical"
                                  size={18}
                                  color={accentColor}
                                />
                              </Pressable>
                            ) : null}
                          </View>

                          <Text
                            style={[
                              styles.cardDescription,
                              { color: textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {pontosCount} pontos
                          </Text>
                        </Pressable>
                      </SurfaceCard>
                    </View>
                  );
                })
              )}
            </View>
          </Reanimated.View>
        </Reanimated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerAndBody: {
    flex: 1,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headerGradientWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInlineTitleWrap: {
    flex: 1,
    marginLeft: 6,
    marginRight: 6,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInlineTitle: {
    fontSize: 14,
    fontWeight: "900",
    maxWidth: 260,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topGradient: {
    position: "absolute",
    left: -spacing.lg,
    right: -spacing.lg,
  },
  coverBanner: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  coverBannerFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    paddingTop: spacing.lg,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: 2,
  },
  h1: {
    flex: 1,
    minWidth: 0,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  titleShareWrap: {
    marginTop: 2,
  },
  countText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  countsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  actionsRow: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  primaryActionBtn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.brass600,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.paper50,
  },
  secondaryActionBtn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },

  // Cards (mantém visual atual do Terreiro)
  cardsBlock: {
    paddingTop: spacing.sm,
  },
  cardGap: {
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "900",
  },
  cardDescription: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.7,
  },

  paddedBlock: {
    paddingVertical: spacing.md,
  },
  bodyText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Sheets (reuso do Terreiro)
  newCollectionSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
  newCollectionInputWrap: {
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  newCollectionInput: {
    fontSize: 14,
    fontWeight: "800",
  },
  newCollectionError: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: "800",
  },
  newCollectionCreateButton: {
    marginTop: spacing.md,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brass600,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.paper50,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
  newCollectionFiller: {
    width: "100%",
    height: 290,
    marginTop: spacing.md,
  },

  sheetActions: {
    marginTop: spacing.md,
  },
  sheetActionRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sheetActionPressed: {
    opacity: 0.75,
  },
  sheetActionDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
