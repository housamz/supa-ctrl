import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { inferType } from "../utils/dataFormatting";

export function RowEditor({ row, columns, onSave, onClose, isNew }) {
  const editableColumns = useMemo(
    () => (isNew ? columns.filter((column) => column !== "id") : columns),
    [columns, isNew]
  );

  const [data, setData] = useState(() => {
    const initial = {};
    editableColumns.forEach((column) => {
      if (row?.[column] !== undefined) {
        initial[column] =
          typeof row[column] === "object"
            ? JSON.stringify(row[column], null, 2)
            : String(row[column] ?? "");
      } else {
        initial[column] = "";
      }
    });
    return initial;
  });

  return (
    <Modal title={isNew ? "Insert row" : "Edit row"} onClose={onClose}>
      <div className="p-5">
        {editableColumns.map((column) => (
          <div key={column} className="mb-4">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1.5">
              {column}
              <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {inferType(row?.[column])}
              </span>
            </label>
            <textarea
              value={data[column] ?? ""}
              rows={1}
              onChange={(event) => setData((prev) => ({ ...prev, [column]: event.target.value }))}
              className="w-full text-xs font-mono border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y transition"
            />
          </div>
        ))}
        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(data)}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            {isNew ? "Insert row" : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

