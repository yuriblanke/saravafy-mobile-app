const PUBLIC_DOMAIN = "https://saravafy.com.br";

export type PublicLinkType = "ponto" | "colecao" | "terreiro";

export function buildPublicUrl(params: { type: PublicLinkType; id: string }): string {
	const type = String(params.type ?? "").trim().toLowerCase();
	const id = String(params.id ?? "").trim();
	return `${PUBLIC_DOMAIN}/l/${type}/${id}`;
}

export function buildPublicPontoUrl(pontoId: string): string {
	return buildPublicUrl({ type: "ponto", id: pontoId });
}

export function buildPublicColecaoUrl(collectionId: string): string {
	return buildPublicUrl({ type: "colecao", id: collectionId });
}

export function buildPublicTerreiroUrl(terreiroId: string): string {
	return buildPublicUrl({ type: "terreiro", id: terreiroId });
}
