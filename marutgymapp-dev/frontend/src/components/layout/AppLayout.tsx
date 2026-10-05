"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "../theme/ThemeProvider";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarCheck,
  CircleDollarSign,
  UserCheck,
  Briefcase,
  FormInput,
  BarChart3,
  Palette,
  Sliders,
  ShieldCheck,
  LogOut,
  Search,
  Menu,
  X,
  Dumbbell,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Trophy,
} from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { branding, setBranding } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [isUnlockingDoor, setIsUnlockingDoor] = useState(false);
  const [toastNotice, setToastNotice] = useState<{ show: boolean; message: string; type: "success" | "error" } | null>(null);

  const handleRemoteUnlockDoor = async () => {
    try {
      setIsUnlockingDoor(true);
      const res = await authFetch("/api/v1/integrations/biometric/unlock-door", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setToastNotice({
          show: true,
          message: data.message || "Door unlock command sent! The door relay will open immediately.",
          type: "success",
        });
      } else {
        setToastNotice({
          show: true,
          message: data?.error || "Failed to trigger door unlock.",
          type: "error",
        });
      }
    } catch (err) {
      setToastNotice({
        show: true,
        message: "Error sending door unlock command.",
        type: "error",
      });
    } finally {
      setIsUnlockingDoor(false);
      setTimeout(() => setToastNotice(null), 4000);
    }
  };

  const [businessCode, setBusinessCode] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user");
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {}
      }
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    authFetch("/api/v1/auth/me")
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.success && data.user) {
          setUser(data.user);
          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(data.user));
          }
          if (data.user.branding) {
            setBranding(data.user.branding);
          }
        }
      })
      .catch(() => {});

    authFetch("/api/v1/tenants/branding")
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.businessCode) {
          setBusinessCode(data.businessCode);
        }
      })
      .catch(() => {});
  }, [pathname, router, setBranding]);

  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  // Check if current logged-in user is Owner or Manager
  const isOwnerOrManager = Boolean(
    !user ||
      user?.isSuperAdmin ||
      (user?.role || "").toUpperCase().includes("OWNER") ||
      (user?.role || "").toUpperCase().includes("MANAGER") ||
      user?.role === "Gym Owner"
  );

  // Route Guard: Redirect non-owner roles away from restricted sensitive pages
  useEffect(() => {
    if (mounted && user) {
      if (isSuperAdmin) {
        if (pathname !== "/platform-admin" && pathname !== "/dashboard" && !pathname.startsWith("/competitions")) {
          router.push("/dashboard");
        }
      } else if (!isOwnerOrManager) {
        const restrictedPages = [
          "/staff",
          "/finance",
          "/reports",
          "/white-label",
          "/custom-fields",
          "/integrations",
          "/platform-admin",
        ];
        if (restrictedPages.some((p) => pathname.startsWith(p))) {
          router.push("/dashboard");
        }
      }
    }
  }, [mounted, user, pathname, isOwnerOrManager, isSuperAdmin, router]);

  const handleLogout = async () => {
    await authFetch("/api/v1/auth/logout", { method: "POST" });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  let navItems: { name: string; href: string; icon: any }[] = [];

  if (isSuperAdmin) {
    // Super Admin gets Dashboard and Control Center tabs
    navItems = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Control Center", href: "/platform-admin", icon: ShieldCheck },
      { name: "Competitions", href: "/competitions", icon: Trophy },
    ];
  } else {
    // Standard Gym Navigation Items
    navItems = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Members", href: "/members", icon: Users },
      { name: "Memberships", href: "/memberships", icon: CreditCard },
      { name: "Attendance", href: "/attendance", icon: CalendarCheck },
      { name: "Competitions", href: "/competitions", icon: Trophy },
      { name: "Finance", href: "/finance", icon: CircleDollarSign },
      { name: "CRM / Leads", href: "/leads", icon: UserCheck },
      { name: "Staff & Workouts", href: "/staff", icon: Briefcase },
      { name: "Custom Fields", href: "/custom-fields", icon: FormInput },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "White-Label Brand", href: "/white-label", icon: Palette },
      { name: "Integrations", href: "/integrations", icon: Sliders },
    ];

    // Hide sensitive financial and staff management items from Receptionists and non-owners
    if (mounted && user && !isOwnerOrManager) {
      const restrictedHrefs = ["/finance", "/staff", "/reports", "/white-label", "/custom-fields", "/integrations"];
      navItems = navItems.filter((item) => !restrictedHrefs.includes(item.href));
    }
  }

  // Global member search
  // Debounced to avoid an API request for every keystroke.
  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchOpen(false);
      setGlobalSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setGlobalSearchLoading(true);
        setGlobalSearchOpen(true);

        const res = await authFetch(
          `/api/v1/members?search=${encodeURIComponent(query)}&status=ALL`
        );

        if (!res.ok) {
          if (!cancelled) {
            setGlobalSearchResults([]);
          }
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          const results = Array.isArray(data?.members)
            ? data.members.slice(0, 8)
            : [];

          setGlobalSearchResults(results);
          setGlobalSearchOpen(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Global member search failed:", err);
          setGlobalSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setGlobalSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  // Close global search results with Escape.
  useEffect(() => {
    const handleGlobalSearchEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGlobalSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleGlobalSearchEscape);

    return () => {
      window.removeEventListener("keydown", handleGlobalSearchEscape);
    };
  }, []);

  const handleGlobalMemberSelect = (member: any) => {
    setGlobalSearchOpen(false);
    setSearchQuery("");
    router.push("/members");
  };

  // Keyboard shortcut '/' for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("global-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const businessName = isSuperAdmin
    ? "Marut Fitness Software"
    : branding?.businessName || user?.tenantName || "Marut Fitness Software";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* White-Label Logo & Brand Name */}
          <Link href={isSuperAdmin ? "/platform-admin" : "/dashboard"} className="flex items-center space-x-3 group">
            {isSuperAdmin ? (
              <img
                src="/marut_hanuman_logo.png"
                alt="Marut Fitness Software Emblem"
                className="w-9 h-9 rounded-xl object-cover border border-amber-500/40 shadow-xs"
              />
            ) : branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={businessName} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Dumbbell className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors" suppressHydrationWarning>
                  {mounted ? businessName : "Marut Fitness Software"}
                </span>
                {!isSuperAdmin && businessCode && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold rounded-md" title="4-Digit Numeric Business Code for Bulk QR Stickers">
                    Code: {businessCode}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
                {isSuperAdmin ? "Control Center & Platform Admin" : "Fitness Operating System"}
              </p>
            </div>
          </Link>
        </div>

        {/* Global Search & User Bar */}
        <div className="flex items-center space-x-4">
          {!isSuperAdmin && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRemoteUnlockDoor}
                disabled={isUnlockingDoor}
                title="Remote Unlock Door via Biometric Device Relay"
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-xs border ${
                  isUnlockingDoor
                    ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse cursor-wait"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-500/30 hover:scale-[1.03] active:scale-[0.97] shadow-emerald-500/20"
                }`}
              >
                <DoorOpen className={`w-4 h-4 ${isUnlockingDoor ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">
                  {isUnlockingDoor ? "Unlocking..." : "Unlock Door"}
                </span>
                <span className="sm:hidden">Unlock</span>
              </button>

              <div className="relative hidden md:block w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 z-10" />

                <input
                  id="global-search-input"
                  type="text"
                  placeholder="Search members, payments... (/)"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) {
                      setGlobalSearchOpen(true);
                    }
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setGlobalSearchOpen(e.target.value.trim().length >= 2);
                  }}
                  className="w-full pl-9 pr-9 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />

                {globalSearchLoading && (
                  <div className="absolute right-3 top-2.5 w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                )}

                {globalSearchOpen && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                    {globalSearchLoading ? (
                      <div className="px-4 py-3 text-xs text-slate-500">
                        Searching members...
                      </div>
                    ) : globalSearchResults.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        {globalSearchResults.map((member: any) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleGlobalMemberSelect(member)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {member.firstName || ""}
                                  {member.lastName
                                    ? ` ${member.lastName}`
                                    : ""}
                                </div>

                                <div className="mt-0.5 text-[10px] text-slate-500 truncate">
                                  {member.memberCode
                                    ? `Member #${member.memberCode}`
                                    : ""}
                                  {member.phone
                                    ? ` • ${member.phone}`
                                    : ""}
                                </div>
                              </div>

                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  member.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {member.status || "UNKNOWN"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-center">
                        <div className="text-xs font-semibold text-slate-700">
                          No members found
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          Try a different name, member code, phone, or email.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-xs" suppressHydrationWarning>
              {mounted && user?.name ? user.name[0].toUpperCase() : "A"}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight" suppressHydrationWarning>
                {mounted ? user?.name || "Super Admin" : "Super Admin"}
              </p>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-extrabold" suppressHydrationWarning>
                {mounted ? user?.role || "Super Admin" : "Super Admin"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors flex items-center space-x-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-semibold hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification for Remote Door Unlock */}
      {toastNotice && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 ${
            toastNotice.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-500/20"
          }`}
        >
          {toastNotice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastNotice.message}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden transition-opacity" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`absolute lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col transform transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-4 flex-1 overflow-y-auto space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200/80 text-xs text-slate-500">
            <p className="font-semibold text-slate-700" suppressHydrationWarning>
              {mounted ? businessName : "Marut Fitness Software"}
            </p>
            <p className="text-[10px] text-slate-400">
              {isSuperAdmin ? "Platform Control Center" : "Operating System v1.0"}
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
