"use client";

import { useEffect, useState } from "react";
import { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setError((await res.json()).error || "Failed to save");
    }
  }

  if (!settings)
    return <div className="p-8 text-slate-400">Loading settings…</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
      <p className="text-slate-500 text-sm mb-6">
        BPCL-controlled thresholds. These are read live everywhere (low-volume
        flag, multi-stop clustering) — no redeploy needed.
      </p>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Low-volume threshold (cases)
          </label>
          <input
            type="number"
            value={settings.lowVolumeThresholdCases}
            onChange={(e) =>
              setSettings({
                ...settings,
                lowVolumeThresholdCases: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full border rounded-lg px-3 py-2"
          />
          <p className="text-xs text-slate-400 mt-1">
            Customers below this are flagged &quot;batch on a multi-stop run&quot;
            instead of a dedicated pickup.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Clustering radius (km)
          </label>
          <input
            type="number"
            value={settings.clusterRadiusKm}
            onChange={(e) =>
              setSettings({
                ...settings,
                clusterRadiusKm: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full border rounded-lg px-3 py-2"
          />
          <p className="text-xs text-slate-400 mt-1">
            Low-volume customers within this distance of each other are grouped
            into one candidate multi-stop run.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}
