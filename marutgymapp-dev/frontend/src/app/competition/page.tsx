"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";
import BusinessCodeModal from "@/components/public/BusinessCodeModal";
import FranchiseInvestmentModal from "@/components/public/FranchiseInvestmentModal";
import { Trophy, CheckCircle2, AlertCircle, Video, Flame, User, Phone, Youtube, Sparkles, Building2 } from "lucide-react";

interface CompetitionItem {
  id: string;
  title: string;
  category: string;
  metricType: string;
  metricUnit: string;
  description: string | null;
}

function CompetitionFormContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || searchParams.get("facilityCode") || "";

  const [tenant, setTenant] = useState<{ id: string; name: string; businessCode?: string; businessName?: string; logoUrl?: string | null } | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showFranchiseModal, setShowFranchiseModal] = useState(false);
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);

  // Form State
  const [selectedCompId, setSelectedCompId] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{ rank?: number; submission?: any } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialCode) {
      validateFacilityCode(initialCode);
    } else {
      const savedCode = localStorage.getItem("marut_business_code");
      if (savedCode) {
        validateFacilityCode(savedCode);
      } else {
        setShowCodeModal(true);
        fetchCompetitions("");
      }
    }
  }, [initialCode]);

  const validateFacilityCode = async (codeToTest: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/v1/public/facility/validate/${encodeURIComponent(codeToTest)}`));
      const data = await res.json();
      if (data.success && data.tenant) {
        setTenant(data.tenant);
        setShowCodeModal(false);
        fetchCompetitions(data.tenant.businessCode || codeToTest);
      } else {
        setShowCodeModal(true);
        fetchCompetitions("");
      }
    } catch (err) {
      setShowCodeModal(true);
      fetchCompetitions("");
    }
  };

  const fetchCompetitions = async (bizCode: string) => {
    setLoadingCompetitions(true);
    try {
      const url = bizCode
        ? getApiUrl(`/api/v1/public/competitions?code=${encodeURIComponent(bizCode)}`)
        : getApiUrl("/api/v1/public/competitions");
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.competitions)) {
        setCompetitions(data.competitions);
        if (data.competitions.length > 0) {
          setSelectedCompId(data.competitions[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching competitions:", err);
    } finally {
      setLoadingCompetitions(false);
    }
  };

  const selectedComp = competitions.find((c) => c.id === selectedCompId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim() || !participantPhone.trim() || !selectedCompId || !metricValue || !youtubeUrl.trim()) {
      setErrorMsg("Please fill in all required fields including performance vitals and YouTube video link.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(getApiUrl("/api/v1/public/competitions/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: tenant?.businessCode || initialCode,
          tenantId: tenant?.id,
          competitionId: selectedCompId,
          participantName: participantName.trim(),
          participantPhone: participantPhone.trim(),
          metricValue: parseFloat(metricValue),
          youtubeUrl: youtubeUrl.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit competition entry.");
      }

      setSubmittedResult(data);
      setShowFranchiseModal(true);
    } catch (err: any) {
      console.error("Competition submission error:", err);
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      
      {/* Business Code Selection Modal if Code Missing */}
      <BusinessCodeModal
        isOpen={showCodeModal}
        onCodeValidated={(validatedTenant) => {
          setTenant(validatedTenant);
          setShowCodeModal(false);
          fetchCompetitions(validatedTenant.businessCode);
        }}
      />

      {/* Post-Submission Franchise Investment Opportunity Modal */}
      <FranchiseInvestmentModal
        isOpen={showFranchiseModal}
        onClose={() => setShowFranchiseModal(false)}
        participantData={{
          name: participantName,
          phone: participantPhone,
          code: tenant?.businessCode || initialCode
        }}
      />

      <div className="max-w-xl mx-auto w-full pt-4 pb-12">
        
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Member Fitness Competition Entry</span>
          </div>

          {tenant && (
            <div className="flex items-center justify-center gap-2 mb-2 text-slate-300">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-white text-sm">{tenant.businessName || tenant.name}</span>
              {tenant.businessCode && (
                <span className="px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 font-mono font-bold text-xs rounded-md">
                  Code: {tenant.businessCode}
                </span>
              )}
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Record & Submit Performance
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto leading-relaxed">
            Participate in Gym, Zumba, Yoga & Sports challenges. Submit your performance score & video proof to qualify for live finals!
          </p>
        </div>

        {/* Success Screen */}
        {submittedResult ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center animate-in fade-in zoom-in duration-200 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Entry Verified & Ranked #{submittedResult.rank || 1}
            </span>

            <h2 className="text-2xl font-extrabold text-white mb-2">Competition Entry Submitted!</h2>
            <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
              Great effort, <strong className="text-white">{submittedResult.submission?.participantName}</strong>! Your attempt has been recorded and placed on the live leaderboard.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left mb-6 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Event Category:</span>
                <span className="font-bold text-white">{submittedResult.submission?.competition?.title}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Recorded Vitals Score:</span>
                <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                  <span className="font-mono text-base text-amber-300 font-black">{submittedResult.submission?.metricValue}</span>
                  <span className="text-xs uppercase font-extrabold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md">
                    {submittedResult.submission?.competition?.metricUnit || selectedComp?.metricUnit || "reps"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({submittedResult.submission?.competition?.metricType || selectedComp?.metricType || "REPS"})
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Live Leaderboard Position:</span>
                <span className="font-bold text-emerald-400 font-mono">Rank #{submittedResult.rank || 1}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 italic">
              Organizers will review YouTube video proof for top performers before conducting live on-stage finals!
            </p>

            <button
              onClick={() => {
                setSubmittedResult(null);
                setParticipantName("");
                setParticipantPhone("");
                setMetricValue("");
                setYoutubeUrl("");
                setNotes("");
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/20"
            >
              Submit Another Challenge Entry
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Enter Fitness Challenge</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select event, enter your vitals score, and link video proof.</p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {loadingCompetitions ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading competition events...
              </div>
            ) : competitions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Trophy className="w-8 h-8 text-amber-500/40 mx-auto" />
                <p>No active competitions open right now.</p>
                <p className="text-[11px] text-slate-500">Please check back soon or ask your gym organizers!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Full Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={participantPhone}
                        onChange={(e) => setParticipantPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Competition Event Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Competition Event *
                  </label>
                  <select
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-bold focus:outline-none"
                  >
                    {competitions.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        [{comp.category}] {comp.title} ({comp.metricUnit || "reps"})
                      </option>
                    ))}
                  </select>
                  {selectedComp?.description && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">{selectedComp.description}</p>
                  )}
                </div>

                {/* Vitals Score Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Performance Vitals Score ({selectedComp?.metricUnit || "Reps / Count"}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                    placeholder={
                      selectedComp?.metricType === "DURATION"
                        ? "Enter hold duration in seconds (e.g. 180 for 3 mins)"
                        : selectedComp?.metricType === "COUNT"
                        ? "Enter total score or count achieved (e.g. 150)"
                        : "Enter total number of reps completed (e.g. 60)"
                    }
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono"
                  />
                </div>

                {/* YouTube Video Proof Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    YouTube Video Proof Link *
                  </label>
                  <div className="relative">
                    <Youtube className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      required
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Upload your video attempt to YouTube (Public or Unlisted) and paste the video link here.
                  </p>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Additional Notes / Comments
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mention equipment used, body weight, or any remarks..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider mt-2 flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{submitting ? "Submitting Performance..." : "Submit Entry & View Rank"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-slate-900 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">Marut Fitness Operating System</p>
        <p>Member Competitions & Live Leaderboards</p>
      </div>
    </div>
  );
}

export default function CompetitionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Competition Portal...</div>}>
      <CompetitionFormContent />
    </Suspense>
  );
}
