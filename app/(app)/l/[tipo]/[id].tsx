import { useToast } from "@/contexts/ToastContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

export default function DeepLinkBridge() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ tipo?: string; id?: string }>();

  const didNavigateRef = useRef(false);

  useEffect(() => {
    if (didNavigateRef.current) return;

    const rawTipo = typeof params.tipo === "string" ? params.tipo : "";
    const rawId = typeof params.id === "string" ? params.id : "";

    const tipo = rawTipo.trim().toLowerCase();
    const id = rawId.trim();

    if (!tipo || !id) {
      didNavigateRef.current = true;
      showToast("Link inválido.");
      router.replace("/(app)");
      return;
    }

    const normalizedTipo = tipo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (normalizedTipo === "terreiro" || normalizedTipo === "terreiros") {
      didNavigateRef.current = true;
      router.replace({ pathname: "/terreiro", params: { terreiroId: id } });
      return;
    }

    if (
      normalizedTipo === "collection" ||
      normalizedTipo === "collections" ||
      normalizedTipo === "colecao" ||
      normalizedTipo === "colecoes"
    ) {
      didNavigateRef.current = true;
      router.replace({ pathname: "/collection/[id]", params: { id } });
      return;
    }

    if (normalizedTipo === "ponto" || normalizedTipo === "pontos") {
      didNavigateRef.current = true;
      router.replace({ pathname: "/player", params: { source: "all", pontoId: id } });
      return;
    }

    didNavigateRef.current = true;
    showToast("Link desconhecido.");
    router.replace("/(app)");
  }, [params.id, params.tipo, router, showToast]);

  return null;
}
