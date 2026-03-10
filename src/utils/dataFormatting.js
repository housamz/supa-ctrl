/**
 * Infer a column type from a value. Used for table display and exports.
 */
export function inferType(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (typeof v === "object") return "json";

  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return "timestamp";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return "uuid";
  if (/^\d+$/.test(s) && s.length < 15) return "integer";
  if (/^\d+\.\d+$/.test(s)) return "float";
  return "text";
}

/**
 * Generate a formatted cell descriptor for display in the grid.
 */
export function formatCell(value, type) {
  if (value === null || value === undefined) return { text: "—", dim: true };
  if (type === "json" || typeof value === "object") {
    try { return { text: JSON.stringify(value).slice(0, 80), mono: true }; } catch {}
  }
  if (type === "timestamp") {
    try { return { text: new Date(value).toLocaleString() }; } catch {}
  }
  if (type === "boolean") return { text: String(value), bool: true, boolVal: !!value };
  if (type === "uuid") return { text: value.slice(0, 8) + "…", dim: true, full: value, mono: true };
  return { text: String(value) };
}

/**
 * Map inferred types to PostgreSQL column types for export.
 */
export function mapTypeToSql(type) {
  switch (type) {
    case "boolean":
      return "boolean";
    case "integer":
      return "integer";
    case "float":
    case "number":
      return "numeric";
    case "timestamp":
      return "timestamp";
    case "uuid":
      return "uuid";
    case "json":
      return "jsonb";
    case "text":
      return "text";
    case "null":
    default:
      return null;
  }
}

