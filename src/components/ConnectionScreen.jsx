import { useState } from "react";
import {
  AlertTriangle,
  Database,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "../services/supabaseClient";

export function ConnectionScreen({ onConnect }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    if (!url.trim() || !key.trim()) {
      setError("Both fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const client = createClient(url.trim(), key.trim());
      const tables = await client.discoverTables();
      onConnect(client, url.trim(), tables);
    } catch (e) {
      setError(e.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-base leading-tight">Supa Ctrl</div>
            <div className="text-xs text-gray-400">Supabase database interface</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Project URL</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              onKeyDown={(event) => event.key === "Enter" && connect()}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              API Key <span className="text-gray-400 font-normal">(publishable / anon / service_role)</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 pr-9 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="eyJhbGci…"
                onKeyDown={(event) => event.key === "Enter" && connect()}
              />
              <button
                onClick={() => setShowKey((value) => !value)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2.5">
            <ShieldAlert size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Empty tables?</strong> RLS may be hiding data. Use your <strong>service_role</strong> key to bypass RLS, or add read policies in Supabase.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle size={13} className="text-red-600 mt-0.5 shrink-0" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}

          <button
            onClick={connect}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md py-2.5 flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Connecting…
              </>
            ) : (
              "Connect"
            )}
          </button>
        </div>
        <p className="text-center mt-4 text-xs text-gray-400">
          "Publishable key" is Supabase's newer term for the anon key — they're the same.
        </p>
      </div>
    </div>
  );
}

