import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/src/components/BottomSheet";
import { Separator } from "@/src/components/Separator";
import type { MyTerreiroWithRole } from "@/src/queries/me";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { useQueryClient } from "@tanstack/react-query";

import { ConfirmModal } from "./ConfirmModal";

type Props = {
  variant: "light" | "dark";
  target: MyTerreiroWithRole | null;
  onClose: () => void;
};

export function TerreiroActionsSheet({ variant, target, onClose }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;

  const dangerColor = colors.danger;

  const canAdmin = target?.role === "admin";
  const canEditor = target?.role === "editor";
  const canLeaveRole = canAdmin || canEditor;
  const canLeaveTerreiro = target?.role === "member";

  const leaveRoleActionLabel = useMemo(() => {
    if (target?.role === "admin") return "Sair do papel de admin";
    if (target?.role === "editor") return "Sair do papel de editor";
    return "Sair do papel";
  }, [target?.role]);

  const snapPoints = useMemo(() => {
    if (canAdmin) return [320];
    if (canLeaveRole) return [220];
    if (canLeaveTerreiro) return [220];
    return [180];
  }, [canAdmin, canLeaveRole, canLeaveTerreiro]);

  const [leaveRoleTarget, setLeaveRoleTarget] =
    useState<MyTerreiroWithRole | null>(null);
  const [leaveRoleBusy, setLeaveRoleBusy] = useState(false);

  const [leaveTerreiroTarget, setLeaveTerreiroTarget] =
    useState<MyTerreiroWithRole | null>(null);
  const [leaveTerreiroBusy, setLeaveTerreiroBusy] = useState(false);

  const leaveRoleTitle = useMemo(() => {
    if (!leaveRoleTarget) return "Sair do papel?";
    if (leaveRoleTarget.role === "admin") return "Sair do papel de admin?";
    if (leaveRoleTarget.role === "editor") return "Sair do papel de editor(a)?";
    return "Sair do papel?";
  }, [leaveRoleTarget]);

  const leaveRoleBody = useMemo(() => {
    return "Você vai perder acesso de gestão deste terreiro e continuará como membro.";
  }, []);

  const requestLeaveRole = useCallback(() => {
    if (!target) return;
    if (!(target.role === "admin" || target.role === "editor")) return;
    // Close sheet first, then open modal.
    onClose();
    setTimeout(() => {
      setLeaveRoleTarget(target);
    }, 80);
  }, [onClose, target]);

  const requestLeaveTerreiro = useCallback(() => {
    if (!target) return;
    if (target.role !== "member") return;
    // Close sheet first, then open modal.
    onClose();
    setTimeout(() => {
      setLeaveTerreiroTarget(target);
    }, 80);
  }, [onClose, target]);

  const confirmLeaveRole = useCallback(async () => {
    const userId = user?.id ?? "";
    if (!userId) {
      showToast("Faça login novamente para continuar.");
      setLeaveRoleTarget(null);
      return;
    }

    const t = leaveRoleTarget;
    if (!t) return;
    if (!(t.role === "admin" || t.role === "editor")) return;

    setLeaveRoleBusy(true);
    try {
      const res = await supabase
        .from("terreiro_members")
        .update({ role: "member" })
        .eq("terreiro_id", t.id)
        .eq("user_id", userId);

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Não foi possível sair do papel agora."
        );
      }

      // Update the shared membership cache immediately so all screens (Terreiro/Player/Collection)
      // drop edit permissions without waiting for a refetch.
      queryClient.setQueryData(queryKeys.me.membership(userId), (prev: any) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.map((r: any) => {
          if (String(r?.terreiro_id ?? "") !== String(t.id)) return r;
          return { ...r, role: "member" };
        });
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.preferences.terreiros(userId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.editableByUser(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      showToast("Pronto: você voltou a ser membro.");
      setLeaveRoleTarget(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (String(message ?? "").toLowerCase().includes("cannot_remove_last_admin")) {
        showToast("Não é possível remover o último admin");
      } else {
        showToast(message || "Não foi possível sair do papel agora.");
      }
    } finally {
      setLeaveRoleBusy(false);
    }
  }, [leaveRoleTarget, queryClient, showToast, user?.id]);

  const confirmLeaveTerreiro = useCallback(async () => {
    const userId = user?.id ?? "";
    if (!userId) {
      showToast("Faça login novamente para continuar.");
      setLeaveTerreiroTarget(null);
      return;
    }

    const t = leaveTerreiroTarget;
    if (!t) return;
    if (t.role !== "member") return;

    setLeaveTerreiroBusy(true);
    try {
      const res = await supabase
        .from("terreiro_members")
        .delete()
        .eq("terreiro_id", t.id)
        .eq("user_id", userId);

      if (res.error) {
        const msg =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Não foi possível sair do terreiro agora.";

        const lower = msg.toLowerCase();
        if (
          lower.includes("row-level") ||
          lower.includes("rls") ||
          lower.includes("permission") ||
          lower.includes("not authorized")
        ) {
          throw new Error(
            "Sem permissão para sair automaticamente. Um admin precisa ajustar a policy no Supabase."
          );
        }

        throw new Error(msg);
      }

      // Drop membership immediately.
      queryClient.setQueryData(queryKeys.me.membership(userId), (prev: any) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.filter(
          (r: any) => String(r?.terreiro_id ?? "") !== String(t.id)
        );
      });

      // Remove from preferences list immediately.
      queryClient.setQueryData(
        queryKeys.preferences.terreiros(userId),
        (prev: any) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.filter((x: any) => String(x?.id ?? "") !== String(t.id));
        }
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.preferences.terreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.membership(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.editableByUser(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });

      showToast("Você saiu do terreiro.");
      setLeaveTerreiroTarget(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast(message || "Não foi possível sair do terreiro agora.");
    } finally {
      setLeaveTerreiroBusy(false);
    }
  }, [leaveTerreiroTarget, queryClient, showToast, user?.id]);

  return (
    <>
      <BottomSheet
        visible={!!target}
        variant={variant}
        onClose={onClose}
        snapPoints={snapPoints}
      >
        <View style={styles.wrap}>
          <Text style={[styles.title, { color: textPrimary }]}>
            Ações do terreiro
          </Text>

          {target?.title ? (
            <Text
              style={[styles.subtitle, { color: textSecondary }]}
              numberOfLines={2}
            >
              {target.title}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {canAdmin ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!target) return;
                    onClose();
                    router.push({
                      pathname: "/terreiro-members" as any,
                      params: { terreiroId: target.id },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed ? styles.actionPressed : null,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={textPrimary}
                  />
                  <Text style={[styles.actionText, { color: textPrimary }]}>
                    Gerenciar membros
                  </Text>
                </Pressable>

                <Separator variant={variant} />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!target) return;
                    onClose();
                    router.push({
                      pathname: "/access-manager" as any,
                      params: {
                        terreiroId: target.id,
                        terreiroTitle: target.title,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed ? styles.actionPressed : null,
                  ]}
                >
                  <Ionicons name="key-outline" size={18} color={textPrimary} />
                  <Text style={[styles.actionText, { color: textPrimary }]}>
                    Gerenciar gestão
                  </Text>
                </Pressable>

                <Separator variant={variant} />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!target) return;
                    onClose();
                    router.push({
                      pathname: "/terreiro-editor" as any,
                      params: { mode: "edit", terreiroId: target.id },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed ? styles.actionPressed : null,
                  ]}
                >
                  <Ionicons name="pencil" size={18} color={textPrimary} />
                  <Text style={[styles.actionText, { color: textPrimary }]}>
                    Editar detalhes
                  </Text>
                </Pressable>
              </>
            ) : null}

            {canLeaveRole ? (
              <>
                {canAdmin ? <Separator variant={variant} /> : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={requestLeaveRole}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed ? styles.actionPressed : null,
                  ]}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={dangerColor}
                  />
                  <Text style={[styles.actionText, { color: dangerColor }]}>
                    {leaveRoleActionLabel}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {canLeaveTerreiro ? (
              <>
                <Separator variant={variant} />

                <Pressable
                  accessibilityRole="button"
                  onPress={requestLeaveTerreiro}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed ? styles.actionPressed : null,
                  ]}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={dangerColor}
                  />
                  <Text style={[styles.actionText, { color: dangerColor }]}>
                    Deixar de ser membro
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </BottomSheet>

      <ConfirmModal
        visible={!!leaveRoleTarget}
        variant={variant}
        tone="danger"
        title={leaveRoleTitle}
        body={leaveRoleBody}
        confirmLabel={leaveRoleBusy ? "Saindo…" : "Sair"}
        cancelLabel="Cancelar"
        busy={leaveRoleBusy}
        onCancel={() => {
          if (leaveRoleBusy) return;
          setLeaveRoleTarget(null);
        }}
        onConfirm={() => {
          void confirmLeaveRole();
        }}
      />

      <ConfirmModal
        visible={!!leaveTerreiroTarget}
        variant={variant}
        tone="danger"
        title="Deixar de ser membro?"
        body="Você vai deixar de ser membro e perder acesso ao conteúdo e às coleções deste terreiro."
        confirmLabel={leaveTerreiroBusy ? "Saindo…" : "Sair"}
        cancelLabel="Cancelar"
        busy={leaveTerreiroBusy}
        onCancel={() => {
          if (leaveTerreiroBusy) return;
          setLeaveTerreiroTarget(null);
        }}
        onConfirm={() => {
          void confirmLeaveTerreiro();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  actions: {
    marginTop: spacing.sm,
  },
  actionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
