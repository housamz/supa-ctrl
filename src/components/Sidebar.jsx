import { useMemo, useState } from "react";
import { Database, Download, Loader2, LogOut, RefreshCw, Search, Table2, Upload } from "lucide-react";

const navItems = [
  { id: "tables", label: "Tables", Icon: Table2 },
  { id: "export", label: "Export", Icon: Download },
  { id: "import", label: "Import", Icon: Upload },
];

export function Sidebar({
  tables,
  selectedTable,
  onSelectTable,
  activeView,
  onSetView,
  onRefresh,
  onDisconnect,
  projectUrl,
  loading,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => tables.filter((table) => table.toLowerCase().includes(query.toLowerCase())),
    [query, tables]
  );

  const domain = useMemo(() => {
    try {
      return new URL(projectUrl).hostname.split(".")[0];
    } catch {
      return projectUrl;
    }
  }, [projectUrl]);

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0">
      <div className="p-3 pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <Database size={13} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900">SupaCtrl</span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded px-2 py-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
          <span className="text-xs text-gray-500 truncate">{domain}</span>
        </div>
      </div>

      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tables"
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded pl-7 pr-2 py-1.5 outline-none focus:border-blue-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-400">
            <Loader2 size={16} className="animate-spin mx-auto mb-2" />
            Discovering tables…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            {tables.length === 0 ? "No tables found" : "No matches"}
          </div>
        ) : (
          filtered.map((table) => (
            <button
              key={table}
              onClick={() => {
                onSelectTable(table);
                onSetView("tables");
              }}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-sm transition mb-0.5
                ${selectedTable === table && activeView === "tables"
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-100"}`}
            >
              <Table2 size={14} className="shrink-0 opacity-50" />
              <span className="truncate">{table}</span>
            </button>
          ))
        )}
      </div>





      <div className="p-2 border-t border-gray-100 grid grid-cols-5 gap-1">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              title={label}
              onClick={() => onSetView(id)}
              className={`transition cursor-pointer rounded px-2 py-2 flex justify-center align-center
                ${activeView === id ? "bg-blue-600 text-white font-medium" : "text-gray-600 hover:bg-blue-100"}`}
            >
              <Icon size={14} />
            </button>
          ))}

        <button
          onClick={onRefresh}
          className="bg-gray-600 text-white hover:bg-gray-500 transition cursor-pointer rounded px-2 py-2 flex justify-center align-center"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={onDisconnect}
          className="bg-red-600 text-white hover:bg-red-500 transition cursor-pointer rounded px-2 py-2 flex justify-center align-center"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

