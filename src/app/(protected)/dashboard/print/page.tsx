"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Customer, Rbu } from "@/lib/types";

const NetworkMap = dynamic(() => import("@/components/NetworkMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-slate-400">
      Loading map…
    </div>
  ),
});

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-600">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
        Customer (size = case qty)
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
  );
}

function SectionStats({
  customers,
  rbus,
}: {
  customers: Customer[];
  rbus: Rbu[];
}) {
  const totalCases = customers.reduce((s, c) => s + c.caseQty, 0);
  const missing = customers.filter((c) => c.latitude == null).length;
  return (
    <p className="text-sm text-slate-600">
      {customers.length} customers · {Math.round(totalCases)} cases ·{" "}
      {rbus.filter((r) => !r.isFactory).length} RBU(s)
      {missing > 0 && ` · ${missing} without coordinates (not shown)`}
    </p>
  );
}

export default function PrintMapPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rbus, setRbus] = useState<Rbu[]>([]);
  const [loading, setLoading] = useState(true);

  const [includeWhole, setIncludeWhole] = useState(true);
  const [includeZones, setIncludeZones] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/rbus").then((r) => r.json()),
    ]).then(([cs, rs]: [Customer[], Rbu[]]) => {
      setCustomers(cs);
      setRbus(rs);
      setSelectedRegions(new Set(cs.map((c) => c.regionName)));
      setLoading(false);
    });
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.regionName))).sort(),
    [customers]
  );

  const factory = rbus.find((r) => r.isFactory);

  function zoneRbus(zoneCustomers: Customer[]): Rbu[] {
    const ids = new Set(
      zoneCustomers.map((c) => c.assignedRbuId).filter(Boolean) as string[]
    );
    const list = rbus.filter((r) => ids.has(r.id));
    if (factory && !list.some((r) => r.id === factory.id)) list.push(factory);
    return list;
  }

  function toggleRegion(r: string) {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  const activeRegions = regions.filter((r) => selectedRegions.has(r));
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center text-slate-400">
        Loading network…
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto p-6 print:p-0 print:max-w-none">
      {/* Controls — hidden when printing */}
      <div className="print:hidden bg-white border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-lg font-bold text-slate-900">Print Map Report</h1>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeWhole}
              onChange={(e) => setIncludeWhole(e.target.checked)}
            />
            Whole network
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeZones}
              onChange={(e) => setIncludeZones(e.target.checked)}
            />
            Zone-wise maps
          </label>
          <button
            onClick={() => window.print()}
            className="ml-auto bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark"
          >
            🖨 Print / Save as PDF
          </button>
        </div>
        {includeZones && (
          <div className="mt-3 flex flex-wrap gap-2">
            {regions.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 cursor-pointer ${
                  selectedRegions.has(r)
                    ? "bg-brand/10 border-brand text-brand"
                    : "text-slate-500"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedRegions.has(r)}
                  onChange={() => toggleRegion(r)}
                />
                {r}
              </label>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Tip: wait for all map tiles to finish loading before printing. Use
          landscape orientation for best results.
        </p>
      </div>

      {/* Whole network */}
      {includeWhole && (
        <section className="print-section bg-white border rounded-xl print:border-0 print:rounded-none overflow-hidden mb-8">
          <div className="px-4 py-3 border-b">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-900">
                PET Reverse-Logistics Network — Whole Network
              </h2>
              <span className="text-xs text-slate-400">
                BPCL × Transcom · {today}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
              <SectionStats customers={customers} rbus={rbus} />
              <Legend />
            </div>
          </div>
          <div className="print-map h-[600px]">
            <NetworkMap customers={customers} rbus={rbus} fitData />
          </div>
        </section>
      )}

      {/* Zone-wise */}
      {includeZones &&
        activeRegions.map((region) => {
          const zoneCustomers = customers.filter((c) => c.regionName === region);
          const zRbus = zoneRbus(zoneCustomers);
          return (
            <section
              key={region}
              className="print-section bg-white border rounded-xl print:border-0 print:rounded-none overflow-hidden mb-8"
            >
              <div className="px-4 py-3 border-b">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Zone: {region}
                  </h2>
                  <span className="text-xs text-slate-400">
                    BPCL × Transcom · {today}
                  </span>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
                  <SectionStats customers={zoneCustomers} rbus={zRbus} />
                  <Legend />
                </div>
              </div>
              <div className="print-map h-[600px]">
                <NetworkMap customers={zoneCustomers} rbus={zRbus} fitData />
              </div>
            </section>
          );
        })}
    </div>
  );
}
