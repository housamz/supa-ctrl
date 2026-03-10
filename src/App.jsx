import { useCallback, useState } from "react";
import { ConnectionScreen } from "./components/ConnectionScreen";
import { Sidebar } from "./components/Sidebar";
import { TableView } from "./components/TableView";
import { ExportView } from "./components/ExportView";
import { ImportView } from "./components/ImportView";
import { EmptyTableState } from "./components/EmptyTableState";
import { Toasts } from "./components/Toasts";
import { useToast } from "./hooks/useToast";

export default function App() {
  const [client, setClient] = useState(null);
  const [projectUrl, setProjectUrl] = useState("");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeView, setActiveView] = useState("tables");
  const [tableLoading, setTableLoading] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const handleConnect = useCallback((connectedClient, url, discoveredTables) => {
    setClient(connectedClient);
    setProjectUrl(url);
    setTables(discoveredTables);
    toast(`Connected — ${discoveredTables.length} table${discoveredTables.length !== 1 ? "s" : ""} found`, "success");
  }, [toast]);

  const refreshTables = useCallback(async () => {
    if (!client) return;
    setTableLoading(true);
    try {
      const discovered = await client.discoverTables();
      setTables(discovered);
      toast(`${discovered.length} tables discovered`, "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setTableLoading(false);
    }
  }, [client, toast]);

  const renderMain = useCallback(() => {
    if (activeView === "export") {
      return <ExportView client={client} tables={tables} toast={toast} />;
    }
    if (activeView === "import") {
      return <ImportView client={client} toast={toast} />;
    }
    if (selectedTable) {
      return <TableView key={selectedTable} client={client} tableName={selectedTable} toast={toast} />;
    }
    return <EmptyTableState />;
  }, [activeView, client, selectedTable, tables, toast]);

  if (!client) {
    return (
      <>
        <ConnectionScreen onConnect={handleConnect} />
        <Toasts toasts={toasts} dismiss={dismiss} />
      </>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={(table) => {
          setSelectedTable(table);
          setActiveView("tables");
        }}
        activeView={activeView}
        onSetView={setActiveView}
        onRefresh={refreshTables}
        onDisconnect={() => {
          setClient(null);
          setSelectedTable(null);
          setTables([]);
          setActiveView("tables");
        }}
        projectUrl={projectUrl}
        loading={tableLoading}
      />
      {renderMain()}
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

