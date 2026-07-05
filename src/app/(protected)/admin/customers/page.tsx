"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Customer, Rbu } from "@/lib/types";

const PinMap = dynamic(() => import("@/components/PinMap"), { ssr: false });

type FormState = Partial<Customer> & { _newRegion?: boolean };

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rbus, setRbus] = useState<Rbu[]>([]);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [cs, rs] = await Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/rbus").then((r) => r.json()),
    ]);
    setCustomers(cs);
    setRbus(rs);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.regionName))).sort(),
    [customers]
  );
  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (region && c.regionName !== region) return false;
        if (q) {
          const s = q.toLowerCase();
          return (
            c.dbName.toLowerCase().includes(s) ||
            (c.proprietorName ?? "").toLowerCase().includes(s) ||
            (c.dbCode ?? "").toLowerCase().includes(s)
          );
        }
        return true;
      }),
    [customers, q, region]
  );

  const rbuName = (id: string | null | undefined) =>
    rbus.find((r) => r.id === id)?.name ?? "—";

  async function save() {
    if (!editing?.dbName) return;
    setSaving(true);
    const isNew = !editing.id;
    const { _newRegion, ...payload } = editing;
    const res = await fetch(
      isNew ? "/api/customers" : `/api/customers/${editing.id}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      load();
    } else {
      alert((await res.json()).error || "Save failed");
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`Delete "${c.dbName}"?`)) return;
    const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm">
            {customers.length} distributors ·{" "}
            {customers.filter((c) => c.latitude == null).length} missing
            coordinates
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/customers/import"
            className="border border-brand text-brand px-3 py-2 rounded-lg text-sm hover:bg-brand hover:text-white"
          >
            Import spreadsheet
          </Link>
          <button
            onClick={() =>
              setEditing({ regionName: "Dhaka Metro", caseQty: 0, phase: "Phase 2" })
            }
            className="bg-brand text-white px-3 py-2 rounded-lg text-sm hover:bg-brand-dark"
          >
            + Add customer
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, proprietor, DB code…"
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-3 py-2">DB Name</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2 text-right">Case Qty</th>
              <th className="px-3 py-2">Coordinates</th>
              <th className="px-3 py-2">Assigned RBU</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : (
              filtered.slice(0, 500).map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {c.dbName}
                    {c.proprietorName && (
                      <div className="text-xs text-slate-400">{c.proprietorName}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{c.regionName}</td>
                  <td className="px-3 py-2 text-right">{Math.round(c.caseQty)}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.latitude != null ? (
                      `${c.latitude.toFixed(4)}, ${c.longitude!.toFixed(4)}`
                    ) : (
                      <span className="text-amber-600">missing</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{rbuName(c.assignedRbuId)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-brand hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex justify-end">
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editing.id ? "Edit customer" : "Add customer"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <Field label="DB Name *">
                <input
                  value={editing.dbName ?? ""}
                  onChange={(e) => setEditing({ ...editing, dbName: e.target.value })}
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Region">
                  {editing._newRegion ? (
                    <div className="flex gap-1">
                      <input
                        value={editing.regionName ?? ""}
                        onChange={(e) =>
                          setEditing({ ...editing, regionName: e.target.value })
                        }
                        className="input"
                        placeholder="Enter new region name"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({ ...editing, _newRegion: false, regionName: regions[0] ?? "" })
                        }
                        className="text-xs px-2 border rounded-lg whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editing.regionName ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setEditing({ ...editing, _newRegion: true, regionName: "" });
                        } else {
                          setEditing({ ...editing, regionName: e.target.value });
                        }
                      }}
                      className="input"
                    >
                      {!regions.includes(editing.regionName ?? "") && editing.regionName && (
                        <option value={editing.regionName}>{editing.regionName}</option>
                      )}
                      {regions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="__add_new__">+ Add new region…</option>
                    </select>
                  )}
                </Field>
                <Field label="Area">
                  <input
                    value={editing.areaName ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, areaName: e.target.value })
                    }
                    className="input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Proprietor">
                  <input
                    value={editing.proprietorName ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, proprietorName: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={editing.mobilePhone ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, mobilePhone: e.target.value })
                    }
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Address">
                <input
                  value={editing.address ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Case Qty">
                  <input
                    type="number"
                    value={editing.caseQty ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, caseQty: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Assigned RBU">
                  <select
                    value={editing.assignedRbuId ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        assignedRbuId: e.target.value === "" ? null : e.target.value,
                      })
                    }
                    className="input"
                  >
                    <option value="">— Unassigned —</option>
                    {rbus.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <input
                    type="number"
                    value={editing.latitude ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        latitude: e.target.value === "" ? null : parseFloat(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    type="number"
                    value={editing.longitude ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        longitude: e.target.value === "" ? null : parseFloat(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Click the map to drop a pin</p>
                <PinMap
                  lat={editing.latitude ?? null}
                  lng={editing.longitude ?? null}
                  onPick={(lat, lng) => setEditing({ ...editing, latitude: lat, longitude: lng })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={save}
                  disabled={saving || !editing.dbName}
                  className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg border"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
