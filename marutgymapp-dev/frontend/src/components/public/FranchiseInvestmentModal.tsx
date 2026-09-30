"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Building2, ShieldCheck, ArrowRight, X, TrendingUp, Cpu } from "lucide-react";

interface FranchiseInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantData?: {
    name?: string;
    phone?: string;
    email?: string;
    code?: string;
  };
}

export default function FranchiseInvestmentModal({
  isOpen,
  onClose,
  participantData
}: FranchiseInvestmentModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleProceedToFranchise = () => {
    const params = new URLSearchParams();
    if (participantData?.name) params.set("name", participantData.name);
    if (participantData?.phone) params.set("phone", participantData.phone);
    if (participantData?.email) params.set("email", participantData.email);
    if (participantData?.code) params.set("code", participantData.code);

    const queryString = params.toString();
    const targetUrl = queryString ? `/franchise?${queryString}` : "/franchise";
    router.push(targetUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Exclusive Franchise Opportunity</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
            Interested in Owning & Investing in MarutFit.com Software Franchise?
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Join the <strong className="text-white">MarutFit.com & AiVONIC Technology</strong> family! Build a high-yield fitness business backed by complete technical support & automated operating systems.
          </p>
        </div>

        {/* Value Highlights */}
        <div className="space-y-2.5 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
            <span><strong>100% Tech Support</strong> by AiVONIC Technology PVT LTD</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>Automated Gym OS</strong> & Biometric Sync Software</span>
          </div>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>High ROI Potential</strong> with zero technical background required</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleProceedToFranchise}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group"
          >
            <span>Yes, Show Franchise Details</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-semibold transition"
          >
            No Thanks, Continue to Confirmation
          </button>
        </div>

      </div>
    </div>
  );
}
