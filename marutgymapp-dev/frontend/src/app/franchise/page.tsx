"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";
import { Building2, CheckCircle2, AlertCircle, Sparkles, UserCheck, ShieldCheck, Mail, Phone, MapPin, Briefcase, IndianRupee } from "lucide-react";

function FranchiseFormContent() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref") || searchParams.get("affiliate") || searchParams.get("code") || searchParams.get("referredByCode") || "";
  const nameParam = searchParams.get("name") || "";
  const phoneParam = searchParams.get("phone") || "";
  const emailParam = searchParams.get("email") || "";

  const [name, setName] = useState(nameParam);
  const [phone, setPhone] = useState(phoneParam);
  const [email, setEmail] = useState(emailParam);
  const [location, setLocation] = useState("");
  const [profession, setProfession] = useState("");
  const [investmentBudget, setInvestmentBudget] = useState("25-50 Lakhs");
  const [experience, setExperience] = useState("");
  const [referredByCode, setReferredByCode] = useState(refParam);
  const [notes, setNotes] = useState("");

  const [affiliateInfo, setAffiliateInfo] = useState<{ name: string; code: string; type: string; profession?: string } | null>(null);
  const [affiliateValidating, setAffiliateValidating] = useState(false);

  const [status, setStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (nameParam) setName(nameParam);
    if (phoneParam) setPhone(phoneParam);
    if (emailParam) setEmail(emailParam);
    if (refParam) {
      setReferredByCode(refParam);
      validateRefCode(refParam);
    }
  }, [refParam, nameParam, phoneParam, emailParam]);

  const validateRefCode = async (codeToTest: string) => {
    if (!codeToTest.trim()) {
      setAffiliateInfo(null);
      return;
    }
    setAffiliateValidating(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/public/affiliate/validate/${encodeURIComponent(codeToTest.trim())}`));
      const data = await res.json();
      if (data.success && data.affiliate) {
        setAffiliateInfo(data.affiliate);
      } else {
        setAffiliateInfo(null);
      }
    } catch (err) {
      setAffiliateInfo(null);
    } finally {
      setAffiliateValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !location.trim()) {
      setErrorMessage("Please enter your name, phone number, and desired location.");
      setStatus("ERROR");
      return;
    }

    setStatus("SUBMITTING");
    setErrorMessage("");

    try {
      const res = await fetch(getApiUrl("/api/v1/public/franchise"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          location: location.trim(),
          profession: profession.trim(),
          investmentBudget,
          experience,
          referredByCode: referredByCode.trim(),
          notes
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit franchise application.");
      }

      setStatus("SUCCESS");
    } catch (err: any) {
      console.error("Franchise submission error:", err);
      setErrorMessage(err.message || "An unexpected error occurred.");
      setStatus("ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="max-w-2xl mx-auto w-full pt-4 pb-12">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            MarutFit.com Franchise Opportunity
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Own a Fitness Technology Business
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-lg mx-auto leading-relaxed">
            No Technical Background Required. AiVONIC Technology PVT LTD provides complete technology, hardware integration & technical support.
          </p>
        </div>

        {/* Affiliate Attribution Banner */}
        {affiliateInfo && (
          <div className="mb-6 p-4 bg-blue-950/40 border border-blue-800/80 rounded-2xl flex items-center gap-3.5 text-blue-200 animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">Referred By Affiliate Partner</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {affiliateInfo.name} <span className="text-xs font-normal text-blue-300">({affiliateInfo.profession} - Code: {affiliateInfo.code})</span>
              </p>
            </div>
          </div>
        )}

        {status === "SUCCESS" ? (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Franchise Application Received!</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Thank you for your interest in partnering with MarutFit.com. Our corporate expansion team will contact you within 24 hours.
            </p>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left mb-6 text-xs text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-200">Direct Contact:</p>
              <p>📧 Email: <span className="text-slate-200 font-mono">franchise@marutfit.com</span></p>
              <p>📞 Phone: <span className="text-slate-200 font-mono">+91 76718 01206</span></p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://wa.me/917671801206?text=${encodeURIComponent("I would like to know details about MarutFit.com Fitness Software Franchise")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/30"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp Now</span>
              </a>
              <button
                onClick={() => {
                  setStatus("IDLE");
                  setName("");
                  setPhone("");
                  setEmail("");
                  setLocation("");
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
              >
                Submit Another Inquiry
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Franchise Partner Registration</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Fill in your details below to receive full business proposal details & financial breakdown.
            </p>

            {status === "ERROR" && (
              <div className="mb-6 p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Verma"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@example.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Desired City / Location *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Hyderabad, Bengaluru, Vizag"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Profession / Current Industry</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. Gym Owner, IT Professional, Real Estate"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Investment Budget Capacity</label>
                  <select
                    value={investmentBudget}
                    onChange={(e) => setInvestmentBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    <option value="10-25 Lakhs">₹10 Lakhs - ₹25 Lakhs</option>
                    <option value="25-50 Lakhs">₹25 Lakhs - ₹50 Lakhs</option>
                    <option value="50 Lakhs - 1 Crore">₹50 Lakhs - ₹1 Crore</option>
                    <option value="1 Crore+">₹1 Crore+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Affiliate / Referral Code (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referredByCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReferredByCode(val);
                      validateRefCode(val);
                    }}
                    placeholder="Enter referral or affiliate code (e.g. 1001 or 8001)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition font-mono"
                  />
                  {affiliateValidating && (
                    <span className="absolute right-3 top-3 w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin"></span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Experience / Additional Notes
                </label>
                <textarea
                  rows={3}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Tell us about your background or any specific questions..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "SUBMITTING"}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 mt-2"
              >
                {status === "SUBMITTING" ? "Submitting Application..." : "Submit Franchise Application"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-slate-900 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">AiVONIC Technology PVT LTD</p>
        <p>Technology & Technical Support Provider for MarutFit.com</p>
        <p>📧 franchise@marutfit.com | 📞 +91 76718 01206</p>
      </div>
    </div>
  );
}

export default function FranchisePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <FranchiseFormContent />
    </Suspense>
  );
}
