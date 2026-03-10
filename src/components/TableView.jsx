import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { RowEditor } from "./RowEditor";
import { Modal } from "./Modal";
import { formatCell, inferType } from "../utils/dataFormatting";

const PAGE_SIZE = 50;

export function TableView({ client, tableName, toast }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchColumn, setSearchColumn] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [showInsert, setShowInsert] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);

  const load = useCallback(
    async (pageNumber, searchValue, searchKey) => {
      setLoading(true);
      try {
        const { rows: dataRows, count: rowCount } = await client.getRows(tableName, {
          page: pageNumber,
          pageSize: PAGE_SIZE,
          search: searchValue,
          searchCol: searchKey,
        });
        setRows(dataRows);
        setCount(rowCount);
        if (dataRows.length > 0) {
          setColumns((prev) => (prev.length ? prev : Object.keys(dataRows[0])));
        }
      } catch (error) {
        toast(error.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [client, tableName, toast]
  );

  useEffect(() => {
    setPage(0);
    setSearch("");
    setSearchInput("");
    setColumns([]);
    setRows([]);
    setCount(0);
  }, [tableName]);

  useEffect(() => {
    load(page, search, searchColumn);
  }, [tableName, page, search, searchColumn, load]);

  const primaryKey = useMemo(() => {
    if (columns.includes("id")) return "id";
    return columns[0];
  }, [columns]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  const columnTypes = useMemo(() => {
    if (!rows[0]) return {};
    const types = {};
    columns.forEach((column) => {
      types[column] = inferType(rows[0][column]);
    });
    return types;
  }, [columns, rows]);

  const textColumns = useMemo(
    () => columns.filter((column) => ["text", "uuid", "integer", "float"].includes(columnTypes[column] || "text")),
    [columns, columnTypes]
  );

  async function handleSave(data) {
    try {
      await client.updateRow(tableName, editRow[primaryKey], data, primaryKey);
      toast("Row updated", "success");
      setEditRow(null);
      load(page, search, searchColumn);
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function handleInsert(data) {
    try {
      await client.insertRow(tableName, data);
      toast("Row inserted", "success");
      setShowInsert(false);
      setPage(0);
      load(0, "", "");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function handleDelete(row) {
    try {
      await client.deleteRow(tableName, row[primaryKey], primaryKey);
      toast("Row deleted", "success");
      setDeleteRow(null);
      load(page, search, searchColumn);
    } catch (error) {
      toast(error.message, "error");
    }
  }

  function copyCell(value) {
    navigator.clipboard.writeText(String(value ?? "")).then(() => toast("Copied", "info"));
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-sm text-gray-900 truncate">{tableName}</span>
          {!loading && (
            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {count.toLocaleString()} rows
            </span>
          )}
          {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
        </div>
        <div className="flex items-center gap-2">
          {textColumns.length > 0 && (
            <select
              value={searchColumn}
              onChange={(event) => setSearchColumn(event.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
            >
              <option value="">Any column</option>
              {textColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearch(searchInput);
                  setPage(0);
                }
              }}
              placeholder="Search…"
              className="text-xs border border-gray-200 rounded pl-7 pr-2 py-1.5 w-36 outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => load(page, search, searchColumn)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setShowInsert(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
          >
            <Plus size={13} />
            Insert
          </button>
        </div>
      </div>

      {!loading && rows.length === 0 && count === 0 && (
        <div className="mx-4 mt-3 flex gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
          <ShieldAlert size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>No rows returned.</strong> RLS may be blocking reads. Try the <strong>service_role</strong> key, or add a read policy in your Supabase dashboard.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {rows.length === 0 && !loading ? (
          <div className="py-16 text-center text-gray-400">
            <Database size={26} className="mx-auto mb-3 opacity-30" />
            <span className="text-sm">No rows to display</span>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-2 text-right text-[11px] text-gray-400 font-normal border-r border-gray-100">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-3.5 py-2 text-left text-[11px] text-gray-600 font-medium whitespace-nowrap"
                  >
                    {column}
                    <span className="ml-1.5 font-mono text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded">
                      {columnTypes[column] || "?"}
                    </span>
                  </th>
                ))}
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50 group">
                  <td className="px-3 py-2 text-right text-[11px] text-gray-300 border-r border-gray-100 select-none">
                    {page * PAGE_SIZE + rowIndex + 1}
                  </td>
                  {columns.map((column) => {
                    const formatted = formatCell(row[column], columnTypes[column]);
                    return (
                      <td
                        key={column}
                        title={formatted.full || formatted.text}
                        onClick={() => copyCell(formatted.full || row[column])}
                        className={`px-3.5 py-2 max-w-[200px] truncate cursor-pointer
                          ${
                            formatted.dim
                              ? "text-gray-400"
                              : formatted.bool
                              ? formatted.boolVal
                                ? "text-green-600"
                                : "text-red-500"
                              : "text-gray-700"
                          }
                          ${formatted.mono ? "font-mono text-[11px]" : ""}`}
                      >
                        {formatted.text}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1">
                    <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditRow(row)}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteRow(row)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 text-xs text-gray-500 shrink-0">
          <button
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={page === 0}
            className="px-2.5 py-1 border border-gray-200 bg-white rounded hover:bg-gray-50 disabled:opacity-40 transition"
          >
            <ChevronLeft size={12} />
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            disabled={page === totalPages - 1}
            className="px-2.5 py-1 border border-gray-200 bg-white rounded hover:bg-gray-50 disabled:opacity-40 transition"
          >
            <ChevronRight size={12} />
          </button>
          <span className="ml-auto text-gray-400">
            {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, count).toLocaleString()} of{" "}
            {count.toLocaleString()}
          </span>
        </div>
      )}

      {editRow && (
        <RowEditor
          row={editRow}
          columns={columns}
          onSave={handleSave}
          onClose={() => setEditRow(null)}
        />
      )}
      {showInsert && (
        <RowEditor
          columns={columns}
          onSave={handleInsert}
          onClose={() => setShowInsert(false)}
          isNew
        />
      )}
      {deleteRow && (
        <Modal title="Delete row" onClose={() => setDeleteRow(null)} width="max-w-sm">
          <div className="p-5">
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Permanently delete the row where{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                {primaryKey} = {deleteRow[primaryKey]}
              </code>
              ? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteRow(null)}
                className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteRow)}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-1.5 transition"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

