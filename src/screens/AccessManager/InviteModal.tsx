import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomSheet } from "@/src/components/BottomSheet";
import { AccessRoleInfo } from "@/src/components/AccessRoleInfo";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import { getAccessRoleLabel } from "@/src/constants/accessRoleCopy";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

import type { AccessRole } from "./InviteRow";

export type InviteModalMode = "gestao" | "membro";

export type InviteSubmitPayload = {
  email: string;
  role: AccessRole;
};

function normalizeEmail(v: string) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string) {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (e.includes(" ")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  mode: InviteModalMode;
  onClose: () => void;
  onSubmit: (payload: InviteSubmitPayload) => Promise<void>;
  isSubmitting: boolean;
};

export function InviteModal({
  visible,
  variant,
  mode,
  onClose,
  onSubmit,
  isSubmitting,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccessRole>("editor");
  const [didTrySubmit, setDidTrySubmit] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setEmail("");
    setDidTrySubmit(false);

    if (mode === "membro") {
      setRole("member");
    } else {
      setRole("editor");
    }
  }, [mode, visible]);

  const roleItems: SelectItem[] = useMemo(
    () => [
      { key: "admin", label: "Admin", value: "admin" },
      { key: "editor", label: "Editora", value: "editor" },
    ],
    []
  );

  const normalizedEmail = normalizeEmail(email);
  const emailOk = isValidEmail(normalizedEmail);

  const textPrimary =
    variant === "light" ? colors.textPrimaryOnLight : colors.textPrimaryOnDark;
  const textSecondary =
    variant === "light"
      ? colors.textSecondaryOnLight
      : colors.textSecondaryOnDark;
  const textMuted =
    variant === "light" ? colors.textMutedOnLight : colors.textMutedOnDark;

  const title = mode === "gestao" ? "Convidar gestão" : "Convidar membro";

  const roleLabel = getAccessRoleLabel(role);

  const submitDisabled = isSubmitting || !emailOk;

  const handleSubmit = async () => {
    setDidTrySubmit(true);
    if (!emailOk) return;

    await onSubmit({
      email: normalizedEmail,
      role: mode === "membro" ? "member" : role,
    });
  };

  return (
    <>
      <BottomSheet visible={visible} variant={variant} onClose={onClose}>
        <View style={styles.sheetHead}>
          <Text
            style={[styles.sheetTitle, { color: textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <Text style={[styles.label, { color: textSecondary }]}>E-mail</Text>
        <TextInput
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (didTrySubmit) setDidTrySubmit(false);
          }}
          placeholder="local@dominio.tld"
          placeholderTextColor={textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            styles.input,
            {
              backgroundColor:
                variant === "light" ? colors.inputBgLight : colors.inputBgDark,
              borderColor:
                variant === "light"
                  ? colors.surfaceCardBorderLight
                  : colors.surfaceCardBorder,
              color: textPrimary,
            },
          ]}
        />

        {didTrySubmit && !emailOk ? (
          <Text
            style={[styles.inlineError, { color: colors.danger }]}
            numberOfLines={2}
          >
            Informe um e-mail válido.
          </Text>
        ) : null}

        {mode === "gestao" ? (
          <>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: textSecondary }]}>
                Nível de acesso
              </Text>
              <AccessRoleInfo variant={variant} role={role} />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRoleModalOpen(true)}
              style={({ pressed }) => [
                styles.selectField,
                {
                  backgroundColor:
                    variant === "light"
                      ? colors.inputBgLight
                      : colors.inputBgDark,
                  borderColor:
                    variant === "light"
                      ? colors.surfaceCardBorderLight
                      : colors.surfaceCardBorder,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.selectValue, { color: textPrimary }]}>
                {roleLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={textMuted} />
            </Pressable>
          </>
        ) : (
          <View style={styles.memberFixedRow}>
            <Text style={[styles.label, { color: textSecondary }]}>Nível de acesso</Text>
            <View style={styles.memberFixedRight}>
              <Text style={[styles.memberFixedValue, { color: textMuted }]}>
                {getAccessRoleLabel("member")}
              </Text>
              <AccessRoleInfo variant={variant} role="member" />
            </View>
          </View>
        )}

        <View style={styles.sheetActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed ? styles.pressed : null,
              isSubmitting ? styles.disabled : null,
              {
                borderColor:
                  variant === "light"
                    ? colors.surfaceCardBorderLight
                    : colors.surfaceCardBorder,
              },
            ]}
          >
            <Text
              style={[styles.secondaryBtnText, { color: textPrimary }]}
              numberOfLines={1}
            >
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={submitDisabled}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.pressed : null,
              submitDisabled ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryBtnText} numberOfLines={1}>
              Enviar convite
            </Text>
          </Pressable>
        </View>

        <Image
          source={require("@/assets/images/filler.png")}
          style={styles.filler}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </BottomSheet>

      <SelectModal
        title="Papel"
        visible={roleModalOpen}
        variant={variant}
        items={roleItems}
        onClose={() => setRoleModalOpen(false)}
        onSelect={(value) => {
          const v = String(value) as AccessRole;
          if (v === "admin" || v === "editor") {
            setRole(v);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheetHead: {
    marginBottom: spacing.md,
    gap: 4,
  },
  filler: {
    width: "100%",
    height: 265,
    marginTop: spacing.lg,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  inlineError: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  selectField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  selectValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  memberFixedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  memberFixedRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberFixedValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  sheetActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brass600,
  },
  primaryBtnText: {
    color: colors.paper50,
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.6,
  },
});
