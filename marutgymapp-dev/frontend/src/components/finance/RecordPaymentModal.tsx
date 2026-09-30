"use client";

import React, { useEffect, useState } from "react";
import { X, Search, Check, CreditCard, DollarSign, User, Calendar, FileText, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMemberId?: string;
}

export function RecordPaymentModal({ isOpen, onClose, onSuccess, initialMemberId }: RecordPaymentModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // Search Members Effect
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await authFetch(`/api/v1/members?search=${encodeURIComponent(searchQuery)}&status=ALL`);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.members)) {
            setSearchResults(data.members.slice(0, 8)); // Top 8 matches
          }
        }
      } catch (err) {
        console.error("Error searching members:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  // Handle Initial Member ID if provided
  useEffect(() => {
    if (isOpen && initialMemberId && !selectedMember) {
      const loadInitialMember = async () => {
        try {
          const res = await authFetch(`/api/v1/members?search=${encodeURIComponent(initialMemberId || "")}`);
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.success && Array.isArray(data.members) && data.members.length > 0) {
              handleSelectMember(data.members[0]);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      loadInitialMember();
    }
  }, [isOpen, initialMemberId]);

  const handleSelectMember = (member: any) => {
    setSelectedMember(member);
    setError("");
    const activeMembership = member.memberships?.[0];
    if (activeMembership && activeMembership.pendingAmount > 0) {
      setAmount(String(activeMembership.pendingAmount));
    } else if (activeMembership && activeMembership.totalAmount > 0) {
      setAmount(String(activeMembership.totalAmount));
    } else {
      setAmount("");
    }
  };

  const handleClearSelection = () => {
    setSelectedMember(null);
    setAmount("");
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setError("Please search and select a member first.");
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const activeMembership = selectedMember.memberships?.[0];

      const res = await authFetch("/api/v1/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          membershipId: activeMembership?.id,
          amount: numAmount,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          paymentDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        onSuccess();
        resetAndClose();
      } else {
        setError(data?.error || "Failed to record payment. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Error submitting payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSelectedMember(null);
    setSearchQuery("");
    setSearchResults([]);
    setAmount("");
    setPaymentMethod("CASH");
    setTransactionRef("");
    setNotes("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const activeMembership = selectedMember?.memberships?.[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span>Record Fee Payment</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Collect member fees, update pending dues, and issue receipt.</p>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Search & Selection Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Gym Member <span className="text-rose-500">*</span>
            </label>

            {selectedMember ? (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {selectedMember.avatarUrl ? (
                    <img src={selectedMember.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-blue-300" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                      {selectedMember.firstName?.[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {selectedMember.firstName} {selectedMember.lastName}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {selectedMember.memberCode} | Ph: {selectedMember.phone}
                    </p>
                    {activeMembership ? (
                      <p className="text-[10px] font-semibold text-blue-700 mt-0.5">
                        Plan: {activeMembership.plan?.name || "Active"} | Dues: ₹{activeMembership.pendingAmount?.toLocaleString("en-IN") || 0}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No Active Plan Assigned</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member by name, ID code, or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />

                {/* Dropdown Search Results */}
                {searchQuery.trim().length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {isSearching ? (
                      <div className="p-3 text-center text-xs text-slate-400 animate-pulse">Searching members...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">No member found matching "{searchQuery}"</div>
                    ) : (
                      searchResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMember(m)}
                          className="w-full text-left p-3 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border">
                              {m.firstName?.[0]}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {m.firstName} {m.lastName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                ID: {m.memberCode} | {m.phone}
                              </div>
                            </div>
                          </div>
                          {m.memberships?.[0]?.pendingAmount > 0 && (
                            <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Due: ₹{m.memberships[0].pendingAmount.toLocaleString("en-IN")}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount Field */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CASH">💵 Cash</option>
                <option value="UPI">📱 UPI / QR Code</option>
                <option value="CARD">💳 Credit / Debit Card</option>
                <option value="NET_BANKING">🏦 Net Banking</option>
                <option value="CHEQUE">📝 Cheque</option>
              </select>
            </div>
          </div>

          {/* Date & Transaction Ref */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Ref / UTR</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref # or Cheque No."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Partial fee payment for August"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedMember}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Saving Payment...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm & Save Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
