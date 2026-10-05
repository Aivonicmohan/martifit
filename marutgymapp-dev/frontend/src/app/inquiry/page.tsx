import React, { Suspense } from "react";
import { PublicInquiryClient } from "./[slug]/PublicInquiryClient";

export default function InquiryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-3 text-white">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-300">Loading Gym Inquiry Portal...</p>
          </div>
        </div>
      }
    >
      <PublicInquiryClient />
    </Suspense>
  );
}
