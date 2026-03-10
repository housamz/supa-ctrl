import { useState } from "react";
import { Database, Download, FileJson, FileText, Loader2 } from "lucide-react";
import { inferType, mapTypeToSql } from "../utils/dataFormatting";
import { downloadFile } from "../utils/downloadFile";

function deriveSchemaFromRows(rows) {
  if (!rows?.length) return [];

  const columnNames = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((column) => set.add(column));
      return set;
    }, new Set()),
  );

  return columnNames.map((column) => {
    const values = rows.map((row) => row[column]);
    const sample = values.find(
      (value) => value !== null && value !== undefined,
    );
    const inferredType = inferType(sample);
    const sqlType = mapTypeToSql(inferredType);
    const isNullable = values.some(
      (value) => value === null || value === undefined,
    )
      ? "YES"
      : "NO";

    let characterMax;
    if (inferredType === "text") {
      characterMax = values.reduce(
        (max, value) =>
          typeof value === "string" ? Math.max(max, value.length) : max,
        0,
      );
    }

    let numericPrecision;
    let numericScale;
    if (
      inferredType === "integer" ||
      inferredType === "float" ||
      inferredType === "number"
    ) {
      numericPrecision = values.reduce((max, value) => {
        if (typeof value !== "number") return max;
        return Math.max(
          max,
          value.toString().replace("-", "").replace(".", "").length,
        );
      }, 0);
      if (inferredType !== "integer") {
        numericScale = values.reduce((max, value) => {
          if (typeof value !== "number") return max;
          const decimals = value.toString().split(".")[1];
          return Math.max(max, decimals ? decimals.length : 0);
        }, 0);
      }
    }

    return {
      column_name: column,
      data_type: sqlType ?? "text",
      inferred_type: inferredType,
      character_maximum_length: characterMax || undefined,
      numeric_precision: numericPrecision || undefined,
      numeric_scale: numericScale || undefined,
      is_nullable: isNullable,
      column_default: undefined,
    };
  });
}

function formatSqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === "object")
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function ExportView({ client, tables, toast }) {
  const [selected, setSelected] = useState(new Set());
  const [format, setFormat] = useState("json");
  const [includeSchema, setIncludeSchema] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  function toggle(table) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(table) ? next.delete(table) : next.add(table);
      return next;
    });
  }

  const selectedArray = [...selected];

  async function doExport() {
    if (!selected.size) {
      toast("Select at least one table", "error");
      return;
    }
    if (!includeSchema && !includeData) {
      toast("Select schema, data, or both", "error");
      return;
    }

    setLoading(true);
    setProgress("");
    try {
      const result = {};
      for (const table of selected) {
        setProgress(`Fetching ${table}…`);
        const entry = {
          schema: [],
          data: [],
          schemaError: null,
          dataError: null,
        };

        let sampleRows = [];

        if (includeData) {
          try {
            const rows = await client.exportAll(table);
            entry.data = rows;
            sampleRows = rows;
          } catch (error) {
            entry.data = [];
            entry.dataError = error.message;
          }
        }

        if (includeSchema) {
          try {
            if (!sampleRows.length) {
              const { rows } = await client.getRows(table, { pageSize: 100 });
              sampleRows = rows;
            }
            if (sampleRows.length) {
              entry.schema = deriveSchemaFromRows(sampleRows);
            } else {
              entry.schema = [];
              entry.schemaError =
                "Unable to infer schema (table empty or inaccessible).";
            }
          } catch (error) {
            entry.schema = [];
            entry.schemaError = error.message;
          }
        }

        result[table] = entry;
      }

      setProgress("Building file…");
      let content;
      let ext;
      if (format === "json") {
        content = JSON.stringify(result, null, 2);
        ext = "json";
      } else {
        const generatedOn = new Date().toISOString();
        const tableNames = Object.keys(result);
        let sql = "-- SupaCtrl\n";
        sql += `-- Generated on: ${generatedOn}\n`;
        sql += `-- Tables exported: ${tableNames.join(", ")}\n`;

        const tablesWithErrors = Object.entries(result).filter(
          ([, tableInfo]) => tableInfo.schemaError || tableInfo.dataError,
        );
        if (tablesWithErrors.length > 0) {
          sql += `-- WARNING: ${tablesWithErrors.length} tables had access errors (likely due to RLS policies)\n`;
          sql += `-- Affected tables: ${tablesWithErrors.map(([name]) => name).join(", ")}\n`;
        }

        sql += "\n";

        for (const [table, entry] of Object.entries(result)) {
          sql += `-- ============================================\n`;
          sql += `-- Table: ${table}\n`;
          sql += `-- ============================================\n\n`;

          if (includeSchema) {
            if (entry.schema?.length) {
              sql += `-- Schema for table: ${table}\n`;
              sql += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
              sql += `CREATE TABLE "${table}" (\n`;
              sql += entry.schema
                .map((column) => {
                  let columnDef = `  "${column.column_name}" ${column.data_type}`;
                  if (column.character_maximum_length) {
                    columnDef += `(${column.character_maximum_length})`;
                  } else if (column.numeric_precision) {
                    columnDef += `(${column.numeric_precision}${
                      column.numeric_scale ? `,${column.numeric_scale}` : ""
                    })`;
                  }
                  if (column.is_nullable === "NO") columnDef += " NOT NULL";
                  if (column.column_default)
                    columnDef += ` DEFAULT ${column.column_default}`;
                  if (!mapTypeToSql(column.inferred_type)) {
                    columnDef += ` -- inferred type ${column.inferred_type}`;
                  }
                  return columnDef;
                })
                .join(",\n");
              sql += "\n);\n\n";
            } else {
              sql += `-- Schema for table: ${table}\n`;
              sql += entry.schemaError
                ? `-- ${entry.schemaError}\n\n`
                : "-- No schema information available.\n\n";
            }
          }

          if (includeData) {
            if (entry.data?.length) {
              sql += `-- Data for table: ${table} (${entry.data.length} rows)\n`;
              entry.data.forEach((row, index) => {
                const columns = Object.keys(row)
                  .map((column) => `"${column}"`)
                  .join(", ");
                const values = Object.values(row)
                  .map((value) => formatSqlValue(value))
                  .join(", ");
                sql += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
                if ((index + 1) % 100 === 0) {
                  sql += `-- Inserted ${index + 1} rows so far...\n`;
                }
              });
              sql += "\n";
            } else if (!entry.dataError) {
              sql += `-- Data for table: ${table}\n-- No rows exported for this table.\n\n`;
            }
          }

          if (entry.schemaError) {
            sql += `-- SCHEMA ERROR: ${entry.schemaError}\n`;
            sql +=
              "-- This table's schema could not be accessed due to database permissions.\n";
          }

          if (entry.dataError) {
            sql += `-- DATA ERROR: ${entry.dataError}\n`;
            sql +=
              "-- This table's data could not be accessed due to database permissions.\n";
          }

          sql += "\n";
        }

        sql += "-- Export completed\n";
        content = sql;
        ext = "sql";
      }

      downloadFile(
        content,
        `supabase_export_${Date.now()}.${ext}`,
        format === "json" ? "application/json" : "text/plain",
      );
      toast(
        `Exported ${selected.size} table${selected.size !== 1 ? "s" : ""}`,
        "success",
      );
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-7">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Export Database
        </h2>
        <p className="text-sm text-gray-500">
          Select tables and configure export options to download your database.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-sm text-gray-900">
              Select Tables
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set(tables))}
                className="text-xs text-blue-600 hover:underline"
              >
                Select all
              </button>
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-gray-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {tables.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No tables found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {tables.map((table) => (
                <label
                  key={table}
                  className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 -mx-5 px-5 transition"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(table)}
                    onChange={() => toggle(table)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-gray-700">{table}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <span className="font-semibold text-sm text-gray-900 block mb-4">
              Export Options
            </span>
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Format
              </div>
              <div className="flex gap-5">
                {["json", "sql"].map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="radio"
                      name="exportFmt"
                      value={option}
                      checked={format === option}
                      onChange={() => setFormat(option)}
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                    />
                    {option.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={includeSchema}
                  onChange={(event) => setIncludeSchema(event.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                />
                Include schema
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(event) => setIncludeData(event.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                />
                Include data
              </label>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <span className="font-semibold text-sm text-gray-900 block mb-4">
              Export Summary
            </span>
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Database size={14} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {selected.size} table{selected.size !== 1 ? "s" : ""}{" "}
                    selected
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {selectedArray.length === 0
                      ? "None selected"
                      : selectedArray.slice(0, 3).join(", ") +
                        (selectedArray.length > 3
                          ? ` +${selectedArray.length - 3} more`
                          : "")}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  {format === "json" ? (
                    <FileJson size={14} className="text-green-600" />
                  ) : (
                    <FileText size={14} className="text-green-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {format.toUpperCase()} format
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {[includeSchema && "Schema", includeData && "Data"]
                      .filter(Boolean)
                      .join(" and ") || "Nothing"}{" "}
                    included
                  </div>
                </div>
              </div>
            </div>

            {progress && (
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
                <Loader2 size={11} className="animate-spin" />
                {progress}
              </div>
            )}

            <button
              onClick={doExport}
              disabled={loading || selected.size === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download size={13} />
                  Export Database
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
