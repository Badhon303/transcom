"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Customer, Rbu } from "@/lib/types";
import { haversineKm } from "@/lib/geo";

export default function SummaryPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rbus, setRbus] = useState<Rbu[]>([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => {
    const totalCases = customers.reduce((s, c) => s + c.caseQty, 0);
    const byRegion: Record<string, number> = {};
    const byRbu: Record<string, number> = {};
    let distSum = 0;
    let distCount = 0;
    const unassigned: Customer[] = [];

    const rbuById = new Map(rbus.map((r) => [r.id, r]));

    for (const c of customers) {
      byRegion[c.regionName] = (byRegion[c.regionName] ?? 0) + c.caseQty;
      if (c.assignedRbuId && rbuById.has(c.assignedRbuId)) {
        const r = rbuById.get(c.assignedRbuId)!;
        byRbu[r.name] = (byRbu[r.name] ?? 0) + c.caseQty;
        if (c.latitude != null && c.longitude != null) {
          distSum += haversineKm(
            { latitude: c.latitude, longitude: c.longitude },
            { latitude: r.latitude, longitude: r.longitude }
          );
          distCount++;
        }
      } else {
        unassigned.push(c);
      }
    }

    return {
      totalCustomers: customers.length,
      totalCases,
      avgDistance: distCount ? distSum / distCount : 0,
      byRegion: Object.entries(byRegion)
        .map(([name, cases]) => ({ name, cases: Math.round(cases) }))
        .sort((a, b) => b.cases - a.cases),
      byRbu: Object.entries(byRbu)
        .map(([name, cases]) => ({ name, cases: Math.round(cases) }))
        .sort((a, b) => b.cases - a.cases),
      unassigned,
    };
  }, [customers, rbus]);

  if (loading) return <div className="p-8 text-slate-400">Loading summary…</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Summary & Reports</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total customers" value={stats.totalCustomers.toLocaleString()} />
        <Card label="Total case qty" value={Math.round(stats.totalCases).toLocaleString()} />
        <Card
          label="Avg customer → RBU"
          value={`${stats.avgDistance.toFixed(1)} km`}
          hint="straight-line"
        />
        <Card
          label="Unassigned"
          value={stats.unassigned.length.toLocaleString()}
          hint="no RBU / no coords"
          alert={stats.unassigned.length > 0}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Case quantity by region">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byRegion} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cases" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Case quantity by RBU catchment">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byRbu} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cases" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b font-semibold text-slate-700">
          Unassigned customers ({stats.unassigned.length})
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left sticky top-0">
              <tr>
                <th className="px-3 py-2">DB Name</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2 text-right">Case Qty</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {stats.unassigned.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    All customers assigned to an RBU.
                  </td>
                </tr>
              ) : (
                stats.unassigned.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">{c.dbName}</td>
                    <td className="px-3 py-2">{c.regionName}</td>
                    <td className="px-3 py-2 text-right">{Math.round(c.caseQty)}</td>
                    <td className="px-3 py-2 text-xs text-amber-600">
                      {c.latitude == null ? "Missing coordinates" : "No RBU assigned"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? "border-amber-300" : ""}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${alert ? "text-amber-600" : "text-slate-800"}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
