"use client";

import React, { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users,
  Plus,
  Search,
  Filter,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  CreditCard,
  Cake,
  Heart,
  User,
  X,
  TrendingDown,
  Receipt,
  ChevronDown,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowUpRight,
  Wallet,
  Camera,
  Upload,
  Fingerprint,
  RefreshCw,
  Ban
} from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<"DIRECTORY" | "PAYROLL" | "PENDING">("DIRECTORY");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Payroll state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollLedger, setPayrollLedger] = useState<any[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    email: "",
    photoUrl: "",
    dob: "",
    anniversary: "",
    gender: "MALE",
    staffType: "TRAINER",
    roleTitle: "",
    baseSalary: "",
    salaryDay: "1",
    externalBiometricId: "",
  });

  // Biometric Remote Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollMemberName, setEnrollMemberName] = useState("");
  const [enrollPin, setEnrollPin] = useState("");
  const [enrollStatus, setEnrollStatus] = useState<"INITIATING" | "WAITING" | "SCANNING" | "SUCCESS" | "FAILED">("INITIATING");
  const [enrollStatusText, setEnrollStatusText] = useState("");
  const [enrollTimer, setEnrollTimer] = useState(120);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [enrollParamsData, setEnrollParamsData] = useState<any>(null);

  useEffect(() => {
    let interval: any;
    if (isEnrollModalOpen && enrollTimer > 0 && (enrollStatus === "WAITING" || enrollStatus === "SCANNING")) {
      interval = setInterval(() => {
        setEnrollTimer((prev) => prev - 1);
      }, 1000);
    } else if (enrollTimer === 0 && (enrollStatus === "WAITING" || enrollStatus === "SCANNING")) {
      setEnrollStatus("FAILED");
      setEnrollStatusText("Enrollment timed out. Place finger on scanner within 2 minutes.");
    }
    return () => clearInterval(interval);
  }, [isEnrollModalOpen, enrollTimer, enrollStatus]);

  useEffect(() => {
    let pollInterval: any;
    if (isEnrollModalOpen && activeCommandId && (enrollStatus === "WAITING" || enrollStatus === "SCANNING")) {
      pollInterval = setInterval(async () => {
        try {
          const res = await authFetch(`/api/v1/integrations/biometric/commands/${activeCommandId}/status`);
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
            if (data.status === "EXECUTED") {
              setEnrollStatus("SUCCESS");
              setEnrollStatusText("Fingerprint captured and verified successfully on biometric device!");
              clearInterval(pollInterval);
            }
          }
        } catch (err) {
          console.error("Error polling command status:", err);
        }
      }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [isEnrollModalOpen, activeCommandId, enrollStatus]);

  const handleBlockStaffBiometric = async (staffId: string, name: string) => {
    if (!confirm(`Are you sure you want to block biometric access for staff member "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/staff/${staffId}/block`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Staff block command queued successfully.");
        loadStaff();
      } else {
        alert(data?.error || "Failed to block staff on biometric.");
      }
    } catch (err) {
      alert("Error queueing block command.");
    }
  };

  const handleSyncStaffBiometric = async (staffId: string, name: string) => {
    if (!confirm(`Sync staff member "${name}" info to biometric device?`)) return;
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/staff/${staffId}/sync`, { method: "POST text" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Staff sync command queued successfully.");
        loadStaff();
      } else {
        alert(data?.error || "Failed to sync staff to biometric.");
      }
    } catch (err) {
      alert("Error queueing sync command.");
    }
  };

  const startStaffFingerprintEnrollment = async (params: { staffId: string; name: string; pin?: string }) => {
    setEnrollParamsData(params);
    setIsEnrollModalOpen(true);
    setEnrollMemberName(params.name || "Staff Member");
    setEnrollStatus("INITIATING");
    setEnrollStatusText("Sending fingerprint enrollment command to biometric device...");
    setEnrollTimer(120);
    setActiveCommandId(null);

    try {
      const res = await authFetch(`/api/v1/integrations/biometric/staff/${params.staffId}/enroll`, {
        method: "POST"
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setEnrollStatus("FAILED");
        setEnrollStatusText(data?.error || "Failed to start enrollment on device.");
        return;
      }

      setEnrollPin(data.pin || params.pin || "");
      const createdCommands = data.commands || [];
      const enrollCmd = createdCommands.find((c: any) => c.command.includes("ENROLL_FP")) || createdCommands[createdCommands.length - 1];

      if (enrollCmd?.id) {
        setActiveCommandId(enrollCmd.id);
      }
      setEnrollStatus("WAITING");
    } catch (err) {
      setEnrollStatus("FAILED");
      setEnrollStatusText("Error connecting to server.");
    }
  };

  // Payment / Advance Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTargetStaff, setPayTargetStaff] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    paymentType: "SALARY", // SALARY or ADVANCE
    amount: "",
    paymentMethod: "CASH",
    notes: "",
  });

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          });
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
        } catch (err: any) {
          alert(`Camera access failed: ${err.message || "Please grant camera permission in your browser prompt."}`);
          setIsCameraActive(false);
        }
      }, 100);
    } catch (err: any) {
      alert("Unable to initialize camera.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setStaffForm((prev) => ({ ...prev, photoUrl: dataUrl }));
      }
      stopCamera();
    }
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/v1/staff?search=${encodeURIComponent(searchQuery)}&staffType=${roleFilter}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setStaffList(data.staff || []);
        }
      }
    } catch (err) {
      console.error("Error loading staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayroll = async () => {
    try {
      setLoadingPayroll(true);
      const res = await authFetch(`/api/v1/staff/payroll?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setPayrollLedger(data.ledger || []);
        }
      }
    } catch (err) {
      console.error("Error loading payroll:", err);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const loadPendingStaff = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/staff/pending");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setPendingStaff(data.pending || []);
        }
      }
    } catch (err) {
      console.error("Error loading pending staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStaff = async (id: string, name: string) => {
    if (!confirm(`Approve user registration for "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/staff/${id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "User approved successfully!");
        loadPendingStaff();
        loadStaff();
      } else {
        alert(data?.error || "Failed to approve user.");
      }
    } catch (err) {
      alert("Error approving user.");
    }
  };

  const handleRejectStaff = async (id: string, name: string) => {
    if (!confirm(`Reject registration request for "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/staff/${id}/reject`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Registration request rejected.");
        loadPendingStaff();
      } else {
        alert(data?.error || "Failed to reject user.");
      }
    } catch (err) {
      alert("Error rejecting user.");
    }
  };

  useEffect(() => {
    loadPendingStaff();
  }, []);

  useEffect(() => {
    if (activeTab === "DIRECTORY") {
      loadStaff();
    } else if (activeTab === "PENDING") {
      loadPendingStaff();
    }
  }, [activeTab, searchQuery, roleFilter]);

  useEffect(() => {
    if (activeTab === "PAYROLL") {
      loadPayroll();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const openCreateModal = () => {
    setEditingStaffId(null);
    setStaffForm({
      name: "",
      phone: "",
      email: "",
      photoUrl: "",
      dob: "",
      anniversary: "",
      gender: "MALE",
      staffType: "TRAINER",
      roleTitle: "",
      baseSalary: "",
      salaryDay: "1",
      externalBiometricId: "",
    });
    setIsCameraActive(false);
    setIsStaffModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setEditingStaffId(s.id);
    setStaffForm({
      name: s.name || "",
      phone: s.phone || "",
      email: s.email || "",
      photoUrl: s.photoUrl || "",
      dob: s.dob ? s.dob.split("T")[0] : "",
      anniversary: s.anniversary ? s.anniversary.split("T")[0] : "",
      gender: s.gender || "MALE",
      staffType: s.staffType || "TRAINER",
      roleTitle: s.roleTitle || "",
      baseSalary: String(s.baseSalary || 0),
      salaryDay: String(s.salaryDay || 1),
      externalBiometricId: s.externalBiometricId || "",
    });
    setIsCameraActive(false);
    setIsStaffModalOpen(true);
  };

  const closeStaffModal = () => {
    stopCamera();
    setIsStaffModalOpen(false);
    setEditingStaffId(null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingStaffId);
      const url = isEdit ? `/api/v1/staff/${editingStaffId}` : "/api/v1/staff";
      const method = isEdit ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        closeStaffModal();
        loadStaff();
        if (activeTab === "PAYROLL") loadPayroll();
      } else {
        alert(data?.error || "Failed to save staff member.");
      }
    } catch (err) {
      alert("Error saving staff member.");
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate staff member "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/v1/staff/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        loadStaff();
        if (activeTab === "PAYROLL") loadPayroll();
      } else {
        alert(data?.error || "Failed to delete staff member.");
      }
    } catch (err) {
      alert("Error deleting staff member.");
    }
  };

  const openPayModal = (staffItem: any, type: "SALARY" | "ADVANCE" = "SALARY") => {
    setPayTargetStaff(staffItem);
    setPayForm({
      paymentType: type,
      amount: "",
      paymentMethod: "CASH",
      notes: "",
    });
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetStaff) return;
    try {
      const res = await authFetch("/api/v1/staff/payroll/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: payTargetStaff.staffId || payTargetStaff.id,
          month: selectedMonth,
          year: selectedYear,
          paymentType: payForm.paymentType,
          amount: payForm.amount,
          paymentMethod: payForm.paymentMethod,
          notes: payForm.notes,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setIsPayModalOpen(false);
        setPayTargetStaff(null);
        loadPayroll();
        loadStaff();
      } else {
        alert(data?.error || "Failed to record payment.");
      }
    } catch (err) {
      alert("Error recording payment.");
    }
  };

  // Metrics
  const totalStaff = staffList.length;
  const owners = staffList.filter((s) => s.staffType === "OWNER").length;
  const trainers = staffList.filter((s) => s.staffType === "TRAINER").length;
  const receptionists = staffList.filter((s) => s.staffType === "RECEPTIONIST").length;
  const housekeeping = staffList.filter((s) => s.staffType === "HOUSE_KEEPING").length;

  const totalMonthlyPayroll = payrollLedger.reduce((sum, item) => sum + (item.baseSalary || 0), 0);
  const totalAdvances = payrollLedger.reduce((sum, item) => sum + (item.advancesGiven || 0), 0);
  const totalPaid = payrollLedger.reduce((sum, item) => sum + (item.amountPaid || 0), 0);
  const totalDues = payrollLedger.reduce((sum, item) => sum + (item.dueAmount || 0), 0);

  const formatOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-blue-300 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Staff & Payroll Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Staff & Trainer Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Manage gym trainers, facility owners, receptionists, housekeeping staff, personal training schedules, and monthly salary payouts.
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* Navigation & Role Summary Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("DIRECTORY")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "DIRECTORY"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Staff Directory ({totalStaff})</span>
            </button>
            <button
              onClick={() => setActiveTab("PAYROLL")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "PAYROLL"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Monthly Payroll & Advances</span>
            </button>
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "PENDING"
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending User Approvals ({pendingStaff.length})</span>
            </button>
          </div>

          {activeTab === "DIRECTORY" ? (
            <div className="flex items-center space-x-2 overflow-x-auto text-[11px] font-semibold">
              <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-3 py-1 rounded-full flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                <span>Owners: {owners}</span>
              </span>
              <span className="bg-blue-500/10 text-blue-700 border border-blue-500/20 px-3 py-1 rounded-full flex items-center space-x-1">
                <Award className="w-3 h-3 text-blue-600" />
                <span>Trainers: {trainers}</span>
              </span>
              <span className="bg-purple-500/10 text-purple-700 border border-purple-500/20 px-3 py-1 rounded-full flex items-center space-x-1">
                <UserCheck className="w-3 h-3 text-purple-600" />
                <span>Receptionists: {receptionists}</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center space-x-1">
                <Users className="w-3 h-3 text-emerald-600" />
                <span>House Keeping: {housekeeping}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((m, idx) => (
                  <option key={idx} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: STAFF DIRECTORY */}
        {activeTab === "DIRECTORY" && (
          <div className="space-y-4">
            {/* Search & Role Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Staff Types</option>
                  <option value="OWNER">Owner</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="HOUSE_KEEPING">House Keeping</option>
                </select>
              </div>
            </div>

            {/* Staff Cards Grid */}
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading staff directory...
              </div>
            ) : staffList.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Staff Members Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "Add Staff Member" to register gym trainers, owners, receptionists, or housekeeping staff.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {staffList.map((s) => {
                  const badgeStyle =
                    s.staffType === "OWNER"
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      : s.staffType === "TRAINER"
                      ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                      : s.staffType === "RECEPTIONIST"
                      ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";

                  const roleLabel =
                    s.staffType === "OWNER"
                      ? "Owner"
                      : s.staffType === "TRAINER"
                      ? "Trainer"
                      : s.staffType === "RECEPTIONIST"
                      ? "Receptionist"
                      : "House Keeping";

                  return (
                    <div
                      key={s.id}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
                    >
                      <div className="space-y-4">
                        {/* Header Profile */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3.5">
                            <div className="relative">
                              {s.photoUrl ? (
                                <img
                                  src={s.photoUrl}
                                  alt={s.name}
                                  className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs"
                                />
                              ) : (
                                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                                  {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                                </div>
                              )}
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                                {s.name}
                              </h3>
                              <span
                                className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border mt-1 ${badgeStyle}`}
                              >
                                {roleLabel}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditModal(s)}
                              title="Edit Staff"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(s.id, s.name)}
                              title="Deactivate Staff"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Details List */}
                        <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center space-x-2 text-slate-500 font-medium">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>Phone:</span>
                            </span>
                            <span className="font-bold text-slate-900">{s.phone}</span>
                          </div>

                          {s.email && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center space-x-2 text-slate-500 font-medium">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>Email:</span>
                              </span>
                              <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                                {s.email}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="flex items-center space-x-2 text-slate-500 font-medium">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>Gender:</span>
                            </span>
                            <span className="font-semibold text-slate-800">{s.gender || "MALE"}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center space-x-2 text-slate-500 font-medium">
                              <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
                              <span>Biometric ID:</span>
                            </span>
                            <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                              {s.externalBiometricId ? `#${s.externalBiometricId}` : "Not Set"}
                            </span>
                          </div>

                          {s.dob && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center space-x-2 text-slate-500 font-medium">
                                <Cake className="w-3.5 h-3.5 text-amber-500" />
                                <span>DOB:</span>
                              </span>
                              <span className="font-semibold text-slate-800">
                                {new Date(s.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          )}

                          {s.anniversary && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center space-x-2 text-slate-500 font-medium">
                                <Heart className="w-3.5 h-3.5 text-rose-500" />
                                <span>Anniversary:</span>
                              </span>
                              <span className="font-semibold text-slate-800">
                                {new Date(s.anniversary).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Biometric Controls */}
                      <div className="pt-3 border-t border-slate-100 mt-3 space-y-1.5">
                        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (!s.externalBiometricId) {
                                alert("Please edit staff and set a Biometric ID / PIN before enrolling fingerprint.");
                                return;
                              }
                              startStaffFingerprintEnrollment({ staffId: s.id, name: s.name, pin: s.externalBiometricId });
                            }}
                            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                            title="Enroll Fingerprint on Device"
                          >
                            <Fingerprint className="w-3.5 h-3.5" />
                            <span className="truncate">Enroll FP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!s.externalBiometricId) {
                                alert("Please edit staff and set a Biometric ID / PIN before syncing.");
                                return;
                              }
                              handleSyncStaffBiometric(s.id, s.name);
                            }}
                            className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl font-bold transition-colors ${
                              !s.isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                            title="Sync User Info to Biometric"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="truncate">{!s.isActive ? "Unblock" : "Sync"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!s.externalBiometricId) {
                                alert("Please edit staff and set a Biometric ID / PIN before blocking.");
                                return;
                              }
                              handleBlockStaffBiometric(s.id, s.name);
                            }}
                            className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                            title="Block on Biometric"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span className="truncate">Block</span>
                          </button>
                        </div>
                      </div>

                      {/* Salary Footer (Hidden for Owners) */}
                      {s.staffType !== "OWNER" && (
                        <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                              Monthly Salary
                            </span>
                            <span className="text-base font-extrabold text-slate-900">
                              ₹{Number(s.baseSalary || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                              Salary Day
                            </span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-block">
                              {formatOrdinal(s.salaryDay || 1)} of month
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MONTHLY PAYROLL & ADVANCES */}
        {activeTab === "PAYROLL" && (
          <div className="space-y-5">
            {/* Payroll Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Monthly Salary
                </span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  ₹{totalMonthlyPayroll.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-5 rounded-3xl border border-amber-500/20 shadow-xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Advances Given
                </span>
                <p className="text-2xl font-extrabold text-amber-900 mt-1">
                  ₹{totalAdvances.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 p-5 rounded-3xl border border-emerald-500/20 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Total Paid Amount
                </span>
                <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-gradient-to-br from-rose-500/10 via-white to-rose-500/5 p-5 rounded-3xl border border-rose-500/20 shadow-xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Pending Dues
                </span>
                <p className="text-2xl font-extrabold text-rose-900 mt-1">
                  ₹{totalDues.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>
                  Payroll Ledger for {new Date(2026, selectedMonth - 1).toLocaleString("default", { month: "long" })}{" "}
                  {selectedYear}
                </span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {payrollLedger.length} Staff Members
                </span>
              </div>

              {loadingPayroll ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Loading payroll ledger...
                </div>
              ) : payrollLedger.length === 0 ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400">
                  No staff payroll records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-4 px-5">Staff Member</th>
                        <th className="py-4 px-5">Monthly Salary</th>
                        <th className="py-4 px-5">Due Day</th>
                        <th className="py-4 px-5">Advances Given</th>
                        <th className="py-4 px-5">Paid Amount</th>
                        <th className="py-4 px-5">Remaining Due</th>
                        <th className="py-4 px-5">Status</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrollLedger.map((row) => (
                        <tr key={row.staffId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{row.staffName}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {row.staffType}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            ₹{Number(row.baseSalary || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-5 text-slate-600 font-semibold">
                            {formatOrdinal(row.salaryDay || 1)}
                          </td>
                          <td className="py-4 px-5 font-bold text-amber-700">
                            ₹{Number(row.advancesGiven || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-5 font-bold text-emerald-700">
                            ₹{Number(row.amountPaid || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-5 font-extrabold text-rose-700">
                            ₹{Number(row.dueAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                row.status === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                  : row.status === "PARTIAL"
                                  ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openPayModal(row, "ADVANCE")}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-xl transition-all"
                              >
                                + Advance
                              </button>
                              <button
                                onClick={() => openPayModal(row, "SALARY")}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-xs"
                              >
                                Pay Salary
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
          </div>
        )}

        {/* TAB 3: PENDING USER APPROVALS QUEUE */}
        {activeTab === "PENDING" && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading pending user account requests...
              </div>
            ) : pendingStaff.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Pending Registration Requests</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All user registration requests for your gym facility have been reviewed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pendingStaff.map((ps) => (
                  <div
                    key={ps.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 font-extrabold flex items-center justify-center text-lg border border-amber-500/20">
                            {ps.name ? ps.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{ps.name}</h3>
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 inline-block mt-1">
                              Role: {ps.staffType || "STAFF"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{ps.phone}</span>
                        </div>
                        {ps.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{ps.email}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted: {new Date(ps.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleRejectStaff(ps.id, ps.name)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveStaff(ps.id, ps.name)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
                      >
                        Approve User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: ADD / EDIT STAFF MEMBER */}
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingStaffId ? "Edit Staff Member" : "Add Staff Member"}
                  </h3>
                  <p className="text-xs text-slate-500">Configure staff details, role, and salary settings.</p>
                </div>
                <button
                  onClick={closeStaffModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
                {/* Photo Upload & Camera Widget (Identical to Add Member) */}
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 p-4 rounded-2xl">
                  {isCameraActive ? (
                    <div className="flex flex-col items-center space-y-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-36 h-36 rounded-full object-cover border-2 border-blue-600 shadow-md bg-black"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Snap Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      {staffForm.photoUrl ? (
                        <img
                          src={staffForm.photoUrl}
                          alt="Staff Photo"
                          className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center border-2 border-blue-200">
                          {staffForm.name ? staffForm.name[0].toUpperCase() : "P"}
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3.5 py-1.5 bg-white text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-xl border border-blue-200 flex items-center space-x-1.5 shadow-xs transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-blue-600" />
                          <span>Take Photo</span>
                        </button>
                        <label className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer flex items-center space-x-1.5 shadow-xs transition-colors">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setStaffForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Email & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. staff@gym.com"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={staffForm.gender}
                      onChange={(e) => setStaffForm({ ...staffForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Staff Type & Biometric ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Staff Type / Role *</label>
                    <select
                      value={staffForm.staffType}
                      onChange={(e) => setStaffForm({ ...staffForm, staffType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="TRAINER">Trainer</option>
                      <option value="RECEPTIONIST">Receptionist</option>
                      <option value="HOUSE_KEEPING">House Keeping</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Biometric ID / Device PIN <span className="text-[11px] text-blue-600 font-normal">(Auto-assigned if empty)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-assigned (e.g. 501)"
                      value={staffForm.externalBiometricId}
                      onChange={(e) => setStaffForm({ ...staffForm, externalBiometricId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Monthly Salary & Salary Day (Hidden for Owner, Optional for Staff) */}
                {staffForm.staffType !== "OWNER" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Monthly Salary (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 15000 (Optional)"
                        value={staffForm.baseSalary}
                        onChange={(e) => setStaffForm({ ...staffForm, baseSalary: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Salary Day of Month</label>
                      <select
                        value={staffForm.salaryDay}
                        onChange={(e) => setStaffForm({ ...staffForm, salaryDay: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {formatOrdinal(d)} of month
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* DOB & Anniversary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date of Birth (DOB)</label>
                    <input
                      type="date"
                      value={staffForm.dob}
                      onChange={(e) => setStaffForm({ ...staffForm, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Anniversary Date</label>
                    <input
                      type="date"
                      value={staffForm.anniversary}
                      onChange={(e) => setStaffForm({ ...staffForm, anniversary: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeStaffModal}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
                  >
                    {editingStaffId ? "Update Staff" : "Save Staff Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: RECORD SALARY PAYMENT / ADVANCE */}
        {isPayModalOpen && payTargetStaff && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Record {payForm.paymentType === "ADVANCE" ? "Salary Advance" : "Salary Payment"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Staff: <span className="font-bold text-slate-800">{payTargetStaff.staffName || payTargetStaff.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                {/* Transaction Type */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={payForm.paymentType}
                    onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="SALARY">Salary Payment</option>
                    <option value="ADVANCE">Salary Advance</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-extrabold text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Festival advance / August salary"
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  >
                    Save Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Remote Fingerprint Enrollment Modal */}
        {isEnrollModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Fingerprint className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Remote Fingerprint Enrollment</h3>
                    <p className="text-xs text-slate-500">Staff: <span className="font-semibold text-slate-700">{enrollMemberName}</span> (PIN: {enrollPin})</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 flex flex-col items-center text-center space-y-4">
                {enrollStatus === "INITIATING" && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin flex items-center justify-center" />
                    <p className="text-sm font-medium text-slate-600">Syncing staff profile (PIN: {enrollPin}) to biometric device...</p>
                  </div>
                )}

                {(enrollStatus === "WAITING" || enrollStatus === "SCANNING") && (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Fingerprint className="w-10 h-10 animate-pulse text-blue-600" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Staff Profile Synced to Device (PIN: {enrollPin})</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left w-full space-y-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900 flex items-center space-x-1">
                        <span>How to Register Fingerprint on Device:</span>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 font-medium leading-relaxed">
                        <li>On the biometric device keypad, press <span className="font-bold text-slate-800">Menu → User Mgt → Edit User → PIN {enrollPin}</span>.</li>
                        <li>Select <span className="font-bold text-slate-800">Register FP / Add Fingerprint</span> and scan finger 3 times.</li>
                        <li>The app will automatically detect & confirm your fingerprint in real-time below!</li>
                      </ol>
                    </div>

                    <div className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-100 rounded-xl text-[11px] font-mono font-medium text-slate-600">
                      <span>Status: Listening for scan...</span>
                      <span>{enrollTimer}s</span>
                    </div>
                  </div>
                )}

                {enrollStatus === "SUCCESS" && (
                  <div className="flex flex-col items-center space-y-3 py-2">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <p className="text-base font-bold text-emerald-600">Fingerprint Registered Successfully!</p>
                    <p className="text-xs text-slate-600 max-w-xs">{enrollStatusText}</p>
                  </div>
                )}

                {enrollStatus === "FAILED" && (
                  <div className="flex flex-col items-center space-y-3 py-2">
                    <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <X className="w-7 h-7" />
                    </div>
                    <p className="text-base font-bold text-rose-600">Enrollment Timed Out</p>
                    <p className="text-xs text-slate-600 max-w-xs">
                      No fingerprint scan detected within the time limit. Ensure the biometric device is powered on and connected.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                {enrollStatus === "FAILED" ? (
                  <>
                    <button
                      onClick={() => setIsEnrollModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => enrollParamsData && startStaffFingerprintEnrollment(enrollParamsData)}
                      className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    >
                      Retry Enrollment
                    </button>
                  </>
                ) : enrollStatus === "SUCCESS" ? (
                  <button
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
