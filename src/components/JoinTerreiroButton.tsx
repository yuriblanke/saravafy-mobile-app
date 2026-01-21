import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  useCreateTerreiroMembershipRequest,
  useTerreiroMembershipStatus,
} from "@/src/hooks/terreiroMembership";
import { colors } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

type JoinTerreiroButtonProps = {
  terreiroId: string;
  variant: "light" | "dark";
};

export function JoinTerreiroButton({
  terreiroId,
  variant,
}: JoinTerreiroButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const membership = useTerreiroMembershipStatus(terreiroId);
  const createRequest = useCreateTerreiroMembershipRequest(terreiroId);

  const handlePress = async () => {
    if (!user?.id) {
      router.replace("/login" as any);
      return;
    }

    if (!terreiroId) {
      showToast("Não foi possível identificar o terreiro.");
      return;
    }

    if (membership.data.isActiveMember) {
      showToast("Você já é membro deste terreiro.");
      return;
    }

    const result = await createRequest.create();
    if (result.ok) {
      showToast(
        result.alreadyExisted
          ? "Pedido já enviado (pendente)."
          : "Pedido enviado (pendente)."
      );
      await membership.reload();
      return;
    }

    showToast("Não foi possível enviar o pedido agora. Tente novamente.");
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tornar-se membro deste terreiro"
      disabled={createRequest.isCreating || membership.isLoading || !terreiroId}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.primaryActionBtn,
        pressed ? styles.pressed : null,
        createRequest.isCreating ? styles.disabled : null,
      ]}
    >
      <Ionicons name="person-add" size={18} color={colors.paper50} />
      <Text style={styles.primaryActionText}>Tornar-se membro</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
});
