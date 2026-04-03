import { TagChip } from "@/src/components/TagChip";
import React from "react";

type Props = {
  variant: "light" | "dark";
  entidadeNome: string | null;
  orixaNome: string | null;
};

/** Chips de entidade + orixá (sem médium). */
export function PontoEntidadeOrixaChips(props: Props) {
  const { variant, entidadeNome, orixaNome } = props;

  if (!entidadeNome && !orixaNome) return null;

  return (
    <>
      {entidadeNome ? (
        <TagChip label={entidadeNome} variant={variant} kind="ponto" />
      ) : null}
      {orixaNome ? (
        <TagChip
          label={orixaNome}
          variant={variant}
          kind="ponto"
          appearance="secondary"
        />
      ) : null}
    </>
  );
}
