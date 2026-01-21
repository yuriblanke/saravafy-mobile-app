import React from "react";

import { PontoUpsertModal } from "@/src/components/pontos/PontoUpsertModal";

type Props = {
  visible: boolean;
  variant: "light" | "dark";
  onClose: () => void;
  onSubmitted?: () => void;
};

export function SubmitPontoModal({
  visible,
  variant,
  onClose,
  onSubmitted,
}: Props) {
  return (
    <PontoUpsertModal
      visible={visible}
      variant={variant}
      mode="create"
      onCancel={onClose}
      onSuccess={() => {
        onSubmitted?.();
      }}
    />
  );
}
