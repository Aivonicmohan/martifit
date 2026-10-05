"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart3, TrendingUp, Users, CreditCard, Download } from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await authFetch("/api/v1/reports?type=SUMMARY");
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success) setSummary(data.summary);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Analytics & Business Intelligence</h1>
            <p className="text-xs text-slate-500 mt-1">Export financial reports, member retention statistics, and revenue projections.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Member Growth</h3>
            <p className="text-2xl font-extrabold text-blue-600">
              {loading ? "..." : summary?.totalMembers ?? 0} Total Members
            </p>
            <p className="text-xs text-slate-500 mt-1">Active registrations across all plans</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Active Subscriptions</h3>
            <p className="text-2xl font-extrabold text-emerald-600">
              {loading ? "..." : summary?.activeMemberships ?? 0} Active
            </p>
            <p className="text-xs text-slate-500 mt-1">Ongoing active membership plans</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Total Facility Revenue</h3>
            <p className="text-2xl font-extrabold text-indigo-600">
              ₹{loading ? "..." : (summary?.totalRevenue ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-slate-500 mt-1">Verified fee collections</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
