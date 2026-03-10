import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Upload,
  X,
} from "lucide-react";

export function ImportView({ client, toast }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  function handleFile(targetFile) {
    if (!targetFile) return;
    if (targetFile.size > 10 * 1024 * 1024) {
      toast("File exceeds 10 MB limit", "error");
      return;
    }
    if (!targetFile.name.match(/\.(json|sql)$/i)) {
      toast("Only .json and .sql files are supported", "error");
      return;
    }
    setFile(targetFile);
    setResult(null);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files[0]);
  }

  async function doImport() {
    if (!file) {
      toast("Please select a file first", "error");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const ext = file.name.split(".").pop().toLowerCase();
      let imported = 0;
      let errors = [];

      if (ext === "json") {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error("Invalid JSON file");
        }
        if (Array.isArray(parsed)) throw new Error("JSON must be in format: { tableName: { data: [...] } }");
        for (const [tableName, entry] of Object.entries(parsed)) {
          const rows = Array.isArray(entry) ? entry : entry.data || [];
          for (const row of rows) {
            const { id, ...rest } = row;
            try {
              await client.insertRow(tableName, rest);
              imported++;
            } catch (error) {
              errors.push(`${tableName}: ${error.message}`);
            }
          }
        }
      } else {
        const res = await client.execSQL(text);
        if (Array.isArray(res)) {
          imported = res.filter((item) => item.ok).length;
          errors = res.filter((item) => !item.ok).map((item) => `${item.table}: ${item.error}`);
        } else {
          imported = 1;
        }
      }

      setResult({ imported, errors });
      if (imported > 0) toast(`Imported ${imported} row${imported !== 1 ? "s" : ""}`, "success");
      else toast("No rows imported", "error");
    } catch (error) {
      toast(error.message, "error");
      setResult({ imported: 0, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-7">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Import Database</h2>
        <p className="text-sm text-gray-500">Upload a JSON or SQL file to import data into your database.</p>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <span className="font-semibold text-sm text-gray-900 block mb-4">Upload File</span>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
                ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 size={28} className="text-green-500" />
                  <div className="font-medium text-sm text-gray-800">{file.name}</div>
                  <div className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB · {file.name.split(".").pop().toUpperCase()}
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                      setResult(null);
                    }}
                    className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={28} className="text-gray-400 mx-auto mb-3" />
                  <div className="font-medium text-sm text-gray-700 mb-1">Drop your file here</div>
                  <div className="text-xs text-gray-400 mb-4">Supports JSON and SQL files (max 10 MB enforced)</div>
                  <button
                    onClick={(event) => event.stopPropagation()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition inline-flex"
                  >
                    Choose File
                  </button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".json,.sql"
                className="hidden"
                onChange={(event) => handleFile(event.target.files[0])}
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <span className="font-semibold text-sm text-gray-900 block mb-3">Import Options</span>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2.5 mb-4">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Warning: This will modify your database.</strong>
                <br />
                Make sure to backup your data before importing. Duplicate data may cause conflicts.
              </div>
            </div>
            <button
              onClick={doImport}
              disabled={loading || !file}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Import Database
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <span className="font-semibold text-sm text-gray-900 block mb-3">Import Result</span>
              <div className="flex items-center gap-2.5 mb-2">
                {result.imported > 0 ? (
                  <CheckCircle2 size={17} className="text-green-500" />
                ) : (
                  <CircleAlert size={17} className="text-amber-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    result.imported > 0 ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {result.imported} row{result.imported !== 1 ? "s" : ""} imported successfully
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 mt-2">
                  <div className="text-xs font-medium text-red-700 mb-1.5">
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                  </div>
                  {result.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-[11px] text-red-600 font-mono mb-0.5">
                      {error}
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-[11px] text-red-500">
                      +{result.errors.length - 5} more…
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <span className="font-semibold text-sm text-gray-900 block mb-4">File Format Guide</span>
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-700 mb-2">JSON Format</div>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] font-mono text-gray-700 overflow-auto leading-relaxed">{`{
  "users": {
    "schema": [{
      "column_name": "id",
      "data_type": "integer"
    }],
    "data": [
      {"id": 1, "name": "John"}
    ]
  }
}`}</pre>
          </div>
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-700 mb-2">SQL Format</div>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] font-mono text-gray-700 overflow-auto leading-relaxed">{`INSERT INTO users (name)
  VALUES ('John');
INSERT INTO users (name)
  VALUES ('Jane');`}</pre>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-700 mb-2">Tips</div>
            <ul className="text-xs text-gray-600 leading-6 pl-3.5 list-disc">
              <li>Use Export to get the correct JSON format</li>
              <li>SQL files can contain multiple INSERTs</li>
              <li>The <code className="font-mono">id</code> column is auto-skipped</li>
              <li>Tables must exist before importing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

