"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Phone, Mail, User, Lock, ArrowRight, CheckCircle2, ArrowLeft, Shield, UserCheck } from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "@/lib/apiConfig";

export default function SignupPage() {
  const router = useRouter();
  const [signupType, setSignupType] = useState<"NEW_GYM" | "JOIN_GYM">("NEW_GYM");

  // State for NEW GYM FACILITY
  const [facilityForm, setFacilityForm] = useState({
    gymName: "",
    location: "",
    contactPhone: "",
    contactEmail: "",
    ownerName: "",
    password: "",
  });

  // State for JOIN EXISTING GYM USER
  const [userForm, setUserForm] = useState({
    tenantId: "",
    name: "",
    email: "",
    phone: "",
    staffType: "TRAINER",
    password: "",
  });

  const [facilities, setFacilities] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState("");

  // Load public facilities and roles on component mount
  useEffect(() => {
    fetch(getApiUrl("/api/v1/tenants/public-list"))
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setFacilities(data.facilities || []);
          setRoles(data.roles || []);
          if (data.facilities?.length > 0) {
            setUserForm((prev) => ({ ...prev, tenantId: data.facilities[0].id }));
          }
        }
      })
      .catch((err) => console.error("Error loading facilities:", err));
  }, []);

  const handleFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(getApiUrl("/api/v1/tenants/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facilityForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Registration failed. Please check form inputs.");
        setLoading(false);
        return;
      }

      setSubmittedMessage(`Your registration request for "${facilityForm.gymName}" has been submitted and is pending approval by the System Administrator.`);
      setSubmitted(true);
    } catch {
      setError("Network error. Please check backend connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(getApiUrl("/api/v1/tenants/register-user"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "User registration failed. Please check form inputs.");
        setLoading(false);
        return;
      }

      setSubmittedMessage(data.message || "User account registration submitted successfully! Awaiting approval from your Gym Owner or Administrator.");
      setSubmitted(true);
    } catch {
      setError("Network error. Please check backend connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-800 relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <img
              src="/marut_hanuman_logo.png"
              alt="Marut Fitness Software Logo"
              className="w-12 h-12 rounded-full object-cover border border-amber-500/30"
            />
            <div>
              <h1 className="text-lg font-extrabold text-white">Marut Fitness Software</h1>
              <p className="text-xs text-slate-400">Account & Facility Registration</p>
            </div>
          </div>
          <Link
            href="/login"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Login</span>
          </Link>
        </div>

        {/* Tab Switcher */}
        {!submitted && (
          <div className="grid grid-cols-2 gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                setSignupType("NEW_GYM");
                setError("");
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                signupType === "NEW_GYM"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>New Gym Facility</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSignupType("JOIN_GYM");
                setError("");
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                signupType === "JOIN_GYM"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Join Existing Gym</span>
            </button>
          </div>
        )}

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Registration Submitted!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              {submittedMessage}
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : signupType === "NEW_GYM" ? (
          /* FORM 1: REGISTER NEW GYM FACILITY */
          <form onSubmit={handleFacilitySubmit} className="space-y-4 text-xs" autoComplete="off">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl font-medium leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Gym Facility Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gold Standard Fitness & Gym"
                    value={facilityForm.gymName}
                    onChange={(e) => setFacilityForm({ ...facilityForm, gymName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Gym Location / Address *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Road No 10, Jubilee Hills, Hyderabad"
                    value={facilityForm.location}
                    onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={facilityForm.contactPhone}
                    onChange={(e) => setFacilityForm({ ...facilityForm, contactPhone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. owner@gym.com"
                    value={facilityForm.contactEmail}
                    onChange={(e) => setFacilityForm({ ...facilityForm, contactEmail: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Owner Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Reddy"
                    value={facilityForm.ownerName}
                    onChange={(e) => setFacilityForm({ ...facilityForm, ownerName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={facilityForm.password}
                    onChange={(e) => setFacilityForm({ ...facilityForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? "Submitting Registration..." : "Submit Facility Registration"}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>
        ) : (
          /* FORM 2: JOIN EXISTING GYM USER */
          <form onSubmit={handleUserSubmit} className="space-y-4 text-xs" autoComplete="off">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl font-medium leading-relaxed">
                {error}
              </div>
            )}

            {/* Select Gym Facility */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">Select Gym Facility *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                <select
                  required
                  value={userForm.tenantId}
                  onChange={(e) => setUserForm({ ...userForm, tenantId: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 appearance-none"
                >
                  {facilities.length === 0 ? (
                    <option value="">No Active Gyms Found</option>
                  ) : (
                    facilities.map((fac) => (
                      <option key={fac.id} value={fac.id} className="bg-slate-900 text-white">
                        {fac.name} {fac.branding?.address ? `(${fac.branding.address})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Select User Role */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">Select Gym User Role *</label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                <select
                  required
                  value={userForm.staffType}
                  onChange={(e) => setUserForm({ ...userForm, staffType: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 appearance-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Mobile Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || facilities.length === 0}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? "Submitting Request..." : "Submit User Registration"}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
