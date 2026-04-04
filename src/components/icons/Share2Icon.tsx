import type { LucideShare2Props } from "lucide-react-native/dist/esm/icons/share-2.js";
import Share2 from "lucide-react-native/dist/esm/icons/share-2.js";

export type Share2IconProps = LucideShare2Props;

/**
 * Lucide `share-2`. Import profundo (`dist/esm/icons/...`) para não puxar o índice
 * completo de ícones no Metro (especialmente problemático no Windows).
 */
export function Share2Icon(props: Share2IconProps) {
  return <Share2 {...props} />;
}
