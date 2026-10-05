"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FormInput, Plus, Tag, Layers, CheckCircle2 } from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFields() {
      try {
        const res = await authFetch("/api/v1/custom-fields?entity=MEMBER");
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success) setFields(data.fields || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFields();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Custom Form Fields Engine</h1>
            <p className="text-xs text-slate-500 mt-1">Configure custom member registration fields, document uploads, and facility tags.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Active Member Custom Attributes</h3>
          {fields.length === 0 ? (
            <p className="text-xs text-slate-500">No custom form fields created. Custom fields allow tracking additional member properties.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {fields.map((f) => (
                <div key={f.id} className="p-4 bg-slate-50 border rounded-xl">
                  <span className="text-xs font-bold text-slate-900">{f.name}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Type: {f.fieldType} ({f.required ? "Required" : "Optional"})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
