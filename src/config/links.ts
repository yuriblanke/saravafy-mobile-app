const PUBLIC_DOMAIN = "https://saravafy.com.br";

export function buildPublicPontoUrl(pontoId: string): string {
	const id = String(pontoId ?? "").trim();
	return `${PUBLIC_DOMAIN}/l/ponto/${id}`;
}
