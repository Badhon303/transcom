"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Customer, Rbu, Run, RunSuggestion } from "@/lib/types";

const NetworkMap = dynamic(() => import("@/components/NetworkMap"), { ssr: false });

interface EditorStop {
  id: string;
  dbName: string;
  caseQty: number;
  latitude: number;
  longitude: number;
}

export default function RunsPage() {
  const { data: session } = useSession();
  const isBpcl = (session?.user as { role?: string })?.role === "BPCL_ADMIN";

  const [rbus, setRbus] = useState<Rbu[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [suggestions, setSuggestions] = useState<RunSuggestion[]>([]);
  const [suggestMeta, setSuggestMeta] = useState<{ threshold: number; radius: number } | null>(null);

  const [editorRbuId, setEditorRbuId] = useState<string>("");
  const [editorStops, setEditorStops] = useState<EditorStop[]>([]);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeTotals, setRouteTotals] = useState<{ km: number; min: number } | null>(null);
  const [addCustomerId, setAddCustomerId] = useState("");

  async function loadAll() {
    const [rs, cs, rn] = await Promise.all([
      fetch("/api/rbus").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/runs").then((r) => r.json()),
    ]);
    setRbus(rs.filter((r: Rbu) => !r.isFactory));
    setCustomers(cs);
    setRuns(rn);
    const sug = await fetch("/api/runs/suggest").then((r) => r.json());
    setSuggestions(sug.suggestions ?? []);
    setSuggestMeta({ threshold: sug.lowVolumeThresholdCases, radius: sug.clusterRadiusKm });
  }
  useEffect(() => {
    loadAll();
  }, []);

  // Recompute the route whenever the editor stops/rbu change.
  useEffect(() => {
    const rbu = rbus.find((r) => r.id === editorRbuId);
    if (!rbu || editorStops.length === 0) {
      setRoute(null);
      setRouteTotals(null);
      return;
    }
    const points = [
      { latitude: rbu.latitude, longitude: rbu.longitude },
      ...editorStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
      { latitude: rbu.latitude, longitude: rbu.longitude },
    ];
    let cancelled = false;
    fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.geometry) {
          setRoute(res.geometry);
          setRouteTotals({ km: res.roadDistanceKm, min: res.roadDurationMin });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editorRbuId, editorStops, rbus]);

  function loadSuggestion(s: RunSuggestion) {
    setEditingRunId(null);
    setEditorRbuId(s.rbuId);
    setEditorStops(s.stops);
  }

  function loadRun(run: Run) {
    setEditingRunId(run.id);
    setEditorRbuId(run.rbuId);
    setEditorStops(
      run.stops
        .filter((st) => st.customer.latitude != null)
        .map((st) => ({
          id: st.customer.id,
          dbName: st.customer.dbName,
          caseQty: st.customer.caseQty,
          latitude: st.customer.latitude as number,
          longitude: st.customer.longitude as number,
        }))
    );
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= editorStops.length) return;
    const next = [...editorStops];
    [next[i], next[j]] = [next[j], next[i]];
    setEditorStops(next);
  }
  function removeStop(id: string) {
    setEditorStops(editorStops.filter((s) => s.id !== id));
  }
  function addStop() {
    const c = customers.find((x) => x.id === addCustomerId);
    if (!c || c.latitude == null) return;
    if (editorStops.some((s) => s.id === c.id)) return;
    setEditorStops([
      ...editorStops,
      {
        id: c.id,
        dbName: c.dbName,
        caseQty: c.caseQty,
        latitude: c.latitude,
        longitude: c.longitude as number,
      },
    ]);
    setAddCustomerId("");
  }

  async function saveRun(status: "PLANNED" | "COMPLETED") {
    if (!editorRbuId || editorStops.length === 0) return;
    const body = {
      rbuId: editorRbuId,
      status,
      customerIds: editorStops.map((s) => s.id),
    };
    const res = await fetch(
      editingRunId ? `/api/runs/${editingRunId}` : "/api/runs",
      {
        method: editingRunId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (res.ok) {
      clearEditor();
      loadAll();
    } else {
      alert((await res.json()).error || "Save failed");
    }
  }

  async function deleteRun(id: string) {
    if (!confirm("Delete this run?")) return;
    const res = await fetch(`/api/runs/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingRunId === id) clearEditor();
      loadAll();
    }
  }

  function clearEditor() {
    setEditingRunId(null);
    setEditorRbuId("");
    setEditorStops([]);
    setRoute(null);
    setRouteTotals(null);
  }

  const editorRbu = rbus.find((r) => r.id === editorRbuId);
  const totalCases = editorStops.reduce((s, x) => s + x.caseQty, 0);
  const availableToAdd = customers.filter(
    (c) => c.latitude != null && !editorStops.some((s) => s.id === c.id)
  );

  return (
    <div className="max-w-[1600px] mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Multi-Stop Runs</h1>
      <p className="text-slate-500 text-sm mb-4">
        Batch low-volume customers into collection runs ending at their RBU.
        {suggestMeta &&
          ` Auto-grouping: < ${suggestMeta.threshold} cases, within ${suggestMeta.radius} km.`}
        {!isBpcl && " (Read-only — sign in as BPCL Admin to edit.)"}
      </p>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Left column: suggestions + saved runs */}
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-slate-700 mb-2">
              Suggested runs ({suggestions.length})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {suggestions.length === 0 && (
                <p className="text-sm text-slate-400">
                  No multi-stop clusters found at current settings.
                </p>
              )}
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSuggestion(s)}
                  className="w-full text-left bg-white border rounded-lg p-3 hover:border-brand"
                >
                  <div className="font-medium text-sm">{s.rbuName}</div>
                  <div className="text-xs text-slate-500">
                    {s.stops.length} stops · {Math.round(s.totalCaseQty)} cases
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-slate-700 mb-2">
              Saved runs ({runs.length})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {runs.length === 0 && (
                <p className="text-sm text-slate-400">No saved runs yet.</p>
              )}
              {runs.map((run) => (
                <div key={run.id} className="bg-white border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <button onClick={() => loadRun(run)} className="text-left">
                      <div className="font-medium text-sm">{run.rbu.name}</div>
                      <div className="text-xs text-slate-500">
                        {run.stops.length} stops
                        {run.totalDistanceKm != null &&
                          ` · ${run.totalDistanceKm.toFixed(1)} km`}
                      </div>
                    </button>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        run.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  {isBpcl && (
                    <button
                      onClick={() => deleteRun(run.id)}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: editor + map */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <select
                value={editorRbuId}
                onChange={(e) => {
                  setEditorRbuId(e.target.value);
                  setEditingRunId(null);
                }}
                disabled={!isBpcl}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select RBU…</option>
                {rbus.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div className="text-sm text-slate-500">
                {editorStops.length} stops · {Math.round(totalCases)} cases
                {routeTotals &&
                  ` · ${routeTotals.km.toFixed(1)} km · ~${Math.round(routeTotals.min)} min`}
              </div>
              {isBpcl && editorRbuId && editorStops.length > 0 && (
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => saveRun("PLANNED")}
                    className="bg-brand text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-dark"
                  >
                    {editingRunId ? "Update" : "Save"} run
                  </button>
                  <button
                    onClick={() => saveRun("COMPLETED")}
                    className="border border-green-600 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-600 hover:text-white"
                  >
                    Mark completed
                  </button>
                  <button onClick={clearEditor} className="text-sm text-slate-400 px-2">
                    Clear
                  </button>
                </div>
              )}
            </div>

            {editorRbu ? (
              <>
                <ol className="space-y-1 mb-3">
                  {editorStops.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 text-sm bg-slate-50 rounded px-2 py-1"
                    >
                      <span className="w-6 text-center font-medium text-slate-500">
                        {i + 1}
                      </span>
                      <span className="flex-1">{s.dbName}</span>
                      <span className="text-xs text-slate-400">
                        {Math.round(s.caseQty)} cases
                      </span>
                      {isBpcl && (
                        <span className="flex gap-1">
                          <button
                            onClick={() => move(i, -1)}
                            className="px-1 text-slate-400 hover:text-slate-700"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            className="px-1 text-slate-400 hover:text-slate-700"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeStop(s.id)}
                            className="px-1 text-red-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                  {editorStops.length === 0 && (
                    <li className="text-sm text-slate-400 py-2">
                      No stops yet. Add customers below.
                    </li>
                  )}
                </ol>

                {isBpcl && (
                  <div className="flex gap-2">
                    <select
                      value={addCustomerId}
                      onChange={(e) => setAddCustomerId(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm flex-1"
                    >
                      <option value="">Add a customer…</option>
                      {availableToAdd.slice(0, 300).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.dbName} ({Math.round(c.caseQty)} cases)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addStop}
                      disabled={!addCustomerId}
                      className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Select an RBU or click a suggested run to start planning.
              </p>
            )}
          </div>

          <div className="bg-white border rounded-xl overflow-hidden h-[420px]">
            {editorRbu ? (
              <NetworkMap
                customers={editorStops.map((s) => ({
                  id: s.id,
                  dbName: s.dbName,
                  caseQty: s.caseQty,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  regionName: "",
                  slNo: null,
                  areaName: null,
                  seArea: null,
                  dbCode: null,
                  masterId: null,
                  proprietorName: null,
                  mobilePhone: null,
                  address: null,
                  phase: null,
                  auditDate: null,
                  assignedRbuId: null,
                  createdAt: "",
                  updatedAt: "",
                }))}
                rbus={editorRbu ? [editorRbu] : []}
                routePolyline={route}
                fitData
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Route preview appears here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
