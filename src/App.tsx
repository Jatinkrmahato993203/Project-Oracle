import React, { useEffect, useState } from "react";
import { useStore } from "./store.ts";
import { auth, signIn, signOut } from "./lib/firebase.ts";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Target,
  LayoutDashboard,
  Plus,
  Briefcase,
  IndianRupee,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const {
    user,
    token,
    setUser,
    commitments,
    fetchCommitments,
    addCommitment,
    isLoading,
  } = useStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const t = await u.getIdToken();
        setUser(u, t);
      } else {
        setUser(null, null);
      }
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (token) {
      fetchCommitments();
    }
  }, [token, fetchCommitments]);

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 mb-8 text-neutral-400">
          <Target className="w-full h-full" strokeWidth={1} />
        </div>
        <h1 className="text-6xl font-serif mb-4 text-center tracking-tight">
          Project Oracle
        </h1>
        <p className="text-neutral-400 max-w-md text-center mb-12 text-sm uppercase tracking-[0.15em]">
          Know what you'll fail before you fail it. Calculate your exact
          opportunity loss, in real rupees.
        </p>
        <button
          onClick={signIn}
          className="border border-neutral-400 text-neutral-100 px-8 py-3 font-sans text-xs uppercase tracking-[0.2em] hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  const totalAtRiskInr = commitments.reduce((acc, c) => {
    if (c.riskScore > 0.5) return acc + Number(c.stakesInr || 0);
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      <header className="border-b border-neutral-700 bg-neutral-900/90 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-neutral-100">
            <span className="text-[14px] font-bold tracking-[0.2em] uppercase">
              Oracle.
            </span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 hidden md:inline">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-100 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-12 relative">
        <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-gradient-to-b from-neutral-700 to-transparent pointer-events-none hidden md:block"></div>

        {/* Opportunity Loss Banner */}
        <div className="border border-neutral-700 p-8 mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 bg-neutral-900">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Opportunity Loss Radar
            </h2>
            <p className="text-neutral-100 font-serif italic text-lg">
              Expected value at risk based on your current trajectory.
            </p>
          </div>
          <div className="text-6xl font-serif text-neutral-100 italic tracking-tight">
            ₹{totalAtRiskInr.toLocaleString()}
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-700">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Commitments
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <AddCommitmentForm
                onClose={() => setShowAdd(false)}
                onAdd={addCommitment}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-neutral-500 py-24 text-center animate-pulse text-[11px] uppercase tracking-[0.2em]">
              Analyzing trajectory...
            </div>
          ) : commitments.length === 0 ? (
            <div className="text-neutral-500 py-24 text-center border border-neutral-700 text-[11px] uppercase tracking-[0.2em]">
              No active commitments. Add one to start tracking risk.
            </div>
          ) : (
            commitments.map((c) => <CommitmentCard key={c.id} commitment={c} />)
          )}
        </div>
      </main>
    </div>
  );
}

