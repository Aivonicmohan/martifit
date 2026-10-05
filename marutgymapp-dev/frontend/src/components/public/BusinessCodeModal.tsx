"use client";

import React, { useState } from "react";
import { getApiUrl } from "@/lib/apiConfig";
import { Dumbbell, ArrowRight, AlertCircle, CheckCircle2, Building2 } from "lucide-react";

interface BusinessCodeModalProps {
  isOpen: boolean;
  onCodeValidated: (tenant: { id: string; name: string; businessCode: string; businessName: string; logoUrl: string | null }) => void;
  title?: string;
  description?: string;
}

export default function BusinessCodeModal({
  isOpen,
  onCodeValidated,
  title = "Enter Facility Business Code",
  description = "Please enter the 4-digit numeric code printed under the QR code sticker at your facility."
}: BusinessCodeModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validatedTenant, setValidatedTenant] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleVerifyCode = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || code).trim();
    if (!targetCode) {
      setError("Please enter a valid numeric business code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(getApiUrl(`/api/v1/public/tenants/by-code/${encodeURIComponent(targetCode)}`));
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid facility business code. Please check and try again.");
        setValidatedTenant(null);
        setLoading(false);
        return;
      }

      setValidatedTenant(data.tenant);
      
      // Save to localStorage for convenience on returning scans
      if (typeof window !== "undefined") {
        localStorage.setItem("marut_business_code", data.tenant.businessCode || targetCode);
        localStorage.setItem("marut_tenant_id", data.tenant.id);
        localStorage.setItem("marut_tenant_name", data.tenant.businessName || data.tenant.name);
      }

      setTimeout(() => {
        onCodeValidated(data.tenant);
      }, 600);
    } catch (err: any) {
      console.error("Code validation error:", err);
      setError("Network error validating code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
    setCode(val);
    setError("");

    // Auto-trigger validation if 4 numbers entered
    if (val.length === 4) {
      handleVerifyCode(val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-center w-14 h-14 bg-blue-600/20 text-blue-400 rounded-2xl mb-4 mx-auto border border-blue-500/30">
          <Building2 className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-center text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400 text-center mt-1 mb-6 leading-relaxed">{description}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {validatedTenant ? (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-center animate-in fade-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Facility Found</p>
            <p className="text-lg font-bold text-white mt-1">{validatedTenant.businessName || validatedTenant.name}</p>
            <p className="text-xs text-emerald-400/80 mt-1">Loading form...</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyCode();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs uppercase font-semibold tracking-wider text-slate-400 mb-2 text-center">
                Facility Business Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9a-zA-Z]*"
                maxLength={8}
                value={code}
                onChange={handleCodeChange}
                placeholder="e.g. 1001"
                autoFocus
                className="w-full text-center text-3xl font-mono tracking-widest bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-3 px-4 text-white font-bold placeholder:text-slate-600 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Validating Facility...
                </span>
              ) : (
                <>
                  <span>Confirm Facility Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Scanning from a sticker? The 4-digit code is written in the <span className="text-slate-300 font-medium">FACILITY CODE</span> box below the QR code.
          </p>
        </div>
      </div>
    </div>
  );
}
