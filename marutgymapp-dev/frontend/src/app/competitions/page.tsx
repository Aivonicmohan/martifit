"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { authFetch } from "@/lib/apiConfig";
import {
  Trophy,
  Plus,
  Trash2,
  Video,
  CheckCircle2,
  AlertCircle,
  Medal,
  Award,
  Search,
  Filter,
  Flame,
  X,
  Play,
  UserCheck,
  Building2,
  ArrowUpDown
} from "lucide-react";

function formatYoutubeUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();

  if (clean.includes("/shorts/")) {
    const match = clean.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  if (clean.includes("watch?v=")) {
    const match = clean.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  if (clean.includes("youtu.be/")) {
    const match = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  if (clean.includes("/embed/")) {
    const match = clean.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  return clean;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentComp, setCurrentComp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Video Player Modal State
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoParticipant, setActiveVideoParticipant] = useState<string>("");

  // Create Competition Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    category: "GYM",
    metricType: "REPS",
    metricUnit: "reps",
    description: "",
  });

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/tenants/competitions");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.competitions)) {
          setCompetitions(data.competitions);
          if (data.competitions.length > 0 && !selectedCompId) {
            setSelectedCompId(data.competitions[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error loading competitions:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (compId: string) => {
    if (!compId) return;
    try {
      setLoadingLeaderboard(true);
      const res = await authFetch(`/api/v1/tenants/competitions/${compId}/leaderboard`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setCurrentComp(data.competition);
          setLeaderboard(data.submissions || []);
        }
      }
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompId) {
      loadLeaderboard(selectedCompId);
    }
  }, [selectedCompId]);

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      const res = await authFetch("/api/v1/tenants/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert("Competition event created successfully!");
        setIsModalOpen(false);
        setCreateForm({
          title: "",
          category: "GYM",
          metricType: "REPS",
          metricUnit: "reps",
          description: "",
        });
        loadCompetitions();
      } else {
        alert(data?.error || "Failed to create competition.");
      }
    } catch (err) {
      alert("Error creating competition event.");
    }
  };

  const handleDeleteCompetition = async (id: string, title: string) => {
    if (!confirm(`Delete competition event "${title}"?\nAll associated member submissions will also be deleted.`)) return;

    try {
      const res = await authFetch(`/api/v1/tenants/competitions/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        alert("Competition deleted successfully!");
        if (selectedCompId === id) {
          setSelectedCompId("");
          setLeaderboard([]);
        }
        loadCompetitions();
      } else {
        alert(data?.error || "Failed to delete competition.");
      }
    } catch (err) {
      alert("Error deleting competition.");
    }
  };

  const handleUpdateSubmissionStatus = async (subId: string, newStatus: string) => {
    try {
      const res = await authFetch(`/api/v1/tenants/competitions/submissions/${subId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        loadLeaderboard(selectedCompId);
      } else {
        alert(data?.error || "Failed to update status.");
      }
    } catch (err) {
      alert("Error updating submission status.");
    }
  };

  const filteredLeaderboard = leaderboard.filter(
    (sub) =>
      sub.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.participantPhone.includes(searchQuery) ||
      sub.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full text-amber-300 text-xs font-semibold backdrop-blur-md">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Member Competition Engine & Leaderboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Gym, Zumba, Yoga & Sports Contests
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Add dynamic competition events, auto-sort top performance scores, audit YouTube video proofs, and select finalists for live on-stage competitions.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Competition Event</span>
            </button>
          </div>
        </div>

        {/* Competition Event Tabs Selector */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              Active Competition Categories ({competitions.length})
            </span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
              Loading competition events...
            </div>
          ) : competitions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No competition categories created yet. Click "+ Add Competition Event" above to create one.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {competitions.map((comp) => {
                const isSelected = comp.id === selectedCompId;
                return (
                  <div
                    key={comp.id}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                    onClick={() => setSelectedCompId(comp.id)}
                  >
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {comp.category}
                    </span>
                    <span>{comp.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isSelected ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"}`}>
                      {comp._count?.submissions || 0} Entries
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCompetition(comp.id, comp.title);
                      }}
                      title="Delete Event"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-rose-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Event Leaderboard Section */}
        {currentComp && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
            
            {/* Header Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{currentComp.title}</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {currentComp.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                    Metric: {currentComp.metricUnit} (Sorted Descending)
                  </span>
                </div>
                {currentComp.description && (
                  <p className="text-xs text-slate-500 mt-1">{currentComp.description}</p>
                )}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search participant or gym..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Leaderboard Table */}
            {loadingLeaderboard ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading live leaderboard...
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 space-y-2">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <p>No participant submissions for this competition event yet.</p>
                <p className="text-[11px] text-slate-500">
                  Members scan the "🏆 Member Competition Entry" QR sticker to submit performance vitals & YouTube video link!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-4 px-5">Rank</th>
                      <th className="py-4 px-5">Participant Name</th>
                      <th className="py-4 px-5">Facility Location</th>
                      <th className="py-4 px-5">
                        <div className="flex items-center gap-1">
                          <span>Vitals Score</span>
                          <ArrowUpDown className="w-3 h-3 text-amber-500" />
                        </div>
                      </th>
                      <th className="py-4 px-5">Video Proof</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeaderboard.map((sub) => {
                      const isTop3 = sub.rank <= 3;
                      return (
                        <tr key={sub.id} className={`hover:bg-slate-50/80 transition-colors ${sub.status === "VERIFIED_FINALIST" ? "bg-amber-50/40" : ""}`}>
                          {/* Rank */}
                          <td className="py-4 px-5">
                            <div className="flex items-center space-x-2">
                              {sub.rank === 1 ? (
                                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20">
                                  🥇 1
                                </span>
                              ) : sub.rank === 2 ? (
                                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 font-extrabold text-sm flex items-center justify-center border border-slate-300">
                                  🥈 2
                                </span>
                              ) : sub.rank === 3 ? (
                                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-white font-extrabold text-sm flex items-center justify-center">
                                  🥉 3
                                </span>
                              ) : (
                                <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                                  #{sub.rank}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Participant */}
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{sub.participantName}</div>
                            <span className="text-[10px] text-slate-500">📞 {sub.participantPhone}</span>
                          </td>

                          {/* Facility */}
                          <td className="py-4 px-5 font-semibold text-slate-700">
                            <div>{sub.tenant?.branding?.businessName || sub.tenant?.name || "Facility"}</div>
                            {sub.tenant?.businessCode && (
                              <span className="text-[10px] font-mono text-slate-400">Code: {sub.tenant.businessCode}</span>
                            )}
                          </td>

                          {/* Vitals Score */}
                          <td className="py-4 px-5">
                            <div className="flex items-baseline space-x-1.5">
                              <span className="text-base font-black font-mono text-amber-600">
                                {sub.metricValue}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300/80 rounded-md shadow-2xs">
                                {currentComp?.metricUnit || sub.competition?.metricUnit || "reps"}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase mt-0.5">
                              {currentComp?.metricType || sub.competition?.metricType || "REPS"}
                            </div>
                          </td>

                          {/* Video Proof */}
                          <td className="py-4 px-5">
                            <button
                              onClick={() => {
                                setActiveVideoUrl(formatYoutubeUrl(sub.youtubeUrl));
                                setActiveVideoParticipant(sub.participantName);
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                              <span>Watch Video</span>
                            </button>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                sub.status === "VERIFIED_FINALIST"
                                  ? "bg-amber-500/20 text-amber-800 border border-amber-400"
                                  : sub.status === "DISQUALIFIED"
                                  ? "bg-rose-500/10 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {sub.status === "VERIFIED_FINALIST" ? "🏆 Top Finalist" : sub.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {sub.status !== "VERIFIED_FINALIST" && (
                                <button
                                  onClick={() => handleUpdateSubmissionStatus(sub.id, "VERIFIED_FINALIST")}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition shadow-xs flex items-center gap-1"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Mark Finalist</span>
                                </button>
                              )}
                              {sub.status !== "DISQUALIFIED" && (
                                <button
                                  onClick={() => handleUpdateSubmissionStatus(sub.id, "DISQUALIFIED")}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[11px] font-bold rounded-xl transition"
                                >
                                  Disqualify
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL: CREATE NEW COMPETITION EVENT */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Competition Event</h3>
                  <p className="text-xs text-slate-500">Create a new contest for members to submit vitals & video proof.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCompetition} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Competition Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Max Bench Press Reps, Zumba Dance Battle, Plank Duration"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category *</label>
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-bold"
                    >
                      <option value="GYM">🏋️ GYM</option>
                      <option value="ZUMBA">💃 ZUMBA</option>
                      <option value="YOGA">🧘 YOGA</option>
                      <option value="SPORTS">⚽ SPORTS</option>
                      <option value="CROSSFIT">🔥 CROSSFIT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Metric Type *</label>
                    <select
                      value={createForm.metricType}
                      onChange={(e) => {
                        const m = e.target.value;
                        const unit = m === "DURATION" ? "seconds" : m === "COUNT" ? "points" : "reps";
                        setCreateForm({ ...createForm, metricType: m, metricUnit: unit });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-bold"
                    >
                      <option value="REPS">REPS (Reps Completed)</option>
                      <option value="DURATION">DURATION (Time in Seconds)</option>
                      <option value="COUNT">COUNT (Score Points)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metric Unit Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. reps, seconds, points"
                    value={createForm.metricUnit}
                    onChange={(e) => setCreateForm({ ...createForm, metricUnit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description / Rules</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Full range of motion required. Touch chest to bar."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl shadow-md"
                  >
                    Create Competition Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: YOUTUBE VIDEO AUDIT PLAYER */}
        {activeVideoUrl && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-800 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-white">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                    Video Proof Audit: <span className="text-amber-400">{activeVideoParticipant}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setActiveVideoUrl(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800">
                <iframe
                  src={activeVideoUrl}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setActiveVideoUrl(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                >
                  Close Audit Player
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
