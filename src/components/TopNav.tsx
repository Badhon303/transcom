"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const ROLE_LABEL: Record<string, string> = {
  TRANSCOM_ADMIN: "Transcom Admin",
  BPCL_ADMIN: "BPCL Admin",
  VIEWER: "Viewer",
};

export default function TopNav({ role, name }: { role: string; name: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const links: { href: string; label: string; show: boolean }[] = [
    { href: "/dashboard", label: "Network Map", show: true },
    { href: "/dashboard/summary", label: "Summary", show: true },
    { href: "/dashboard/runs", label: "Runs", show: true },
    { href: "/admin/customers", label: "Customers", show: role === "TRANSCOM_ADMIN" },
    { href: "/admin/rbus", label: "RBUs & Factory", show: role === "BPCL_ADMIN" },
    { href: "/admin/settings", label: "Settings", show: role === "BPCL_ADMIN" },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-[1000]">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center gap-6 h-14">
        <Link href="/dashboard" className="font-bold text-brand whitespace-nowrap">
          BPCL × Transcom
        </Link>
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {links
            .filter((l) => l.show)
            .map((l) => {
              const active =
                pathname === l.href ||
                (l.href !== "/dashboard" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition ${
                    active
                      ? "bg-brand text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
        </nav>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full hover:bg-slate-100 px-2 py-1 transition"
          >
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-semibold">
              {name.charAt(0).toUpperCase()}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-sm font-medium text-slate-700">{name}</div>
                <div className="text-xs text-slate-400">{ROLE_LABEL[role] ?? role}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
