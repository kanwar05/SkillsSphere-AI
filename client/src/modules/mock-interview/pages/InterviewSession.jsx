import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { submitAnswer, completeInterview } from "../services/interviewService";
import { apiRequest } from "../../../services/apiClient";
import InterviewSessionSkeleton from "../components/InterviewSessionSkeleton";
import ObserverPanel from "../components/ObserverPanel";
import RealtimeSentimentIndicator from "../components/RealtimeSentimentIndicator";
import { analyzeText, debounce } from "../utils/sentiment";
import {
  Send,
  CheckCircle,
  Clock,
  ChevronRight,
  Trophy,
  Loader2,
  AlertCircle,
  Target,
  MessageSquare,
  Brain,
} from "lucide-react";

const TOKEN_KEY = "skillssphere.auth.token";

const InterviewSession = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastScores, setLastScores] = useState(null);
  const [showScores, setShowScores] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const debouncedAnalyze = useRef(
    debounce((text) => {
      setAnalysis(analyzeText(text));
    }, 500)
  ).current;

  // Socket & Multi-role state
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [liveTyping, setLiveTyping] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");

  const isObserver = user && session && user._id !== session.userId;

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token =
          localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        const res = await apiRequest(`/api/interviews/${sessionId}`, {
          method: "GET",
          token,
        });
        const data = res.data;
        setSession(data);

        // Find the first unanswered question
        const unansweredIdx = data.answers.findIndex(
          (a) => !a.transcript && !a.scores,
        );
        const idx = unansweredIdx >= 0 ? unansweredIdx : 0;
        setCurrentIndex(idx);
        setCurrentQuestion({
          questionText: data.answers[idx]?.questionText,
          questionId: data.answers[idx]?.questionId,
        });
        setIsLastQuestion(idx === data.answers.length - 1);
      } catch (err) {
        setError("Failed to load interview session.");
        console.error("[InterviewSession] Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Socket Connection
  useEffect(() => {
    if (!session || !user) return;
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    
    // In production, VITE_API_URL should be used. Using standard URL for now.
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const newSocket = io(socketUrl, { auth: { token } });

    newSocket.on("connect", () => {
      setSocketStatus("connected");
      newSocket.emit("join-interview", { sessionId });
    });

    newSocket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    newSocket.on("reconnect_attempt", () => {
      setSocketStatus("reconnecting");
    });

    newSocket.on("interview-participants", (pts) => {
      setParticipants(pts.filter(p => p.user.id !== user._id));
    });

    newSocket.on("participant-joined", (data) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== data.socketId), data]);
    });

    newSocket.on("participant-left", (data) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
    });

    newSocket.on("interview-typing", ({ text }) => {
      setLiveTyping(text);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [session, user, sessionId]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await submitAnswer(sessionId, answer.trim());
      const data = res.data;

      setLastScores(data.scores);
      setShowScores(true);
      setAnswer("");

      if (data.isLastQuestion) {
        setIsLastQuestion(true);
      } else if (data.nextQuestion) {
        // Wait 3 seconds to show scores, then load next question
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setCurrentIndex(data.nextQuestion.index);
          setShowScores(false);
          setLastScores(null);
          if (textareaRef.current) textareaRef.current.focus();
        }, 3000);
      }
    } catch (err) {
      setError(err.message || "Failed to submit answer.");
      console.error("[InterviewSession] Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);

    try {
      await completeInterview(sessionId);
      navigate(`/mock-interview/${sessionId}/results`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to complete interview.");
      console.error("[InterviewSession] Complete error:", err);
    } finally {
      setCompleting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey && !submitting) {
      handleSubmitAnswer();
    }
  };

  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
    debouncedAnalyze(e.target.value);
    if (socket && !isObserver) {
      socket.emit("interview-typing", { sessionId, text: e.target.value });
    }
  };

  const handleSendFeedback = (note) => {
    if (socket) {
      socket.emit("save-private-note", { sessionId, note });
    }
  };

  if (loading) {
    return <InterviewSessionSkeleton />;
  }

  if (error && !session) {
    return (
      <div className="max-w-[900px] mx-auto p-8 min-h-[calc(100vh-80px)] flex flex-col gap-6">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
          <AlertCircle size={48} />
          <p>{error}</p>
          <button
            className="bg-indigo-500/15 text-indigo-300 border-none py-3 px-6 rounded-xl font-semibold cursor-pointer"
            onClick={() => navigate("/mock-interview")}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const totalQuestions = session?.totalQuestions || 0;

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden p-6">
      <div className="flex-1 max-w-4xl mx-auto flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 py-4 px-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex-wrap dark:bg-gray-900/70">
        <div className="flex gap-2 items-center">
          <span className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white py-1 px-3 rounded-full text-xs font-bold tracking-wider uppercase">{session?.topic?.toUpperCase()}</span>
          <span className="bg-indigo-500/15 text-indigo-300 py-1 px-3 rounded-full text-xs font-semibold capitalize">{session?.difficulty}</span>
        </div>

        <div className="flex-1 min-w-[200px] flex flex-col gap-1">
          <div className="text-xs text-slate-400 text-center">
            Question {currentIndex + 1} of {totalQuestions}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{
                width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-base text-slate-400 font-semibold">
          <Clock size={16} />
          {formatTime(elapsedTime)}
        </div>
        <div className="flex items-center gap-2 py-2 px-4 bg-black/20 rounded-full text-xs font-semibold">
          <span className={`w-2 h-2 rounded-full animate-pulse ${
            socketStatus === "connected" ? "bg-emerald-500" :
            socketStatus === "disconnected" ? "bg-red-500" :
            socketStatus === "reconnecting" ? "bg-amber-500" :
            "bg-slate-400"
          }`} />
          <span className="text-slate-400">
            {socketStatus === "connected" && "Connected"}
            {socketStatus === "disconnected" && "Disconnected"}
            {socketStatus === "reconnecting" && "Reconnecting"}
            {socketStatus === "connecting" && "Connecting..."}
          </span>
        </div>
      </div>

      {/* Question Area */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 text-center dark:bg-gray-900/70 mt-6">
        <div className="text-sm font-bold text-indigo-400 mb-3 tracking-[0.1em]">Q{currentIndex + 1}</div>
        <h2 className="text-2xl font-bold leading-snug text-slate-100">
          {currentQuestion?.questionText || "Loading question..."}
        </h2>
      </div>

      {!showScores && !isObserver && (
        <RealtimeSentimentIndicator analysis={analysis} />
      )}

      {/* Score Flash */}
      {showScores && lastScores && (
        <div className="flex gap-4 justify-center mt-6">
          <div className="flex-1 max-w-[200px] bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-2 dark:bg-gray-900/70">
            <Brain size={18} />
            <span className="text-xs text-slate-400">Technical</span>
            <strong className="text-2xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">{lastScores.technical}%</strong>
          </div>
          <div className="flex-1 max-w-[200px] bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-2 dark:bg-gray-900/70">
            <MessageSquare size={18} />
            <span className="text-xs text-slate-400">Communication</span>
            <strong className="text-2xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">{lastScores.communication}%</strong>
          </div>
          <div className="flex-1 max-w-[200px] bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-2 dark:bg-gray-900/70">
            <Target size={18} />
            <span className="text-xs text-slate-400">Relevance</span>
            <strong className="text-2xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">{lastScores.relevance}%</strong>
          </div>
        </div>
      )}

      {/* Answer Input / Observer View */}
      {!showScores && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 dark:bg-gray-900/70 mt-4">
          {isObserver ? (
            <div className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-6 h-48 overflow-y-auto">
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 mb-2 block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Candidate Typing Live...
              </span>
              <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                {liveTyping || <span className="text-slate-600 italic">Waiting for candidate to start typing...</span>}
              </p>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border border-white/15 rounded-xl p-4 text-slate-100 text-base leading-relaxed resize-y min-h-[140px] focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 placeholder:text-slate-500"
              placeholder="Type your answer here... (Ctrl+Enter to submit)"
              value={answer}
              onChange={handleAnswerChange}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              rows={6}
            />
          )}
          
          <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
            <span className="text-xs text-slate-500">
              {isObserver ? liveTyping.trim().split(/\s+/).filter(Boolean).length : answer.trim().split(/\s+/).filter(Boolean).length} words
            </span>

            {error && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={14} /> {error}
              </span>
            )}

            <button
              className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none py-3 px-6 rounded-xl font-semibold cursor-pointer flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || submitting || isObserver}
              style={{ display: isObserver ? 'none' : 'flex' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Evaluating...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Answer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Complete / Next */}
      {showScores && isLastQuestion && (
        <div className="text-center flex flex-col items-center gap-4 mt-8">
          <p className="text-emerald-500 font-semibold flex items-center gap-2">
            <CheckCircle size={20} /> All questions answered!
          </p>
          <button
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none py-4 px-8 rounded-full text-lg font-bold cursor-pointer flex items-center gap-2 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Calculating
                Results...
              </>
            ) : (
              <>
                <Trophy size={16} /> View Results
              </>
            )}
          </button>
        </div>
      )}

      {showScores && !isLastQuestion && (
        <div className="text-center text-slate-400 flex items-center justify-center gap-2 mt-8">
          <Loader2 className="animate-spin" size={16} />
          Loading next question...
        </div>
      )}
      </div>

      {/* Observer Panel (Only visible if observer) */}
      {isObserver && (
        <ObserverPanel 
          participants={participants} 
          onSendFeedback={handleSendFeedback} 
          isConductor={true} 
        />
      )}
    </div>
  );
};

export default InterviewSession;
