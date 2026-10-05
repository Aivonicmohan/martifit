"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTheme } from "@/components/theme/ThemeProvider";
import { authFetch } from "@/lib/apiConfig";
import {
  Palette,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  Dumbbell,
  Sparkles,
  Link as LinkIcon,
  RefreshCcw,
} from "lucide-react";

export default function WhiteLabelPage() {
  const { branding, setBranding } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    logoUrl: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
  });

  const [useUrlInput, setUseUrlInput] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/tenants/branding")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.branding) {
          setForm({
            businessName: data.branding.businessName || "",
            logoUrl: data.branding.logoUrl || "",
            contactPhone: data.branding.contactPhone || "",
            contactEmail: data.branding.contactEmail || "",
            address: data.branding.address || "",
          });
          if (data.branding.logoUrl && data.branding.logoUrl.startsWith("http")) {
            setUseUrlInput(true);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load branding:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("Image file size must be less than 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL(
            file.type === "image/png" ? "image/png" : "image/jpeg",
            0.9
          );
          setForm((prev) => ({ ...prev, logoUrl: resizedDataUrl }));
          setErrorMessage("");
        } else {
          setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
          setErrorMessage("");
        }
      };
      img.onerror = () => {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
        setErrorMessage("");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await authFetch("/api/v1/tenants/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || (contentType && !contentType.includes("application/json"))) {
        const text = await res.text().catch(() => "");
        setErrorMessage(`Server error (${res.status}): ${text.slice(0, 100) || "Unable to save branding settings."}`);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setSuccessMessage("Gym branding and logo updated successfully!");
        setBranding(data.branding);

        // Update local storage user object if present
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            u.tenantName = data.branding.businessName;
            u.branding = data.branding;
            localStorage.setItem("user", JSON.stringify(u));
          } catch {}
        }
      } else {
        setErrorMessage(data.error || "Failed to update branding settings.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Server error while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Palette className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">White-Label Gym Branding</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-11">
              Upload your official Gym Logo and customize your facility identity, header branding, and contact details.
            </p>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <X className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form Section */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Facility Identity & Logo</span>
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                White-Label Enabled
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Gym Logo Upload & Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>Gym Facility Logo</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseUrlInput(!useUrlInput)}
                    className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>{useUrlInput ? "Switch to File Upload" : "Use Image URL Link"}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center">
                  {/* Current Logo Display */}
                  {form.logoUrl ? (
                    <div className="relative group">
                      <img
                        src={form.logoUrl}
                        alt="Gym Logo Preview"
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-600 shadow-md bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logoUrl: "" })}
                        title="Remove Logo"
                        className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-600 font-black text-2xl flex items-center justify-center border-2 border-dashed border-blue-300">
                      <Dumbbell className="w-8 h-8 text-blue-600" />
                    </div>
                  )}

                  {/* Upload Controls */}
                  {!useUrlInput ? (
                    <div className="space-y-2">
                      <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all inline-flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload Gym Logo Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Supports PNG, JPG, WebP or SVG (Recommended: 200x200px or square)
                      </p>
                    </div>
                  ) : (
                    <div className="w-full space-y-1 text-left">
                      <label className="block text-[11px] font-medium text-slate-700">Image Web URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={form.logoUrl}
                        onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Facility Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Gym Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cross Road Fitness"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Support / Contact Phone</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9059059751"
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Support / Contact Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. support@gym.com"
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Gym Facility Address</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Full physical address of your gym branch"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:bg-slate-300"
                >
                  {saving ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      <span>Saving Gym Branding...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Apply Branding Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Section */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Live Navigation Header Preview</span>
              </h3>
              <p className="text-xs text-slate-500">
                This is how your custom Gym Logo and Business Name will look at the top of your software:
              </p>

              {/* Header Preview Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-inner border border-slate-800 space-y-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Top Header Bar Mockup
                </div>
                <div className="flex items-center space-x-3 bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt="Gym Logo"
                      className="w-9 h-9 rounded-xl object-cover border border-slate-600 bg-white"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-sm tracking-tight text-white block">
                      {form.businessName || "Your Gym Business Name"}
                    </span>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Fitness Operating System
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Preview Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Member Receipt Header Preview
                </div>
                <div className="flex items-center space-x-3 pt-1">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover border bg-white" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                      {(form.businessName || "G")[0]}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">{form.businessName || "Gym Name"}</span>
                    <span className="text-[10px] text-slate-500 block">{form.contactPhone || "Support Phone"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
