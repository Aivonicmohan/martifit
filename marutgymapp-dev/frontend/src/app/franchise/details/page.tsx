"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";

function FranchiseDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const ref = searchParams.get("ref") || searchParams.get("affiliate") || searchParams.get("code");
      
      try {
        const res = await fetch(getApiUrl("/api/v1/public/system-settings/franchise_target_url"));
        const data = await res.json();

        if (data.success && data.value && data.value.trim()) {
          let customUrl = data.value.trim();
          if (ref) {
            customUrl += customUrl.includes("?") ? `&ref=${encodeURIComponent(ref)}` : `?ref=${encodeURIComponent(ref)}`;
          }
          window.location.href = customUrl;
          return;
        }
      } catch (err) {
        console.error("Error fetching franchise target setting:", err);
      }

      // Default fallback if no custom URL is configured
      const fallbackUrl = ref ? `/franchise?ref=${encodeURIComponent(ref)}` : `/franchise`;
      router.replace(fallbackUrl);
    };

    handleRedirect();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-300 font-semibold text-sm">Redirecting to Franchise Opportunity Details...</p>
      </div>
    </div>
  );
}

export default function FranchiseDetailsRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 font-semibold text-sm">Loading Franchise Redirect...</p>
        </div>
      </div>
    }>
      <FranchiseDetailsContent />
    </Suspense>
  );
}
