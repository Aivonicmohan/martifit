"use client";

import React from "react";

export interface CustomFieldDef {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  placeholder?: string | null;
  isRequired: boolean;
  optionsJson?: string | null;
}

interface CustomFieldsRendererProps {
  fields: CustomFieldDef[];
  values: Record<string, any>;
  onChange: (fieldKey: string, value: any) => void;
  errors?: Record<string, string>;
}

export function CustomFieldsRenderer({ fields, values, onChange, errors = {} }: CustomFieldsRendererProps) {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custom Business Fields</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const val = values[field.fieldKey] ?? "";
          const errorMsg = errors[field.fieldKey];

          let options: string[] = [];
          if (field.optionsJson) {
            try {
              options = JSON.parse(field.optionsJson);
            } catch {
              options = [];
            }
          }

          return (
            <div key={field.id} className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                {field.label} {field.isRequired && <span className="text-red-500">*</span>}
              </label>

              {field.fieldType === "DROPDOWN" || field.fieldType === "RADIO" ? (
                <select
                  value={val}
                  onChange={(e) => onChange(field.fieldKey, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select {field.label} --</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.fieldType === "LONG_TEXT" ? (
                <textarea
                  rows={2}
                  value={val}
                  onChange={(e) => onChange(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : field.fieldType === "BOOLEAN" || field.fieldType === "CHECKBOX" ? (
                <label className="flex items-center space-x-2 text-sm text-slate-700 mt-2">
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => onChange(field.fieldKey, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>Enable / Yes</span>
                </label>
              ) : (
                <input
                  type={
                    field.fieldType === "NUMBER" || field.fieldType === "DECIMAL" || field.fieldType === "CURRENCY"
                      ? "number"
                      : field.fieldType === "DATE"
                      ? "date"
                      : field.fieldType === "EMAIL"
                      ? "email"
                      : "text"
                  }
                  value={val}
                  onChange={(e) => onChange(field.fieldKey, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {errorMsg && <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
