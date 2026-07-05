"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Rbu } from "@/lib/types";

const PinMap = dynamic(() => import("@/components/PinMap"), { ssr: false });

type FormState = Partial<Rbu>;

export default function RbusAdminPage() {
  const [rbus, setRbus] = useState<Rbu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const rs = await fetch("/api/rbus").then((r) => r.json());
    setRbus(rs);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.name || editing.latitude == null || editing.longitude == null) {
      alert("Name and coordinates are required.");
      return;
    }
    setSaving(true);
    const isNew = !editing.id;
    const res = await fetch(isNew ? "/api/rbus" : `/api/rbus/${editing.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      load();
    } else {
      alert((await res.json()).error || "Save failed");
    }
  }

  async function remove(r: Rbu) {
    if (!confirm(`Delete "${r.name}"? Customers will be reassigned.`)) return;
    const res = await fetch(`/api/rbus/${r.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">RBUs & Factory</h1>
          <p className="text-slate-500 text-sm">
            {rbus.filter((r) => !r.isFactory).length} RBUs ·{" "}
            {rbus.filter((r) => r.isFactory).length} factory. Add the remaining
            RBUs and re-pin approximate locations.
          </p>
        </div>
        <button
          onClick={() => setEditing({ name: "", isFactory: false })}
          className="bg-brand text-white px-3 py-2 rounded-lg text-sm hover:bg-brand-dark"
        >
          + Add RBU / Factory
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Coordinates</th>
              <th className="px-3 py-2 text-right">Customers</th>
              <th className="px-3 py-2 text-right">Total cases</th>
              <th className="px-3 py-2 text-right">→ Factory</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : (
              rbus.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-2">
                    {r.isFactory ? (
                      <span className="text-green-700 font-medium">Factory</span>
                    ) : (
                      "RBU"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right">{r.customerCount ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    {Math.round(r.totalCaseQty ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {r.distanceToFactoryKm != null
                      ? `${r.distanceToFactoryKm.toFixed(1)} km`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(r)}
                      className="text-brand hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(r)}
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
                {editing.id ? "Edit" : "Add"} RBU / Factory
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Name *
                </span>
                <input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.isFactory}
                  onChange={(e) =>
                    setEditing({ ...editing, isFactory: e.target.checked })
                  }
                />
                This is the Factory (final destination). Only one factory is
                allowed — saving replaces any existing one.
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Address
                </span>
                <input
                  value={editing.address ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">
                  Capacity notes
                </span>
                <input
                  value={editing.capacityNotes ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, capacityNotes: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    Latitude *
                  </span>
                  <input
                    type="number"
                    value={editing.latitude ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        latitude: e.target.value === "" ? undefined : parseFloat(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    Longitude *
                  </span>
                  <input
                    type="number"
                    value={editing.longitude ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        longitude: e.target.value === "" ? undefined : parseFloat(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Click the map to drop a pin</p>
                <PinMap
                  lat={editing.latitude ?? null}
                  lng={editing.longitude ?? null}
                  onPick={(lat, lng) =>
                    setEditing({ ...editing, latitude: lat, longitude: lng })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={save}
                  disabled={saving}
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
    </div>
  );
}
