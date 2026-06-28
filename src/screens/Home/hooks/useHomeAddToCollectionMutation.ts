import {
  applyEntidadePlaceholder,
  lyricsHasEntidadePlaceholder,
} from "@/src/domain/entidadePlaceholder";
import { type EditableCollection } from "@/src/queries/collections";
import {
  incrementCollectionPontosCountInTerreiroLists,
  removePontoFromCollectionPontosList,
  upsertPontoInCollectionPontosList,
} from "@/src/queries/collectionsCache";
import {
  cancelQueries,
  patchById,
  patchQueriesByPrefix,
  rollbackQueries,
  setQueriesDataSafe,
  snapshotQueries,
} from "@/src/queries/mutationUtils";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  resolveDefaultPontoVersaoId,
  toPlayerPonto,
  type ListPonto,
} from "@/src/screens/CollectionAddToCollection/addToCollectionModel";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addPontoToCollection,
  type CollectionPontoEntidadeInput,
} from "../data/collections_pontos";
import type { Ponto } from "../data/ponto";

export type HomeAddToCollectionVars = {
  collectionId: string;
  pontoId: string;
  addedBy: string;
  pontoSnapshot?: Ponto | null;
  pontoVersaoId?: string | null;
  entidade?: CollectionPontoEntidadeInput | null;
  entidadeResolvedLabel?: string | null;
  listPonto?: ListPonto | null;
};

export function useHomeAddToCollectionMutation(params: {
  userId: string | null;
  onError: (message: string) => void;
}) {
  const { userId, onError } = params;
  const queryClient = useQueryClient();

  return useMutation<any, Error, HomeAddToCollectionVars>({
    mutationFn: async (vars) => {
      const res = await addPontoToCollection({
        collectionId: vars.collectionId,
        pontoId: vars.pontoId,
        addedBy: vars.addedBy,
        pontoVersaoId: vars.pontoVersaoId ?? undefined,
        entidade: vars.entidade ?? null,
      });
      if (!res.ok) {
        throw new Error(res.error || "Erro ao adicionar ponto à coleção.");
      }
      return res;
    },
    onMutate: async (vars) => {
      if (!userId) return null;

      const now = new Date().toISOString();

      const pontoSnapshot = vars.pontoSnapshot;
      const shouldPatchPontosList =
        !!pontoSnapshot && typeof pontoSnapshot?.id === "string";

      const filters = [
        { queryKey: queryKeys.collections.accountable(userId) },
        { queryKey: queryKeys.collections.editableByUserPrefix(userId) },
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        { queryKey: queryKeys.collections.pontos(vars.collectionId) },
        { queryKey: ["terreiros", "collectionsByTerreiro"] },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => patchById(old ?? [], vars.collectionId, { updated_at: now }),
      );

      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => patchById(old ?? [], vars.collectionId, { updated_at: now }),
      );

      setQueriesDataSafe<any>(
        queryClient,
        { queryKey: queryKeys.collections.byId(vars.collectionId) },
        (old: any) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, updated_at: now };
        },
      );

      let didInsertPonto = false;
      let didIncrementCount = false;

      if (shouldPatchPontosList && pontoSnapshot) {
        const listPonto = vars.listPonto;
        let mappedPonto: PlayerPonto;

        if (
          listPonto &&
          Array.isArray(listPonto.versoes) &&
          listPonto.versoes.length > 0
        ) {
          const explicit =
            typeof vars.pontoVersaoId === "string" && vars.pontoVersaoId.trim()
              ? vars.pontoVersaoId.trim()
              : null;
          const vid =
            explicit ?? resolveDefaultPontoVersaoId(listPonto.versoes);
          const v = vid
            ? listPonto.versoes.find((x) => x.id === vid) ?? null
            : null;
          const base = toPlayerPonto(listPonto);
          const label =
            typeof vars.entidadeResolvedLabel === "string"
              ? vars.entidadeResolvedLabel.trim()
              : "";
          let lyrics = v?.lyrics ?? base.lyrics;
          let lyrics_preview_6 =
            typeof v?.lyrics_preview_6 === "string"
              ? v.lyrics_preview_6
              : base.lyrics_preview_6;
          if (label && v && lyricsHasEntidadePlaceholder(lyrics)) {
            lyrics = applyEntidadePlaceholder(lyrics, label);
            if (typeof lyrics_preview_6 === "string") {
              lyrics_preview_6 = applyEntidadePlaceholder(
                lyrics_preview_6,
                label,
              );
            }
          }
          const collectionEntidadeResolve =
            vars.entidade?.kind === "custom"
              ? {
                  entidadeTexto: vars.entidade.texto.trim(),
                  entidadeLabelFromId: null as string | null,
                }
              : vars.entidade?.kind === "registered"
                ? {
                    entidadeTexto: null as string | null,
                    entidadeLabelFromId: label || null,
                  }
                : null;
          mappedPonto = {
            ...(v ? { ...base, lyrics, lyrics_preview_6 } : base),
            collectionPinnedVersaoId: vid ?? null,
            collectionEntidadeResolve,
          };
        } else {
          mappedPonto = {
            id: String(pontoSnapshot.id ?? ""),
            title:
              (typeof (pontoSnapshot as any).title === "string" &&
                (pontoSnapshot as any).title.trim()) ||
              "Ponto",
            artist: null,
            author_name:
              typeof (pontoSnapshot as any).author_name === "string"
                ? (pontoSnapshot as any).author_name
                : null,
            is_public_domain:
              typeof (pontoSnapshot as any).is_public_domain === "boolean"
                ? (pontoSnapshot as any).is_public_domain
                : null,
            duration_seconds: null,
            cover_url: null,
            lyrics:
              typeof (pontoSnapshot as any).lyrics === "string"
                ? (pontoSnapshot as any).lyrics
                : "",
            tags: Array.isArray((pontoSnapshot as any).tags)
              ? ((pontoSnapshot as any).tags as any[]).filter(
                  (t) => typeof t === "string",
                )
              : [],
            versoes: [],
            entidade_id: null,
            entidadeNome: null,
            orixaNome: null,
          };
        }

        const { didInsert } = upsertPontoInCollectionPontosList(queryClient, {
          collectionId: vars.collectionId,
          ponto: mappedPonto,
        });
        didInsertPonto = didInsert;

        if (didInsertPonto) {
          incrementCollectionPontosCountInTerreiroLists(queryClient, {
            collectionId: vars.collectionId,
            delta: 1,
          });
          didIncrementCount = true;
        }
      }

      return { snapshot, didInsertPonto, didIncrementCount };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) {
        rollbackQueries(queryClient, ctx.snapshot);
      }
      const msg =
        err instanceof Error ? err.message : "Erro ao adicionar ponto à coleção.";
      onError(__DEV__ ? msg : "Erro ao adicionar ponto à coleção.");
    },
    onSuccess: (data, vars, ctx) => {
      if (data?.alreadyExists) {
        if (ctx?.didInsertPonto) {
          removePontoFromCollectionPontosList(queryClient, {
            collectionId: vars.collectionId,
            pontoId: vars.pontoId,
          });
        }
        if (ctx?.didIncrementCount) {
          incrementCollectionPontosCountInTerreiroLists(queryClient, {
            collectionId: vars.collectionId,
            delta: -1,
          });
        }
      }
    },
    onSettled: (_data, _err, vars) => {
      if (!userId) return;

      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.byId(vars.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.pontos(vars.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: ["terreiros", "collectionsByTerreiro"],
      });
    },
  });
}
