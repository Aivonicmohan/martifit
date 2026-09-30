"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiConfig";
import {
  Dumbbell,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Sparkles,
  Send,
  MapPin,
  MessageSquare,
  Building2,
  Share2,
  Users,
  HelpCircle,
  Package,
} from "lucide-react";

import BusinessCodeModal from "@/components/public/BusinessCodeModal";
import FranchiseInvestmentModal from "@/components/public/FranchiseInvestmentModal";

export function PublicInquiryClient() {
  const params = useParams();
  const rawParamSlug = params?.slug as string;
  const [pathnameSlug, setPathnameSlug] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParam =
        new URLSearchParams(window.location.search).get("gym") ||
        new URLSearchParams(window.location.search).get("slug");
      if (queryParam) {
        setPathnameSlug(queryParam);
      } else {
        const parts = window.location.pathname.split("/inquiry/");
        if (parts[1]) {
          setPathnameSlug(parts[1].replace(/\/$/, ""));
        }
      }
    }
  }, []);

  const slug =
    (rawParamSlug && rawParamSlug !== "default" ? rawParamSlug : null) ||
    pathnameSlug ||
    rawParamSlug ||
    "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gym, setGym] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    interestedPlanId: "",
    notes: "",
  });

  const [howDidYouFindUs, setHowDidYouFindUs] = useState("DIRECT_WALK_IN");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showFranchiseModal, setShowFranchiseModal] = useState(false);
  const [facilityCode, setFacilityCode] = useState<string>(slug || "");
  const [activeSlug, setActiveSlug] = useState<string>(slug);
  const [referrerName, setReferrerName] = useState("");
  const [referrerPhone, setReferrerPhone] = useState("");
  const [otherSourceDetails, setOtherSourceDetails] = useState("");

  useEffect(() => {
    const target = activeSlug || slug;
    if (!target || target === "default") {
      setShowCodeModal(true);
      setLoading(false);
      return;
    }
    fetchGymInfo(target);
  }, [slug, activeSlug]);

  const fetchGymInfo = async (param: string) => {
    setLoading(true);
    try {
      // Try by code first
      let res = await fetch(`${API_BASE_URL}/api/v1/public/tenants/by-code/${encodeURIComponent(param)}`);
      let data = await res.json();
      let effectiveSlug = param;
      if (data.success && data.tenant) {
        effectiveSlug = data.tenant.id;
        setFacilityCode(data.tenant.businessCode || data.tenant.id);
      }

      res = await fetch(`${API_BASE_URL}/api/v1/leads/public/gym-info/${effectiveSlug}`);
      data = await res.json();
      if (data.success && data.gym) {
        setGym(data.gym);
        setActiveSlug(effectiveSlug);
        if (data.gym.businessCode) {
          setFacilityCode(data.gym.businessCode);
        }
        setShowCodeModal(false);
        if (data.gym.plans && data.gym.plans.length > 0) {
          setForm((prev) => ({ ...prev, interestedPlanId: data.gym.plans[0].id }));
        }
      } else {
        setShowCodeModal(true);
      }
    } catch (err) {
      setShowCodeModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      setErrorMsg("Please fill in your Full Name and Mobile Phone Number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leads/public/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: activeSlug || gym?.id || gym?.businessCode || slug,
          ...form,
          howDidYouFindUs,
          referrerName: howDidYouFindUs === "REFERENCE" ? referrerName : "",
          referrerPhone: howDidYouFindUs === "REFERENCE" ? referrerPhone : "",
          otherSourceDetails: howDidYouFindUs === "OTHERS" ? otherSourceDetails : "",
          source: howDidYouFindUs === "DIRECT_WALK_IN" ? "WALK_IN" : howDidYouFindUs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setShowFranchiseModal(true);
      } else {
        setErrorMsg(data.error || "Failed to submit inquiry.");
      }
    } catch {
      setErrorMsg("An error occurred while submitting your inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const gymName = gym?.branding?.businessName || gym?.name || "Fitness Center";
  const gymLogo = gym?.branding?.logoUrl;
  const gymPhone = gym?.branding?.contactPhone || gym?.branding?.supportNumber;
  const gymAddress = gym?.branding?.address;

  if (loading && slug) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3 text-slate-700 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Loading Gym Inquiry Portal...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !gym) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Facility Unavailable</h2>
          <p className="text-xs text-slate-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative">
      <BusinessCodeModal
        isOpen={showCodeModal}
        onCodeValidated={(validated) => {
          setFacilityCode(validated.businessCode || validated.id);
          fetchGymInfo(validated.id);
        }}
        title="Visitor Inquiry & Free Trial"
        description="Please enter your 4-digit facility code to open the inquiry form."
      />

      <FranchiseInvestmentModal
        isOpen={showFranchiseModal}
        onClose={() => setShowFranchiseModal(false)}
        participantData={{
          name: form.name,
          phone: form.phone,
          email: form.email,
          code: facilityCode || gym?.businessCode || activeSlug || slug || ""
        }}
      />

      {/* Background Soft Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-100/60 blur-[130px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-100/50 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          {gymLogo ? (
            <img
              src={gymLogo}
              alt={gymName}
              className="w-20 h-20 mx-auto rounded-3xl object-cover border-2 border-blue-200 shadow-xl bg-white p-1.5"
            />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border border-blue-400/30">
              <Dumbbell className="w-10 h-10" />
            </div>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{gymName}</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Official Membership Inquiry & Free Trial</span>
            </p>
          </div>

          {(gymAddress || gymPhone) && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600 pt-1">
              {gymAddress && (
                <span className="flex items-center space-x-1.5 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{gymAddress}</span>
                </span>
              )}
              {gymPhone && (
                <a
                  href={`tel:${gymPhone}`}
                  className="flex items-center space-x-1.5 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200 text-blue-600 hover:text-blue-700 hover:border-blue-300 font-semibold shadow-sm transition-all"
                >
                  <Phone className="w-3 h-3" />
                  <span>{gymPhone}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Main Card (Light Mode) */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-5">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-9 h-9 animate-bounce text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900">Inquiry Submitted!</h2>
                <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                  Thank you, <span className="font-bold text-slate-900">{form.name}</span>! Your inquiry has been received by{" "}
                  <span className="font-bold text-blue-600">{gymName}</span>. Our representative will contact you shortly.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: "", phone: "", email: "", interestedPlanId: gym?.plans?.[0]?.id || "", notes: "" });
                    setHowDidYouFindUs("DIRECT_WALK_IN");
                    setReferrerName("");
                    setReferrerPhone("");
                    setOtherSourceDetails("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold underline"
                >
                  Submit Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-b border-slate-100 pb-3.5">
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Your Contact Information</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fill in your details below to request pricing or book a trial workout.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Interested Program / Package (Shows Workout Types first, then duration) */}
              {gym?.plans && gym.plans.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interested Program / Package</label>
                  <div className="relative">
                    <Package className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <select
                      value={form.interestedPlanId}
                      onChange={(e) => setForm({ ...form, interestedPlanId: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300/80 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-semibold"
                    >
                      {gym.plans.map((plan: any) => {
                        const durationText = `${plan.durationMonths} ${plan.durationMonths === 1 ? "Month" : "Months"}`;
                        const formattedPrice = `₹${plan.price?.toLocaleString("en-IN")}`;
                        return (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} — {durationText} ({formattedPrice})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* How Did You Find Us Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">How did you find us?</label>
                <div className="relative">
                  <Share2 className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <select
                    value={howDidYouFindUs}
                    onChange={(e) => setHowDidYouFindUs(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300/80 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-semibold"
                  >
                    <option value="DIRECT_WALK_IN">Direct Enquiry from road / Walk-in</option>
                    <option value="REFERENCE">Reference / Member Referral</option>
                    <option value="SOCIAL_MEDIA">Social Media (Instagram, Facebook, Google)</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
              </div>

              {/* Conditional Fields: Reference */}
              {howDidYouFindUs === "REFERENCE" && (
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3 animate-fadeIn">
                  <div className="text-[11px] font-bold text-blue-900 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Referral Information (Optional)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Referred Person Name</label>
                    <input
                      type="text"
                      placeholder="Name of the person who referred you"
                      value={referrerName}
                      onChange={(e) => setReferrerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Referred Person Contact No.</label>
                    <input
                      type="tel"
                      placeholder="Contact number of referred person"
                      value={referrerPhone}
                      onChange={(e) => setReferrerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Conditional Fields: Others */}
              {howDidYouFindUs === "OTHERS" && (
                <div className="p-3.5 bg-slate-100/70 rounded-2xl border border-slate-200/80 space-y-2 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Please Specify Details (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flyer, Newspaper, Event, Friend recommendation..."
                    value={otherSourceDetails}
                    onChange={(e) => setOtherSourceDetails(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              )}

              {/* Notes / Preferred Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fitness Goals / Questions</label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="Tell us your fitness goals or best time to call..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Free Trial Inquiry</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-4 text-[11px] text-slate-400 border-t border-slate-200/80">
        Powered by <span className="font-bold text-slate-600">Marut Fitness Software</span> • White-Label Fitness Platform
      </div>
    </div>
  );
}
