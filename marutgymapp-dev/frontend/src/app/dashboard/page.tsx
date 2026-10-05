"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  DollarSign,
  UserPlus,
  Building2,
  Calendar,
  ShieldCheck,
  Trash2,
  Filter,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Plus
} from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/apiConfig";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [superAdminStats, setSuperAdminStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [superAdminFilter, setSuperAdminFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");

  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  const isOwnerOrManager = Boolean(
    user?.isSuperAdmin ||
      (user?.role || "").toUpperCase().includes("OWNER") ||
      (user?.role || "").toUpperCase().includes("MANAGER") ||
      user?.role === "Gym Owner"
  );

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      if (isSuperAdmin) {
        const res = await authFetch("/api/v1/tenants/dashboard-stats");
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && data?.stats) {
            setSuperAdminStats(data.stats);
          }
        }
      } else {
        const res = await authFetch("/api/v1/reports/dashboard-stats");
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && data?.stats) {
            setStats(data.stats);
          }
        }
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, [isSuperAdmin]);

  const handleDeleteFacility = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently DELETE gym facility "${name}"?\n\nThis will remove all associated members, memberships, and records. This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/v1/tenants/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Facility deleted successfully!");
        loadDashboardStats();
      } else {
        alert(data?.error || "Failed to delete facility.");
      }
    } catch (err) {
      alert("Error deleting facility.");
    }
  };

  // ----------------------------------------------------
  // SUPER ADMIN DASHBOARD VIEW
  // ----------------------------------------------------
  if (isSuperAdmin) {
    const totalFacilities = superAdminStats?.totalFacilities ?? 0;
    const dueTodayCount = superAdminStats?.dueTodayCount ?? 0;
    const dueThisWeekCount = superAdminStats?.dueThisWeekCount ?? 0;
    const dueThisMonthCount = superAdminStats?.dueThisMonthCount ?? 0;

    let displayedFacilities: any[] = [];
    let filterTitle = "All Onboarded Gym Facilities";

    if (superAdminFilter === "TODAY") {
      displayedFacilities = superAdminStats?.dueTodayList || [];
      filterTitle = "Facilities Due Software Payment Today";
    } else if (superAdminFilter === "WEEK") {
      displayedFacilities = superAdminStats?.dueThisWeekList || [];
      filterTitle = "Facilities Due Software Payment This Week (Next 7 Days)";
    } else if (superAdminFilter === "MONTH") {
      displayedFacilities = superAdminStats?.dueThisMonthList || [];
      filterTitle = "Facilities Due Software Payment This Month";
    } else {
      displayedFacilities = superAdminStats?.allFacilities || [];
      filterTitle = "All Onboarded Gym Facilities";
    }

    const saCards = [
      {
        id: "ALL",
        label: "Total Gym Facilities",
        value: totalFacilities.toLocaleString("en-IN"),
        sub: "All onboarded locations",
        icon: Building2,
        color: "bg-blue-50 text-blue-600 border-blue-200",
        activeColor: "ring-2 ring-blue-500 bg-blue-50/50"
      },
      {
        id: "TODAY",
        label: "Payment Due Today",
        value: dueTodayCount.toLocaleString("en-IN"),
        sub: "SaaS renewal due today",
        icon: Clock,
        color: "bg-rose-50 text-rose-600 border-rose-200",
        activeColor: "ring-2 ring-rose-500 bg-rose-50/50"
      },
      {
        id: "WEEK",
        label: "Payment Due This Week",
        value: dueThisWeekCount.toLocaleString("en-IN"),
        sub: "SaaS renewal in 7 days",
        icon: Calendar,
        color: "bg-amber-50 text-amber-600 border-amber-200",
        activeColor: "ring-2 ring-amber-500 bg-amber-50/50"
      },
      {
        id: "MONTH",
        label: "Payment Due This Month",
        value: dueThisMonthCount.toLocaleString("en-IN"),
        sub: "Current month SaaS renewals",
        icon: TrendingUp,
        color: "bg-indigo-50 text-indigo-600 border-indigo-200",
        activeColor: "ring-2 ring-indigo-500 bg-indigo-50/50"
      },
    ];

    return (
      <AppLayout>
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md">
            <div>
              <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Super Admin Platform Dashboard</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold">Facilities & SaaS Renewal Tracker</h1>
              <p className="text-xs text-slate-400 mt-1">
                Monitor onboarded gym facilities and software subscription payment schedules.
              </p>
            </div>
            <Link
              href="/platform-admin"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-2xl shadow-md transition-all flex items-center space-x-2 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Control Center Approvals</span>
            </Link>
          </div>

          {/* Interactive Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {saCards.map((card) => {
              const Icon = card.icon;
              const isSelected = superAdminFilter === card.id;

              return (
                <button
                  key={card.id}
                  onClick={() => setSuperAdminFilter(card.id as any)}
                  className={`bg-white p-5 rounded-3xl border transition-all text-left flex flex-col justify-between hover:shadow-md ${
                    isSelected ? card.activeColor : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-600">{card.label}</span>
                    <div className={`p-2.5 rounded-2xl border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900">
                      {loading ? <span className="text-xs text-slate-400">Loading...</span> : card.value}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">{card.sub}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-blue-600">
                    <span>{isSelected ? "● Showing Selected List" : "Click to view list"}</span>
                    <span>→</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Facilities Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{filterTitle}</h3>
                <p className="text-xs text-slate-500">Showing {displayedFacilities.length} facilities</p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setSuperAdminFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    superAdminFilter === "ALL" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({totalFacilities})
                </button>
                <button
                  onClick={() => setSuperAdminFilter("TODAY")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    superAdminFilter === "TODAY" ? "bg-white text-rose-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Due Today ({dueTodayCount})
                </button>
                <button
                  onClick={() => setSuperAdminFilter("WEEK")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    superAdminFilter === "WEEK" ? "bg-white text-amber-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Due This Week ({dueThisWeekCount})
                </button>
                <button
                  onClick={() => setSuperAdminFilter("MONTH")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    superAdminFilter === "MONTH" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Due This Month ({dueThisMonthCount})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading facility records...
              </div>
            ) : displayedFacilities.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p>No gym facilities found matching this payment filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-4 px-5">Gym Name</th>
                      <th className="py-4 px-5">Location</th>
                      <th className="py-4 px-5">Owner / Contact</th>
                      <th className="py-4 px-5">Members</th>
                      <th className="py-4 px-5">Payment Due Date</th>
                      <th className="py-4 px-5">SaaS Fee</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedFacilities.map((t) => {
                      const dueDateObj = new Date(t.dueDate);
                      const formattedDate = dueDateObj.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      });

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{t.slug}</span>
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-700">
                            {t.branding?.address || "N/A"}
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-800">{t.owner?.name || "N/A"}</div>
                            <span className="text-[10px] text-slate-500">{t.branding?.contactPhone || t.owner?.phone || t.owner?.email}</span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            {t.membersCount} Members
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900">{formattedDate}</div>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                t.isDueToday
                                  ? "bg-rose-100 text-rose-700"
                                  : t.isDueThisWeek
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {t.isDueToday ? "DUE TODAY" : t.isDueThisWeek ? "DUE THIS WEEK" : "DUE THIS MONTH"}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-extrabold text-emerald-600">
                            ₹{t.subscriptionFee.toLocaleString("en-IN")} / mo
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => handleDeleteFacility(t.id, t.name)}
                              title="Delete Facility"
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-xl transition-all flex items-center space-x-1 ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Facility</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ----------------------------------------------------
  // STANDARD GYM OWNER / MANAGER DASHBOARD VIEW
  // ----------------------------------------------------
  const activeMembers = stats?.activeMembers ?? 0;
  const monthCollection = stats?.monthCollection ?? 0;
  const pendingBalance = stats?.pendingBalance ?? 0;
  const todayAttendanceCount = stats?.todayAttendance ?? 0;
  const expiringCount = stats?.expiringCount ?? 0;

  const kpis = [
    { label: "Active Members", value: activeMembers.toLocaleString("en-IN"), icon: Users, color: "bg-emerald-50 text-emerald-600" },
    ...(isOwnerOrManager
      ? [
          { label: "Month Collection", value: `₹${monthCollection.toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-indigo-50 text-indigo-600" },
          { label: "Pending Dues", value: `₹${pendingBalance.toLocaleString("en-IN")}`, icon: AlertCircle, color: "bg-rose-50 text-rose-600" },
          { label: "Today Attendance", value: todayAttendanceCount.toLocaleString("en-IN"), icon: CalendarCheck, color: "bg-purple-50 text-purple-600" },
        ]
      : [
          { label: "Today Attendance", value: todayAttendanceCount.toLocaleString("en-IN"), icon: CalendarCheck, color: "bg-purple-50 text-purple-600" },
          { label: "Expiring (Next 7 Days)", value: expiringCount.toLocaleString("en-IN"), icon: Clock, color: "bg-amber-50 text-amber-600" },
        ]),
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gym Operational Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time member activity, collections, and facility performance.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/members"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </Link>
            <Link
              href="/finance?action=record-payment"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment</span>
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500">{kpi.label}</span>
                  <div className={`p-2 rounded-xl ${kpi.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {loading ? <span className="text-xs text-slate-400">Loading...</span> : kpi.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid: Charts & Activity Feeds */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Revenue & Collection Summary</h3>
                <p className="text-xs text-slate-500">Live collections and outstanding pending dues</p>
              </div>
            </div>

            <div className="space-y-5 py-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">Current Month Total Collection</span>
                  <span className="text-blue-600">₹{monthCollection.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-full transition-all" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">Pending Collections Dues</span>
                  <span className={pendingBalance > 0 ? "text-rose-600" : "text-emerald-600"}>
                    ₹{pendingBalance.toLocaleString("en-IN")} {pendingBalance === 0 ? "(All Dues Cleared)" : ""}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pendingBalance > 0 ? "bg-rose-500 w-3/4" : "bg-emerald-500 w-full"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
