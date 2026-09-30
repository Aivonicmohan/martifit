"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";
import BusinessCodeModal from "@/components/public/BusinessCodeModal";
import { Wrench, CheckCircle2, AlertCircle, Dumbbell, Camera, ImageIcon, Trash2, ArrowLeft } from "lucide-react";

function ComplaintFormContent() {
  const searchParams = useSearchParams();
  const tenantIdParam = searchParams.get("tenantId") || searchParams.get("code");

  const [tenant, setTenant] = useState<{ id: string; name: string; businessCode?: string; businessName?: string; logoUrl?: string | null } | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [issueType, setIssueType] = useState("Rerack Weight");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [status, setStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  // Live Camera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (tenantIdParam) {
      // Direct tenant ID / code in URL
      fetchTenantByParam(tenantIdParam);
    } else {
      setShowCodeModal(true);
    }
  }, [tenantIdParam]);

  const fetchTenantByParam = async (param: string) => {
    try {
      // Try by code first, then by direct ID
      let res = await fetch(getApiUrl(`/api/v1/public/tenants/by-code/${encodeURIComponent(param)}`));
      let data = await res.json();
      if (data.success && data.tenant) {
        setTenant(data.tenant);
        setShowCodeModal(false);
        return;
      }

      res = await fetch(getApiUrl(`/api/v1/public/tenants/${encodeURIComponent(param)}`));
      data = await res.json();
      if (data.success && data.tenant) {
        setTenant({
          id: param,
          name: data.tenant.businessName,
          businessName: data.tenant.businessName,
          logoUrl: data.tenant.logoUrl
        });
        setShowCodeModal(false);
        return;
      }

      // If invalid parameter, prompt modal
      setShowCodeModal(true);
    } catch (err) {
      setShowCodeModal(true);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
        } catch (err: any) {
          alert(`Camera access failed: ${err.message || "Please grant camera permission."}`);
          setIsCameraActive(false);
        }
      }, 100);
    } catch (err: any) {
      alert("Unable to initialize camera.");
      setIsCameraActive(false);
    }
  };

  const captureSnap = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setPhotoUrl(dataUrl);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    if (!memberName.trim() || !memberPhone.trim() || !equipmentName.trim()) {
      setErrorMessage("Please enter your name, phone number, and equipment name.");
      setStatus("ERROR");
      return;
    }

    setStatus("SUBMITTING");
    setErrorMessage("");

    try {
      const res = await fetch(getApiUrl("/api/v1/public/complaints"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          memberName: memberName.trim(),
          memberPhone: memberPhone.trim(),
          equipmentName: equipmentName.trim(),
          issueType,
          notes,
          photoUrl
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit equipment report.");
      }

      setStatus("SUCCESS");
    } catch (err: any) {
      console.error("Complaint error:", err);
      setErrorMessage(err.message || "An unexpected error occurred.");
      setStatus("ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <BusinessCodeModal
        isOpen={showCodeModal}
        onCodeValidated={(validated) => {
          setTenant(validated);
          setShowCodeModal(false);
        }}
        title="Equipment Report & Rerack"
        description="Please enter your 4-digit facility code to report an equipment issue."
      />

      <div className="max-w-xl mx-auto w-full pt-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="Gym Logo" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Wrench className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">{tenant?.businessName || tenant?.name || "Facility Equipment Service"}</h1>
              <p className="text-xs text-slate-400">Equipment Rerack & Maintenance Report</p>
            </div>
          </div>
          {tenant?.businessCode && (
            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-xs font-mono font-semibold rounded-lg text-slate-300">
              Code: {tenant.businessCode}
            </span>
          )}
        </div>

        {status === "SUCCESS" ? (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Report Submitted!</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Thank you! Your equipment maintenance request has been logged. Our gym floor team has been notified.
            </p>
            <button
              onClick={() => {
                setStatus("IDLE");
                setEquipmentName("");
                setNotes("");
                setPhotoUrl("");
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Submit Another Report
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-400" />
              Report Equipment Issue or Request Rerack
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Report misplaced weights, broken equipment, or request assistance from gym staff.
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Equipment Name / Tag *</label>
                <input
                  type="text"
                  required
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="e.g. Bench Press #2, Cable Crossover, 15kg Dumbbells"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Issue Type *</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="Rerack Weight">Rerack Weight / Misplaced Dumbbell</option>
                  <option value="Broken Cable">Broken Cable / Pulley</option>
                  <option value="Bench Cushion Damage">Bench / Cushion Damage</option>
                  <option value="Electronics / Screen Issue">Electronics / Screen Issue</option>
                  <option value="Maintenance Needed">General Maintenance Needed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Additional Notes / Location</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the issue or exact location on the gym floor..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition resize-none"
                />
              </div>

              {/* Photo Upload / Snap */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Photo Attachment (Optional)</label>
                {photoUrl ? (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-700 bg-black">
                    <img src={photoUrl} alt="Equipment Issue" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl("")}
                      className="absolute top-2 right-2 p-2 bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : isCameraActive ? (
                  <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-black">
                    <video ref={videoRef} playsInline autoPlay className="w-full h-52 object-cover" />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 px-4">
                      <button
                        type="button"
                        onClick={captureSnap}
                        className="px-5 py-2 bg-orange-600 text-white rounded-lg font-semibold text-xs shadow-lg hover:bg-orange-500"
                      >
                        Snap Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-3 border border-dashed border-slate-700 hover:border-orange-500/50 bg-slate-950/60 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition hover:bg-slate-950"
                    >
                      <Camera className="w-4 h-4 text-orange-400" />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 border border-dashed border-slate-700 hover:border-orange-500/50 bg-slate-950/60 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition hover:bg-slate-950"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      Choose Photo
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={status === "SUBMITTING"}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-orange-600/20 mt-2"
              >
                {status === "SUBMITTING" ? "Submitting Report..." : "Submit Equipment Issue"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="text-center py-4 border-t border-slate-900 text-xs text-slate-600">
        Powered by Marut Fitness Software
      </div>
    </div>
  );
}

export default function ComplaintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <ComplaintFormContent />
    </Suspense>
  );
}
