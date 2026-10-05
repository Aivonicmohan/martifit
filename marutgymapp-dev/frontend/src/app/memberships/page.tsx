"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, CheckCircle2, ShieldAlert, X, Edit2, Trash2, Clock } from "lucide-react";
import { getApiUrl, authFetch } from "@/lib/apiConfig";
import { safeSetLocalStorage } from "@/lib/storage";

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState<"PLANS" | "BATCHES">("PLANS");
  const [plans, setPlans] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_plans");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    return [];
  });
  const [memberships, setMemberships] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    durationMonths: "1",
    price: "",
    joiningFee: "0",
    isActive: true,
  });

  const [batchForm, setBatchForm] = useState({
    name: "",
    startTime: "06:00 AM",
    endTime: "10:00 AM",
    description: "",
  });

  const loadData = async () => {
    try {
      const [memRes, batchRes] = await Promise.all([
        authFetch("/api/v1/memberships"),
        authFetch("/api/v1/batches"),
      ]);

      if (memRes.ok) {
        const memData = await memRes.json().catch(() => null);
        if (memData?.success) {
          setPlans(memData.plans || []);
          setMemberships(memData.memberships || []);
          if (typeof window !== "undefined") {
            safeSetLocalStorage("cached_plans", JSON.stringify(memData.plans || []));
            localStorage.removeItem("cached_memberships");
          }
        }
      }

      if (batchRes.ok) {
        const batchData = await batchRes.json().catch(() => null);
        if (batchData?.success) {
          setBatches(batchData.batches || []);
        }
      }
    } catch (err) {
      console.error("Error loading membership data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateBatchModal = () => {
    setEditingBatchId(null);
    setBatchForm({ name: "", startTime: "06:00 AM", endTime: "10:00 AM", description: "" });
    setIsBatchModalOpen(true);
  };

  const openEditBatchModal = (b: any) => {
    setEditingBatchId(b.id);
    setBatchForm({
      name: b.name || "",
      startTime: b.startTime || "06:00 AM",
      endTime: b.endTime || "10:00 AM",
      description: b.description || "",
    });
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingBatchId);
      const path = isEdit ? `/api/v1/batches/${editingBatchId}` : "/api/v1/batches";
      const method = isEdit ? "PUT" : "POST";

      const res = await authFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchForm),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setIsBatchModalOpen(false);
        setEditingBatchId(null);
        setBatchForm({ name: "", startTime: "06:00 AM", endTime: "10:00 AM", description: "" });
        loadData();
      } else {
        alert(data?.error || "Failed to save batch.");
      }
    } catch (err) {
      alert("Error saving batch. Please try again.");
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`Are you sure you want to delete batch "${batchName}"?`)) return;

    try {
      const res = await authFetch(`/api/v1/batches/${batchId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert("Batch deleted successfully.");
        loadData();
      } else {
        alert(data?.error || "Failed to delete batch.");
      }
    } catch (err) {
      alert("Error deleting batch.");
    }
  };

  const openCreateModal = () => {
    setEditingPlanId(null);
    setPlanForm({ name: "", description: "", durationMonths: "1", price: "", joiningFee: "0", isActive: true });
    setIsPlanModalOpen(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      durationMonths: String(plan.durationMonths || 1),
      price: String(plan.price || 0),
      joiningFee: String(plan.joiningFee || 0),
      isActive: plan.isActive !== false,
    });
    setIsPlanModalOpen(true);
  };

  const togglePlanStatus = async (plan: any) => {
    try {
      const newStatus = plan.isActive === false;
      const res = await authFetch(`/api/v1/memberships/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        loadData();
      } else {
        alert(data?.error || "Failed to update plan status.");
      }
    } catch (err) {
      alert("Error updating plan status.");
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingPlanId);
      const path = isEdit ? `/api/v1/memberships/${editingPlanId}` : "/api/v1/memberships";
      const method = isEdit ? "PUT" : "POST";

      const res = await authFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setIsPlanModalOpen(false);
        setEditingPlanId(null);
        setPlanForm({ name: "", description: "", durationMonths: "1", price: "", joiningFee: "0", isActive: true });
        
        if (data.plan) {
          setPlans((prev) => {
            const next = isEdit
              ? prev.map((p) => (p.id === data.plan.id ? data.plan : p))
              : [...prev, data.plan];
            if (typeof window !== "undefined") {
              safeSetLocalStorage("cached_plans", JSON.stringify(next));
            }
            return next;
          });
        }
        loadData();
      } else if (res.status === 401) {
        alert("Session expired or unauthenticated. Redirecting to login...");
        window.location.href = "/login";
      } else {
        alert(data?.error || "Failed to save membership plan.");
      }
    } catch (err) {
      alert("Error saving plan. Please try again.");
    }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!confirm(`Are you sure you want to delete or deactivate the plan "${planName}"?`)) return;

    try {
      const res = await authFetch(`/api/v1/memberships/${planId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Plan deleted successfully.");
        setPlans((prev) => {
          const next = prev.filter((p) => p.id !== planId);
          if (typeof window !== "undefined") {
            safeSetLocalStorage("cached_plans", JSON.stringify(next));
          }
          return next;
        });
        loadData();
      } else if (res.status === 401) {
        alert("Session expired or unauthenticated. Redirecting to login...");
        window.location.href = "/login";
      } else {
        alert(data?.error || "Failed to delete membership plan.");
      }
    } catch (err) {
      alert("Error deleting plan. Please try again.");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Membership Plans & Gym Batches</h1>
            <p className="text-xs text-slate-500 mt-1">Manage facility packages, duration tiers, freeze policies, and batch timings.</p>
          </div>
          <div className="flex items-center space-x-2">
            {activeTab === "PLANS" ? (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Plan</span>
              </button>
            ) : (
              <button
                onClick={openCreateBatchModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Gym Batch</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("PLANS")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "PLANS" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Membership Packages ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab("BATCHES")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "BATCHES" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Gym Timing Batches ({batches.length})
          </button>
        </div>

        {/* PLANS TAB CONTENT */}
        {activeTab === "PLANS" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-xl -mr-6 -mt-6" />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {p.durationMonths} Month{p.durationMonths > 1 ? "s" : ""} Package
                      </span>
                      <div className="flex items-center space-x-1 relative z-10">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Plan"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id, p.name)}
                          title="Delete Plan"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => togglePlanStatus(p)}
                          title={p.isActive !== false ? "Deactivate Plan" : "Activate Plan"}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                            p.isActive !== false
                              ? "bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800"
                              : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-800"
                          }`}
                        >
                          {p.isActive !== false ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-3">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{p.description || "Standard gym membership plan."}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Pricing</span>
                      <span className="text-xl font-extrabold text-slate-900">₹{p.price}</span>
                    </div>
                    {p.joiningFee > 0 && (
                      <span className="text-[11px] text-slate-500 font-medium">+ ₹{p.joiningFee} joining fee</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subscriptions Table */}
            {(() => {
              const activeSubscriptions = memberships.filter((m) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = m.endDate ? new Date(m.endDate) : null;
                const isExpired = m.status === "EXPIRED" || (endDate && endDate < today);
                return !isExpired;
              });

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-800">
                    Active Member Subscriptions ({activeSubscriptions.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4">Plan Name</th>
                          <th className="py-3 px-4">Start Date</th>
                          <th className="py-3 px-4">End Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Pending Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeSubscriptions.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {m.member ? `${m.member.firstName} ${m.member.lastName || ""}` : "N/A"}
                            </td>
                            <td className="py-3 px-4 text-blue-600 font-semibold">{m.plan ? m.plan.name : "N/A"}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {m.startDate ? new Date(m.startDate).toLocaleDateString("en-IN") : "N/A"}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {m.endDate ? new Date(m.endDate).toLocaleDateString("en-IN") : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                {m.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              {m.pendingAmount > 0 ? (
                                <span className="text-rose-600 font-bold">₹{m.pendingAmount}</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">Paid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {activeSubscriptions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                              No active member subscriptions found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* BATCHES TAB CONTENT */}
        {activeTab === "BATCHES" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {batches.map((b) => (
                <div key={b.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl -mr-6 -mt-6" />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : "Flexible Timing"}
                      </span>
                      <div className="flex items-center space-x-1 relative z-10">
                        <button
                          onClick={() => openEditBatchModal(b)}
                          title="Edit Batch"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(b.id, b.name)}
                          title="Delete Batch"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-3">{b.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{b.description || "Active facility training batch."}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Timing Range</span>
                      <span className="text-xs font-bold text-slate-800">
                        ⏱️ {b.startTime || "N/A"} → {b.endTime || "N/A"}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>
              ))}

              {batches.length === 0 && (
                <div className="col-span-3 bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No Custom Gym Batches Created Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Create custom batches like Morning Batch, Evening Batch, or Ladies Batch to let admins choose timing options during member registration.
                  </p>
                  <button
                    onClick={openCreateBatchModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm inline-flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Batch</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Plan Creation / Edit Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlanId ? "Edit Membership Plan" : "Create Membership Plan"}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly Cardio & Strength"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    required
                    value={planForm.durationMonths}
                    onChange={(e) => setPlanForm({ ...planForm, durationMonths: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2000"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Joining Fee (₹)</label>
                  <input
                    type="number"
                    value={planForm.joiningFee}
                    onChange={(e) => setPlanForm({ ...planForm, joiningFee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Plan Status</label>
                  <select
                    value={planForm.isActive ? "active" : "inactive"}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.value === "active" })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="active">Active Plan</option>
                    <option value="inactive">Inactive Plan</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl shadow-sm">
                  {editingPlanId ? "Update Plan" : "Save Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Creation / Edit Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingBatchId ? "Edit Gym Batch" : "Create Gym Batch"}
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Batch, Evening Batch, Ladies Batch"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 AM"
                    value={batchForm.startTime}
                    onChange={(e) => setBatchForm({ ...batchForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={batchForm.endTime}
                    onChange={(e) => setBatchForm({ ...batchForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Batch description or target group details..."
                  value={batchForm.description}
                  onChange={(e) => setBatchForm({ ...batchForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm">
                  {editingBatchId ? "Update Batch" : "Save Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
