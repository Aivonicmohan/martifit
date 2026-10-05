"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  CircleDollarSign,
  Plus,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  X,
  Calendar,
  Filter,
  Search,
  MessageCircle,
  Phone,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Check
} from "lucide-react";
import { authFetch } from "@/lib/apiConfig";
import { RecordPaymentModal } from "@/components/finance/RecordPaymentModal";

export type FinanceFilterType =
  | "ALL"
  | "COLLECTION_TODAY"
  | "COLLECTION_WEEK"
  | "COLLECTION_MONTH"
  | "DUES_TODAY"
  | "DUES_WEEK"
  | "DUES_MONTH"
  | "TOTAL_DUES"
  | "EXPENSES";

export default function FinancePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<FinanceFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payForMemberId, setPayForMemberId] = useState<string | undefined>(undefined);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payRes, memRes, expRes] = await Promise.all([
        authFetch("/api/v1/finance/payments"),
        authFetch("/api/v1/finance/dues"),
        authFetch("/api/v1/finance/expenses"),
      ]);

      if (payRes.ok) {
        const payData = await payRes.json().catch(() => null);
        if (payData?.success) setPayments(payData.payments || []);
      }
      if (memRes.ok) {
        const memData = await memRes.json().catch(() => null);
        if (memData?.success) setMemberships(memData.memberships || []);
      }
      if (expRes.ok) {
        const expData = await expRes.json().catch(() => null);
        if (expData?.success) setExpenses(expData.expenses || []);
      }
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "record-payment") {
        setPayForMemberId(undefined);
        setIsRecordPaymentOpen(true);
      }
    }
  }, []);

  // Time Window Reference Boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
  const weekEnd = todayEnd;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Helper: Get effective collection date (Membership Start Date if available, else Payment/Creation Date)
  const getCollectionDate = (p: any): Date => {
    const dStr = p.membership?.startDate || p.paymentDate || p.createdAt;
    return new Date(dStr);
  };

  // Collection Totals
  const collectionToday = useMemo(() => {
    return payments
      .filter((p) => {
        const d = getCollectionDate(p);
        return d >= todayStart && d <= todayEnd;
      })
      .reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments, todayStart, todayEnd]);

  const collectionWeek = useMemo(() => {
    return payments
      .filter((p) => {
        const d = getCollectionDate(p);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments, weekStart, weekEnd]);

  const collectionMonth = useMemo(() => {
    return payments
      .filter((p) => {
        const d = getCollectionDate(p);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments, monthStart, monthEnd]);

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments]);

  // Dues Totals
  const duesList = useMemo(() => {
    return memberships.filter((m) => (m.pendingAmount || 0) > 0);
  }, [memberships]);

  const duesToday = useMemo(() => {
    return duesList
      .filter((m) => {
        const d = new Date(m.startDate || m.createdAt);
        return d >= todayStart && d <= todayEnd;
      })
      .reduce((acc, m) => acc + (m.pendingAmount || 0), 0);
  }, [duesList, todayStart, todayEnd]);

  const duesWeek = useMemo(() => {
    return duesList
      .filter((m) => {
        const d = new Date(m.startDate || m.createdAt);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((acc, m) => acc + (m.pendingAmount || 0), 0);
  }, [duesList, weekStart, weekEnd]);

  const duesMonth = useMemo(() => {
    return duesList
      .filter((m) => {
        const d = new Date(m.startDate || m.createdAt);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((acc, m) => acc + (m.pendingAmount || 0), 0);
  }, [duesList, monthStart, monthEnd]);

  const totalDues = useMemo(() => {
    return duesList.reduce((acc, m) => acc + (m.pendingAmount || 0), 0);
  }, [duesList]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [expenses]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const cDate = getCollectionDate(p);

      if (activeFilter === "COLLECTION_TODAY" && (cDate < todayStart || cDate > todayEnd)) return false;
      if (activeFilter === "COLLECTION_WEEK" && (cDate < weekStart || cDate > weekEnd)) return false;
      if (activeFilter === "COLLECTION_MONTH" && (cDate < monthStart || cDate > monthEnd)) return false;

      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0, 0, 0, 0);
        if (cDate < fDate) return false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (cDate > tDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const memberName = `${p.member?.firstName || ""} ${p.member?.lastName || ""}`.toLowerCase();
        const memberPhone = (p.member?.phone || "").toLowerCase();
        const invoice = (p.invoiceNumber || "").toLowerCase();
        const code = (p.member?.memberCode || "").toLowerCase();
        return memberName.includes(q) || memberPhone.includes(q) || invoice.includes(q) || code.includes(q);
      }

      return true;
    });
  }, [payments, activeFilter, fromDate, toDate, searchQuery, todayStart, todayEnd, weekStart, weekEnd, monthStart, monthEnd]);

  // Filtered Dues List
  const filteredDues = useMemo(() => {
    return duesList.filter((m) => {
      const mDate = new Date(m.startDate || m.createdAt);

      if (activeFilter === "DUES_TODAY" && (mDate < todayStart || mDate > todayEnd)) return false;
      if (activeFilter === "DUES_WEEK" && (mDate < weekStart || mDate > weekEnd)) return false;
      if (activeFilter === "DUES_MONTH" && (mDate < monthStart || mDate > monthEnd)) return false;

      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0, 0, 0, 0);
        if (mDate < fDate) return false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (mDate > tDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const memberName = `${m.member?.firstName || ""} ${m.member?.lastName || ""}`.toLowerCase();
        const memberPhone = (m.member?.phone || "").toLowerCase();
        const code = (m.member?.memberCode || "").toLowerCase();
        const planName = (m.plan?.name || "").toLowerCase();
        return memberName.includes(q) || memberPhone.includes(q) || code.includes(q) || planName.includes(q);
      }

      return true;
    });
  }, [duesList, activeFilter, fromDate, toDate, searchQuery, todayStart, weekStart, monthStart]);

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const eDate = new Date(e.expenseDate);

      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0, 0, 0, 0);
        if (eDate < fDate) return false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (eDate > tDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (e.title || "").toLowerCase();
        const category = (e.category || "").toLowerCase();
        return title.includes(q) || category.includes(q);
      }

      return true;
    });
  }, [expenses, fromDate, toDate, searchQuery]);

  const isDuesView = activeFilter.startsWith("DUES") || activeFilter === "TOTAL_DUES";
  const isExpensesView = activeFilter === "EXPENSES";

  const currentFilteredAmount = useMemo(() => {
    if (isExpensesView) {
      return filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    }
    if (isDuesView) {
      return filteredDues.reduce((acc, m) => acc + (m.pendingAmount || 0), 0);
    }
    return filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [isExpensesView, isDuesView, filteredExpenses, filteredDues, filteredPayments]);

  const currentFilteredCount = isExpensesView
    ? filteredExpenses.length
    : isDuesView
    ? filteredDues.length
    : filteredPayments.length;

  const filterTitle = useMemo(() => {
    if (fromDate || toDate) {
      const startStr = fromDate ? new Date(fromDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Start";
      const endStr = toDate ? new Date(toDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Now";
      return `Custom Date Range (${startStr} - ${endStr})`;
    }

    switch (activeFilter) {
      case "COLLECTION_TODAY": return "Fee Collections Recorded Today";
      case "COLLECTION_WEEK": return "Fee Collections This Week (Last 7 Days)";
      case "COLLECTION_MONTH": return "Fee Collections This Month";
      case "DUES_TODAY": return "Pending Dues Starting/Due Today";
      case "DUES_WEEK": return "Pending Dues Starting/Due This Week (Last 7 Days)";
      case "DUES_MONTH": return "Pending Dues Starting/Due This Month";
      case "TOTAL_DUES": return "Total Outstanding Member Dues";
      case "EXPENSES": return "Facility Operational Expenses";
      default: return "All Recorded Fee Collections";
    }
  }, [activeFilter, fromDate, toDate]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Financial Ledger & Collections</h1>
            <p className="text-xs text-slate-500 mt-1">Track fee collections, payment methods, receipts, pending dues, and facility expenses.</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setPayForMemberId(undefined);
                setIsRecordPaymentOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>

        {/* Interactive Collections & Dues Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Fee Collections Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Fee Collections</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">₹{totalCollected.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Total collected across all time</p>
            </div>
            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => { setActiveFilter("COLLECTION_TODAY"); setFromDate(""); setToDate(""); }}
                className={`p-1.5 rounded-lg text-center font-bold transition-all ${
                  activeFilter === "COLLECTION_TODAY" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <div>Today</div>
                <div>₹{collectionToday.toLocaleString("en-IN")}</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveFilter("COLLECTION_WEEK"); setFromDate(""); setToDate(""); }}
                className={`p-1.5 rounded-lg text-center font-bold transition-all ${
                  activeFilter === "COLLECTION_WEEK" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <div>This Week</div>
                <div>₹{collectionWeek.toLocaleString("en-IN")}</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveFilter("COLLECTION_MONTH"); setFromDate(""); setToDate(""); }}
                className={`p-1.5 rounded-lg text-center font-bold transition-all ${
                  activeFilter === "COLLECTION_MONTH" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <div>This Month</div>
                <div>₹{collectionMonth.toLocaleString("en-IN")}</div>
              </button>
            </div>
          </div>

          {/* Card 2: Pending Dues Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Outstanding Dues</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-rose-600">₹{totalDues.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{duesList.length} members with pending balance</p>
            </div>
            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => { setActiveFilter("DUES_TODAY"); setFromDate(""); setToDate(""); }}
                className={`p-1.5 rounded-lg text-center font-bold transition-all ${
                  activeFilter === "DUES_TODAY" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                <div>Today</div>
                <div>₹{duesToday.toLocaleString("en-IN")}</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveFilter("DUES_WEEK"); setFromDate(""); setToDate(""); }}
                className={`p-1.5 rounded-lg text-center font-bold transition-all ${
                  activeFilter === "DUES_WEEK" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                <div>This Week</div>
                <div>₹{duesWeek.toLocaleString("en-IN")}</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveFilter("DUES_MONTH"); setFromDate(""); setToDate(""); }}
                className={`p-1.5 rounded-lg text-center font-bold transition-all ${
                  activeFilter === "DUES_MONTH" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                <div>This Month</div>
                <div>₹{duesMonth.toLocaleString("en-IN")}</div>
              </button>
            </div>
          </div>

          {/* Card 3: Total Expenses */}
          <div
            onClick={() => { setActiveFilter("EXPENSES"); setFromDate(""); setToDate(""); }}
            className={`bg-white p-5 rounded-2xl border shadow-sm cursor-pointer transition-all flex flex-col justify-between ${
              activeFilter === "EXPENSES" ? "border-rose-400 ring-2 ring-rose-400 bg-rose-50/20" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Expenses</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">₹{totalExpenses.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-slate-400 mt-1">{expenses.length} operational expenses recorded</p>
            </div>
            <div className="pt-2 text-[10px] font-bold text-amber-700 flex items-center justify-between">
              <span>Click to view expenses</span>
              <span>→</span>
            </div>
          </div>

          {/* Card 4: Net Operating Profit */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Net Operating Profit</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <CircleDollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-blue-700">₹{(totalCollected - totalExpenses).toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-slate-400 mt-1">Total Collections minus Expenses</p>
            </div>
            <div className="pt-2 text-[10px] font-semibold text-emerald-600">
              Verified Financial Health
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Date Range Controls */}
        <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search member, phone, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Custom Date Range Filter */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <span className="text-[11px] font-bold text-slate-600 shrink-0">Dates:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                title="Start Date"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                title="End Date"
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => { setFromDate(""); setToDate(""); }}
                  className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-bold rounded-lg transition-colors"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter View:</span>

            <button
              type="button"
              onClick={() => { setActiveFilter("ALL"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                activeFilter === "ALL" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Fee Payments ({payments.length})
            </button>

            {/* Collections Pill Group */}
            <button
              type="button"
              onClick={() => { setActiveFilter("COLLECTION_TODAY"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "COLLECTION_TODAY" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <span>Collection Today</span>
              <span className="bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{collectionToday.toLocaleString("en-IN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter("COLLECTION_WEEK"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "COLLECTION_WEEK" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <span>Collection This Week</span>
              <span className="bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{collectionWeek.toLocaleString("en-IN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter("COLLECTION_MONTH"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "COLLECTION_MONTH" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <span>Collection This Month</span>
              <span className="bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{collectionMonth.toLocaleString("en-IN")}
              </span>
            </button>

            {/* Dues Pill Group */}
            <button
              type="button"
              onClick={() => { setActiveFilter("DUES_TODAY"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "DUES_TODAY" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <span>Dues Today</span>
              <span className="bg-rose-200/80 text-rose-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{duesToday.toLocaleString("en-IN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter("DUES_WEEK"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "DUES_WEEK" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <span>Dues This Week</span>
              <span className="bg-rose-200/80 text-rose-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{duesWeek.toLocaleString("en-IN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter("DUES_MONTH"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "DUES_MONTH" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <span>Dues This Month</span>
              <span className="bg-rose-200/80 text-rose-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{duesMonth.toLocaleString("en-IN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter("TOTAL_DUES"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 ${
                activeFilter === "TOTAL_DUES" ? "bg-rose-700 text-white shadow-xs" : "bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300"
              }`}
            >
              <span>Total Dues</span>
              <span className="bg-rose-300 text-rose-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                ₹{totalDues.toLocaleString("en-IN")} ({duesList.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveFilter("EXPENSES"); setFromDate(""); setToDate(""); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                activeFilter === "EXPENSES" ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              Expenses ({expenses.length})
            </button>
          </div>
        </div>

        {/* Dynamic Filter Summary Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${isDuesView ? "bg-rose-500/20 text-rose-400" : isExpensesView ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{filterTitle}</h3>
              <p className="text-xs text-slate-400">
                Displaying {currentFilteredCount} {isDuesView ? "member due records" : isExpensesView ? "expense records" : "fee payment records"} matching filter criteria
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <span className="text-xs text-slate-300 font-semibold">Filtered Total:</span>
            <span className={`text-base font-extrabold ${isDuesView ? "text-rose-400" : isExpensesView ? "text-amber-400" : "text-emerald-400"}`}>
              ₹{currentFilteredAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
              Loading financial records...
            </div>
          ) : isDuesView ? (
            /* Pending Dues Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Plan Name & Dates</th>
                    <th className="py-3 px-4">Net Package</th>
                    <th className="py-3 px-4">Paid Amount</th>
                    <th className="py-3 px-4">Pending Due</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No pending member dues found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDues.map((m) => {
                      const memberName = `${m.member?.firstName || "Member"} ${m.member?.lastName || ""}`.trim();
                      const phone = m.member?.phone || "";

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{memberName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {m.member?.memberCode || "N/A"}</div>
                          </td>

                          <td className="py-3 px-4 text-[11px]">
                            <div className="font-bold text-blue-700">{m.plan?.name || "Membership Plan"}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>
                                {m.startDate ? new Date(m.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "N/A"} -{" "}
                                {m.endDate ? new Date(m.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-800">
                            ₹{(m.totalAmount || 0).toLocaleString("en-IN")}
                          </td>

                          <td className="py-3 px-4 text-emerald-600 font-semibold">
                            ₹{(m.paidAmount || 0).toLocaleString("en-IN")}
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              ₹{(m.pendingAmount || 0).toLocaleString("en-IN")} Due
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-800 text-[11px]">{phone}</span>
                              {phone && (
                                <>
                                  <a
                                    href={`https://wa.me/91${phone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Send WhatsApp Message"
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                  <a href={`tel:${phone}`} title="Call Member" className="p-1 text-blue-600 hover:bg-blue-50 rounded-md">
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setPayForMemberId(m.memberId || m.member?.id);
                                setIsRecordPaymentOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all inline-flex items-center space-x-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Collect Dues</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : isExpensesView ? (
            /* Expenses Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        No operational expenses found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{e.title}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-600">₹{(e.amount || 0).toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-slate-600">{e.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(e.expenseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Fee Payments Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Start / Collection Date</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        No fee payments found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const collDate = getCollectionDate(p);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">{p.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-800">
                            <div className="font-bold text-slate-900">{p.member?.firstName} {p.member?.lastName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {p.member?.memberCode || "N/A"} &bull; {p.member?.phone}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700">₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div className="font-semibold text-slate-900">
                              {collDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.membership?.startDate ? "Plan Start Date" : "Payment Entry Date"}
                            </div>
                          </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-1 ml-auto font-semibold"
                          >
                            <Printer className="w-4 h-4" />
                            <span>View Receipt</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Official Payment Receipt</h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border p-4 rounded-xl space-y-4 text-xs bg-slate-50">
              <div className="text-center pb-3 border-b">
                <h4 className="text-base font-bold text-slate-900">Cross Road Fitness</h4>
                <p className="text-[10px] text-slate-500">Main Road, Hyderabad | Ph: 9059059751</p>
                <p className="text-[10px] font-mono text-slate-600 mt-1">Receipt #{selectedReceipt.invoiceNumber}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member Name:</span>
                  <span className="font-semibold">{selectedReceipt.member?.firstName} {selectedReceipt.member?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Date:</span>
                  <span>{new Date(selectedReceipt.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-medium">{selectedReceipt.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Amount Paid:</span>
                <span>₹{(selectedReceipt.amount || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        initialMemberId={payForMemberId}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPayForMemberId(undefined);
        }}
        onSuccess={() => loadData()}
      />
    </AppLayout>
  );
}
