import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/src/lib/errors";

export interface QueryLike<T> {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
}

export interface QueryBoundaryProps<T> {
  query: QueryLike<T>;
  loading?: ReactNode;
  error?: (e: unknown) => ReactNode;
  empty?: (data: T) => boolean;
  emptyState?: ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryBoundary<T>(props: QueryBoundaryProps<T>) {
  const { query, loading, error, empty, emptyState, children } = props;

  if (query.data !== undefined) {
    if (empty && empty(query.data)) {
      return <>{emptyState ?? null}</>;
    }
    return <>{children(query.data)}</>;
  }

  if (query.isError) {
    if (error) return <>{error(query.error)}</>;
    return <DefaultErrorCard error={query.error} />;
  }

  if (query.isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  return null;
}

function DefaultLoading() {
  return (
    <View style={styles.loadingContainer} testID="query-boundary-loading">
      <ActivityIndicator />
    </View>
  );
}

function DefaultErrorCard({ error }: { error: unknown }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Não foi possível carregar</Text>
      <Text style={styles.errorBody}>{getErrorMessage(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(244, 67, 54, 0.08)",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 13,
    opacity: 0.8,
  },
});