function AddCommitmentForm({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (d: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    title: "",
    category: "Exam Prep",
    dueAt: "",
    estHours: "10",
    stakesInr: "0",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onAdd(formData);
    setSubmitting(false);
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-neutral-700 bg-neutral-900 relative z-10 p-8 mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Title
          </label>
          <input
            required
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full bg-transparent border-b border-neutral-700 pb-2 text-neutral-100 font-serif italic text-lg focus:outline-none focus:border-neutral-400 transition-colors"
            placeholder="e.g. Google Summer Internship App"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full bg-transparent border-b border-neutral-700 pb-2 text-neutral-100 font-serif italic text-lg focus:outline-none focus:border-neutral-400 transition-colors appearance-none"
          >
            <option className="bg-neutral-900 text-neutral-100">
              Exam Prep
            </option>
            <option className="bg-neutral-900 text-neutral-100">
              Internship Application
            </option>
            <option className="bg-neutral-900 text-neutral-100">
              Project Submission
            </option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Deadline
          </label>
          <input
            required
            type="datetime-local"
            value={formData.dueAt}
            onChange={(e) =>
              setFormData({ ...formData, dueAt: e.target.value })
            }
            className="w-full bg-transparent border-b border-neutral-700 pb-2 text-neutral-100 font-serif italic text-lg focus:outline-none focus:border-neutral-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Estimated Effort (Hours)
          </label>
          <input
            required
            type="number"
            min="1"
            value={formData.estHours}
            onChange={(e) =>
              setFormData({ ...formData, estHours: e.target.value })
            }
            className="w-full bg-transparent border-b border-neutral-700 pb-2 text-neutral-100 font-serif italic text-lg focus:outline-none focus:border-neutral-400 transition-colors"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Stakes (Opportunity Value in ₹)
          </label>
          <div className="relative">
            <IndianRupee className="w-4 h-4 absolute left-0 top-1 text-neutral-500" />
            <input
              type="number"
              min="0"
              value={formData.stakesInr}
              onChange={(e) =>
                setFormData({ ...formData, stakesInr: e.target.value })
              }
              className="w-full bg-transparent border-b border-neutral-700 pl-6 pb-2 text-neutral-100 font-serif italic text-lg focus:outline-none focus:border-neutral-400 transition-colors"
              placeholder="e.g. 40000"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-6 justify-end items-center">
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="border border-neutral-400 px-6 py-3 text-[11px] uppercase tracking-[0.15em] text-neutral-100 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        >
          {submitting ? "Analyzing..." : "Add & Analyze Risk"}
        </button>
      </div>
    </form>
  );
}

function CommitmentCard({ commitment }: { key?: React.Key; commitment: any }) {
  const riskColor =
    commitment.riskScore > 0.6
      ? "text-neutral-100 border-neutral-700 bg-neutral-800"
      : commitment.riskScore > 0.3
        ? "text-neutral-300 border-neutral-800 bg-transparent"
        : "text-neutral-500 border-neutral-800 bg-transparent";

  const riskPercentage = Math.round(commitment.riskScore * 100);

  return (
    <div
      className={`border border-neutral-700 p-8 ${riskColor.split(" ").slice(1).join(" ")} transition-all relative overflow-hidden group`}
    >
      <div className="absolute w-[150%] h-[1px] bg-neutral-700 top-1/2 left-[-25%] rotate-[25deg] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"></div>
      <div className="flex flex-col md:flex-row justify-between gap-12">
        <div className="flex-1 z-10">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              {commitment.category}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {new Date(commitment.dueAt).toLocaleDateString()}
            </span>
          </div>
          <h3 className="text-3xl font-serif italic text-neutral-100 mb-8">
            {commitment.title}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-neutral-700">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">
                Effort Needed
              </div>
              <div className="font-serif italic text-lg">
                {commitment.estHours} hrs
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">
                Value at Stake
              </div>
              <div className="font-serif italic text-lg">
                ₹{Number(commitment.stakesInr).toLocaleString()}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">
                Calibration State
              </div>
              <div className="text-sm text-neutral-400 font-serif italic">
                {commitment.basis?.personalReliability === 0.5
                  ? "General baseline. Personalizing as we learn your history."
                  : "Personalized based on your track record."}
              </div>
            </div>
          </div>

          {commitment.recoveryPlan && (
            <div className="mt-8">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4 flex items-center gap-3">
                <TrendingDown className="w-4 h-4 text-neutral-400" />
                Recovery Plan
              </h4>
              <div className="text-lg font-serif italic text-neutral-300 leading-relaxed whitespace-pre-line pl-6 border-l border-neutral-700">
                {commitment.recoveryPlan}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-start min-w-[120px] z-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
            Risk Score
          </div>
          <div
            className={`text-6xl font-serif italic tracking-tighter ${riskColor.split(" ")[0]}`}
          >
            {riskPercentage}%
          </div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-[0.1em] mt-4 text-right max-w-[150px]">
            Based on explicit time pressure & history.
          </div>
        </div>
      </div>
    </div>
  );
}
