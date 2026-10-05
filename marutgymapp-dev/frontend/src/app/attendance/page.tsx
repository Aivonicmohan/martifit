"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarCheck, QrCode, UserCheck, Clock, Search, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { authFetch } from "@/lib/apiConfig";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [memberCode, setMemberCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [msg, setMsg] = useState("");
  
  // Set default date to today's local date
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const loadAttendance = async () => {
    try {
      const res = await authFetch(`/api/v1/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setAttendance(data.attendance || []);
          setPresentCount(data.presentCount || 0);
          setAbsentCount(data.absentCount || 0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();

    // Auto-refresh every 10 seconds to get newly scanned access without manual refresh
    const intervalId = setInterval(() => {
      loadAttendance();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [selectedDate]); // Re-run effect when selectedDate changes

  const handleCheckIn = async (code: string) => {
    if (!code) return;
    try {
      const res = await authFetch("/api/v1/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCode: code, method: "MANUAL", date: selectedDate }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setMsg(`Check-in successful for ${data.attendance?.member?.firstName || code}`);
          setMemberCode("");
          setIsCheckInModalOpen(false);
          loadAttendance();
        } else {
          alert(data?.error || "Check-in failed");
        }
      } else {
        alert("Check-in failed");
      }
    } catch (err) {
      alert("Error submitting check-in");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance & Check-in Desk</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time check-in logs, biometric device feed, and daily attendance statistics.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              onClick={() => setIsCheckInModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Manual Check-In</span>
            </button>
          </div>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between font-semibold">
            <span>{msg}</span>
            <button onClick={() => setMsg("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Present on {new Date(selectedDate).toLocaleDateString()}</p>
              <p className="text-xl font-bold text-slate-900">{presentCount} Members</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Absent / Not Checked In</p>
              <p className="text-xl font-bold text-slate-900">{absentCount} Members</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Biometric & QR Sync</p>
              <p className="text-xl font-bold text-emerald-600">ONLINE (15m Sync)</p>
            </div>
          </div>
        </div>

        {/* Check-in Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Check-in Log for {new Date(selectedDate).toLocaleDateString()}</h3>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Auto-Refresh Active</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Member Code</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Check-in Method</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {attendance.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.member?.firstName} {log.member?.lastName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.member?.memberCode}</td>
                    <td className="py-3 px-4 text-slate-700">{new Date(log.checkInTime).toLocaleTimeString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                        {log.method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Check-in Modal */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Quick Member Check-In</h3>
              <button onClick={() => setIsCheckInModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Enter Member Code or Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1489 or 9701635058"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <button
                onClick={() => handleCheckIn(memberCode)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Confirm Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
