"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Customer, Rbu, DistanceReport } from "@/lib/types";

const NetworkMap = dynamic(() => import("@/components/NetworkMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-slate-400">
      Loading map…
    </div>
  ),
});

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rbus, setRbus] = useState<Rbu[]>([]);
  const [loading, setLoading] = useState(true);

  const [region, setRegion] = useState("");
  const [minQty, setMinQty] = useState("");
  const [rbuFilter, setRbuFilter] = useState("");

  const [selected, setSelected] = useState<Customer | null>(null);
  const [report, setReport] = useState<DistanceReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [selectedRbu, setSelectedRbu] = useState<Rbu | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/rbus").then((r) => r.json()),
    ]).then(([cs, rs]) => {
      setCustomers(cs);
      setRbus(rs);
      setLoading(false);
    });
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.regionName))).sort(),
    [customers]
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (region && c.regionName !== region) return false;
      if (minQty && c.caseQty < parseFloat(minQty)) return false;
      if (rbuFilter && c.assignedRbuId !== rbuFilter) return false;
      return true;
    });
  }, [customers, region, minQty, rbuFilter]);

  async function selectCustomer(c: Customer) {
    setSelected(c);
    setSelectedRbu(null);
    setRoute(null);
    setReport(null);
    if (c.latitude == null || c.longitude == null) return;
    setReportLoading(true);
    const r = await fetch(`/api/distance/${c.id}`).then((x) => x.json());
    setReport(r);
    setReportLoading(false);
  }

  async function showRoute(toFactory: boolean) {
    if (!selected || !report?.suggestedRbuId) return;
    const rbu = rbus.find((x) => x.id === report.suggestedRbuId);
    if (!rbu || selected.latitude == null) return;
    const points = [
      { latitude: selected.latitude, longitude: selected.longitude },
      { latitude: rbu.latitude, longitude: rbu.longitude },
    ];
    const factory = rbus.find((x) => x.isFactory);
    if (toFactory && factory) {
      points.push({ latitude: factory.latitude, longitude: factory.longitude });
    }
    const res = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    }).then((x) => x.json());
    if (res.geometry) setRoute(res.geometry);
  }

  const rbuName = (id: string | null) =>
    rbus.find((r) => r.id === id)?.name ?? "—";

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Filters + map */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-slate-700">Filters:</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={rbuFilter}
            onChange={(e) => setRbuFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">All RBUs</option>
            {rbus
              .filter((r) => !r.isFactory)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
          <label className="flex items-center gap-1">
            Min cases:
            <input
              type="number"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              className="border rounded px-2 py-1 w-24"
              placeholder="0"
            />
          </label>
          <span className="text-slate-500">
            Showing <strong>{filtered.length}</strong> of {customers.length}
          </span>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              Customer
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              RBU
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-green-700 rounded-sm" />
              Factory
            </span>
          </div>
        </div>
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              Loading network…
            </div>
          ) : (
            <NetworkMap
              customers={filtered}
              rbus={rbus}
              selectedCustomerId={selected?.id}
              onCustomerClick={selectCustomer}
              onRbuClick={(r) => {
                setSelectedRbu(r);
                setSelected(null);
                setRoute(null);
              }}
              routePolyline={route}
              fitData
            />
          )}
        </div>
      </div>

      {/* Side panel */}
      {(selected || selectedRbu) && (
        <aside className="w-96 bg-white border-l overflow-y-auto">
          {selected && (
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-slate-900">{selected.dbName}</h2>
                <button
                  onClick={() => {
                    setSelected(null);
                    setRoute(null);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-500">
                {selected.regionName}
                {selected.areaName ? ` · ${selected.areaName}` : ""}
              </p>
              <dl className="mt-3 text-sm space-y-1">
                <Row label="Case Qty" value={`${Math.round(selected.caseQty)} cases`} />
                <Row label="Proprietor" value={selected.proprietorName ?? "—"} />
                <Row label="Phone" value={selected.mobilePhone ?? "—"} />
                <Row label="Address" value={selected.address ?? "— (coordinates only)"} />
                <Row label="Assigned RBU" value={rbuName(selected.assignedRbuId)} />
              </dl>

              {selected.latitude == null && (
                <div className="mt-3 rounded bg-amber-50 text-amber-700 text-sm px-3 py-2">
                  This customer has no coordinates — needs geocoding before routing.
                </div>
              )}

              {reportLoading && (
                <p className="mt-4 text-sm text-slate-400">Computing road distances…</p>
              )}

              {report && (
                <div className="mt-4">
                  {report.isLowVolume && (
                    <div className="rounded bg-amber-50 text-amber-800 text-xs px-3 py-2 mb-3">
                      Low volume ({Math.round(report.caseQty)} &lt;{" "}
                      {report.lowVolumeThresholdCases} cases) — batch with nearby
                      customers on a multi-stop run instead of a dedicated pickup.
                    </div>
                  )}
                  <h3 className="font-semibold text-sm text-slate-700 mb-1">
                    Suggested RBU
                  </h3>
                  {report.suggestedRbuId ? (
                    <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
                      <div className="font-medium text-green-800">
                        {rbuName(report.suggestedRbuId)}
                      </div>
                      {(() => {
                        const s = report.ranked.find(
                          (x) => x.rbuId === report.suggestedRbuId
                        );
                        return s ? (
                          <div className="text-xs text-slate-600 mt-1">
                            {s.roadDistanceKm != null
                              ? `${s.roadDistanceKm.toFixed(1)} km by road`
                              : `${s.straightLineKm.toFixed(1)} km straight-line`}
                            {s.roadDurationMin != null &&
                              ` · ~${Math.round(s.roadDurationMin)} min`}
                          </div>
                        ) : null;
                      })()}
                      {report.suggestedToFactoryKm != null && (
                        <div className="text-xs text-slate-500 mt-1">
                          → Factory: {report.suggestedToFactoryKm.toFixed(1)} km
                          {report.suggestedToFactoryMin != null &&
                            ` · ~${Math.round(report.suggestedToFactoryMin)} min`}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => showRoute(false)}
                          className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-dark"
                        >
                          Show route
                        </button>
                        <button
                          onClick={() => showRoute(true)}
                          className="text-xs border border-brand text-brand px-2 py-1 rounded hover:bg-brand hover:text-white"
                        >
                          + to Factory
                        </button>
                        {route && (
                          <button
                            onClick={() => setRoute(null)}
                            className="text-xs text-slate-400 px-2 py-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No RBU available.</p>
                  )}

                  <h3 className="font-semibold text-sm text-slate-700 mt-4 mb-1">
                    All RBUs (ranked)
                  </h3>
                  <ul className="space-y-1">
                    {report.ranked.map((r, i) => (
                      <li
                        key={r.rbuId}
                        className="flex justify-between text-sm border-b py-1"
                      >
                        <span>
                          {i + 1}. {r.name}
                        </span>
                        <span className="text-slate-500">
                          {r.roadDistanceKm != null
                            ? `${r.roadDistanceKm.toFixed(1)} km`
                            : `~${r.straightLineKm.toFixed(1)} km`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selectedRbu && (
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-slate-900">{selectedRbu.name}</h2>
                <button
                  onClick={() => setSelectedRbu(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-500">
                {selectedRbu.isFactory ? "Factory (final destination)" : "Recycling Business Unit"}
              </p>
              <dl className="mt-3 text-sm space-y-1">
                <Row label="Address" value={selectedRbu.address ?? "—"} />
                <Row label="Customers in catchment" value={String(selectedRbu.customerCount ?? 0)} />
                <Row
                  label="Total case qty"
                  value={`${Math.round(selectedRbu.totalCaseQty ?? 0)} cases`}
                />
                {!selectedRbu.isFactory && selectedRbu.distanceToFactoryKm != null && (
                  <Row
                    label="Distance to Factory"
                    value={`${selectedRbu.distanceToFactoryKm.toFixed(1)} km (straight-line)`}
                  />
                )}
                <Row label="Notes" value={selectedRbu.capacityNotes ?? "—"} />
              </dl>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-700 text-right">{value}</dd>
    </div>
  );
}
