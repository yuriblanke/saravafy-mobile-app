import { useEffect } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useToast } from "@/contexts/ToastContext";
import { isUuid } from "@/src/utils/pontoCode";

export default function DeepLinkTerreiroRoute() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    const id = String(params.id ?? "").trim();

    if (!isUuid(id)) {
      showToast("Link inválido.");
      router.replace("/(app)");
      return;
    }

    router.replace({ pathname: "/terreiro", params: { terreiroId: id } });
  }, [params.id, router, showToast]);

  return null;
}
