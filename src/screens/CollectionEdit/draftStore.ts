import type { CollectionPlayerItem } from "@/src/screens/Player/hooks/useCollectionPlayerData";

export type CollectionEditDraftSnapshot = {
  collectionId: string;
  collectionTitle: string;
  orderedItems: CollectionPlayerItem[];
  createdAt: number;
};

const drafts = new Map<string, CollectionEditDraftSnapshot>();
const dirtyCollections = new Set<string>();

export function putCollectionEditDraft(params: {
  draftKey: string;
  snapshot: CollectionEditDraftSnapshot;
}) {
  drafts.set(params.draftKey, params.snapshot);
}

export function getCollectionEditDraft(draftKey: string) {
  return drafts.get(draftKey) ?? null;
}

export function consumeCollectionEditDraft(draftKey: string) {
  const snap = drafts.get(draftKey) ?? null;
  drafts.delete(draftKey);
  return snap;
}

export function markCollectionPontosDirty(collectionId: string) {
  if (!collectionId) return;
  dirtyCollections.add(collectionId);
}

export function consumeCollectionPontosDirty(collectionId: string) {
  if (!collectionId) return false;
  if (!dirtyCollections.has(collectionId)) return false;
  dirtyCollections.delete(collectionId);
  return true;
}
