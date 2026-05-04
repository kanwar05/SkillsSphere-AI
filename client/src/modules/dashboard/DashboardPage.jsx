import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { 
  BadgeCheck, 
  FileText, 
  LogOut, 
  Mail, 
  Shield, 
  User, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Clock,
  ArrowRight,
  Target,
  Sparkles,
  Zap,
  ChevronRight,
  BarChart3,
  Calendar
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { logout } from "../../features/auth/authSlice";
import Button from "../../shared/components/Button";
import Navbar from "../../shared/landing/Navbar";
import { getAnalysisHistory } from "./services/dashboardService";

const ROLE_LABELS = {
  student: "Student",
  tutor: "Tutor",
  recruiter: "Recruiter",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-xs text-slate-400 mb-1">{payload[0].payload.fullDate}</p>
        <p className="text-sm font-bold text-blue-400">Score: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const SuggestionItem = ({ suggestion }) => {
  // Handle both string and object formats for robustness
  const text = typeof suggestion === "string" ? suggestion : (suggestion?.text || "");
  const priority = suggestion?.priority || "";

  const suggestionDetails = useMemo(() => {
    const safeText = text.toLowerCase();
    
    if (priority === "Critical" || safeText.includes("urgent") || safeText.includes("missing")) {
      return {
        icon: <AlertCircle size={16} className="text-red-400" />,
        bg: "bg-red-500/5",
        border: "border-red-500/20",
        label: "Critical Action",
        textColor: "text-red-300"
      };
    }
    
    if (priority === "Strategic" || safeText.includes("add") || safeText.includes("integrate") || safeText.includes("projects")) {
      return {
        icon: <Sparkles size={16} className="text-blue-400" />,
        bg: "bg-blue-500/5",
        border: "border-blue-500/20",
        label: "Strategic Tip",
        textColor: "text-blue-300"
      };
    }

    if (priority === "Optimization" || safeText.includes("metric") || safeText.includes("measure") || safeText.includes("highlight")) {
      return {
        icon: <TrendingUp size={16} className="text-emerald-400" />,
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20",
        label: "Growth Area",
        textColor: "text-emerald-300"
      };
    }

    return {
      icon: <Zap size={16} className="text-amber-400" />,
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      label: "Critical Action",
      textColor: "text-amber-300"
    };
  }, [suggestion, text, priority]);

  const { icon, bg, border, label, textColor } = suggestionDetails;

  return (
    <div className={`group flex flex-col gap-2 p-4 rounded-xl border ${bg} ${border} transition-all duration-300 hover:bg-white/[0.02]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${bg} border border-white/5`}>
            {icon}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{label}</span>
        </div>
        <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <p className="text-sm text-slate-300 leading-relaxed font-medium">
        {text.split(' ').map((word, i) => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
          const isHighlight = ['skills', 'projects', 'metrics', 'achievements', 'keywords', 'experience', 'ats', 'readability'].includes(cleanWord);
          return (
            <span key={i} className={isHighlight ? 'text-white font-bold' : ''}>
              {word}{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await getAnalysisHistory();
        if (response.success) {
          setHistory(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const chartData = useMemo(() => {
    return [...history].reverse().map(item => ({
      date: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: item.score,
      fullDate: new Date(item.createdAt).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }));
  }, [history]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const latestAnalysis = history.length > 0 ? history[0] : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-3 sm:p-5 pt-20 sm:pt-28 text-slate-100">
      <Navbar />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 py-6 sm:py-8 px-0 sm:px-2">
        {/* Header Section */}
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
              <p className="text-xs sm:text-sm font-medium text-blue-300 uppercase tracking-wider">Professional Intelligence</p>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Welcome, {user?.name || "Learner"}
            </h1>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
            className="border-slate-700/50 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-sm w-full sm:w-auto transition-all duration-300"
          >
            Logout
          </Button>
        </div>

        {/* User Stats Grid */}
        <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1 sm:grid-cols-2">
          <div className="group relative rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-blue-500/30">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <User size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Profile Name</p>
              <p className="mt-1 font-bold text-lg text-slate-100 break-words">{user?.name || "Not available"}</p>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-emerald-500/30">
             <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Mail size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Email Address</p>
              <p className="mt-1 font-bold text-lg text-slate-100 break-words">{user?.email || "Not available"}</p>
            </div>
          </div>

          <div className="group relative rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-violet-500/30 sm:col-span-2 md:col-span-1">
             <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Access Role</p>
              <p className="mt-1 font-bold text-lg text-slate-100">
                {ROLE_LABELS[user?.role] || user?.role || "Not available"}
              </p>
            </div>
          </div>
        </section>

        {/* Analytics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Score Trend Chart */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden backdrop-blur-md">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-blue-400" size={20} />
                  <h2 className="text-lg font-bold">Performance Trend</h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-md">
                  <Calendar size={12} />
                  <span>Last {history.length} Analyses</span>
                </div>
              </div>
              <div className="p-6 h-[280px] min-h-[280px] w-full">
                {history.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <Activity size={40} className="opacity-20 mb-3" />
                    <p className="text-sm">Need at least 2 analyses to show trend</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden backdrop-blur-md">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-emerald-400" size={20} />
                  <h2 className="text-lg font-bold">Latest Analysis Summary</h2>
                </div>
                {latestAnalysis && (
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(latestAnalysis.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              <div className="p-6">
                {!latestAnalysis ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No analysis data yet</h3>
                    <p className="text-slate-400 max-w-sm mb-6">
                      Upload your resume to see your profile strength, skills analysis, and strategic recommendations.
                    </p>
                    <Link
                      to="/resume-analyzer"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    >
                      <Sparkles size={18} />
                      Start Analyzing Now
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Score and Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="relative h-20 w-20 flex items-center justify-center">
                          <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                              className="stroke-slate-700"
                              strokeWidth="3"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className={`${latestAnalysis.score >= 70 ? "stroke-emerald-500" : latestAnalysis.score >= 40 ? "stroke-yellow-500" : "stroke-red-500"}`}
                              strokeWidth="3"
                              strokeDasharray={`${latestAnalysis.score}, 100`}
                              strokeLinecap="round"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute text-xl font-black">{latestAnalysis.score}%</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Score</p>
                          <p className="text-2xl font-black text-white">{latestAnalysis.classification}</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Skills Match</p>
                        <div className="flex flex-wrap gap-2">
                          {latestAnalysis.skills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-tight">
                              {skill}
                            </span>
                          ))}
                          {latestAnalysis.skills.length > 5 && (
                            <span className="text-[10px] text-slate-500 self-center font-bold">+{latestAnalysis.skills.length - 5} MORE</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle size={18} />
                        <h3 className="font-bold text-sm uppercase tracking-widest">Priority Gaps</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {latestAnalysis.missingSkills.length > 0 ? (
                          latestAnalysis.missingSkills.map((skill, idx) => (
                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400 text-xs font-bold border border-red-500/20 uppercase tracking-wide">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400 italic">No missing skills identified</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History Table */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden backdrop-blur-md">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-violet-400" size={20} />
                  <h2 className="text-lg font-bold">Analysis History</h2>
                </div>
                <span className="text-xs font-medium text-slate-500">{history.length} records found</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/30 text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4 font-bold">Date</th>
                      <th className="px-6 py-4 font-bold">Score</th>
                      <th className="px-6 py-4 font-bold">Level</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.length > 0 ? (
                      history.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-300">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">
                            <span className={`${item.score >= 70 ? "text-emerald-400" : item.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                              {item.score}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              item.classification.includes("Strong") || item.classification === "Advanced"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : item.classification === "Intermediate"
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {item.classification}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                             <div className="flex items-center gap-1.5 text-emerald-500">
                               <CheckCircle size={14} />
                               <span className="text-[10px] font-bold uppercase tracking-wide">Processed</span>
                             </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm">
                          No history found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Smart Suggestions Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden backdrop-blur-md">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center gap-2">
                <Target className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold">Smart Insights</h2>
              </div>
              <div className="p-4 space-y-4">
                {latestAnalysis && latestAnalysis.suggestions.length > 0 ? (
                  latestAnalysis.suggestions.map((suggestion, idx) => (
                    <SuggestionItem key={idx} suggestion={suggestion} />
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Zap size={24} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs uppercase tracking-widest">No insights generated yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-blue-900/40 p-6 shadow-xl backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-all"></div>
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" />
                Improve Profile
              </h3>
              <p className="text-sm text-blue-100/70 mb-6">
                Take the next step in your career journey with our AI-driven tools.
              </p>
              
              <div className="space-y-3">
                <Link
                  to="/resume-analyzer"
                  className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-blue-300" />
                    <span className="font-semibold text-sm">Update Resume</span>
                  </div>
                  <ArrowRight size={16} className="text-blue-300 group-hover/link:translate-x-1 transition-transform" />
                </Link>
                
                <Link
                  to="/job-matcher"
                  className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Target size={18} className="text-emerald-300" />
                    <span className="font-semibold text-sm">Find Matches</span>
                  </div>
                  <ArrowRight size={16} className="text-emerald-300 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Account Status */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Account Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                       <BadgeCheck size={16} />
                     </div>
                     <span className="text-sm font-medium">Verified Account</span>
                   </div>
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                       <Sparkles size={16} />
                     </div>
                     <span className="text-sm font-medium">Pro Features</span>
                   </div>
                   <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default DashboardPage;
