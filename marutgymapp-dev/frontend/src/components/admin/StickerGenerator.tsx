"use client";

import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Printer, Download, Sparkles } from "lucide-react";

interface StickerGeneratorProps {
  defaultCode?: string;
  defaultFacilityName?: string;
}

export default function StickerGenerator({
  defaultCode = "",
  defaultFacilityName = ""
}: StickerGeneratorProps) {
  const [stickerType, setStickerType] = useState<"REGISTER" | "INQUIRY" | "COMPLAINT" | "FRANCHISE" | "COMPETITION">("REGISTER");
  const [businessCode, setBusinessCode] = useState(defaultCode);
  const [isGenerating, setIsGenerating] = useState(false);

  const primaryQrRef = useRef<HTMLDivElement | null>(null);
  const franchiseQrRef = useRef<HTMLDivElement | null>(null);

  // Target URLs
  const getPrimaryUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://marutfit.com";
    switch (stickerType) {
      case "REGISTER":
        return businessCode.trim() ? `${origin}/register?code=${encodeURIComponent(businessCode.trim())}` : `${origin}/register`;
      case "INQUIRY":
        return businessCode.trim() ? `${origin}/inquiry?code=${encodeURIComponent(businessCode.trim())}` : `${origin}/inquiry`;
      case "COMPLAINT":
        return businessCode.trim() ? `${origin}/complaint?code=${encodeURIComponent(businessCode.trim())}` : `${origin}/complaint`;
      case "COMPETITION":
        return businessCode.trim() ? `${origin}/competition?code=${encodeURIComponent(businessCode.trim())}` : `${origin}/competition`;
      case "FRANCHISE":
        return `${origin}/franchise/details`;
    }
  };

  const getFranchiseUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://marutfit.com";
    return `${origin}/franchise/details`;
  };

  const getHeaderTitle = () => {
    switch (stickerType) {
      case "REGISTER":
        return "MEMBER REGISTRATION / QUICK SELF SIGN-UP";
      case "INQUIRY":
        return "MEMBER ENQUIRY";
      case "COMPLAINT":
        return "EQUIPMENT RE-RACK & MAINTENANCE SERVICE";
      case "COMPETITION":
        return "MEMBER FITNESS COMPETITION ENTRY";
      case "FRANCHISE":
        return "MARUT FITNESS SOFTWARE FRANCHISE OPPORTUNITY";
    }
  };

  const handleDownloadPng = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 300 DPI high-res canvas (1200 x 1400 px)
        canvas.width = 1200;
        canvas.height = 1400;

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Outer Border
        ctx.strokeStyle = "#103562";
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Header Rect - Dark Blue
        ctx.fillStyle = "#103562";
        ctx.fillRect(20, 20, canvas.width - 40, 130);

        // Header Text - Pure White
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(getHeaderTitle(), canvas.width / 2, 95);

        // Primary Large QR Code Canvas
        const primaryQrCanvas = primaryQrRef.current?.querySelector("canvas");
        if (primaryQrCanvas) {
          ctx.drawImage(primaryQrCanvas, (canvas.width - 560) / 2, 180, 560, 560);
        }

        // Wide Facility Code Box
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#103562";
        ctx.lineWidth = 5;
        const boxWidth = 1100;
        const boxHeight = 110;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = 780;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = "#103562";
        ctx.font = stickerType === "FRANCHISE" ? "bold 30px sans-serif" : "bold 36px monospace";
        ctx.textAlign = "left";
        const codeLabel = stickerType === "FRANCHISE" ? "AFFILIATE / FACILITY CODE :" : "FACILITY CODE :";
        ctx.fillText(codeLabel, boxX + 35, boxY + 68);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 40px monospace";
        const codeDisplay = businessCode.trim() ? businessCode.trim() : "";
        ctx.fillText(codeDisplay, boxX + (stickerType === "FRANCHISE" ? 540 : 420), boxY + 68);

        // Divider Line
        ctx.strokeStyle = "#103562";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(20, 930);
        ctx.lineTo(canvas.width - 20, 930);
        ctx.stroke();

        // Footer Section - Dual / Single with Circular Marut Logo + 5-Line Right Indented Typography
        const marutLogoImg = new Image();
        marutLogoImg.src = "/marut_hanuman_logo.png";

        const drawFooterDetails = () => {
          // Draw Circular Marut Logo
          try {
            ctx.drawImage(marutLogoImg, 40, 960, 210, 210);
          } catch (e) {
            console.error("Logo draw error:", e);
          }

          // Draw Franchise QR Code only for non-franchise stickers
          if (stickerType !== "FRANCHISE") {
            const franchiseQrCanvas = franchiseQrRef.current?.querySelector("canvas");
            if (franchiseQrCanvas) {
              ctx.drawImage(franchiseQrCanvas, 275, 960, 180, 180);

              ctx.fillStyle = "#103562";
              ctx.font = "bold 22px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("FRANCHISE DETAILS", 365, 1175);
            }
          }

          // Right Footer Text - Exactly matching 5-line right-aligned layout
          ctx.textAlign = "right";
          const rightX = canvas.width - 40;

          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 34px sans-serif";
          ctx.fillText("OWN A FITNESS TECHNOLOGY BUSINESS", rightX, 995);

          ctx.fillStyle = "#334155";
          ctx.font = "bold 25px sans-serif";
          ctx.fillText("No Technical Background Required", rightX, 1035);

          ctx.fillStyle = "#1d4ed8";
          ctx.font = "bold 26px sans-serif";
          ctx.fillText("Invest in a MarutFit.com Franchise", rightX, 1075);

          ctx.fillStyle = "#475569";
          ctx.font = "600 20px sans-serif";
          ctx.fillText("AiVONIC Technology PVT LTD provides Technology & Technical Support", rightX, 1115);

          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 23px sans-serif";
          ctx.fillText("Contact Now IN-7671801206 / email : franchise@marutfit.com", rightX, 1155);

          // Download trigger
          const link = document.createElement("a");
          link.download = `MarutSticker_${stickerType}_${businessCode || "generic"}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          setIsGenerating(false);
        };

        if (marutLogoImg.complete) {
          drawFooterDetails();
        } else {
          marutLogoImg.onload = drawFooterDetails;
          marutLogoImg.onerror = drawFooterDetails;
        }
      } catch (err) {
        console.error("Download failed:", err);
        setIsGenerating(false);
      }
    }, 200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-2xl">
      
      {/* Hidden QR Code Canvases for High-Res PNG rendering */}
      <div className="hidden">
        <div ref={primaryQrRef}>
          <QRCodeCanvas value={getPrimaryUrl()} size={560} level="H" includeMargin={false} />
        </div>
        <div ref={franchiseQrRef}>
          <QRCodeCanvas value={getFranchiseUrl()} size={250} level="H" includeMargin={false} />
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Printable High-Res QR Code Sticker Generator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate and download ready-to-print sticker designs for front desks, equipment, and franchise promotions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? "Generating..." : "Download PNG (300 DPI)"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sticker</span>
          </button>
        </div>
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-xl">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sticker Type</label>
          <select
            value={stickerType}
            onChange={(e: any) => setStickerType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
          >
            <option value="REGISTER">🏋️ Member Self-Registration</option>
            <option value="INQUIRY">📋 Member Enquiry</option>
            <option value="COMPLAINT">🔧 Equipment Service & Rerack</option>
            <option value="COMPETITION">🏆 Member Competition Entry</option>
            <option value="FRANCHISE">💼 Franchise Opportunity (Single QR)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            {stickerType === "FRANCHISE" ? "Affiliate / Facility Code" : "Facility Business Code"}
          </label>
          <input
            type="text"
            maxLength={8}
            placeholder={stickerType === "FRANCHISE" ? "e.g. 1001 or AFF-101" : "e.g. 1001 (or leave blank for bulk)"}
            value={businessCode}
            onChange={(e) => setBusinessCode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Interactive Printable Sticker Card Preview (EXACT MATCH WITH DESIGN) */}
      <div className="max-w-lg mx-auto bg-white text-slate-900 rounded-xl p-5 shadow-2xl border-2 border-slate-900 printable-card font-sans">
        
        {/* Dark Blue Solid Top Banner */}
        <div className="bg-[#103562] text-white py-4 px-3 text-center mb-5">
          <h3 className="text-base font-extrabold tracking-wide uppercase leading-snug text-white">{getHeaderTitle()}</h3>
        </div>

        {/* Massive Primary QR Code (Utilizes all available width) */}
        <div className="flex justify-center my-3 py-2 bg-white">
          <QRCodeCanvas value={getPrimaryUrl()} size={310} level="H" includeMargin={false} />
        </div>

        {/* Wide Full-Width Facility Code Box */}
        <div className="my-5 py-3.5 px-4 border-2 border-[#103562] bg-white flex items-center justify-between gap-2 min-h-[56px]">
          <span className="text-xs sm:text-sm font-bold text-[#103562] uppercase tracking-wide shrink-0">
            {stickerType === "FRANCHISE" ? "AFFILIATE / FACILITY CODE :" : "FACILITY CODE :"}
          </span>
          <span className="font-mono text-base sm:text-lg font-extrabold text-blue-900 flex-1 text-left tracking-widest pl-3">
            {businessCode.trim() ? businessCode.trim() : ""}
          </span>
        </div>

        {/* Dark Blue Separator Bar */}
        <div className="h-1 bg-[#103562] my-4" />

        {/* Footer Layout - Circular Marut Logo + 5-Line Right Indented Typography */}
        <div className="flex items-center justify-between gap-2 pt-1">
          
          {/* Left: Circular Marut Logo (+ Franchise QR for non-franchise stickers) */}
          <div className="flex items-center gap-2">
            <img
              src="/marut_hanuman_logo.png"
              alt="Marut Fitness Logo"
              className="w-16 h-16 object-contain rounded-full border border-amber-500/40"
            />

            {stickerType !== "FRANCHISE" && (
              <div className="flex flex-col items-center">
                <div className="p-0.5 bg-white border border-slate-900">
                  <QRCodeCanvas value={getFranchiseUrl()} size={62} level="M" includeMargin={false} />
                </div>
                <span className="text-[8px] font-extrabold text-slate-900 mt-0.5 uppercase tracking-tighter">FRANCHISE DETAILS</span>
              </div>
            )}
          </div>

          {/* Right: 5-Line Clean Typography (Right-Indented) */}
          <div className="text-right leading-tight pl-2">
            <p className="text-[11px] font-extrabold text-slate-900 uppercase">OWN A FITNESS TECHNOLOGY BUSINESS</p>
            <p className="text-[9px] font-semibold text-slate-700">No Technical Background Required</p>
            <p className="text-[9px] font-bold text-blue-700">Invest in a MarutFit.com Franchise</p>
            <p className="text-[8px] font-medium text-slate-600">AiVONIC Technology PVT LTD provides Technology & Technical Support</p>
            <p className="text-[9px] font-bold text-slate-900 mt-0.5">Contact Now IN-7671801206 / email : franchise@marutfit.com</p>
          </div>
        </div>

      </div>

    </div>
  );
}
