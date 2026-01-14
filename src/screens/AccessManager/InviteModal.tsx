import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AccessRoleInfo } from "@/src/components/AccessRoleInfo";
import { BottomSheet } from "@/src/components/BottomSheet";
import { SelectModal, type SelectItem } from "@/src/components/SelectModal";
import { dismissAllTooltips } from "@/src/components/TooltipPopover";
import { colors, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

import type { InfoProps } from "@/src/components/AccessRoleInfo";

import type { AccessRole } from "./InviteRow";

export type InviteModalMode = "gestao" | "membro" | "curator";

export type InviteSubmitPayload =
  | {
      email: string;
      role: AccessRole;
    }
  | {
      email: string;
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

type CommonProps = {
  visible: boolean;
  variant: "light" | "dark";
  onClose: () => void;
  isSubmitting: boolean;
};

type TerreiroInviteProps = CommonProps & {
  mode: "gestao" | "membro";
  roleDefinitions: TerreiroRoleDefinitions;
  onSubmit: (payload: { email: string; role: AccessRole }) => Promise<void>;
};

type CuratorInviteProps = CommonProps & {
  mode: "curator";
  inviteTitle: string;
  fixedRoleLabel: string;
  infoProps: InfoProps;
  onSubmit: (payload: { email: string }) => Promise<void>;
};

type Props = TerreiroInviteProps | CuratorInviteProps;

export type TerreiroRoleDefinition = {
  label: string;
  infoProps: InfoProps;
};

export type TerreiroRoleDefinitions = Record<
  AccessRole,
  TerreiroRoleDefinition
>;

export function InviteModal(props: Props) {
  const { visible, variant, mode, onClose, onSubmit, isSubmitting } = props;

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

  const roleDefs: TerreiroRoleDefinitions | null =
    mode === "curator" ? null : props.roleDefinitions;

  const roleItems: SelectItem[] = useMemo(() => {
    if (!roleDefs) return [];
    return [
      { key: "admin", label: roleDefs.admin.label, value: "admin" },
      { key: "editor", label: roleDefs.editor.label, value: "editor" },
    ];
  }, [roleDefs]);

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

  const title =
    mode === "curator"
      ? props.inviteTitle
      : mode === "gestao"
      ? "Convidar gestão"
      : "Convidar membro";

  const roleLabel = (roleDefs && roleDefs[role]?.label) || String(role ?? "");

  const submitDisabled = isSubmitting || !emailOk;

  const handleSubmit = async () => {
    setDidTrySubmit(true);
    if (!emailOk) return;

    if (mode === "curator") {
      await onSubmit({
        email: normalizedEmail,
      });
      return;
    }

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
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                dismissAllTooltips();
                setRoleModalOpen(true);
              }}
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
                Role: {roleLabel}
              </Text>
              <View style={styles.selectRight}>
                <AccessRoleInfo
                  variant={variant}
                  info={roleDefs ? roleDefs[role].infoProps : { title: "" }}
                />
                <Ionicons name="chevron-down" size={16} color={textMuted} />
              </View>
            </Pressable>
          </>
        ) : mode === "curator" ? (
          <View style={styles.memberFixedRow}>
            <Text style={[styles.label, { color: textSecondary }]}>
              Nível de acesso
            </Text>
            <View style={styles.memberFixedRight}>
              <Text style={[styles.memberFixedValue, { color: textMuted }]}>
                {props.fixedRoleLabel}
              </Text>
              <AccessRoleInfo variant={variant} info={props.infoProps} />
            </View>
          </View>
        ) : (
          <View style={styles.memberFixedRow}>
            <Text style={[styles.label, { color: textSecondary }]}>Role</Text>
            <View style={styles.memberFixedRight}>
              <Text style={[styles.memberFixedValue, { color: textMuted }]}>
                Role: {roleDefs ? roleDefs.member.label : "member"}
              </Text>
              <AccessRoleInfo
                variant={variant}
                info={roleDefs ? roleDefs.member.infoProps : { title: "" }}
              />
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
    height: 290,
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
  selectRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
