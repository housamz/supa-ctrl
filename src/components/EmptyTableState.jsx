import { Table2 } from "lucide-react";

export function EmptyTableState() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-gray-50">
      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
        <Table2 size={22} className="text-gray-400" />
      </div>
      <div className="font-medium text-sm text-gray-700">Select a table</div>
      <div className="text-xs text-gray-400">Choose a table from the sidebar to browse its data</div>
    </div>
  );
}

