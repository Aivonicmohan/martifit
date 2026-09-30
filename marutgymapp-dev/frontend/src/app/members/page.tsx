"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CustomFieldsRenderer } from "@/components/custom-fields/CustomFieldsRenderer";
import { getApiUrl, authFetch } from "@/lib/apiConfig";
import { safeSetLocalStorage } from "@/lib/storage";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Phone,
  MessageCircle,
  X,
  Check,
  Eye,
  Trash2,
  Edit2,
  Camera,
  RotateCcw,
  Calendar,
  Clock,
  CreditCard,
  History,
  DollarSign,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Fingerprint,
  Ban,
  Dumbbell,
  CheckCircle2,
  QrCode,
  AlertTriangle,
  Image,
  Copy,
  ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { RecordPaymentModal } from "@/components/finance/RecordPaymentModal";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);
  const [isSavingMember, setIsSavingMember] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"OVERVIEW" | "PLANS_HISTORY" | "PAYMENTS_HISTORY" | "BIOMETRIC_LOGS">("OVERVIEW");
  const [biometricLogs, setBiometricLogs] = useState<any[]>([]);
  const [loadingBiometricLogs, setLoadingBiometricLogs] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payForMemberId, setPayForMemberId] = useState<string | undefined>(undefined);
  const [sortColumn, setSortColumn] = useState<"daysRemaining" | "status" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Biometric Enrollment State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollMemberName, setEnrollMemberName] = useState("");
  const [enrollPin, setEnrollPin] = useState("");
  const [enrollStatus, setEnrollStatus] = useState<"INITIATING" | "WAITING" | "SCANNING" | "SUCCESS" | "FAILED">("INITIATING");
  const [enrollStatusText, setEnrollStatusText] = useState("");
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [enrollTimer, setEnrollTimer] = useState(60);
  const [enrollParamsData, setEnrollParamsData] = useState<{ memberId?: string; firstName: string; pin?: string } | null>(null);

  useEffect(() => {
    if (activeDrawerTab === "BIOMETRIC_LOGS" && selectedMember) {
      loadBiometricLogs(selectedMember.id);
    }
  }, [activeDrawerTab, selectedMember]);

  const loadBiometricLogs = async (memberId: string) => {
    setLoadingBiometricLogs(true);
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/members/${memberId}/commands`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setBiometricLogs(data.commands || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBiometricLogs(false);
    }
  };

  const handleClearPendingCommands = async (memberId: string) => {
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/members/${memberId}/clear-pending`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Cleared pending commands");
        loadBiometricLogs(memberId);
      } else {
        alert(data?.error || "Failed to clear pending commands");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to clear pending commands");
    }
  };

  const handleSort = (column: "daysRemaining" | "status") => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Dynamic member status calculator
  const getComputedMemberStatus = React.useCallback((member: any): string => {
    if (!member) return "UNKNOWN";
    if (member.status === "TRASH") return "TRASH";
    if (member.status === "BLOCKED") return "BLOCKED";

    const activeM = member.memberships?.find((item: any) => item.status === "ACTIVE") || member.memberships?.[0];
    const hasNoPlan = !activeM || !activeM.plan;
    if (hasNoPlan) return "UNKNOWN";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let endDate: Date | null = null;
    if (activeM?.endDate) {
      endDate = new Date(activeM.endDate);
      endDate.setHours(0, 0, 0, 0);
    }

    const isExpired = member.status === "EXPIRED" || (endDate ? endDate < today : false);
    if (isExpired) return "EXPIRED";

    return (member.status || "ACTIVE").toUpperCase();
  }, []);

  // Filter matching helper logic
  const isMemberMatchingStatus = React.useCallback((member: any, filter: string) => {
    if (filter === "ALL") return member.status !== "TRASH";
    if (filter === "TRASH") return member.status === "TRASH";

    const computedStatus = getComputedMemberStatus(member);

    if (filter === "UNKNOWN") return computedStatus === "UNKNOWN";
    if (filter === "ACTIVE") return computedStatus === "ACTIVE";
    if (filter === "EXPIRED") return computedStatus === "EXPIRED";

    const activeM = member.memberships?.find((item: any) => item.status === "ACTIVE") || member.memberships?.[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let endDate: Date | null = null;
    if (activeM?.endDate) {
      endDate = new Date(activeM.endDate);
      endDate.setHours(0, 0, 0, 0);
    }

    const diffDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (filter === "EXPIRED_THIS_WEEK") {
      if (computedStatus !== "EXPIRED") return false;
      if (!endDate) return true;
      const daysAgo = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysAgo >= 0 && daysAgo <= 7;
    }

    if (filter === "EXPIRED_THIS_MONTH") {
      if (computedStatus !== "EXPIRED") return false;
      if (!endDate) return true;
      const daysAgo = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      const isSameMonth = endDate.getMonth() === today.getMonth() && endDate.getFullYear() === today.getFullYear();
      return (daysAgo >= 0 && daysAgo <= 30) || isSameMonth;
    }

    if (filter === "EXPIRING_THIS_WEEK") {
      if (computedStatus !== "ACTIVE") return false;
      if (diffDays === null) return false;
      return diffDays >= 0 && diffDays <= 7;
    }

    if (filter === "EXPIRING_THIS_MONTH") {
      if (computedStatus !== "ACTIVE") return false;
      if (diffDays === null) return false;
      return diffDays >= 0 && diffDays <= 30;
    }

    return computedStatus === filter || member.status === filter;
  }, [getComputedMemberStatus]);

  const processedMembers = React.useMemo(() => {
    let list = members.filter((m) => isMemberMatchingStatus(m, statusFilter));

    if (sortColumn) {
      list.sort((a, b) => {
        if (sortColumn === "daysRemaining") {
          const getDays = (m: any) => {
            const activeM = m.memberships?.find((item: any) => item.status === "ACTIVE") || m.memberships?.[0];
            if (!activeM?.endDate) return 999999;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expDate = new Date(activeM.endDate);
            expDate.setHours(0, 0, 0, 0);
            return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          };

          const daysA = getDays(a);
          const daysB = getDays(b);

          return sortDirection === "asc" ? daysA - daysB : daysB - daysA;
        } else if (sortColumn === "status") {
          const statusA = getComputedMemberStatus(a);
          const statusB = getComputedMemberStatus(b);
          const cmp = statusA.localeCompare(statusB);
          return sortDirection === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }

    return list;
  }, [members, statusFilter, sortColumn, sortDirection, isMemberMatchingStatus, getComputedMemberStatus]);

  const counts = React.useMemo(() => {
    let active = 0;
    let unknown = 0;
    let expiredWeek = 0;
    let expiredMonth = 0;
    let expiringWeek = 0;

    members.forEach((m) => {
      if (isMemberMatchingStatus(m, "ACTIVE")) active++;
      if (isMemberMatchingStatus(m, "UNKNOWN")) unknown++;
      if (isMemberMatchingStatus(m, "EXPIRED_THIS_WEEK")) expiredWeek++;
      if (isMemberMatchingStatus(m, "EXPIRED_THIS_MONTH")) expiredMonth++;
      if (isMemberMatchingStatus(m, "EXPIRING_THIS_WEEK")) expiringWeek++;
    });

    return { active, unknown, expiredWeek, expiredMonth, expiringWeek };
  }, [members, isMemberMatchingStatus]);

  // Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    phone: "",
    email: "",
    avatarUrl: "",
    dateOfBirth: "",
    anniversaryDate: "",
    group: "Morning Batch",
    source: "",
    bloodGroup: "",
    occupation: "",
    address: "",
    notes: "",
    status: "ACTIVE",
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    discountAmount: "",
    referralDiscountAmount: "",
    paidAmount: "",
    paymentMethod: "UPI",
    pauses: [] as Array<{ startDate: string; endDate: string; reason?: string }>,
    customFields: {} as Record<string, any>,
    externalBiometricId: "",
  });

  // 2-Step Membership Plan Selector State & Helpers
  const [selectedPlanCategory, setSelectedPlanCategory] = useState<string>("");
  const [showRawPlanDropdown, setShowRawPlanDropdown] = useState<boolean>(false);

  const getCleanPlanCategory = React.useCallback((name: string): string => {
    if (!name) return "GENERAL";
    let clean = name.toUpperCase();
    clean = clean.replace(/-\s*₹\d+/g, "");
    clean = clean.replace(/\(\d+\s*MONTHS?\)/gi, "");
    clean = clean.replace(/\d+\s*MONTHS?/gi, "");
    clean = clean.trim();
    if (clean.endsWith("-")) clean = clean.slice(0, -1).trim();
    return clean || name.trim();
  }, []);

  const availablePlanCategories = React.useMemo(() => {
    const catSet = new Set<string>();
    plans.forEach((p) => {
      const cat = getCleanPlanCategory(p.name);
      if (cat) catSet.add(cat);
    });
    return Array.from(catSet);
  }, [plans, getCleanPlanCategory]);

  useEffect(() => {
    if (form.planId && plans.length > 0) {
      const currentP = plans.find((p) => p.id === form.planId);
      if (currentP) {
        const cat = getCleanPlanCategory(currentP.name);
        setSelectedPlanCategory(cat);
      }
    } else if (availablePlanCategories.length > 0 && !selectedPlanCategory) {
      setSelectedPlanCategory(availablePlanCategories[0]);
    }
  }, [form.planId, plans, availablePlanCategories, getCleanPlanCategory, selectedPlanCategory]);

  const handleSelectPlan = (selectedPlan: any) => {
    const basePrice = selectedPlan ? selectedPlan.price + (selectedPlan.joiningFee || 0) : 0;
    const discount = Number(form.discountAmount) || 0;
    const refDiscount = Number(form.referralDiscountAmount) || 0;
    const netPayable = Math.max(0, basePrice - (discount + refDiscount));

    setForm((prev) => ({
      ...prev,
      planId: selectedPlan ? selectedPlan.id : "",
      paidAmount: String(netPayable),
    }));
  };

  const availablePlansForCategory = React.useMemo(() => {
    if (!selectedPlanCategory) return [];
    return plans
      .filter((p) => getCleanPlanCategory(p.name) === selectedPlanCategory)
      .sort((a, b) => a.durationMonths - b.durationMonths);
  }, [plans, selectedPlanCategory, getCleanPlanCategory]);

  // Registration Link & Photo File Upload Refs
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const getRegistrationUrl = () => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem("token");
    let tenantId = "";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        tenantId = payload.tenantId || "";
      } catch (e) {}
    }
    return `${window.location.origin}/register?tenantId=${tenantId}`;
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      // Wait for state update so video element mounts in DOM
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
        setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
      }
      stopCamera();
    }
  };

  const searchReqCountRef = React.useRef(0);
  const membersAbortControllerRef = React.useRef<AbortController | null>(null);

  const loadMembers = async (searchQuery = search, filterStatus = statusFilter) => {
    const reqId = ++searchReqCountRef.current;

    // Cancel the previous list request when the user changes the search/filter.
    membersAbortControllerRef.current?.abort();
    const controller = new AbortController();
    membersAbortControllerRef.current = controller;

    try {
      const res = await authFetch(
        `/api/v1/members?search=${encodeURIComponent(searchQuery)}&status=${filterStatus}`,
        { signal: controller.signal },
        2
      );

      if (res.ok) {
        const data = await res.json().catch(() => null);

        // Ignore stale out-of-order responses if a newer request has already been issued.
        if (reqId !== searchReqCountRef.current) return;

        if (data?.success && Array.isArray(data.members)) {
          setMembers(data.members);

          if (selectedMember) {
            const refreshed = data.members.find((m: any) => m.id === selectedMember.id);
            if (refreshed) setSelectedMember(refreshed);
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Error loading members:", err);
      }
    } finally {
      if (reqId === searchReqCountRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers(search, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const [planRes, batchRes, fieldRes] = await Promise.all([
          authFetch("/api/v1/memberships"),
          authFetch("/api/v1/batches"),
          authFetch("/api/v1/custom-fields?entity=MEMBER"),
        ]);
        if (planRes.ok) {
          const d = await planRes.json().catch(() => null);
          if (d?.success) setPlans(d.plans || []);
        }
        if (batchRes.ok) {
          const d = await batchRes.json().catch(() => null);
          if (d?.success) setBatches(d.batches || []);
        }
        if (fieldRes.ok) {
          const d = await fieldRes.json().catch(() => null);
          if (d?.success) setCustomFieldDefs(d.fields || []);
        }
      } catch (err) {
        console.error("Error loading auxiliary member data:", err);
      }
    }
    loadAuxiliaryData();
  }, []);

  const openAddModal = () => {
    setEditingMemberId(null);
    setIsRenewing(false);
    setForm({
      firstName: "",
      lastName: "",
      gender: "Male",
      phone: "",
      email: "",
      avatarUrl: "",
      dateOfBirth: "",
      anniversaryDate: "",
      group: "",
      source: "",
      bloodGroup: "",
      occupation: "",
      address: "",
      notes: "",
      status: "ACTIVE",
      planId: "",
      startDate: new Date().toISOString().split("T")[0],
      discountAmount: "",
      referralDiscountAmount: "",
      paidAmount: "",
      paymentMethod: "UPI",
      pauses: [],
      customFields: {},
      externalBiometricId: "",
    });
    setIsAddModalOpen(true);
  };

  const openRenewModal = async (member: any) => {
    setEditingMemberId(member.id);
    setIsRenewing(true);

    let fullMember = member;
    try {
      const res = await authFetch(`/api/v1/members/${member.id}`);
      if (res.ok) {
        const d = await res.json().catch(() => null);
        if (d?.success && d.member) fullMember = d.member;
      }
    } catch (err) {
      console.error("Error fetching full member for renewal:", err);
    }

    const customFieldsMap: Record<string, any> = {};
    if (fullMember.customFields) {
      fullMember.customFields.forEach((cf: any) => {
        customFieldsMap[cf.customField?.key || cf.customFieldId] = cf.value;
      });
    }

    const activeMembership = fullMember.memberships?.find((m: any) => m.status === "ACTIVE") || fullMember.memberships?.[0];

    // Default start date for renewal: day after active plan ends if in future, else today
    let renewalStartDate = new Date().toISOString().split("T")[0];
    if (activeMembership?.endDate) {
      const expDate = new Date(activeMembership.endDate);
      const today = new Date();
      if (expDate > today) {
        expDate.setDate(expDate.getDate() + 1);
        renewalStartDate = expDate.toISOString().split("T")[0];
      }
    }

    const currentPlanId = activeMembership?.planId || activeMembership?.plan?.id || (plans.length > 0 ? plans[0].id : "");
    const selectedPlanObj = plans.find(p => p.id === currentPlanId) || plans[0];
    const initialPaidAmount = selectedPlanObj ? String((selectedPlanObj.price || 0) + (selectedPlanObj.joiningFee || 0)) : "";

    setForm({
      firstName: fullMember.firstName || "",
      lastName: fullMember.lastName || "",
      gender: fullMember.gender || "Male",
      phone: fullMember.phone || "",
      email: fullMember.email || "",
      avatarUrl: fullMember.avatarUrl || "",
      dateOfBirth: fullMember.dateOfBirth ? fullMember.dateOfBirth.split("T")[0] : "",
      anniversaryDate: fullMember.anniversaryDate ? fullMember.anniversaryDate.split("T")[0] : "",
      group: fullMember.group || "",
      source: fullMember.source || "",
      bloodGroup: fullMember.bloodGroup || "",
      occupation: fullMember.occupation || "",
      address: fullMember.address || "",
      notes: fullMember.notes || "",
      status: "ACTIVE",
      planId: currentPlanId,
      startDate: renewalStartDate,
      discountAmount: "",
      referralDiscountAmount: "",
      paidAmount: initialPaidAmount,
      paymentMethod: "UPI",
      pauses: [],
      customFields: customFieldsMap,
      externalBiometricId: fullMember.externalBiometricId || "",
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = async (member: any) => {
    setEditingMemberId(member.id);
    setIsRenewing(false);

    let fullMember = member;
    try {
      const res = await authFetch(`/api/v1/members/${member.id}`);
      if (res.ok) {
        const d = await res.json().catch(() => null);
        if (d?.success && d.member) fullMember = d.member;
      }
    } catch (err) {
      console.error("Error fetching full member for edit:", err);
    }
    
    // Parse custom fields mapping
    const customFieldsMap: Record<string, any> = {};
    if (fullMember.customFields) {
      fullMember.customFields.forEach((cf: any) => {
        customFieldsMap[cf.customField?.key || cf.customFieldId] = cf.value;
      });
    }

    const activeMembership = fullMember.memberships?.find((m: any) => m.status === "ACTIVE") || fullMember.memberships?.[0];
    const defaultStartDate = activeMembership?.startDate 
      ? new Date(activeMembership.startDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0];

    const existingPauses = activeMembership?.pauses
      ? activeMembership.pauses.map((p: any) => ({
          startDate: p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "",
          endDate: p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : "",
          reason: p.reason || "",
        }))
      : [];

    setForm({
      firstName: fullMember.firstName || "",
      lastName: fullMember.lastName || "",
      gender: fullMember.gender || "Male",
      phone: fullMember.phone || "",
      email: fullMember.email || "",
      avatarUrl: fullMember.avatarUrl || "",
      dateOfBirth: fullMember.dateOfBirth ? fullMember.dateOfBirth.split("T")[0] : "",
      anniversaryDate: fullMember.anniversaryDate ? fullMember.anniversaryDate.split("T")[0] : "",
      group: fullMember.group || "",
      source: fullMember.source || "",
      bloodGroup: fullMember.bloodGroup || "",
      occupation: fullMember.occupation || "",
      address: fullMember.address || "",
      notes: fullMember.notes || "",
      status: fullMember.status || "ACTIVE",
      planId: activeMembership?.planId || activeMembership?.plan?.id || "",
      startDate: defaultStartDate,
      discountAmount: String(activeMembership?.discountAmount || ""),
      referralDiscountAmount: "",
      paidAmount: String(activeMembership?.paidAmount || ""),
      paymentMethod: fullMember.payments?.[0]?.paymentMethod || "UPI",
      pauses: existingPauses,
      customFields: customFieldsMap,
      externalBiometricId: fullMember.externalBiometricId || "",
    });
    setIsAddModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingMember) return;
    setIsSavingMember(true);
    try {
      const isEdit = Boolean(editingMemberId);
      const path = isEdit ? `/api/v1/members/${editingMemberId}` : "/api/v1/members";
      const method = isEdit ? "PUT" : "POST";

      const res = await authFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          isRenew: isRenewing,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setIsAddModalOpen(false);
        setEditingMemberId(null);
        setIsRenewing(false);
        setForm({
          firstName: "",
          lastName: "",
          gender: "Male",
          phone: "",
          email: "",
          avatarUrl: "",
          dateOfBirth: "",
          anniversaryDate: "",
          group: "",
          source: "",
          bloodGroup: "",
          occupation: "",
          address: "",
          notes: "",
          status: "ACTIVE",
          planId: "",
          startDate: new Date().toISOString().split("T")[0],
          discountAmount: "",
          referralDiscountAmount: "",
          paidAmount: "",
          paymentMethod: "UPI",
          pauses: [],
          customFields: {},
          externalBiometricId: "",
        });
        loadMembers();
      } else {
        alert(data?.error || "Failed to save member");
      }
    } catch (err) {
      alert("Failed to submit form");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleBlockMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to block this member on the biometric devices?")) return;
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/members/${memberId}/block`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Block command queued successfully.");
        setSelectedMember({ ...selectedMember, status: "BLOCKED" });
        loadMembers();
      } else {
        alert(data?.error || "Failed to block member.");
      }
    } catch (err) {
      alert("Error queueing block command. Please try again.");
    }
  };

  const handleSyncMember = async (memberId: string) => {
    if (selectedMember && selectedMember.id === memberId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeMembership = selectedMember.memberships?.find((m: any) => m.status === "ACTIVE");
      const endDate = activeMembership?.endDate ? new Date(activeMembership.endDate) : null;
      const isExpired = selectedMember.status === "EXPIRED" || (endDate ? endDate < today : false);
      const hasValidPlan = Boolean(activeMembership) && !isExpired && selectedMember.status !== "EXPIRED";
      if (!hasValidPlan) {
        alert("Cannot sync member to biometric device without a valid active membership plan.");
        return;
      }
    }
    if (!confirm("Are you sure you want to sync this member to the biometric devices?")) return;
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/members/${memberId}/sync`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Sync command queued successfully.");
        setSelectedMember({ ...selectedMember, status: "ACTIVE" });
        loadMembers();
      } else {
        alert(data?.error || "Failed to sync member.");
      }
    } catch (err) {
      alert("Error queueing sync command. Please try again.");
    }
  };

  const startFingerprintEnrollment = async (params: { memberId?: string; firstName: string; pin?: string }) => {
    setEnrollParamsData(params);
    setIsEnrollModalOpen(true);
    setEnrollMemberName(params.firstName || "Member");
    setEnrollStatus("INITIATING");
    setEnrollStatusText("Sending fingerprint enrollment command to device...");
    setEnrollTimer(120);
    setActiveCommandId(null);

    try {
      let res;
      if (params.memberId) {
        res = await authFetch(`/api/v1/integrations/biometric/members/${params.memberId}/enroll`, {
          method: "POST"
        });
      } else {
        const usePin = params.pin || String(Math.floor(1000 + Math.random() * 8999));
        setForm(prev => ({ ...prev, externalBiometricId: prev.externalBiometricId || usePin }));
        res = await authFetch(`/api/v1/integrations/biometric/enroll-temp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: usePin, firstName: params.firstName || "New Member" })
        });
      }

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
        setEnrollStatus("WAITING");
        setEnrollStatusText("Enrollment command queued. Waiting for biometric device to poll...");
      } else {
        setEnrollStatus("FAILED");
        setEnrollStatusText("Could not track command status.");
      }
    } catch (err: any) {
      console.error(err);
      setEnrollStatus("FAILED");
      setEnrollStatusText("Network error initiating biometric enrollment.");
    }
  };

  useEffect(() => {
    if (!isEnrollModalOpen || !activeCommandId || enrollStatus === "SUCCESS" || enrollStatus === "FAILED") {
      return;
    }

    let intervalId: any;
    let secondsLeft = enrollTimer;

    const checkStatus = async () => {
      try {
        const res = await authFetch(`/api/v1/integrations/biometric/commands/${activeCommandId}/status`);
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success) {
          const status = data.status;
          if (status === "EXECUTED") {
            setEnrollStatus("SUCCESS");
            setEnrollStatusText("Fingerprint captured and verified successfully on device!");
            if (selectedMember) {
              loadBiometricLogs(selectedMember.id);
            }
            clearInterval(intervalId);
          } else if (status === "FAILED") {
            setEnrollStatus("FAILED");
            setEnrollStatusText("Device reported enrollment failed or rejected. Please try again.");
            clearInterval(intervalId);
          } else {
            setEnrollStatus("WAITING");
            setEnrollStatusText(`Member PIN ${enrollPin || ""} synced to device memory. Listening for fingerprint input...`);
          }
        }
      } catch (err) {
        console.error("Error polling enrollment status:", err);
      }
    };

    checkStatus();
    intervalId = setInterval(() => {
      secondsLeft -= 2;
      setEnrollTimer(secondsLeft);
      if (secondsLeft <= 0) {
        setEnrollStatus("FAILED");
        setEnrollStatusText("Enrollment timed out. Ensure the biometric device is powered on and connected to network.");
        clearInterval(intervalId);
      } else {
        checkStatus();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isEnrollModalOpen, activeCommandId, enrollStatus]);

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete member "${name}"? This will clear all records associated with this member.`)) return;

    try {
      const res = await authFetch(`/api/v1/members/${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Member deleted successfully.");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        loadMembers();
      } else {
        alert(data?.error || "Failed to delete member.");
      }
    } catch (err) {
      alert("Error deleting member. Please try again.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Member ID", "Name", "Gender", "Phone", "Email", "Status"];
    const rows = members.map((m) => [m.memberCode, `${m.firstName} ${m.lastName}`, m.gender, m.phone, m.email, m.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <span>All Members</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                {members.length} Total
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Manage active facility members, profiles, and subscriptions.</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setPayForMemberId(undefined);
                setIsRecordPaymentOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Member QR</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500">
                <Filter className="w-4 h-4 text-slate-400" />
                <span>Status Filter:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UNKNOWN">Unknown (No Plan)</option>
                <option value="INACTIVE">Inactive</option>
                <option value="EXPIRED">Expired (All)</option>
                <option value="EXPIRED_THIS_WEEK">Expired This Week</option>
                <option value="EXPIRED_THIS_MONTH">Expired This Month</option>
                <option value="EXPIRING_THIS_WEEK">Expiring This Week</option>
                <option value="EXPIRING_THIS_MONTH">Expiring This Month</option>
                <option value="FROZEN">Frozen</option>
                <option value="TRASH">Trash / Deleted</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Filters:</span>
            
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({members.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs ${
                statusFilter === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              Active ({counts.active})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("UNKNOWN")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs ${
                statusFilter === "UNKNOWN"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              Unknown ({counts.unknown})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("EXPIRED_THIS_WEEK")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center space-x-1.5 ${
                statusFilter === "EXPIRED_THIS_WEEK"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <span>Expired This Week</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === "EXPIRED_THIS_WEEK" ? "bg-rose-700 text-white" : "bg-rose-200/90 text-rose-900"
              }`}>
                {counts.expiredWeek}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("EXPIRED_THIS_MONTH")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center space-x-1.5 ${
                statusFilter === "EXPIRED_THIS_MONTH"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <span>Expired This Month</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === "EXPIRED_THIS_MONTH" ? "bg-amber-700 text-white" : "bg-amber-200/90 text-amber-950"
              }`}>
                {counts.expiredMonth}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("EXPIRING_THIS_WEEK")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center space-x-1.5 ${
                statusFilter === "EXPIRING_THIS_WEEK"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
              }`}
            >
              <span>Expiring Soon (7d)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                statusFilter === "EXPIRING_THIS_WEEK" ? "bg-indigo-700 text-white" : "bg-indigo-200/90 text-indigo-900"
              }`}>
                {counts.expiringWeek}
              </span>
            </button>
          </div>
        </div>

        {/* Member Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Active Plan & Dates</th>
                  <th className="py-3 px-4">Package Amount / Dues</th>
                  <th
                    onClick={() => handleSort("daysRemaining")}
                    className="py-3 px-2 text-center w-28 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                    title="Click to sort by Days Remaining"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Days Left</span>
                      {sortColumn === "daysRemaining" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">Phone / WhatsApp</th>
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                    title="Click to sort by Status alphabetically"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {sortColumn === "status" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {processedMembers.map((member) => {
                  const activeMembership = member.memberships?.find((m: any) => m.status === "ACTIVE") || member.memberships?.[0];

                  let daysRemaining: number | null = null;
                  if (activeMembership?.endDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expDate = new Date(activeMembership.endDate);
                    expDate.setHours(0, 0, 0, 0);
                    const diffTime = expDate.getTime() - today.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-blue-200 shadow-sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border">
                              {member.firstName[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              ID: {member.memberCode} &bull; {member.gender || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 text-[11px]">
                        {activeMembership ? (
                          <div>
                            <span className="font-bold text-blue-700">{activeMembership.plan?.name || "Plan Assigned"}</span>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>
                                {new Date(activeMembership.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - {new Date(activeMembership.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Plan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {activeMembership ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              Net Payable: ₹{activeMembership.totalAmount?.toLocaleString("en-IN")}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                              <span className="text-emerald-600 font-semibold">
                                Paid: ₹{activeMembership.paidAmount?.toLocaleString("en-IN")}
                              </span>
                              {activeMembership.pendingAmount > 0 && (
                                <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Due: ₹{activeMembership.pendingAmount?.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center w-28 whitespace-nowrap text-[11px]">
                        {daysRemaining !== null ? (
                          daysRemaining < 0 ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-100/80 rounded-full border border-rose-200">
                              Expired ({Math.abs(daysRemaining)}d)
                            </span>
                          ) : daysRemaining <= 10 ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 rounded-full border border-rose-200/80">
                              {daysRemaining} {daysRemaining === 1 ? "Day" : "Days"} Left
                            </span>
                          ) : daysRemaining <= 30 ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200/80">
                              {daysRemaining} Days Left
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200/80">
                              {daysRemaining} Days Left
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">No Plan</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-800">{member.phone}</span>
                          <a
                            href={`https://wa.me/91${member.phone}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Send WhatsApp"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a href={`tel:${member.phone}`} title="Call Member" className="p-1 text-blue-600 hover:bg-blue-50 rounded-md">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {(() => {
                          const displayStatus = getComputedMemberStatus(member);

                          return (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                displayStatus === "UNKNOWN"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : displayStatus === "EXPIRED"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : displayStatus === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : displayStatus === "BLOCKED"
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const endDate = activeMembership?.endDate ? new Date(activeMembership.endDate) : null;
                          const isExpired = member.status === "EXPIRED" || (endDate && endDate < today);

                          return (
                            <div className="flex items-center justify-end space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => openRenewModal(member)}
                                title="Renew Membership Plan"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all inline-flex items-center space-x-1 mr-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Renew</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setActiveDrawerTab("OVERVIEW");
                                }}
                                title="View Details & History"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(member)}
                                title="Edit Member Profile"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id, `${member.firstName} ${member.lastName}`)}
                                title="Delete Member"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Member Registration QR</h2>
              </div>
              <button onClick={() => setIsQRModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center space-y-4">
              <p className="text-center text-xs text-slate-600">
                Ask potential members to scan this QR code with their phone camera to self-register their details online.
              </p>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <QRCodeSVG
                  value={getRegistrationUrl()}
                  size={200}
                  level={"H"}
                  includeMargin={true}
                />
              </div>

              {/* Registration Link Input & Copy Button */}
              <div className="w-full space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registration Link</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={getRegistrationUrl()}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600 font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (getRegistrationUrl()) {
                        navigator.clipboard.writeText(getRegistrationUrl());
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center space-x-1 flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-lg text-center w-full">
                <strong>Tip:</strong> New members self-registering via this link will automatically appear in your Members list.
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between space-x-2">
              <button
                type="button"
                onClick={() => {
                  const url = getRegistrationUrl();
                  if (url) window.open(url, "_blank");
                }}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 justify-center flex-1"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Link</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit / Renew Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isRenewing
                  ? "Renew Membership Subscription"
                  : editingMemberId
                  ? "Edit Gym Member Profile"
                  : "Add New Gym Member"}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Registration Link / QR Banner accessible directly inside member form */}
            {!editingMemberId && !isRenewing && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center space-x-2 text-xs font-medium text-indigo-900">
                  <QrCode className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Self-Registration QR Code & Link</p>
                    <p className="text-[11px] text-indigo-700">Allow member to fill basic details on their phone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQRModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center space-x-1 flex-shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View QR / Link</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4">
              {/* Profile Photo Camera Capture / Choose Photo File */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />

                {isCameraActive ? (
                  <div className="flex flex-col items-center space-y-2">
                    <video ref={videoRef} autoPlay playsInline className="w-36 h-36 rounded-full object-cover border-2 border-blue-600 shadow-md bg-black" />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1"
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
                  <div className="flex flex-col items-center space-y-2.5">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="Member Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-md" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 font-bold text-xl flex items-center justify-center border-2 border-blue-200 shadow-2xs">
                        {form.firstName ? form.firstName[0].toUpperCase() : "P"}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 flex items-center space-x-1 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs flex items-center space-x-1 transition-colors"
                      >
                        <Image className="w-3.5 h-3.5 text-slate-500" />
                        <span>Choose Photo</span>
                      </button>

                      {form.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, avatarUrl: "" }))}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Anniversary Date</label>
                  <input
                    type="date"
                    value={form.anniversaryDate}
                    onChange={(e) => setForm({ ...form, anniversaryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gym Batch Timing *</label>
                  <select
                    value={form.group || (batches.length > 0 ? batches[0].name : "Morning Batch")}
                    onChange={(e) => setForm({ ...form, group: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                  >
                    {batches.length > 0 ? (
                      batches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} {b.startTime && b.endTime ? `(${b.startTime} - ${b.endTime})` : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Morning Batch">🌅 Morning Batch (6:00 AM - 11:00 AM)</option>
                        <option value="Evening Batch">🌙 Evening Batch (4:00 PM - 10:00 PM)</option>
                        <option value="General / All Day">⚡ General / All Day Access</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Source / Lead Channel</label>
                  <input
                    type="text"
                    placeholder="e.g. Walk-in, Referral"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Select Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineer, Business"
                    value={form.occupation}
                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-700">External Biometric ID</label>
                  {(() => {
                    const hasValidPlan = Boolean(form.planId) && form.status !== "EXPIRED";
                    return (
                      <button
                        type="button"
                        disabled={!hasValidPlan}
                        title={!hasValidPlan ? "Select a valid plan to enable biometric enrollment" : "Enroll Fingerprint"}
                        onClick={() => {
                          if (!hasValidPlan) return;
                          const usePin = form.externalBiometricId || String(Math.floor(1000 + Math.random() * 8999));
                          if (!form.externalBiometricId) {
                            setForm(prev => ({ ...prev, externalBiometricId: usePin }));
                          }
                          startFingerprintEnrollment({
                            memberId: editingMemberId || undefined,
                            firstName: form.firstName || "Member",
                            pin: usePin
                          });
                        }}
                        className={`text-[11px] flex items-center space-x-1 font-semibold px-2 py-0.5 rounded border transition-colors ${
                          !hasValidPlan
                            ? "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                            : "text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100"
                        }`}
                      >
                        <Fingerprint className="w-3 h-3" />
                        <span>Enroll Fingerprint on Device</span>
                      </button>
                    );
                  })()}
                </div>
                {(!form.planId || form.status === "EXPIRED") && (
                  <p className="text-[10px] text-amber-600 font-medium mb-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Valid plan selection required to enable biometric option.</span>
                  </p>
                )}
                <input
                  type="text"
                  placeholder="ID assigned on the biometric device (optional)"
                  value={form.externalBiometricId}
                  onChange={(e) => setForm({ ...form, externalBiometricId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Member residential address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Member Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="FROZEN">Frozen</option>
                </select>
              </div>

              {/* Clean 2-Step Membership Plan Selector */}
              <div className="space-y-3 p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Dumbbell className="w-4 h-4 text-blue-600" />
                    <span>{editingMemberId ? "Renew / Select Membership Plan" : "Assign Membership Plan"}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRawPlanDropdown(!showRawPlanDropdown)}
                    className="text-[10px] font-semibold text-blue-600 hover:underline"
                  >
                    {showRawPlanDropdown ? "Switch to 2-Step Guided Selector" : "Show All Plans Dropdown"}
                  </button>
                </div>

                {!showRawPlanDropdown ? (
                  <div className="space-y-3 text-xs">
                    {/* Step 1: Select Type of Exercise / Program */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                        1. Choose Exercise / Program Type
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {availablePlanCategories.map((cat) => {
                          const isSelected = selectedPlanCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSelectedPlanCategory(cat);
                                const catPlans = plans
                                  .filter((p) => getCleanPlanCategory(p.name) === cat)
                                  .sort((a, b) => a.durationMonths - b.durationMonths);
                                if (catPlans.length > 0) {
                                  handleSelectPlan(catPlans[0]);
                                }
                              }}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 border ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80"
                              }`}
                            >
                              <span>{cat}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Select Duration in Months & Live Price Tag */}
                    {selectedPlanCategory && (
                      <div className="pt-2 border-t border-slate-200/80">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                          2. Choose Duration & Pricing
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {availablePlansForCategory.map((p) => {
                            const isSelected = form.planId === p.id;
                            const totalPrice = p.price + (p.joiningFee || 0);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectPlan(p)}
                                className={`p-2.5 rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? "bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-2xs"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                                  {p.durationMonths} {p.durationMonths === 1 ? "Month" : "Months"}
                                </div>
                                <div className={`text-sm font-black mt-0.5 ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
                                  ₹{totalPrice.toLocaleString("en-IN")}
                                </div>
                                {p.joiningFee > 0 && (
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    +₹{p.joiningFee} joining
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Live Selected Plan Confirmation Banner */}
                    {form.planId && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-950">
                              {plans.find((p) => p.id === form.planId)?.name}
                            </span>
                            <span className="text-[11px] text-emerald-700 block">
                              Duration: {plans.find((p) => p.id === form.planId)?.durationMonths} Months | Base Price: ₹{plans.find((p) => p.id === form.planId)?.price?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-600 uppercase font-bold block">Package Fee</span>
                          <span className="font-black text-emerald-900 text-sm">
                            ₹{((plans.find((p) => p.id === form.planId)?.price || 0) + (plans.find((p) => p.id === form.planId)?.joiningFee || 0)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    value={form.planId}
                    onChange={(e) => {
                      const selectedPlan = plans.find((p) => p.id === e.target.value);
                      if (selectedPlan) handleSelectPlan(selectedPlan);
                      else setForm({ ...form, planId: "" });
                    }}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                  >
                    <option value="">-- Select Plan --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₹{p.price} ({p.durationMonths} Months)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Custom Membership Start Date & Auto-Calculated End Date with Pause Extensions */}
              {form.planId && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{editingMemberId ? "Plan Renewal & Pause Duration" : "Membership Plan Duration"}</span>
                    </span>
                    {(() => {
                      const selectedPlan = plans.find((p) => p.id === form.planId);
                      if (!selectedPlan || !form.startDate) return null;
                      const sDate = new Date(form.startDate);
                      const eDate = new Date(sDate);
                      eDate.setMonth(eDate.getMonth() + selectedPlan.durationMonths);
                      
                      // Calculate total pause days (Capped at 7 Days max as per policy)
                      let totalPauseDays = 0;
                      if (form.pauses && form.pauses.length > 0) {
                        form.pauses.forEach((p) => {
                          if (p.startDate && p.endDate) {
                            const pStart = new Date(p.startDate);
                            const pEnd = new Date(p.endDate);
                            if (pEnd >= pStart) {
                              const diffTime = Math.abs(pEnd.getTime() - pStart.getTime());
                              totalPauseDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            }
                          }
                        });
                      }

                      if (totalPauseDays > 0) {
                        eDate.setDate(eDate.getDate() + totalPauseDays);
                      }

                      return (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {totalPauseDays > 0 ? `Extended Expiry (+${totalPauseDays}d): ` : "Expires: "}
                          {eDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {editingMemberId ? "Renewal Start Date" : "Membership Start Date"}
                      </label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Auto-Calculated End Date
                      </label>
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg font-mono flex items-center justify-between">
                        <span>
                          {(() => {
                            const selectedPlan = plans.find((p) => p.id === form.planId);
                            if (!selectedPlan || !form.startDate) return "Select Date";
                            const sDate = new Date(form.startDate);
                            const eDate = new Date(sDate);
                            eDate.setMonth(eDate.getMonth() + selectedPlan.durationMonths);

                            let totalPauseDays = 0;
                            if (form.pauses && form.pauses.length > 0) {
                              form.pauses.forEach((p) => {
                                if (p.startDate && p.endDate) {
                                  const pStart = new Date(p.startDate);
                                  const pEnd = new Date(p.endDate);
                                  if (pEnd >= pStart) {
                                    const diffTime = Math.abs(pEnd.getTime() - pStart.getTime());
                                    totalPauseDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                  }
                                }
                              });
                            }

                            if (totalPauseDays > 0) {
                              eDate.setDate(eDate.getDate() + totalPauseDays);
                            }

                            return eDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                          })()}
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold uppercase">Auto</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Row Membership Break / Freeze Section */}
                  {editingMemberId && (
                    <div className="pt-2 border-t border-blue-200 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Membership Break / Extension Periods</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newBreak = { startDate: "", endDate: "", reason: "Member Requested Break / Extension" };
                            setForm({ ...form, pauses: [...(form.pauses || []), newBreak] });
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg border text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border-blue-300 flex items-center space-x-1 transition-all"
                        >
                          <span>+ Add Break Period</span>
                        </button>
                      </div>

                      {form.pauses && form.pauses.length > 0 ? (
                        <div className="space-y-2">
                          {form.pauses.map((pause, idx) => {
                            const pStart = pause.startDate ? new Date(pause.startDate) : null;
                            const pEnd = pause.endDate ? new Date(pause.endDate) : null;
                            
                            // Calculate days for this break (inclusive)
                            let currentBreakDays = 0;
                            if (pStart && pEnd && pEnd >= pStart) {
                              const diffTime = Math.abs(pEnd.getTime() - pStart.getTime());
                              currentBreakDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            }

                            const handleStartDateChange = (newStartStr: string) => {
                              const updated = [...form.pauses];
                              updated[idx].startDate = newStartStr;
                              if (newStartStr && currentBreakDays > 0) {
                                const sDate = new Date(newStartStr);
                                sDate.setDate(sDate.getDate() + (currentBreakDays - 1));
                                updated[idx].endDate = sDate.toISOString().split("T")[0];
                              }
                              setForm({ ...form, pauses: updated });
                            };

                            const handleDaysChange = (daysVal: number) => {
                              const updated = [...form.pauses];
                              if (updated[idx].startDate && daysVal > 0) {
                                const sDate = new Date(updated[idx].startDate);
                                sDate.setDate(sDate.getDate() + (daysVal - 1));
                                updated[idx].endDate = sDate.toISOString().split("T")[0];
                              }
                              setForm({ ...form, pauses: updated });
                            };

                            const handleEndDateChange = (newEndStr: string) => {
                              const updated = [...form.pauses];
                              updated[idx].endDate = newEndStr;
                              setForm({ ...form, pauses: updated });
                            };

                            return (
                              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-xs">
                                <div className="grid grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Break Start Date</label>
                                    <input
                                      type="date"
                                      value={pause.startDate}
                                      min={form.startDate}
                                      onChange={(e) => handleStartDateChange(e.target.value)}
                                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Number of Days</label>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="e.g. 7, 15, 30"
                                      value={currentBreakDays > 0 ? currentBreakDays : ""}
                                      onChange={(e) => handleDaysChange(Number(e.target.value))}
                                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-bold text-blue-700"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Auto-Calculated End Date</label>
                                    <input
                                      type="date"
                                      value={pause.endDate}
                                      min={pause.startDate || form.startDate}
                                      onChange={(e) => handleEndDateChange(e.target.value)}
                                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-800"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-emerald-700 bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200/60 font-semibold">
                                  <span>✨ Break Duration: <strong className="text-emerald-900 font-extrabold">{currentBreakDays} Days</strong></span>
                                  <span>Membership Period Extended by +{currentBreakDays} Days</span>
                                </div>

                                <div className="flex items-center space-x-2 pt-0.5">
                                  <input
                                    type="text"
                                    placeholder="Reason for break (e.g. Medical, Exam, Vacation)"
                                    value={pause.reason || ""}
                                    onChange={(e) => {
                                      const updated = [...form.pauses];
                                      updated[idx].reason = e.target.value;
                                      setForm({ ...form, pauses: updated });
                                    }}
                                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = form.pauses.filter((_, i) => i !== idx);
                                      setForm({ ...form, pauses: updated });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Remove Break Period"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No break periods added yet. Click "+ Add Break Period" to extend end date.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Financial Calculation Breakdown */}
              {form.planId && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                    <span>Payment & Discount Breakdown</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                      Plan Price: ₹{plans.find((p) => p.id === form.planId)?.price || 0}
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Discount Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.discountAmount}
                        onChange={(e) => {
                          const discount = Number(e.target.value) || 0;
                          const selectedPlan = plans.find((p) => p.id === form.planId);
                          const basePrice = selectedPlan ? selectedPlan.price + selectedPlan.joiningFee : 0;
                          const refDiscount = Number(form.referralDiscountAmount) || 0;
                          const netPayable = Math.max(0, basePrice - (discount + refDiscount));

                          setForm({
                            ...form,
                            discountAmount: e.target.value,
                            paidAmount: String(netPayable),
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Referral Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.referralDiscountAmount}
                        onChange={(e) => {
                          const refDiscount = Number(e.target.value) || 0;
                          const selectedPlan = plans.find((p) => p.id === form.planId);
                          const basePrice = selectedPlan ? selectedPlan.price + selectedPlan.joiningFee : 0;
                          const discount = Number(form.discountAmount) || 0;
                          const netPayable = Math.max(0, basePrice - (discount + refDiscount));

                          setForm({
                            ...form,
                            referralDiscountAmount: e.target.value,
                            paidAmount: String(netPayable),
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  {(() => {
                    const selectedPlan = plans.find((p) => p.id === form.planId);
                    const basePrice = selectedPlan ? selectedPlan.price + (selectedPlan.joiningFee || 0) : 0;
                    const discount = Number(form.discountAmount) || 0;
                    const refDiscount = Number(form.referralDiscountAmount) || 0;
                    const totalDiscount = discount + refDiscount;
                    const netPayable = Math.max(0, basePrice - totalDiscount);
                    const paid = Number(form.paidAmount) || 0;
                    const due = Math.max(0, netPayable - paid);

                    return (
                      <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Package Base Price:</span>
                          <span className="font-semibold">₹{basePrice.toLocaleString("en-IN")}</span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Total Discounts:</span>
                            <span className="font-semibold">- ₹{totalDiscount.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                          <span>Payable Amount:</span>
                          <span className="text-blue-600">₹{netPayable.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Paid Amount (₹)</label>
                            <input
                              type="number"
                              min="0"
                              max={netPayable}
                              value={form.paidAmount}
                              onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-emerald-700"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Payment Type</label>
                            <select
                              value={form.paymentMethod || "UPI"}
                              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-800"
                            >
                              <option value="UPI">📱 UPI</option>
                              <option value="CASH">💵 Cash</option>
                              <option value="CARD">💳 Card</option>
                              <option value="NET_BANKING">🏦 NetBanking</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Due Amount (₹)</label>
                            <div className={`px-2.5 py-1.5 text-xs border rounded-lg font-bold ${due > 0 ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                              ₹{due.toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Dynamic Custom Fields */}
              <CustomFieldsRenderer
                fields={customFieldDefs}
                values={form.customFields}
                onChange={(key, val) =>
                  setForm({
                    ...form,
                    customFields: { ...form.customFields, [key]: val },
                  })
                }
              />

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMember}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
                >
                  {isSavingMember
                    ? "Saving..."
                    : isRenewing
                    ? "Confirm Plan Renewal & Payment"
                    : editingMemberId
                    ? "Update Member Profile"
                    : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Details & History Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto space-y-5 relative">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md pt-2 pb-3 -mt-2 border-b border-slate-100 z-10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Member Profile & History</h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: {selectedMember.memberCode}</p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Close Profile"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Profile Header */}
            <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {selectedMember.avatarUrl ? (
                <img src={selectedMember.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-blue-600 shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center border-2 border-blue-600">
                  {selectedMember.firstName[0]}
                </div>
              )}
              <div className="space-y-0.5">
                <h4 className="text-base font-bold text-slate-900">
                  {selectedMember.firstName} {selectedMember.lastName}
                </h4>
                <div className="text-xs text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Registered: {new Date(selectedMember.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(selectedMember.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                </div>
                <div className="pt-1 flex items-center space-x-2">
                  {(() => {
                    const drawerStatus = getComputedMemberStatus(selectedMember);

                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        drawerStatus === "UNKNOWN"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : drawerStatus === "EXPIRED"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : drawerStatus === "BLOCKED"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : drawerStatus === "INACTIVE"
                          ? "bg-slate-200 text-slate-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {drawerStatus}
                      </span>
                    );
                  })()}
                  <button
                    onClick={() => {
                      const m = selectedMember;
                      setSelectedMember(null);
                      openRenewModal(m);
                    }}
                    className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-full shadow-2xs transition-all inline-flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Renew Plan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveDrawerTab("OVERVIEW")}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeDrawerTab === "OVERVIEW"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("PLANS_HISTORY")}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeDrawerTab === "PLANS_HISTORY"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Plan History ({selectedMember.memberships?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("PAYMENTS_HISTORY")}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeDrawerTab === "PAYMENTS_HISTORY"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payment History ({selectedMember.payments?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("BIOMETRIC_LOGS")}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeDrawerTab === "BIOMETRIC_LOGS"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Device Logs</span>
              </button>
            </div>

            {/* Tab Content: OVERVIEW */}
            {activeDrawerTab === "OVERVIEW" && (
              <div className="space-y-4">
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl text-xs divide-y divide-slate-200">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Registration Date & Time</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(selectedMember.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} {new Date(selectedMember.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-semibold text-slate-800">{selectedMember.gender}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="font-semibold text-slate-800">{selectedMember.dateOfBirth ? new Date(selectedMember.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Anniversary Date</span>
                    <span className="font-semibold text-slate-800">{selectedMember.anniversaryDate ? new Date(selectedMember.anniversaryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 items-center">
                    <span className="text-slate-500">Phone Number</span>
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                      <span>{selectedMember.phone}</span>
                      <a href={`https://wa.me/91${selectedMember.phone}`} target="_blank" rel="noreferrer" className="text-emerald-600">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Email</span>
                    <span className="font-semibold text-slate-800">{selectedMember.email || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Group / Batch</span>
                    <span className="font-semibold text-slate-800">{selectedMember.group || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Source / Lead Channel</span>
                    <span className="font-semibold text-slate-800">{selectedMember.source || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Blood Group</span>
                    <span className="font-semibold text-slate-800">{selectedMember.bloodGroup || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Occupation</span>
                    <span className="font-semibold text-slate-800">{selectedMember.occupation || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Address</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[220px] truncate">{selectedMember.address || "N/A"}</span>
                  </div>
                </div>

                {selectedMember.customFields && selectedMember.customFields.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase text-slate-500">Custom Attributes</h5>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2">
                      {selectedMember.customFields.map((cf: any) => (
                        <div key={cf.id} className="flex justify-between py-1 border-b border-slate-200 last:border-none">
                          <span className="text-slate-500">{cf.customField?.label}</span>
                          <span className="font-semibold text-slate-900">{cf.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Access Control section */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold uppercase text-slate-500">Access Control (Biometric)</h5>
                  <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 flex flex-col gap-2">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const activeMembership = selectedMember.memberships?.find((m: any) => m.status === "ACTIVE");
                      const endDate = activeMembership?.endDate ? new Date(activeMembership.endDate) : null;
                      const isExpired = selectedMember.status === "EXPIRED" || (endDate ? endDate < today : false);
                      const hasValidPlan = Boolean(activeMembership) && !isExpired && selectedMember.status !== "EXPIRED";

                      return (
                        <>
                          {!hasValidPlan && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center space-x-1.5 mb-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Active membership plan required to enable biometric features.</span>
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={!hasValidPlan}
                            title={!hasValidPlan ? "Active membership plan required to enable biometric enrollment" : ""}
                            onClick={() => {
                              if (!hasValidPlan) return;
                              startFingerprintEnrollment({ 
                                memberId: selectedMember.id, 
                                firstName: selectedMember.firstName, 
                                pin: selectedMember.externalBiometricId || selectedMember.memberCode 
                              });
                            }}
                            className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-colors font-semibold shadow-xs ${
                              !hasValidPlan
                                ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            <Fingerprint className="w-4 h-4" />
                            <span>Enroll Fingerprint on Device</span>
                          </button>

                          <button
                            type="button"
                            disabled={!hasValidPlan}
                            title={!hasValidPlan ? "Active membership plan required to sync user info to biometric" : ""}
                            onClick={() => {
                              if (!hasValidPlan) return;
                              handleSyncMember(selectedMember.id);
                            }}
                            className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors font-semibold ${
                              !hasValidPlan
                                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-70"
                                : selectedMember.status === "BLOCKED" 
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            <Fingerprint className="w-4 h-4" />
                            <span>{selectedMember.status === "BLOCKED" ? "Unblock & Sync to Biometric" : "Sync User Info to Biometric"}</span>
                          </button>

                          {selectedMember.status !== "BLOCKED" && (
                            <button
                              type="button"
                              onClick={() => handleBlockMember(selectedMember.id)}
                              className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg transition-colors font-semibold"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Block on Biometric</span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: PLANS_HISTORY */}
            {activeDrawerTab === "PLANS_HISTORY" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold uppercase text-slate-500">Plan Subscription Timeline</h5>
                  <button
                    onClick={() => {
                      const m = selectedMember;
                      setSelectedMember(null);
                      openRenewModal(m);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all inline-flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>+ Add Renewal Plan</span>
                  </button>
                </div>
                {selectedMember.memberships && selectedMember.memberships.length > 0 ? (
                  <div className="space-y-3">
                    {selectedMember.memberships.map((m: any, index: number) => (
                      <div key={m.id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-slate-900">{m.plan?.name || "Membership Plan"}</span>
                            <div className="text-slate-500 text-[11px] font-mono mt-0.5 flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>
                                {new Date(m.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} → {new Date(m.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                            {m.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Net Payable</span>
                            <span className="font-semibold text-slate-900">₹{m.totalAmount?.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Paid Amount</span>
                            <span className="font-semibold text-emerald-600">₹{m.paidAmount?.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Due Balance</span>
                            <span className={`font-semibold ${m.pendingAmount > 0 ? "text-rose-600" : "text-slate-700"}`}>
                              ₹{(m.pendingAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No plan history found for this member.</p>
                )}
              </div>
            )}

            {/* Tab Content: PAYMENTS_HISTORY */}
            {activeDrawerTab === "PAYMENTS_HISTORY" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold uppercase text-slate-500">Payment & Transaction Receipts</h5>
                  <button
                    onClick={() => {
                      setPayForMemberId(selectedMember.id);
                      setIsRecordPaymentOpen(true);
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center space-x-1 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>+ Record Payment</span>
                  </button>
                </div>
                {selectedMember.payments && selectedMember.payments.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedMember.payments.map((p: any) => (
                      <div key={p.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>{p.invoiceNumber || "Receipt"}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(p.paymentDate || p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <span className="inline-block text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                            {p.paymentMethod || "UPI"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-600 block">+ ₹{p.amount?.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-slate-400 font-medium">SUCCESS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No payment receipts recorded for this member.</p>
                )}
              </div>
            )}

            {/* Tab Content: BIOMETRIC_LOGS */}
            {activeDrawerTab === "BIOMETRIC_LOGS" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold uppercase text-slate-500">Biometric Device Command Logs</h5>
                  <div className="flex items-center space-x-2">
                    {biometricLogs.some((l: any) => l.status === "PENDING") && (
                      <button onClick={() => handleClearPendingCommands(selectedMember.id)} className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 rounded shadow-sm hover:bg-rose-100 font-semibold">
                        Clear Stale Pending
                      </button>
                    )}
                    <button onClick={() => loadBiometricLogs(selectedMember.id)} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm hover:bg-slate-50 font-semibold">
                      Refresh Logs
                    </button>
                  </div>
                </div>
                {loadingBiometricLogs ? (
                  <p className="text-xs text-slate-500">Loading logs...</p>
                ) : biometricLogs.length > 0 ? (
                  <div className="space-y-2">
                    {biometricLogs.map((log: any) => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col space-y-2 text-[11px]">
                        <div className="flex justify-between items-start">
                          <div className="font-mono text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded font-semibold overflow-x-auto max-w-[220px]">
                            {log.command.includes("ENROLL_FP")
                              ? "ENROLL_FINGERPRINT"
                              : log.command.includes("AC_UNELOCK") || log.command.includes("AC_UNLOCK") || log.command.includes("Door1Open") || log.command.includes("RELAY") || log.command.includes("REMOTE_UNLOCK")
                              ? "REMOTE_DOOR_UNLOCK"
                              : log.command.includes("DELETE")
                              ? "BLOCK_USER / WIPE"
                              : log.command.includes("UPDATE")
                              ? "SYNC_USER / UNBLOCK"
                              : log.command.includes("CLEAR ADMIN")
                              ? "CLEAR_ADMIN_LOCK"
                              : log.command.substring(0, 20)}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            log.status === "EXECUTED" ? "bg-emerald-100 text-emerald-700" :
                            log.status === "FAILED" ? "bg-rose-100 text-rose-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 text-[10px]">
                          <span className="truncate max-w-[140px]" title={log.command}>{log.command.substring(0, 25)}...</span>
                          <div className="flex items-center space-x-1.5">
                            {(() => {
                              const start = log.createdAt ? new Date(log.createdAt).getTime() : 0;
                              const end = (log.status === "EXECUTED" || log.status === "FAILED") && log.updatedAt
                                ? new Date(log.updatedAt).getTime()
                                : Date.now();
                              const diffMs = start > 0 ? Math.max(0, end - start) : 0;
                              const diffSec = Math.floor(diffMs / 1000);
                              if (start === 0) return null;
                              return (
                                <span className="font-mono text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  {log.status === "PENDING"
                                    ? `${diffSec}s pending`
                                    : diffMs < 1000
                                    ? `${diffMs}ms`
                                    : diffSec < 60
                                    ? `${(diffMs / 1000).toFixed(1)}s`
                                    : `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`}
                                </span>
                              );
                            })()}
                            <span>{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium">No biometric commands queued for this member yet.</p>
                  </div>
                )}
              </div>
            )}
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
                  <p className="text-xs text-slate-500">Member: <span className="font-semibold text-slate-700">{enrollMemberName}</span> (PIN: {enrollPin})</p>
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
                  <p className="text-sm font-medium text-slate-600">Syncing member profile (PIN: {enrollPin}) to biometric device...</p>
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
                    <span>Member Profile Synced to Device (PIN: {enrollPin})</span>
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
                    onClick={() => enrollParamsData && startFingerprintEnrollment(enrollParamsData)}
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
                  className="w-full py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPayForMemberId(undefined);
        }}
        onSuccess={() => loadMembers()}
        initialMemberId={payForMemberId}
      />
    </AppLayout>
  );
}

