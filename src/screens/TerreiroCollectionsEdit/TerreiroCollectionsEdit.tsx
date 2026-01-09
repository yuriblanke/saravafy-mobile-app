import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useToast } from "@/contexts/ToastContext";
import {
  EditOrderScreenBase,
  type EditOrderItem,
} from "@/src/screens/EditOrderScreenBase/EditOrderScreenBase";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import { useCollectionsByTerreiroQuery } from "@/src/queries/terreirosCollections";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";

export default function EditTerreiroCollectionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ terreiroId?: string }>();
  const { shouldBlockPress } = useGestureBlock();
  const { showToast } = useToast();
  const { user } = useAuth();

  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  useEffect(() => {
    if (terreiroId) return;
    showToast("Terreiro inválido.");
    router.back();
  }, [router, showToast, terreiroId]);

  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;
  const myRole = membership.role;
  const canEdit = membership.isActiveMember && (myRole === "admin" || myRole === "editor");

  useEffect(() => {
    if (!terreiroId) return;
    if (!user?.id) return;
    if (membershipQuery.isLoading) return;

    if (!canEdit) {
      showToast("Sem permissão para editar este terreiro.");
      router.back();
    }
  }, [canEdit, membershipQuery.isLoading, router, showToast, terreiroId, user?.id]);

  const collectionsQuery = useCollectionsByTerreiroQuery(terreiroId || null);
  const collections = collectionsQuery.data ?? [];

  const items = useMemo(() => {
    const mapped: EditOrderItem[] = [];
    for (const c of collections) {
      const id = String(c?.id ?? "");
      if (!id) continue;
      const title = (typeof c?.title === "string" && c.title.trim()) || "Coleção";
      const subtitle =
        typeof c?.description === "string" && c.description.trim()
          ? c.description
          : typeof c?.pontosCount === "number"
            ? `${c.pontosCount} ponto(s)`
            : undefined;
      mapped.push({ id, title, subtitle });
    }
    return mapped;
  }, [collections]);

  const onSave = useCallback(async (_orderedIds: string[]) => {
    if (!terreiroId) {
      throw new Error("Terreiro inválido.");
    }

    // Stub: ainda não existe persistência da ordem das collections por terreiro.
    // Mantemos o editor reutilizável, mas o save não altera o backend.
    return;
  }, [terreiroId]);

  if (!terreiroId) return null;

  return (
    <EditOrderScreenBase
      title="Editar coleções"
      items={items}
      allowRemove={false}
      onSave={onSave}
      successToast="Ordem de coleções ainda não é persistida."
      errorToastFallback="Não foi possível salvar."
      discardConfirmTitle="Descartar alterações?"
      discardConfirmMessage="Suas alterações não foram salvas."
    />
  );
}
