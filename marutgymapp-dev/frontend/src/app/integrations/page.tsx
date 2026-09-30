"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Send,
  BellRing,
  Edit3,
  Sparkles,
  Smartphone,
  AlertCircle,
  FileText,
  UserCheck,
  DollarSign,
  Search,
  Users,
  Check,
  Info,
  BookOpen,
  Plus,
  Trash2,
  Wifi,
  Server,
  Cpu,
  RefreshCw,
  Unlock,
} from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

const formatDuration = (ms?: number | null): string => {
  if (ms === undefined || ms === null || ms < 0 || isNaN(ms)) return "never pinged";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0
      ? `${hours} hr${hours > 1 ? "s" : ""} ${remMinutes} min${remMinutes > 1 ? "s" : ""}`
      : `${hours} hr${hours > 1 ? "s" : ""}`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0
    ? `${days} day${days > 1 ? "s" : ""} ${remHours} hr${remHours > 1 ? "s" : ""}`
    : `${days} day${days > 1 ? "s" : ""}`;
};

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBiometricGuideOpen, setIsBiometricGuideOpen] = useState(false);
  const [isBiometricManageOpen, setIsBiometricManageOpen] = useState(false);
  const [isBiometricLogsOpen, setIsBiometricLogsOpen] = useState(false);

  // Biometric Logs State
  const [biometricLogs, setBiometricLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<"ALL" | "UNLOCK" | "SYNC_BLOCK">("ALL");
  const [clearingStale, setClearingStale] = useState(false);

  const [showApiKey, setShowApiKey] = useState(false);

  // Configuration State
  const [config, setConfig] = useState({
    provider: "WHATSAPP_CLOUD_API",
    wabaId: "",
    phoneNumberId: "",
    apiKey: "",
    isActive: true,
    enablePreBatchReminder: true,
    autoReminderDaysBefore: 10,
  });

  // Templates & Members State
  const [templates, setTemplates] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Biometric Hardware State
  const [biometricDevices, setBiometricDevices] = useState<any[]>([]);
  const [newDevice, setNewDevice] = useState({
    name: "",
    deviceType: "ZKTeco Modern",
    deviceSerial: "",
    deviceIp: "192.168.1.201",
  });
  const [addingDevice, setAddingDevice] = useState(false);

  // Send WhatsApp Modal State
  const [recipientMode, setRecipientMode] = useState<"EXISTING_MEMBERS" | "ALL_ACTIVE" | "MANUAL">("EXISTING_MEMBERS");
  const [sendMode, setSendMode] = useState<"TEMPLATE" | "TEXT">("TEMPLATE");
  const [templateName, setTemplateName] = useState("hello_world");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [manualPhone, setManualPhone] = useState("9059059751");
  const [selectedTestCategory, setSelectedTestCategory] = useState("EXPIRY_REMINDER");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; results?: any[] } | null>(null);

  const loadData = async () => {
    try {
      const [cfgRes, tmplRes, memRes, bioRes] = await Promise.all([
        authFetch("/api/v1/integrations/whatsapp"),
        authFetch("/api/v1/integrations/whatsapp/templates"),
        authFetch("/api/v1/members"),
        authFetch("/api/v1/integrations/biometric/devices"),
      ]);

      if (cfgRes.ok) {
        const d = await cfgRes.json().catch(() => null);
        if (d?.success && d.config) {
          setConfig({
            provider: d.config.provider || "WHATSAPP_CLOUD_API",
            wabaId: d.config.wabaId || "",
            phoneNumberId: d.config.phoneNumberId || "",
            apiKey: d.config.apiKey || "",
            isActive: d.config.isActive !== false,
            enablePreBatchReminder: d.config.enablePreBatchReminder !== false,
            autoReminderDaysBefore: d.config.autoReminderDaysBefore || 10,
          });
        }
      }

      if (tmplRes.ok) {
        const d = await tmplRes.json().catch(() => null);
        if (d?.success && d.templates) {
          setTemplates(d.templates);
        }
      }

      if (memRes.ok) {
        const d = await memRes.json().catch(() => null);
        if (d?.success && Array.isArray(d.members)) {
          setMembers(d.members);
        }
      }

      if (bioRes.ok) {
        const d = await bioRes.json().catch(() => null);
        if (d?.success && Array.isArray(d.devices)) {
          setBiometricDevices(d.devices);
        }
      }
    } catch (err) {
      console.error("Error loading integration data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert("WhatsApp Integration settings and API key saved successfully!");
        setIsConfigModalOpen(false);
        loadData();
      } else {
        alert(data?.error || "Failed to save WhatsApp settings.");
      }
    } catch (err) {
      alert("Error saving WhatsApp settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/integrations/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(`Message template for "${editingTemplate.category}" saved successfully!`);
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        loadData();
      } else {
        alert(data?.error || "Failed to save template.");
      }
    } catch (err) {
      alert("Error saving template.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBiometricDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.name || !newDevice.deviceSerial) {
      alert("Please enter Device Name and Serial Number.");
      return;
    }
    setAddingDevice(true);
    try {
      const res = await authFetch("/api/v1/integrations/biometric/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDevice),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Biometric device connected successfully!");
        setNewDevice({
          name: "",
          deviceType: "ZKTeco Modern",
          deviceSerial: "",
          deviceIp: "192.168.1.201",
        });
        loadData();
      } else {
        alert(data?.error || "Failed to add biometric device.");
      }
    } catch (err) {
      alert("Error adding biometric device.");
    } finally {
      setAddingDevice(false);
    }
  };

  const fetchBiometricLogs = async (filter = logsFilter) => {
    setLogsLoading(true);
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/logs?filter=${filter}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.logs)) {
          setBiometricLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Error loading biometric logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearStaleCommands = async () => {
    setClearingStale(true);
    try {
      const res = await authFetch("/api/v1/integrations/biometric/clear-stale", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Stale commands cleared!");
        fetchBiometricLogs();
      } else {
        alert(data?.error || "Failed to clear stale commands.");
      }
    } catch (err) {
      alert("Error clearing stale commands.");
    } finally {
      setClearingStale(false);
    }
  };

  const handleDeleteBiometricDevice = async (id: string) => {
    if (!confirm("Are you sure you want to remove this biometric device?")) return;
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/devices/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      alert("Failed to delete device.");
    }
  };

  const handleClearAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to unlock the menu for "${name}"? This will send remote unlock commands to remove Super Admin locks on the device.`)) return;
    try {
      const res = await authFetch(`/api/v1/integrations/biometric/devices/${id}/clear-admin`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert(data.message || "Admin unlock commands queued successfully!");
      } else {
        alert(data?.error || "Failed to queue admin unlock commands.");
      }
    } catch (err) {
      alert("Error queueing admin unlock commands.");
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const selectAllMembers = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  };

  const handleSendWhatsAppMessages = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    setTestResult(null);

    const tmpl = templates.find((t) => t.category === selectedTestCategory);
    const templateContent = tmpl ? tmpl.content : "Test message from Marut Fitness Software.";

    let recipients: { name: string; phone: string; body: string }[] = [];

    if (recipientMode === "EXISTING_MEMBERS" || recipientMode === "ALL_ACTIVE") {
      const targetMembers =
        recipientMode === "ALL_ACTIVE"
          ? members.filter((m) => m.status === "ACTIVE")
          : members.filter((m) => selectedMemberIds.includes(m.id));

      if (targetMembers.length === 0) {
        setTestResult({
          success: false,
          message: "Please select at least one member to send the WhatsApp message.",
        });
        setTestSending(false);
        return;
      }

      recipients = targetMembers.map((m) => {
        const fullName = `${m.firstName} ${m.lastName || ""}`.trim();
        const activeSub = m.memberships?.find((s: any) => s.status === "ACTIVE") || m.memberships?.[0];
        const planName = activeSub?.plan?.name || "Standard Membership";
        const endDateStr = activeSub?.endDate ? new Date(activeSub.endDate).toLocaleDateString("en-IN") : "N/A";

        let daysLeft = "0";
        if (activeSub?.endDate) {
          const diffMs = new Date(activeSub.endDate).getTime() - new Date().getTime();
          daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24)).toString();
        }

        const body = templateContent
          .replace(/{FirstName}/g, m.firstName || "Member")
          .replace(/{LastName}/g, m.lastName || "")
          .replace(/{PlanName}/g, planName)
          .replace(/{DaysLeft}/g, daysLeft)
          .replace(/{BatchTime}/g, "06:00 AM")
          .replace(/{EndDate}/g, endDateStr)
          .replace(/{Amount}/g, activeSub?.totalAmount ? activeSub.totalAmount.toString() : "0")
          .replace(/{InvoiceNumber}/g, `INV-${m.memberCode}`)
          .replace(/{MemberCode}/g, m.memberCode || "")
          .replace(/{PendingAmount}/g, activeSub?.pendingAmount ? activeSub.pendingAmount.toString() : "0");

        return {
          name: fullName,
          phone: m.phone,
          body,
        };
      });
    } else {
      recipients = [
        {
          name: "Manual Recipient",
          phone: manualPhone,
          body: templateContent
            .replace(/{FirstName}/g, "Pandu")
            .replace(/{LastName}/g, "Ranga Rao")
            .replace(/{PlanName}/g, "CARDIO & STRENGTH")
            .replace(/{DaysLeft}/g, "7")
            .replace(/{BatchTime}/g, "06:00 AM")
            .replace(/{EndDate}/g, "07 Sept 2026")
            .replace(/{Amount}/g, "13000")
            .replace(/{InvoiceNumber}/g, "INV-685")
            .replace(/{MemberCode}/g, "685")
            .replace(/{PendingAmount}/g, "0"),
        },
      ];
    }

    try {
      const res = await authFetch("/api/v1/integrations/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          sendMode,
          templateName: sendMode === "TEMPLATE" ? templateName || "hello_world" : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTestResult({
          success: true,
          message: data.message || `Meta WhatsApp message sent to ${recipients.length} member(s) successfully!`,
          results: data.results,
        });
      } else {
        setTestResult({
          success: false,
          message: data?.error || "Failed to deliver Meta WhatsApp message. Please check API Key & permissions.",
          results: data?.results,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Network error sending WhatsApp message.",
      });
    } finally {
      setTestSending(false);
    }
  };

  const insertTag = (tag: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      content: editingTemplate.content + ` ${tag}`,
    });
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearchQuery.toLowerCase();
    const fullName = `${m.firstName} ${m.lastName || ""}`.toLowerCase();
    const phone = m.phone || "";
    const code = m.memberCode || "";
    return fullName.includes(q) || phone.includes(q) || code.includes(q);
  });

  const isConfigured = Boolean(config.apiKey && config.apiKey.trim().length > 0);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "EXPIRY_REMINDER":
        return <BellRing className="w-4 h-4 text-emerald-600" />;
      case "PAYMENT_RECEIPT":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "WELCOME_MESSAGE":
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case "DUE_ALERT":
        return <DollarSign className="w-4 h-4 text-rose-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Third-Party Hardware & Gateway Integrations</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure WhatsApp Automation API, Biometric Hardware Sync, and Payment Gateways.
            </p>
          </div>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* WhatsApp API Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 font-bold text-[10px] rounded-full uppercase ${
                    isConfigured
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  {isConfigured ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : null}
                  <span>{isConfigured ? "ACTIVE" : "API KEY REQUIRED"}</span>
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">WhatsApp Automation API</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Auto-send daily 1-hr pre-batch expiry reminders, payment receipts, fee alerts, and custom member greetings.
                </p>
              </div>

              {isConfigured && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Provider:</span>
                    <span className="font-semibold text-slate-800">{config.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">API Key:</span>
                    <span className="font-semibold text-emerald-700">
                      {config.apiKey.substring(0, 8)}••••••••
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">1-Hr Pre-Batch Reminders:</span>
                    <span className={`font-semibold ${config.enablePreBatchReminder ? "text-emerald-600" : "text-slate-500"}`}>
                      {config.enablePreBatchReminder ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setIsTestModalOpen(true)}
                disabled={!isConfigured}
                className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  isConfigured
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>🚀 Send WhatsApp Message</span>
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1.5"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>{isConfigured ? "Manage API Key & Settings" : "Configure WhatsApp API Key"}</span>
              </button>
            </div>
          </div>

          {/* Biometric Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                {(() => {
                  if (biometricDevices.length === 0) {
                    return (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 font-bold text-[10px] rounded-full uppercase bg-blue-100 text-blue-800 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>READY TO LINK</span>
                      </span>
                    );
                  }
                  const onlineCount = biometricDevices.filter((d) => d.status === "ONLINE" || d.isOnline).length;
                  if (onlineCount === biometricDevices.length) {
                    return (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 font-bold text-[10px] rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>ALL ONLINE ({onlineCount}/{biometricDevices.length})</span>
                      </span>
                    );
                  }
                  if (onlineCount === 0) {
                    return (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 font-bold text-[10px] rounded-full uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>ALL OFFLINE ({biometricDevices.length} Unit{biometricDevices.length > 1 ? "s" : ""})</span>
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 font-bold text-[10px] rounded-full uppercase bg-amber-100 text-amber-800 border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>{onlineCount}/{biometricDevices.length} ONLINE</span>
                    </span>
                  );
                })()}
              </div>
              <h3 className="text-base font-bold text-slate-900">Biometric & Turnstile Machine</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect eSSL / ZKTeco ADMS biometric finger & facial attendance hardware (e.g. K90, X900, MB20).
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Connected Devices:</span>
                  <span className="font-bold text-slate-900">{biometricDevices.length} Hardware Unit(s)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Push Server Domain:</span>
                  <span className="font-mono text-blue-600 font-bold">api.marutfit.com</span>
                </div>

                {/* Individual Device Status List */}
                {biometricDevices.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Hardware Units</div>
                    {biometricDevices.map((d) => {
                      const isOnline = d.status === "ONLINE" || d.isOnline;
                      const diffMs = d.lastPingDiffMs ?? (d.lastPing ? Math.max(0, Date.now() - new Date(d.lastPing).getTime()) : null);
                      return (
                        <div key={d.id} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px] shadow-2xs">
                          <div className="truncate pr-2">
                            <span className="font-bold text-slate-900 block truncate">{d.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">SN: {d.deviceSerial}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 font-bold text-[9px] rounded-full uppercase ${
                              isOnline ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                              <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
                            </span>
                            <div className={`text-[10px] font-semibold mt-0.5 ${isOnline ? "text-emerald-700" : "text-rose-600"}`}>
                              {isOnline ? `Online for ${formatDuration(diffMs)}` : `Offline for ${formatDuration(diffMs)}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  fetchBiometricLogs();
                  setIsBiometricLogsOpen(true);
                }}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-emerald-200"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📋 View Door Unlock & Device Logs</span>
              </button>
              <button
                onClick={() => setIsBiometricGuideOpen(true)}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-blue-200"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 Device Setup Guide (5 Steps)</span>
              </button>
              <button
                onClick={() => setIsBiometricManageOpen(true)}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Configure & Add Biometric Device</span>
              </button>
            </div>
          </div>

          {/* Payment Gateway Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Online Payment Gateway</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accept direct member UPI, QR, Debit/Credit Cards & NetBanking payments into gym accounts.
              </p>
              <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 font-semibold text-[10px] rounded-full">
                READY
              </span>
            </div>
            <button disabled className="w-full py-2 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl cursor-not-allowed">
              Gateway Enabled
            </button>
          </div>
        </div>

        {/* WhatsApp Message Templates Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Message Templates & Event Rules</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize message wording for different requirements (Expiry Reminders, Receipts, Welcome, Dues).
              </p>
            </div>
            <button
              onClick={() => setIsTestModalOpen(true)}
              disabled={!isConfigured}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 ${
                isConfigured ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message To Members</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        {getCategoryIcon(tmpl.category)}
                      </div>
                      <span className="font-bold text-xs text-slate-900">{tmpl.name}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 rounded-full">
                      {tmpl.category}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-sans leading-relaxed">
                    {tmpl.content}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-400 font-mono">Meta Template: {tmpl.metaTemplateName || "hello_world"}</span>
                  <button
                    onClick={() => {
                      setEditingTemplate(tmpl);
                      setIsTemplateModalOpen(true);
                    }}
                    className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Template</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Biometric Device Setup Guide (Exact Step-by-Step Match) */}
        {isBiometricGuideOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Device Setup Guide</h3>
                  <p className="text-[11px] text-slate-500">eSSL / ZKTeco ADMS device setup for Marut Fitness Software (e.g. K90/X900/MB20)</p>
                </div>
                <button onClick={() => setIsBiometricGuideOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prerequisites Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                  <strong>Before you begin:</strong> You will need a LAN cable (or WiFi for MB-series devices), a router, and a phone or laptop on the same network.
                </p>
              </div>

              {/* 5 Steps Timeline */}
              <div className="space-y-5 text-xs text-slate-800 pt-1">
                {/* Step 1 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Connect the device to your router</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Plug a LAN cable into the back of your device and into any free port on your router. For MB-series WiFi models, connect via the device&apos;s WiFi settings instead.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Find your router&apos;s Gateway IP</h4>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>Android:</strong> Settings &rarr; WiFi &rarr; tap the (i) info icon next to your network &rarr; look for &quot;Gateway&quot;.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>iPhone:</strong> Settings &rarr; WiFi &rarr; tap the (i) info icon &rarr; look for &quot;Router&quot;.
                    </p>
                    <p className="text-slate-500 font-mono text-[11px]">Usually looks like 192.168.1.1 or 192.168.0.1.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-2 w-full">
                    <h4 className="font-bold text-slate-900">Ethernet settings</h4>
                    <p className="text-slate-600">
                      On the device: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Menu &rarr; Comm (or Communication) &rarr; Ethernet</code>
                    </p>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">DHCP:</span>
                        <span className="font-bold text-slate-900">OFF (Must be OFF for fixed IP)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gateway:</span>
                        <span className="font-bold text-slate-900">Your Gateway IP (e.g. 192.168.1.1)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">IP Address:</span>
                        <span className="font-bold text-slate-900">Same as gateway, last number &rarr; 201</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subnet Mask:</span>
                        <span className="font-bold text-slate-900">255.255.255.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">DNS:</span>
                        <span className="font-bold text-slate-900">8.8.8.8</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    4
                  </div>
                  <div className="space-y-2 w-full">
                    <h4 className="font-bold text-slate-900">Cloud server settings</h4>
                    <p className="text-slate-600">
                      On the device: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Menu &rarr; Comm &rarr; Cloud Server</code>
                    </p>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Server Mode:</span>
                        <span className="font-bold text-slate-900">ADMS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Enable Domain Name:</span>
                        <span className="font-bold text-slate-900">ON</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Server Address:</span>
                        <span className="font-bold text-blue-600">api.marutfit.com</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Server Port:</span>
                        <span className="font-bold text-slate-900">80</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Enable Proxy / HTTPS:</span>
                        <span className="font-bold text-slate-900">OFF</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900">Restart the device & Link Serial Number</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Go to <code className="bg-slate-100 px-1 rounded">Menu &rarr; System &rarr; Reboot</code> (or cut power for 30s). Wait for the device to connect, then tap <strong>&quot;Configure & Add Biometric Device&quot;</strong> and enter the Serial Number printed on the back.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsBiometricGuideOpen(false);
                    setIsBiometricManageOpen(true);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Connect & Link Device Now &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Manage & Add Biometric Devices */}
        {isBiometricManageOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Manage Biometric Devices</h3>
                    <p className="text-[11px] text-slate-500">Link eSSL / ZKTeco Hardware Units to Gym Software</p>
                  </div>
                </div>
                <button onClick={() => setIsBiometricManageOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add New Device Form */}
              <form onSubmit={handleAddBiometricDevice} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Link New Biometric Hardware Unit</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Device Name / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Front Gate Turnstile"
                      value={newDevice.name}
                      onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Device Model / Protocol *</label>
                    <select
                      value={newDevice.deviceType}
                      onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      <option value="ZKTeco Modern">ZKTeco Modern (Recommended)</option>
                      <option value="ZKTeco Standard">ZKTeco Standard (Older Firmware)</option>
                      <option value="ZKTeco Full Fields">ZKTeco Full Fields (Passwd/Card/Grp/TZ)</option>
                      <option value="ZKTeco Strict Timezone">ZKTeco Strict Timezone (Grp/TZ)</option>
                      <option value="ZKTeco Legacy">ZKTeco Legacy (Old Wipe Protocol)</option>
                      <option value="Realtime">Realtime Biometric</option>
                      <option value="Biomax">Biomax Hardware</option>
                      <option value="Matrix">Matrix COSEC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Device Serial Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CL7X2048001"
                      value={newDevice.deviceSerial}
                      onChange={(e) => setNewDevice({ ...newDevice, deviceSerial: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Device Fixed Local IP</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.201"
                      value={newDevice.deviceIp}
                      onChange={(e) => setNewDevice({ ...newDevice, deviceIp: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={addingDevice}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingDevice ? "Linking..." : "Link Hardware Device"}</span>
                  </button>
                </div>
              </form>

              {/* Registered Devices List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Registered Hardware Devices ({biometricDevices.length})</h4>
                
                {biometricDevices.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl italic text-xs">
                    No biometric devices linked yet. Follow the 5-step guide above to connect your hardware!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {biometricDevices.map((d) => {
                      const isOnline = d.status === "ONLINE" || d.isOnline;
                      const diffMs = d.lastPingDiffMs ?? (d.lastPing ? Math.max(0, Date.now() - new Date(d.lastPing).getTime()) : null);
                      const lastActiveStr = d.lastPing
                        ? new Date(d.lastPing).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "Never";

                      return (
                        <div
                          key={d.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs text-xs"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                                isOnline
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-rose-50 text-rose-600 border border-rose-200"
                              }`}
                            >
                              <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-bold text-slate-900">{d.name}</p>
                                <span
                                  className={`px-2 py-0.5 font-bold text-[9px] rounded-full uppercase border ${
                                    isOnline
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : "bg-rose-100 text-rose-800 border-rose-300"
                                  }`}
                                >
                                  {isOnline ? "ONLINE" : "OFFLINE"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                SN: <span className="font-bold text-slate-800">{d.deviceSerial}</span> | IP: {d.deviceIp || "192.168.1.201"} | Protocol: {d.deviceType || "ZKTeco Standard"}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                                {isOnline ? (
                                  <span className="text-emerald-700">🟢 Online for {formatDuration(diffMs)} (Last ping: {lastActiveStr})</span>
                                ) : (
                                  <span className="text-rose-600">🔴 Offline for {formatDuration(diffMs)} (Last active: {lastActiveStr})</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleClearAdmin(d.id, d.name)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 shadow-2xs"
                              title="Unlock device menu remotely if admin fingerprint is lost"
                            >
                              <Unlock className="w-3 h-3 text-amber-700" />
                              <span>Unlock Menu</span>
                            </button>
                            <button
                              onClick={() => handleDeleteBiometricDevice(d.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remove device"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsBiometricManageOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Biometric & Door Unlock Logs */}
        {isBiometricLogsOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Door Unlock & Biometric Device Logs</h3>
                    <p className="text-[11px] text-slate-500">Live execution history of remote door unlocks, user sync, and device commands</p>
                  </div>
                </div>
                <button onClick={() => setIsBiometricLogsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters & Actions Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">Filter Log Type:</span>
                  <div className="flex items-center space-x-1 bg-white p-1 border rounded-lg shadow-2xs">
                    {(["ALL", "UNLOCK", "SYNC_BLOCK"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setLogsFilter(f);
                          fetchBiometricLogs(f);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          logsFilter === f ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {f === "ALL" ? "All Logs" : f === "UNLOCK" ? "Door Unlocks Only" : "User Sync & Blocks"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchBiometricLogs(logsFilter)}
                    disabled={logsLoading}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg text-xs flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin text-emerald-600" : ""}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={handleClearStaleCommands}
                    disabled={clearingStale}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-lg text-xs flex items-center space-x-1 shadow-2xs"
                    title="Expires PENDING commands older than 3 minutes"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${clearingStale ? "animate-spin" : ""}`} />
                    <span>{clearingStale ? "Clearing..." : "Clear Stale Pending"}</span>
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                {logsLoading ? (
                  <div className="p-8 text-center text-slate-500 font-medium">Loading logs...</div>
                ) : biometricLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">No door unlock or biometric logs found.</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Time</th>
                          <th className="p-2.5">Device Serial</th>
                          <th className="p-2.5">Action / Command</th>
                          <th className="p-2.5">Target Member / Staff</th>
                          <th className="p-2.5 text-center">Duration</th>
                          <th className="p-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {biometricLogs.map((l) => {
                          const cmd = l.command || "";
                          const isUnlock = cmd.includes("AC_UNELOCK") || cmd.includes("AC_UNLOCK") || cmd.includes("Door1Open") || cmd.includes("RELAY");
                          const actionLabel = isUnlock
                            ? "REMOTE DOOR UNLOCK"
                            : cmd.includes("DATA USER") || cmd.includes("USER")
                            ? "SYNC USER (ALLOW ACCESS)"
                            : cmd.includes("DATA DELETE USER") || cmd.includes("DELETE USER")
                            ? "BLOCK USER (EXPIRED)"
                            : cmd;

                          // Calculate execution duration
                          const start = l.createdAt ? new Date(l.createdAt).getTime() : 0;
                          const end = (l.status === "EXECUTED" || l.status === "FAILED") && l.updatedAt
                            ? new Date(l.updatedAt).getTime()
                            : Date.now();
                          const diffMs = start > 0 ? Math.max(0, end - start) : 0;
                          const diffSec = Math.floor(diffMs / 1000);

                          let durationText = "-";
                          if (start > 0) {
                            if (l.status === "PENDING") {
                              durationText = `${diffSec}s (pending)`;
                            } else if (diffMs < 1000) {
                              durationText = `${diffMs}ms`;
                            } else if (diffSec < 60) {
                              durationText = `${(diffMs / 1000).toFixed(1)}s`;
                            } else {
                              const mins = Math.floor(diffSec / 60);
                              const remSec = diffSec % 60;
                              durationText = `${mins}m ${remSec}s`;
                            }
                          }

                          return (
                            <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(l.createdAt).toLocaleString("en-IN", {
                                  dateStyle: "short",
                                  timeStyle: "medium",
                                })}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                                {l.device?.deviceSerial || l.device?.name || "All Devices"}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isUnlock
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-blue-50 text-blue-800 border border-blue-200"
                                  }`}
                                >
                                  {isUnlock && <Unlock className="w-3 h-3 text-emerald-600" />}
                                  <span>{actionLabel}</span>
                                </span>
                              </td>
                              <td className="p-2.5 font-medium text-slate-700">
                                {l.member ? (
                                  <span>
                                    {l.member.firstName} {l.member.lastName || ""} (#{l.member.memberCode})
                                  </span>
                                ) : l.staff ? (
                                  <span>
                                    Staff: {l.staff.firstName} {l.staff.lastName || ""}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">ALL CONNECTED DEVICES</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono text-[11px] font-bold text-slate-600 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded ${
                                  l.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : diffSec <= 3
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : diffSec <= 10
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  {durationText}
                                </span>
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    l.status === "EXECUTED" || l.status === "SUCCESS"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : l.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-between items-center text-xs text-slate-500">
                <span>Showing last 100 log events.</span>
                <button
                  type="button"
                  onClick={() => setIsBiometricLogsOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 1: WhatsApp API Configuration */}
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Configure WhatsApp API Key</h3>
                    <p className="text-[11px] text-slate-500">Connect Provider & Enable Pre-Batch Reminders</p>
                  </div>
                </div>
                <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Service Provider *</label>
                  <select
                    value={config.provider}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                  >
                    <option value="WHATSAPP_CLOUD_API">Meta WhatsApp Cloud API (Official)</option>
                    <option value="TWILIO">Twilio WhatsApp API</option>
                    <option value="ULTRAMSG">UltraMsg Gateway</option>
                    <option value="WATI">WATI WhatsApp API</option>
                    <option value="GENERIC_WEBHOOK">Custom WhatsApp Webhook / Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp API Key / Permanent Access Token *</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      required
                      placeholder="Enter API Key (e.g. EAAL...)"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      className="w-full pl-3 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number ID / Sender</label>
                    <input
                      type="text"
                      placeholder="e.g. 1048572910"
                      value={config.phoneNumberId}
                      onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">WABA ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2938102931"
                      value={config.wabaId}
                      onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Automated 1-Hr Pre-Batch Expiry Reminders</span>
                    <input
                      type="checkbox"
                      checked={config.enablePreBatchReminder}
                      onChange={(e) => setConfig({ ...config, enablePreBatchReminder: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Sends automated daily WhatsApp reminders 1 hour before member batch start times for plans expiring in &le; 10 days until 10 days after expiry.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-sm"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Send WhatsApp Message */}
        {isTestModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Send WhatsApp Message</h3>
                    <p className="text-[11px] text-slate-500">Select Multiple Existing Members & Payload Mode</p>
                  </div>
                </div>
                <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendWhatsAppMessages} className="space-y-4 text-xs">
                {/* Delivery Mode Banner (Meta Template vs Direct Text) */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-900 text-xs">
                      <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>Meta Cloud API Delivery Mode</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] font-bold">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="sendMode"
                          value="TEMPLATE"
                          checked={sendMode === "TEMPLATE"}
                          onChange={() => setSendMode("TEMPLATE")}
                          className="text-blue-600"
                        />
                        <span>Approved Meta Template (Recommended)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="sendMode"
                          value="TEXT"
                          checked={sendMode === "TEXT"}
                          onChange={() => setSendMode("TEXT")}
                          className="text-blue-600"
                        />
                        <span>Direct Custom Text</span>
                      </label>
                    </div>
                  </div>

                  {sendMode === "TEMPLATE" ? (
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      <strong>Meta Approved Template Mode</strong> delivers messages instantly to any recipient phone number regardless of whether they messaged the gym first (bypasses Meta&apos;s 24-hour customer window limit).
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      <strong>Direct Custom Text Mode</strong> allows sending custom text, but Meta will only deliver if the member messaged your WhatsApp Business number within the last 24 hours.
                    </p>
                  )}

                  {sendMode === "TEMPLATE" && (
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="font-semibold text-amber-900">Meta Template Name:</span>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="hello_world"
                        className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono text-slate-800 w-36 font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Recipient Selection Mode Tabs */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Recipient Selection Mode *</label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRecipientMode("EXISTING_MEMBERS")}
                      className={`py-2 px-2 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center space-x-1 ${
                        recipientMode === "EXISTING_MEMBERS"
                          ? "bg-white text-blue-600 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Choose Members</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode("ALL_ACTIVE")}
                      className={`py-2 px-2 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center space-x-1 ${
                        recipientMode === "ALL_ACTIVE"
                          ? "bg-white text-emerald-600 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>All Active ({members.filter((m) => m.status === "ACTIVE").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode("MANUAL")}
                      className={`py-2 px-2 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center space-x-1 ${
                        recipientMode === "MANUAL"
                          ? "bg-white text-purple-600 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Manual Phone</span>
                    </button>
                  </div>
                </div>

                {/* Recipient Mode 1: Multi-Select Existing Members */}
                {recipientMode === "EXISTING_MEMBERS" && (
                  <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        Selected Members ({selectedMemberIds.length})
                      </span>
                      <button
                        type="button"
                        onClick={selectAllMembers}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        {selectedMemberIds.length === members.length ? "Deselect All" : `Select All (${members.length})`}
                      </button>
                    </div>

                    {/* Selected Chips */}
                    {selectedMemberIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                        {members
                          .filter((m) => selectedMemberIds.includes(m.id))
                          .map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded-lg border border-blue-200"
                            >
                              <span>
                                {m.firstName} {m.lastName || ""} ({m.phone})
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleMemberSelection(m.id)}
                                className="hover:text-rose-600 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Member Search & List */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search member name or phone..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                      {filteredMembers.map((m) => {
                        const isSelected = selectedMemberIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleMemberSelection(m.id)}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">
                                  {m.firstName} {m.lastName || ""}{" "}
                                  <span className="text-[10px] text-slate-400 font-mono">#{m.memberCode}</span>
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">{m.phone}</p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                                m.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                        );
                      })}
                      {filteredMembers.length === 0 && (
                        <div className="p-4 text-center text-slate-400 italic">No members found matching query.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recipient Mode 2: All Active Members Banner */}
                {recipientMode === "ALL_ACTIVE" && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3">
                    <UserCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 text-xs">Broadcast to All Active Members</h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        WhatsApp message will be sent to all{" "}
                        <strong>{members.filter((m) => m.status === "ACTIVE").length} active members</strong> with registered phone numbers.
                      </p>
                    </div>
                  </div>
                )}

                {/* Recipient Mode 3: Manual Phone Entry */}
                {recipientMode === "MANUAL" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Manual WhatsApp Number *</label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9059059751 or +919059059751"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 font-mono font-medium text-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Message Template Requirement</label>
                  <select
                    value={selectedTestCategory}
                    onChange={(e) => setSelectedTestCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                  >
                    <option value="EXPIRY_REMINDER">Membership Pre-Batch Expiry Reminder</option>
                    <option value="PAYMENT_RECEIPT">Payment Receipt Confirmation</option>
                    <option value="WELCOME_MESSAGE">New Member Welcome Message</option>
                    <option value="DUE_ALERT">Pending Dues Alert</option>
                  </select>
                </div>

                {/* Message Body Live Preview */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Wording Preview</label>
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans shadow-2xs">
                    {(() => {
                      const tmpl = templates.find((t) => t.category === selectedTestCategory);
                      return tmpl ? tmpl.content : "Test message from Marut Fitness Software.";
                    })()}
                  </div>
                </div>

                {/* Delivery Feedback */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs border space-y-2 ${
                      testResult.success
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>

                    {Array.isArray(testResult.results) && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-200/50 pt-1 font-mono text-[11px]">
                        {testResult.results.map((r, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1">
                            <div>
                              <p className="font-semibold text-slate-900">{r.name} (+{r.phone})</p>
                              {r.wmid && <p className="text-[10px] text-emerald-700 font-mono truncate max-w-xs">wmid: {r.wmid}</p>}
                            </div>
                            <span className={r.status === "SENT" ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                              {r.status} {r.error ? `(${r.error})` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsTestModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={testSending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {testSending
                        ? "Delivering..."
                        : recipientMode === "EXISTING_MEMBERS"
                        ? `Send to ${selectedMemberIds.length} Member(s)`
                        : recipientMode === "ALL_ACTIVE"
                        ? `Broadcast to ${members.filter((m) => m.status === "ACTIVE").length} Active Members`
                        : "Send WhatsApp Message"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Edit Message Template Wording */}
        {isTemplateModalOpen && editingTemplate && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Edit Message Template</h3>
                    <p className="text-[11px] text-slate-500">{editingTemplate.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requirement Event Name</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Meta Approved Template Name (For 24-hr bypass)</label>
                  <input
                    type="text"
                    value={editingTemplate.metaTemplateName || "hello_world"}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, metaTemplateName: e.target.value })}
                    placeholder="e.g. hello_world or membership_reminder"
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Message Content & Dynamic Variables *</label>
                    <span className="text-[10px] text-purple-600 font-medium">Click tag below to insert</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {["{FirstName}", "{LastName}", "{PlanName}", "{DaysLeft}", "{BatchTime}", "{EndDate}", "{Amount}", "{InvoiceNumber}", "{MemberCode}", "{PendingAmount}"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        className="px-2 py-0.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-semibold rounded-lg transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    required
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 font-sans leading-relaxed text-slate-800"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm"
                  >
                    {saving ? "Saving..." : "Save Template"}
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
