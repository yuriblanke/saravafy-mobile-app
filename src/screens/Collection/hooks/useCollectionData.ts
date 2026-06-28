import { getErrorMessage } from "@/src/utils/errors";
import { useCallback, useEffect, useState } from "react";

import { fetchCollection, type CollectionRow } from "../data/collection";

export type { CollectionRow };

export function useCollectionData(collectionId: string) {
  const [collection, setCollection] = useState<CollectionRow | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  const loadCollection = useCallback(async () => {
    if (!collectionId) {
      setCollection(null);
      setCollectionError("Collection inválida.");
      return;
    }

    setCollectionLoading(true);
    setCollectionError(null);

    try {
      const row = await fetchCollection(collectionId);
      setCollection(row);
    } catch (e) {
      if (__DEV__) {
        console.info("[Collection] erro ao carregar collection", {
          collectionId,
          error: getErrorMessage(e),
          raw: e,
        });
      }
      setCollection(null);
      setCollectionError(getErrorMessage(e));
    } finally {
      setCollectionLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  return { collection, setCollection, collectionLoading, collectionError, loadCollection };
}
