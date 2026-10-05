"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";
import BusinessCodeModal from "@/components/public/BusinessCodeModal";
import FranchiseInvestmentModal from "@/components/public/FranchiseInvestmentModal";
import { User, Phone, CheckCircle2, AlertCircle, Dumbbell, Camera, ImageIcon, Trash2 } from "lucide-react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const rawParam = searchParams.get("tenantId") || searchParams.get("code");
  const [activeTenantId, setActiveTenantId] = useState<string | null>(rawParam);
  const [facilityCode, setFacilityCode] = useState<string>(rawParam || "");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showFranchiseModal, setShowFranchiseModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    phone: "",
    bloodGroup: "",
    address: "",
    dateOfBirth: "",
    anniversaryDate: "",
    group: "Morning Batch",
    source: "",
    occupation: "",
  });

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [branding, setBranding] = useState<{businessName: string, logoUrl: string | null} | null>(null);
  const [batches, setBatches] = useState<any[]>([]);

  const [status, setStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
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
          alert(`Camera access failed: ${err.message || "Please grant camera permission."}`);
          setIsCameraActive(false);
        }
      }, 100);
    } catch (err: any) {
      alert("Unable to initialize camera.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setAvatarUrl(dataUrl);
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

  useEffect(() => {
    if (rawParam) {
      fetchTenantByParam(rawParam);
    } else {
      // If no code parameter in URL, prompt BusinessCodeModal for facility code
      setShowCodeModal(true);
    }
  }, [rawParam]);

  const fetchTenantByParam = async (param: string) => {
    try {
      let res = await fetch(getApiUrl(`/api/v1/public/tenants/by-code/${encodeURIComponent(param)}`));
      let data = await res.json();
      if (data.success && data.tenant) {
        setActiveTenantId(data.tenant.id);
        setFacilityCode(data.tenant.businessCode || data.tenant.id);
        setBranding({
          businessName: data.tenant.businessName,
          logoUrl: data.tenant.logoUrl
        });
        setShowCodeModal(false);
        return;
      }

      res = await fetch(getApiUrl(`/api/v1/public/tenants/${encodeURIComponent(param)}`));
      data = await res.json();
      if (data.success && data.tenant) {
        setActiveTenantId(param);
        setFacilityCode(data.tenant.businessCode || param);
        setBranding(data.tenant);
        setShowCodeModal(false);
        return;
      }

      setShowCodeModal(true);
    } catch (err) {
      setShowCodeModal(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.phone) {
      setErrorMessage("First Name and Phone are required.");
      setStatus("ERROR");
      return;
    }

    if (!activeTenantId) {
      setShowCodeModal(true);
      return;
    }

    setStatus("SUBMITTING");
    setErrorMessage("");

    try {
      const res = await fetch(getApiUrl("/api/v1/public/members"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: activeTenantId,
          ...formData,
          avatarUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit registration");
      }

      setStatus("SUCCESS");
      setShowFranchiseModal(true);
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMessage(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 sm:px-6">
      <BusinessCodeModal
        isOpen={showCodeModal}
        onCodeValidated={(validated: any) => {
          setActiveTenantId(validated.id);
          setFacilityCode(validated.businessCode || validated.id || "");
          setBranding({ businessName: validated.businessName || validated.name, logoUrl: validated.logoUrl });
          setShowCodeModal(false);
        }}
        title="Member Registration"
        description="Please enter your 4-digit facility code to open the self-registration form."
      />

      <FranchiseInvestmentModal
        isOpen={showFranchiseModal}
        onClose={() => setShowFranchiseModal(false)}
        participantData={{
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          code: facilityCode || activeTenantId || rawParam || ""
        }}
      />

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Gym Logo" className="h-20 object-contain mx-auto mb-4 bg-white/10 p-2 rounded-2xl backdrop-blur-sm" />
          ) : (
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold mb-1">{branding?.businessName || "Join the Gym"}</h1>
          <p className="text-blue-100 text-sm">Please fill out your basic information</p>
          <button
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="mt-3 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg backdrop-blur-sm transition border border-white/30"
          >
            🔑 Change Facility Code
          </button>
        </div>

        {/* Form */}
        <div className="p-8">
          {status === "ERROR" && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Profile Photo Camera Capture / File Upload */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/png, image/jpeg, image/jpg, image/webp" 
                className="hidden" 
                onChange={handlePhotoCapture}
              />

              {isCameraActive ? (
                <div className="flex flex-col items-center space-y-3">
                  <video ref={videoRef} autoPlay playsInline className="w-36 h-36 rounded-full object-cover border-2 border-blue-600 shadow-md bg-black" />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-28 h-28 rounded-full bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-400" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button 
                      type="button" 
                      onClick={startCamera}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors border border-blue-200"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Take Photo</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200 shadow-2xs"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span>Choose Photo</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold border border-rose-200 transition-colors"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit number"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Anniversary Date</label>
                <input
                  type="date"
                  name="anniversaryDate"
                  value={formData.anniversaryDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Gym Batch Timing *</label>
                <select
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800"
                >
                  <option value="Morning Batch">🌅 Morning Batch (6:00 AM - 11:00 AM)</option>
                  <option value="Evening Batch">🌙 Evening Batch (4:00 PM - 10:00 PM)</option>
                  <option value="General / All Day">⚡ General / All Day Access</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Source / Lead Channel</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="e.g. Walk-in, Referral"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800"
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
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="e.g. Engineer, Business"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Address</label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Member residential address"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "SUBMITTING"}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === "SUBMITTING" ? "Submitting..." : "Submit Details"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterMemberPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

