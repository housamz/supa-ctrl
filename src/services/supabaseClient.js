/**
 * Minimal Supabase REST client used throughout the app.
 * Wraps the fetch-based API interactions in a single module for reuse.
 */
export function createClient(url, key) {
  const base = url.replace(/\/$/, "");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  async function request(path, opts = {}) {
    const res = await fetch(`${base}${path}`, {
      headers: { ...headers, ...opts.headers },
      ...opts,
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.message || b.hint || b.error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return [];
    return res.json();
  }

  async function discoverTables() {
    try {
      const spec = await fetch(`${base}/rest/v1/`, { headers }).then((r) => r.json());
      if (spec?.paths) {
        const t = Object.keys(spec.paths)
          .filter((p) => p !== "/" && !p.includes("{"))
          .map((p) => p.replace(/^\//, ""))
          .filter(Boolean);
        if (t.length) return t;
      }
    } catch {}

    try {
      const rows = await request("/rest/v1/rpc/get_tables", { method: "POST", body: "{}" });
      if (Array.isArray(rows) && rows.length)
        return rows.map((r) => r.table_name || r.name).filter(Boolean);
    } catch {}

    const common = [
      "users","profiles","posts","products","orders","items","categories","tags",
      "comments","messages","settings","logs","events","sessions","teams",
      "projects","tasks","files","images","notifications","todos","accounts","customers",
    ];
    const found = [];
    await Promise.allSettled(
      common.map(async (t) => {
        try { await request(`/rest/v1/${t}?limit=0`); found.push(t); } catch {}
      })
    );
    return found;
  }

  async function getRows(table, { page = 0, pageSize = 50, search = "", searchCol = "" } = {}) {
    let countPath = `/rest/v1/${table}?select=count`;
    if (search && searchCol)
      countPath += `&${encodeURIComponent(searchCol)}=ilike.*${encodeURIComponent(search)}*`;

    const cr = await fetch(`${base}${countPath}`, {
      headers: { ...headers, Prefer: "count=exact" },
    });
    const count = parseInt((cr.headers.get("content-range") || "").split("/")[1] || "0") || 0;

    let path = `/rest/v1/${table}?limit=${pageSize}&offset=${page * pageSize}&order=id.asc.nullslast`;
    if (search && searchCol)
      path += `&${encodeURIComponent(searchCol)}=ilike.*${encodeURIComponent(search)}*`;

    const rows = await request(path);
    return { rows, count };
  }

  async function exportAll(table) {
    const PAGE = 1000;
    const all = [];
    let page = 0;
    while (true) {
      const { rows, count } = await getRows(table, { page, pageSize: PAGE });
      all.push(...rows);
      if (all.length >= count || rows.length < PAGE) break;
      page++;
    }
    return all;
  }

  const insertRow = (t, d) =>
    request(`/rest/v1/${t}`, { method: "POST", body: JSON.stringify(d) });
  const updateRow = (t, id, d, pk = "id") =>
    request(`/rest/v1/${t}?${pk}=eq.${id}`, { method: "PATCH", body: JSON.stringify(d) });
  const deleteRow = (t, id, pk = "id") =>
    request(`/rest/v1/${t}?${pk}=eq.${id}`, { method: "DELETE" });

  async function execSQL(sql) {
    try {
      return await request("/rest/v1/rpc/exec_sql", { method: "POST", body: JSON.stringify({ query: sql }) });
    } catch {}

    const insertRe = /INSERT\s+INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:;|$)/gi;
    let match, results = [];
    while ((match = insertRe.exec(sql)) !== null) {
      const table = match[1];
      const cols = match[2].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const valBlock = match[3];
      const rowRe = /\(([^)]+)\)/g;
      let rm;
      while ((rm = rowRe.exec(valBlock)) !== null) {
        const vals = rm[1].split(",").map((v) => {
          v = v.trim();
          if (v === "NULL") return null;
          if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
          return isNaN(v) ? v : Number(v);
        });
        const obj = {};
        cols.forEach((c, i) => { obj[c] = vals[i]; });
        try { await insertRow(table, obj); results.push({ ok: true, table }); }
        catch (e) { results.push({ ok: false, table, error: e.message }); }
      }
    }
    return results;
  }

  return { discoverTables, getRows, insertRow, updateRow, deleteRow, exportAll, execSQL };
}
