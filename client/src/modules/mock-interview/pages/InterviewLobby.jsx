import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CameraCheck from "../components/CameraCheck";
import PersonaSelector from "../components/PersonaSelector";
import Button from "../../../shared/components/Button";
import Select from "../../../shared/components/Select";
import { Play, GraduationCap, History, Loader2 } from "lucide-react";
import { getTopics, startSession } from "../services/interviewService";

const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const InterviewLobby = () => {
  const navigate = useNavigate();
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("friendly");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await getTopics();
        const topicList = res.data || [];
        setTopics(topicList);
        if (topicList.length > 0) {
          setTopic(topicList[0].topic);
        }
      } catch (err) {
        setError("Failed to load interview topics. Please try again.");
        console.error("[InterviewLobby] Error fetching topics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const handleStartInterview = async () => {
    if (!topic) return;
    setStarting(true);
    setError(null);

    try {
      const res = await startSession(topic, difficulty);
      const sessionId = res.data?.sessionId;
      if (sessionId) {
        navigate(`/mock-interview/${sessionId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to start interview. Please try again.");
      console.error("[InterviewLobby] Error starting session:", err);
    } finally {
      setStarting(false);
    }
  };

  const topicOptions = topics.map((t) => ({
    value: t.topic,
    label: `${t.topic.charAt(0).toUpperCase() + t.topic.slice(1)} (${t.questionCount} in bank)`,
  }));

  return (
    <div className="max-w-[1200px] mx-auto p-8 min-h-[calc(100vh-80px)] flex flex-col gap-8">
      <header className="text-center mb-4">
        <h1 className="text-4xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-2">Adaptive Cognitive Interview</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Prepare for your dream role with our concept-aware AI interviewer. 
          The session will adapt to your performance in real-time.
        </p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <CameraCheck onStreamReady={setIsMediaReady} />
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex flex-col gap-6 shadow-xl dark:bg-gray-900/70">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="text-indigo-500" /> Focus Area
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Technical Domain</label>
                {loading ? (
                  <div className="text-slate-400 text-sm py-2">Loading topics...</div>
                ) : (
                  <Select
                    options={topicOptions}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
                <Select
                  options={DIFFICULTY_LEVELS}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[0.7rem] font-medium text-slate-400 mt-2">
              Each session picks 5 random questions from the selected difficulty.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <PersonaSelector 
            selectedPersona={selectedPersona} 
            onSelect={setSelectedPersona} 
          />

          <div className="flex flex-col items-center gap-4 mt-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full max-w-sm py-4 text-lg font-bold rounded-full flex items-center justify-center gap-3"
              disabled={starting || loading}
              onClick={handleStartInterview}
            >
              {starting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Preparing Session...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play fill="currentColor" /> Start Interview Session
                </span>
              )}
            </Button>

            <button
              className="bg-transparent border-none text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-2 text-sm"
              onClick={() => navigate("/mock-interview/history")}
            >
              <History size={16} /> View Interview History
            </button>
          </div>
          
          {!isMediaReady && (
            <p className="text-center text-sm text-amber-500 font-medium">
              Please enable Camera & Microphone to proceed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewLobby;
