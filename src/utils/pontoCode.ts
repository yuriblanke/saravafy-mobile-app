export function isUuid(value: string): boolean {
  const v = String(value ?? "").trim();
  // Aceita UUID com ou sem version/variant estritos.
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    v
  );
}
