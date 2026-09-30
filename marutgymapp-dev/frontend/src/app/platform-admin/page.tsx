"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import StickerGenerator from "@/components/admin/StickerGenerator";
import {
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Users,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  QrCode,
  Link as LinkIcon,
  Save,
} from "lucide-react";
import { authFetch, getApiUrl } from "@/lib/apiConfig";

export default function PlatformAdminPage() {
  const [activeTab, setActiveTab] = useState<"PENDING" | "ALL" | "FRANCHISE" | "AFFILIATES" | "STICKERS" | "TRASH">("PENDING");
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [trashList, setTrashList] = useState<any[]>([]);
  const [franchiseApps, setFranchiseApps] = useState<any[]>([]);
  const [affiliatesList, setAffiliatesList] = useState<any[]>([]);
  const [franchiseTargetUrl, setFranchiseTargetUrl] = useState("");
  const [isSavingSetting, setIsSavingSetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Gym Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    gymName: "",
    location: "",
    contactPhone: "",
    contactEmail: "",
    ownerName: "",
    password: "",
  });

  // Create Affiliate Modal State
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [affiliateForm, setAffiliateForm] = useState({
    name: "",
    phone: "",
    profession: "",
    location: "",
    code: "",
    notes: ""
  });

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/tenants/pending");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setPendingList(data.pending || []);
        }
      }
    } catch (err) {
      console.error("Error loading pending facilities:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTenants = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/tenants/all");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setAllTenants(data.tenants || []);
        }
      }
    } catch (err) {
      console.error("Error loading all facilities:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrash = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/tenants/trash");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setTrashList(data.trash || []);
        }
      }
    } catch (err) {
      console.error("Error loading trash facilities:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFranchiseApps = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/tenants/franchise-applications");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setFranchiseApps(data.applications || []);
        }
      }
    } catch (err) {
      console.error("Error loading franchise apps:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/tenants/affiliate-partners");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setAffiliatesList(data.affiliates || []);
        }
      }
    } catch (err) {
      console.error("Error loading affiliates:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFranchiseTargetUrl = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/public/system-settings/franchise_target_url"));
      const data = await res.json().catch(() => null);
      if (data?.success && data?.value) {
        setFranchiseTargetUrl(data.value);
      }
    } catch (err) {
      console.error("Error loading franchise target URL:", err);
    }
  };

  const handleSaveFranchiseTargetUrl = async () => {
    setIsSavingSetting(true);
    try {
      const res = await authFetch("/api/v1/tenants/system-settings/franchise_target_url", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: franchiseTargetUrl.trim(), description: "Franchise Target URL Redirect" })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert("Franchise Target URL updated successfully!");
      } else {
        alert(data?.error || "Failed to update setting");
      }
    } catch (err) {
      alert("Error updating setting");
    } finally {
      setIsSavingSetting(false);
    }
  };

  useEffect(() => {
    loadFranchiseTargetUrl();
  }, []);

  useEffect(() => {
    if (activeTab === "PENDING") {
      loadPending();
    } else if (activeTab === "ALL") {
      loadAllTenants();
    } else if (activeTab === "FRANCHISE") {
      loadFranchiseApps();
    } else if (activeTab === "AFFILIATES") {
      loadAffiliates();
    } else if (activeTab === "TRASH") {
      loadTrash();
    }
  }, [activeTab]);

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Approve and activate gym facility "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/tenants/${id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Facility approved successfully!");
        loadPending();
        if (activeTab === "ALL") loadAllTenants();
      } else {
        alert(data?.error || "Failed to approve facility.");
      }
    } catch (err) {
      alert("Error approving facility.");
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Reject facility registration request for "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/tenants/${id}/reject`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Facility registration rejected.");
        loadPending();
        if (activeTab === "ALL") loadAllTenants();
      } else {
        alert(data?.error || "Failed to reject facility.");
      }
    } catch (err) {
      alert("Error rejecting facility.");
    }
  };

  // Move to Trash (Soft Delete)
  const handleMoveToTrash = async (id: string, name: string) => {
    if (!confirm(`Move gym facility "${name}" to Trash?\n\nIt can be restored anytime from the Trash tab.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/v1/tenants/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Facility moved to Trash successfully!");
        loadAllTenants();
        loadPending();
        loadTrash();
      } else {
        alert(data?.error || "Failed to move facility to trash.");
      }
    } catch (err) {
      alert("Error moving facility to trash.");
    }
  };

  // Restore Facility from Trash
  const handleRestoreFacility = async (id: string, name: string) => {
    if (!confirm(`Restore gym facility "${name}" to Active status?`)) return;
    try {
      const res = await authFetch(`/api/v1/tenants/${id}/restore`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Gym facility restored successfully!");
        loadTrash();
        loadAllTenants();
      } else {
        alert(data?.error || "Failed to restore facility.");
      }
    } catch (err) {
      alert("Error restoring facility.");
    }
  };

  // Permanently Delete Facility
  const handlePermanentDelete = async (id: string, name: string) => {
    if (!confirm(`PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY DELETE "${name}"?\nThis will erase all database records for this facility. This action CANNOT BE UNDONE.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/v1/tenants/${id}/permanent`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Facility permanently deleted!");
        loadTrash();
      } else {
        alert(data?.error || "Failed to permanently delete facility.");
      }
    } catch (err) {
      alert("Error deleting facility permanently.");
    }
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/v1/tenants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Gym Facility created successfully!");
        setIsModalOpen(false);
        setCreateForm({
          gymName: "",
          location: "",
          contactPhone: "",
          contactEmail: "",
          ownerName: "",
          password: "",
        });
        loadAllTenants();
        loadPending();
      } else {
        alert(data?.error || "Failed to create gym facility.");
      }
    } catch (err) {
      alert("Error creating gym facility.");
    }
  };

  const handleCreateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/v1/tenants/affiliate-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(affiliateForm)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(`Affiliate Partner created successfully! Code: ${data.partner.code}`);
        setIsAffiliateModalOpen(false);
        setAffiliateForm({ name: "", phone: "", profession: "", location: "", code: "", notes: "" });
        loadAffiliates();
      } else {
        alert(data?.error || "Failed to create affiliate partner.");
      }
    } catch (err) {
      alert("Error creating affiliate partner.");
    }
  };

  const handleDeleteAffiliate = async (id: string, name: string) => {
    if (!confirm(`Delete affiliate partner "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/tenants/affiliate-partners/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadAffiliates();
      }
    } catch (err) {
      alert("Error deleting affiliate.");
    }
  };

  const handleUpdateFranchiseStatus = async (id: string, newStatus: string) => {
    try {
      const res = await authFetch(`/api/v1/tenants/franchise-applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        loadFranchiseApps();
      }
    } catch (err) {
      alert("Error updating application status.");
    }
  };

  const filteredAllTenants = allTenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.branding?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrashTenants = trashList.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.branding?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Control Center Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full text-amber-300 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Super Admin Control Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Gym Facilities & Trash Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Review self-service gym requests, approve new facilities, manage active locations, and restore or clear facilities from Trash.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add New Gym</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "PENDING"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Approvals ({pendingList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "ALL"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>All Active Facilities ({allTenants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("FRANCHISE")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "FRANCHISE"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Franchise Leads ({franchiseApps.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("AFFILIATES")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "AFFILIATES"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Affiliate Partners ({affiliatesList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("STICKERS")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "STICKERS"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-blue-500" />
              <span>Printable QR Stickers</span>
            </button>

            <button
              onClick={() => setActiveTab("TRASH")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "TRASH"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Trash Bin ({trashList.length})</span>
            </button>
          </div>

          {activeTab !== "PENDING" && (
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search facility name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* TAB 1: PENDING APPROVALS QUEUE */}
        {activeTab === "PENDING" && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading pending gym registrations...
              </div>
            ) : pendingList.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Pending Registration Requests</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All self-service facility signups have been reviewed and approved.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pendingList.map((t) => {
                  const owner = t.users?.[0];
                  return (
                    <div
                      key={t.id}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 font-bold flex items-center justify-center text-lg border border-amber-500/20">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">{t.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 inline-block">
                                  Pending Owner & Admin Approval
                                </span>
                                {t.businessCode && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                                    Code: {t.businessCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          {t.branding?.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800">{t.branding.address}</span>
                            </div>
                          )}
                          {owner && (
                            <div className="flex items-center space-x-2">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Owner: <strong className="text-slate-900">{owner.name}</strong></span>
                            </div>
                          )}
                          {t.branding?.contactPhone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800">{t.branding.contactPhone}</span>
                            </div>
                          )}
                          {t.branding?.contactEmail && (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800">{t.branding.contactEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleReject(t.id, t.name)}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(t.id, t.name)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
                        >
                          Approve Gym
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL REGISTERED ACTIVE FACILITIES */}
        {activeTab === "ALL" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>All Active Gym Facilities</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                {filteredAllTenants.length} Gyms
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading facility directory...
              </div>
            ) : filteredAllTenants.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                No active facility records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-4 px-5">Gym Name</th>
                      <th className="py-4 px-5">Facility Code</th>
                      <th className="py-4 px-5">Location</th>
                      <th className="py-4 px-5">Owner / Contact</th>
                      <th className="py-4 px-5">Members</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllTenants.map((t) => {
                      const owner = t.users?.[0];
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{t.slug}</span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold rounded-lg text-xs">
                              {t.businessCode ? `Code: ${t.businessCode}` : "N/A"}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-700">
                            {t.branding?.address || "N/A"}
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-800">{owner?.name || "N/A"}</div>
                            <span className="text-[10px] text-slate-500">{t.branding?.contactPhone || owner?.email}</span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            {t._count?.members || 0} Members
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                t.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                  : t.status === "PENDING_APPROVAL"
                                  ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {t.status === "PENDING_APPROVAL" && (
                                <button
                                  onClick={() => handleApprove(t.id, t.name)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-xl"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleMoveToTrash(t.id, t.name)}
                                title="Move to Trash"
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-xl transition-all flex items-center space-x-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Move to Trash</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: FRANCHISE APPLICATIONS */}
        {activeTab === "FRANCHISE" && (
          <div className="space-y-6">
            
            {/* Dynamic Franchise Redirect URL Configuration */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold flex items-center gap-2 text-white">
                    <LinkIcon className="w-4 h-4 text-blue-400" />
                    Dynamic Franchise QR Code Target URL
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target destination URL for all printed Franchise QR codes (`/franchise/details`). Update anytime without re-printing physical stickers.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="url"
                    placeholder="e.g. https://aivonic.com/franchise-details (or leave empty for default /franchise)"
                    value={franchiseTargetUrl}
                    onChange={(e) => setFranchiseTargetUrl(e.target.value)}
                    className="flex-1 md:w-96 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveFranchiseTargetUrl}
                    disabled={isSavingSetting}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shrink-0 shadow-lg shadow-blue-600/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSetting ? "Saving..." : "Save Link"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Franchise Partner Applications ({franchiseApps.length})</span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Loading franchise applications...
                </div>
              ) : franchiseApps.length === 0 ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400">
                  No franchise partner applications received yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-4 px-5">Applicant Name</th>
                        <th className="py-4 px-5">Contact Details</th>
                        <th className="py-4 px-5">Desired City</th>
                        <th className="py-4 px-5">Budget Capacity</th>
                        <th className="py-4 px-5">Referred By</th>
                        <th className="py-4 px-5">Status</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {franchiseApps.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{app.name}</div>
                            {app.profession && <span className="text-[10px] text-slate-500">{app.profession}</span>}
                          </td>
                          <td className="py-4 px-5 font-medium text-slate-700">
                            <div>📞 {app.phone}</div>
                            {app.email && <div className="text-[10px] text-slate-500">📧 {app.email}</div>}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            {app.location}
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-700">
                            {app.investmentBudget || "N/A"}
                          </td>
                          <td className="py-4 px-5">
                            {app.referredByCode ? (
                              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded-lg text-[11px]">
                                {app.referrerName || app.affiliate?.name || app.referredByCode} (Code: {app.referredByCode})
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Direct Lead</span>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateFranchiseStatus(app.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                            >
                              <option value="NEW">NEW</option>
                              <option value="CONTACTED">CONTACTED</option>
                              <option value="IN_DISCUSSION">IN DISCUSSION</option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                          </td>
                          <td className="py-4 px-5 text-right font-mono text-[10px] text-slate-400">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PRINTABLE STICKERS GENERATOR */}
        {activeTab === "STICKERS" && (
          <StickerGenerator />
        )}

        {/* TAB: AFFILIATE PARTNERS */}
        {activeTab === "AFFILIATES" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Affiliate Marketing Partners ({affiliatesList.length})</span>
              </div>
              <button
                onClick={() => setIsAffiliateModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Affiliate Code</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading affiliate partners...
              </div>
            ) : affiliatesList.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 space-y-3">
                <p>No external affiliate partners registered yet.</p>
                <p className="text-[11px] text-slate-500">Note: All active gym facilities automatically use their 4-digit Business Code as their affiliate referral code!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-4 px-5">Affiliate Code</th>
                      <th className="py-4 px-5">Affiliate Name</th>
                      <th className="py-4 px-5">Contact Details</th>
                      <th className="py-4 px-5">Profession / City</th>
                      <th className="py-4 px-5">Referred Leads</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {affiliatesList.map((aff) => (
                      <tr key={aff.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-extrabold rounded-xl text-xs">
                            {aff.code}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-900 text-sm">
                          {aff.name}
                        </td>
                        <td className="py-4 px-5 text-slate-700">
                          📞 {aff.phone}
                        </td>
                        <td className="py-4 px-5 font-medium text-slate-700">
                          <div>{aff.profession || "Independent Partner"}</div>
                          {aff.location && <div className="text-[10px] text-slate-500">{aff.location}</div>}
                        </td>
                        <td className="py-4 px-5 font-extrabold text-blue-600">
                          {aff._count?.applications || 0} Leads
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/franchise?ref=${aff.code}`;
                                navigator.clipboard.writeText(url);
                                alert(`Copied Referral Link to Clipboard:\n${url}`);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition"
                            >
                              Copy Link
                            </button>
                            <button
                              onClick={() => handleDeleteAffiliate(aff.id, aff.name)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-xl transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRASH BIN QUEUE */}
        {activeTab === "TRASH" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Trash Bin - Deleted Gym Facilities</span>
              </div>
              <span className="text-xs font-semibold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
                {filteredTrashTenants.length} In Trash
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading trash directory...
              </div>
            ) : filteredTrashTenants.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p>Trash is empty! No deleted gym facilities.</p>
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
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrashTenants.map((t) => {
                      const owner = t.users?.[0];
                      return (
                        <tr key={t.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{t.slug}</span>
                          </td>
                          <td className="py-4 px-5 font-semibold text-slate-700">
                            {t.branding?.address || "N/A"}
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-800">{owner?.name || "N/A"}</div>
                            <span className="text-[10px] text-slate-500">{t.branding?.contactPhone || owner?.email}</span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            {t._count?.members || 0} Members
                          </td>
                          <td className="py-4 px-5">
                            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              DELETED (IN TRASH)
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleRestoreFacility(t.id, t.name)}
                                title="Restore Gym Facility"
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-xl transition-all flex items-center space-x-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore Gym</span>
                              </button>

                              <button
                                onClick={() => handlePermanentDelete(t.id, t.name)}
                                title="Permanently Delete"
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl transition-all flex items-center space-x-1 shadow-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Permanently</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL: CREATE NEW GYM FACILITY */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add New Gym Facility</h3>
                  <p className="text-xs text-slate-500">Create and instantly activate a new gym location.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGym} className="space-y-4 text-xs">
                {/* Gym Name & Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gym Facility Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron Fitness Center"
                    value={createForm.gymName}
                    onChange={(e) => setCreateForm({ ...createForm, gymName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gym Location / Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plot 45, Gachibowli, Hyderabad"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* Contact Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={createForm.contactPhone}
                      onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. owner@ironfitness.com"
                      value={createForm.contactEmail}
                      onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Owner Name & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Varma"
                      value={createForm.ownerName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-md"
                  >
                    Create Gym Facility
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CREATE AFFILIATE PARTNER */}
        {isAffiliateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create Affiliate Marketing Code</h3>
                  <p className="text-xs text-slate-500">Register an external partner or influencer for franchise referrals.</p>
                </div>
                <button
                  onClick={() => setIsAffiliateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAffiliate} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Affiliate Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={affiliateForm.name}
                      onChange={(e) => setAffiliateForm({ ...affiliateForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={affiliateForm.phone}
                      onChange={(e) => setAffiliateForm({ ...affiliateForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Profession / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Fitness Consultant, Vendor"
                      value={affiliateForm.profession}
                      onChange={(e) => setAffiliateForm({ ...affiliateForm, profession: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location / City</label>
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad"
                      value={affiliateForm.location}
                      onChange={(e) => setAffiliateForm({ ...affiliateForm, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Affiliate Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave blank for auto-generated 4-digit code (e.g. 8001)"
                    value={affiliateForm.code}
                    onChange={(e) => setAffiliateForm({ ...affiliateForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono uppercase focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">If blank, the next available 4-digit numeric code (e.g. 8001) will be assigned.</p>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAffiliateModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md"
                  >
                    Create Affiliate Partner
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
