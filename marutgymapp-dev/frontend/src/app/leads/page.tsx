"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { authFetch } from "@/lib/apiConfig";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  UserCheck,
  Plus,
  Search,
  PhoneCall,
  Calendar,
  QrCode,
  Printer,
  Copy,
  CheckCircle2,
  Share2,
  Filter,
  MessageCircle,
  Phone,
  User,
  ArrowRight,
  Sparkles,
  Clock,
  FileText,
  UserPlus,
  Trash2,
  X,
  ExternalLink,
  Dumbbell,
  Check,
} from "lucide-react";

export default function LeadsPage() {
  const { branding } = useTheme();

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    newCount: 0,
    followUpCount: 0,
    prospectCount: 0,
    wonCount: 0,
    lostCount: 0,
  });

  const [plans, setPlans] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isPrintPosterOpen, setIsPrintPosterOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Add / Edit Lead Form State
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "WALK_IN",
    interestedPlanId: "",
    assignedStaffId: "",
    followUpDate: "",
    status: "NEW",
    notes: "",
  });

  // Facility Info
  const [gymSlug, setGymSlug] = useState("");
  const [userTenantId, setUserTenantId] = useState("");

  const fetchLeads = (statusFilter = activeTab, search = searchQuery) => {
    setLoading(true);
    let url = `/api/v1/leads?status=${statusFilter}&search=${encodeURIComponent(search)}`;
    authFetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLeads(data.leads || []);
          if (data.stats) setStats(data.stats);
        }
      })
      .catch((err) => console.error("Failed to fetch leads:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads(activeTab, searchQuery);

    // Fetch plans & staff for dropdowns
    authFetch("/api/v1/memberships/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPlans(data.plans || []);
      })
      .catch(() => {});

    authFetch("/api/v1/staff")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStaffList(data.staff || []);
      })
      .catch(() => {});

    // Fetch tenant slug
    authFetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.tenantId) {
          setUserTenantId(data.user.tenantId);
          setGymSlug(data.user.tenantSlug || data.user.tenantId);
        }
      })
      .catch(() => {});
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchLeads(tab, searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchLeads(activeTab, val);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setLeadForm({
          name: "",
          phone: "",
          email: "",
          source: "WALK_IN",
          interestedPlanId: "",
          assignedStaffId: "",
          followUpDate: "",
          status: "NEW",
          notes: "",
        });
        fetchLeads(activeTab, searchQuery);
      } else {
        alert(data.error || "Failed to create lead");
      }
    } catch {
      alert("Error creating lead");
    }
  };

  const handleUpdateLeadStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      const res = await authFetch(`/api/v1/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: leadForm.status,
          followUpDate: leadForm.followUpDate || null,
          assignedStaffId: leadForm.assignedStaffId || null,
          notes: leadForm.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsUpdateModalOpen(false);
        fetchLeads(activeTab, searchQuery);
      } else {
        alert(data.error || "Failed to update lead");
      }
    } catch {
      alert("Error updating lead");
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete lead "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/leads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchLeads(activeTab, searchQuery);
      }
    } catch {
      alert("Failed to delete lead");
    }
  };

  const openUpdateModal = (lead: any) => {
    setSelectedLead(lead);
    setLeadForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email || "",
      source: lead.source || "WALK_IN",
      interestedPlanId: lead.interestedPlanId || "",
      assignedStaffId: lead.assignedStaffId || "",
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().split("T")[0] : "",
      status: lead.status || "NEW",
      notes: lead.notes || "",
    });
    setIsUpdateModalOpen(true);
  };

  // Unique Gym Public Inquiry URL
  const publicInquiryUrl = typeof window !== "undefined"
    ? `${window.location.origin}/inquiry?gym=${encodeURIComponent(gymSlug || userTenantId)}`
    : `https://marutgym.app/inquiry?gym=${encodeURIComponent(gymSlug || userTenantId)}`;

  // QR Code Image API URL
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicInquiryUrl)}&color=0f172a`;

  const copyInquiryLink = () => {
    navigator.clipboard.writeText(publicInquiryUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200 uppercase">New Lead</span>;
      case "FOLLOW_UP":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-200 uppercase">Follow-Up</span>;
      case "PROSPECT":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-900 rounded-full border border-indigo-200 uppercase">Prospect / Trial</span>;
      case "CLOSED_WON":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded-full border border-emerald-200 uppercase">Closed Won ✓</span>;
      case "CLOSED_LOST":
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200 uppercase">Closed Lost</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200 uppercase">{status}</span>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Leads & Inquiry CRM</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-11">
              Track inquiries, trial bookings, and progress prospects through your sales pipeline to Closed Won.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Public Inquiry QR Code</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Pipeline Stage Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => handleTabChange("ALL")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total Leads</span>
            <span className="text-xl font-black">{stats.total}</span>
          </button>

          <button
            onClick={() => handleTabChange("NEW")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeTab === "NEW"
                ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30"
                : "bg-white text-slate-800 border-slate-200 hover:border-blue-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">1. New Inquiries</span>
            <span className="text-xl font-black text-blue-600 dark:text-white">{stats.newCount}</span>
          </button>

          <button
            onClick={() => handleTabChange("FOLLOW_UP")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeTab === "FOLLOW_UP"
                ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30"
                : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">2. Follow-Up</span>
            <span className="text-xl font-black text-amber-600 dark:text-white">{stats.followUpCount}</span>
          </button>

          <button
            onClick={() => handleTabChange("PROSPECT")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeTab === "PROSPECT"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30"
                : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">3. Prospects</span>
            <span className="text-xl font-black text-indigo-600 dark:text-white">{stats.prospectCount}</span>
          </button>

          <button
            onClick={() => handleTabChange("CLOSED_WON")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeTab === "CLOSED_WON"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30"
                : "bg-white text-slate-800 border-slate-200 hover:border-emerald-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">4. Closed Won</span>
            <span className="text-xl font-black text-emerald-600 dark:text-white">{stats.wonCount}</span>
          </button>

          <button
            onClick={() => handleTabChange("CLOSED_LOST")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeTab === "CLOSED_LOST"
                ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/30"
                : "bg-white text-slate-800 border-slate-200 hover:border-rose-300"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">5. Closed Lost</span>
            <span className="text-xl font-black text-rose-600 dark:text-white">{stats.lostCount}</span>
          </button>
        </div>

        {/* Search & Main Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name, phone, email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Showing <span className="text-slate-900 font-bold">{leads.length}</span> lead inquiries
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span>Loading lead inquiries...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Lead Inquiries Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no leads matching the selected pipeline stage. Share your Gym Inquiry QR code to receive automated prospect submissions!
              </p>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded-xl border border-blue-200 inline-flex items-center space-x-1"
              >
                <QrCode className="w-4 h-4" />
                <span>Get Gym Inquiry QR Code</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Prospect Name</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Interested Plan</th>
                    <th className="py-3 px-4">Pipeline Stage</th>
                    <th className="py-3 px-4">Follow-Up Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>
                          <span>{lead.name}</span>
                          {lead.email && <p className="text-[10px] text-slate-400 font-normal">{lead.email}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-800">{lead.phone}</span>
                          <a
                            href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp Prospect"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a href={`tel:${lead.phone}`} title="Call Prospect" className="p-1 text-blue-600 hover:bg-blue-50 rounded-md">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border uppercase">
                          {lead.source === "PUBLIC_QR" ? "📱 Public QR Code" : lead.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {lead.interestedPlan?.name || "General Trial"}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(lead.status)}</td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {lead.followUpDate ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(lead.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => openUpdateModal(lead)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 transition-all inline-flex items-center space-x-1"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Move Stage</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.name)}
                          title="Delete Lead"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QR Code & Share Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center relative">
            <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Unique Gym Public Inquiry QR Code</h3>
              <p className="text-xs text-slate-500 mt-1">
                Display or share this QR code to let prospective members scan and submit trial inquiries directly to your software!
              </p>
            </div>

            {/* QR Code Card Display */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col items-center">
              {branding?.logoUrl && (
                <img src={branding.logoUrl} alt="Gym Logo" className="w-10 h-10 rounded-xl object-cover border bg-white" />
              )}
              <h4 className="font-bold text-slate-900 text-sm">{branding?.businessName || "My Gym Facility"}</h4>
              
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
                <img src={qrCodeImageUrl} alt="Gym Inquiry QR Code" className="w-44 h-44 rounded-lg" />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Scan to Submit Membership Inquiry
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <button
                  onClick={copyInquiryLink}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border flex items-center justify-center space-x-1.5"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Inquiry Link"}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Fill in our gym trial inquiry form here: ${publicInquiryUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm flex items-center justify-center space-x-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>

              <button
                onClick={() => setIsPrintPosterOpen(true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Front-Desk Standee Poster</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Front Desk Poster Modal */}
      {isPrintPosterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 text-center border-4 border-blue-600 relative">
            <button onClick={() => setIsPrintPosterOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>

            {/* Poster Layout */}
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                {branding?.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-600 bg-white p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                    <Dumbbell className="w-8 h-8" />
                  </div>
                )}
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {branding?.businessName || "Fitness Facility"}
                </h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase border border-blue-200">
                  ⚡ Official Membership Inquiry & Trial
                </span>
              </div>

              <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl inline-block shadow-sm">
                <img src={qrCodeImageUrl} alt="QR Poster" className="w-56 h-56 mx-auto rounded-xl" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">SCAN HERE TO REGISTER INQUIRY</h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  Scan this QR code with your mobile camera to view our programs and submit your trial inquiry instantly!
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Lead Inquiry</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                  >
                    <option value="WALK_IN">Walk-in Inquiry</option>
                    <option value="PHONE_CALL">Phone Call</option>
                    <option value="PUBLIC_QR">Public QR Code</option>
                    <option value="INSTAGRAM">Instagram / Social</option>
                    <option value="REFERRAL">Member Referral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Interested Plan</label>
                  <select
                    value={leadForm.interestedPlanId}
                    onChange={(e) => setLeadForm({ ...leadForm, interestedPlanId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                  >
                    <option value="">-- Select Plan --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Special Requests</label>
                <textarea
                  rows={2}
                  placeholder="Goals, weight loss, preferred timings..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm text-xs pt-2"
              >
                Save Lead Inquiry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Move Stage / Update Status Modal */}
      {isUpdateModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Move CRM Pipeline Stage</h3>
                <p className="text-xs text-slate-500">Updating prospect: {selectedLead.name}</p>
              </div>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLeadStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Pipeline Stage Status</label>
                <select
                  value={leadForm.status}
                  onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-slate-800"
                >
                  <option value="NEW">1. New Lead Inquiry</option>
                  <option value="FOLLOW_UP">2. Follow-Up Scheduled</option>
                  <option value="PROSPECT">3. Active Prospect / Trial</option>
                  <option value="CLOSED_WON">4. Closed Won (Converted)</option>
                  <option value="CLOSED_LOST">5. Closed Lost</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Next Scheduled Follow-Up Date</label>
                <input
                  type="date"
                  value={leadForm.followUpDate}
                  onChange={(e) => setLeadForm({ ...leadForm, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assigned Staff / Counselor</label>
                <select
                  value={leadForm.assignedStaffId}
                  onChange={(e) => setLeadForm({ ...leadForm, assignedStaffId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white font-medium"
                >
                  <option value="">-- Select Staff --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.staffType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Follow-up Notes / History</label>
                <textarea
                  rows={3}
                  placeholder="Record conversation details..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm text-xs"
              >
                Save Pipeline Status Update
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
