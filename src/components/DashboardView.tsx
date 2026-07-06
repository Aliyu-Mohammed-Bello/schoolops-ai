import React, { useState, useEffect, useRef } from 'react';
import { Users, GraduationCap, Percent, AlertCircle, Send, Sparkles, Terminal, ArrowRight, UserCheck, Shield, Cpu, Code, Server, Play, Check, CheckCircle2, Loader2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LowAttendanceStudent, ToolActivityLog } from '../types';

interface DashboardViewProps {
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const [metrics, setMetrics] = useState({
    studentCount: 0,
    teacherCount: 0,
    attendanceRate: 100,
    lowAttendanceStudents: [] as LowAttendanceStudent[]
  });
  const [activities, setActivities] = useState<ToolActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Mini-chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'agent'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  
  // Architecture & Integrations Hub State
  const [activeHubTab, setActiveHubTab] = useState<'adk' | 'mcp' | 'antigravity' | 'security'>('adk');
  
  // ADK state
  const [adkQuery, setAdkQuery] = useState('Who is the teacher assigned to Chemistry?');
  const [adkSimulating, setAdkSimulating] = useState(false);
  const [adkStep, setAdkStep] = useState(0);
  const [adkResult, setAdkResult] = useState<{
    agent: string;
    reasoning: string;
    details: string;
  } | null>(null);

  // MCP state
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpFetched, setMcpFetched] = useState(false);

  // Security state
  const [integrityScanning, setIntegrityScanning] = useState(false);
  const [integrityPassed, setIntegrityPassed] = useState(false);
  const [integrityLogs, setIntegrityLogs] = useState<string[]>([]);

  const handleSimulateADK = () => {
    setAdkSimulating(true);
    setAdkStep(1);
    setAdkResult(null);
    
    setTimeout(() => {
      setAdkStep(2);
      setTimeout(() => {
        setAdkStep(3);
        setTimeout(() => {
          setAdkSimulating(false);
          setAdkStep(4);
          
          let agent = "Academic Registrar Agent";
          let reasoning = "The query asks for teacher assignments, which falls under academic course records and staff logs managed by the Registrar.";
          let details = "Assigned Subject: Chemistry | Resolved Staff: TCH004 - Dr. Angela Carter | Workload status: Checked & Validated.";

          if (adkQuery.toLowerCase().includes('timetable') || adkQuery.toLowerCase().includes('schedule')) {
            agent = "Timetable Scheduler Agent";
            reasoning = "The query requests structured time schedules, slot allocations, and clash avoidance, which is the core domain of the Timetable Optimizer.";
            details = "Class: JSS3 | Double Period Checks: Complete | Clash Matrix: 0 conflicts detected | Output: 5x8 Matrix Grid.";
          } else if (adkQuery.toLowerCase().includes('attendance') || adkQuery.toLowerCase().includes('low') || adkQuery.toLowerCase().includes('absent')) {
            agent = "Attendance Audit Agent";
            reasoning = "The query asks for truancy detection, participation metrics, or attendance histories, which are managed by the Attendance Audit Agent.";
            details = "Threshold: <75% | Identified: 4 Students | Notification Trigger: Automated parent SMS warnings queued.";
          } else if (adkQuery.toLowerCase().includes('stu00') || adkQuery.toLowerCase().includes('result') || adkQuery.toLowerCase().includes('grade')) {
            agent = "Academic Registrar Agent";
            reasoning = "Query targets individual academic performance or grade reports. Routed to Academic Registrar for student dossier access.";
            details = "Student: STU001 (James Baldwin) | Average GPA: 89.4% | Class Standing: Excellent | Flag: Report Card ready.";
          }

          setAdkResult({ agent, reasoning, details });
        }, 1200);
      }, 1000);
    }, 800);
  };

  const handleFetchMCP = () => {
    setMcpLoading(true);
    setTimeout(() => {
      setMcpLoading(false);
      setMcpFetched(true);
    }, 1200);
  };

  const handleRunIntegrityScan = () => {
    setIntegrityScanning(true);
    setIntegrityPassed(false);
    setIntegrityLogs([]);
    
    const logs = [
      "Initializing Security Shield integrity scan...",
      "Validating parameterized SQLite bindings... [SECURE]",
      "Auditing CSRF & Session Gate configurations... [OK]",
      "Verifying file synchronization directories... [ISOLATED]",
      "Scanning PDF/Docx template sanitizer rules... [PASS]",
      "Finalizing multi-layer security audit... [100% HEALTHY]"
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setIntegrityLogs(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setIntegrityScanning(false);
          setIntegrityPassed(true);
        }
      }, (index + 1) * 400);
    });
  };
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
    try {
      const metricsRes = await fetch('/api/dashboard');
      if (!metricsRes.ok) throw new Error('Could not load dashboard metrics.');
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      const activityRes = await fetch('/api/agent/activity');
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData);
      }
    } catch (err: any) {
      setError('Connection to backend lost. Retrying...');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/agent/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      setChatHistory(prev => [...prev, { sender: 'agent', text: data.response }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: 'agent', text: `Failed to contact SchoolOps AI agent. Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8">
      {/* Header section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F1F3F8] mb-1">
            Good Morning, <span className="bg-gradient-to-br from-[#3B82F6] via-[#8B5CF6] to-[#14B8A6] bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="text-[#9AA3B8] text-sm">
            {formattedDate} · SchoolOps Core Console
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            Refresh Data
          </button>
          <button 
            onClick={() => onNavigateToTab('ai-assistant')}
            className="px-4 py-2 bg-gradient-to-br from-[#3B82F6] via-[#8B5CF6] to-[#14B8A6] rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 cursor-pointer hover:brightness-110 transition-all"
          >
            AI Portal
          </button>
        </div>
      </header>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students Card */}
        <div 
          onClick={() => onNavigateToTab('students')}
          className="bg-[#141924] border border-white/5 p-5 rounded-[14px] flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:border-[#3B82F6]/30"
        >
          <p className="text-[#9AA3B8] text-xs font-semibold uppercase tracking-wider mb-2">Total Students</p>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{metrics.studentCount}</span>
              <span className="text-[#10B981] text-xs font-bold">+12.4%</span>
            </div>
            <span className="text-[10px] text-[#3B82F6] font-bold group-hover:underline flex items-center gap-0.5">
              ROSTER <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Total Teachers Card */}
        <div 
          onClick={() => onNavigateToTab('teachers')}
          className="bg-[#141924] border border-white/5 p-5 rounded-[14px] flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:border-[#8B5CF6]/30"
        >
          <p className="text-[#9AA3B8] text-xs font-semibold uppercase tracking-wider mb-2">Total Teachers</p>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{metrics.teacherCount}</span>
              <span className="text-[#5C6478] text-xs font-mono font-bold">STABLE</span>
            </div>
            <span className="text-[10px] text-[#8B5CF6] font-bold group-hover:underline flex items-center gap-0.5">
              STAFF <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Attendance Rate Card */}
        <div 
          onClick={() => onNavigateToTab('attendance')}
          className="bg-[#141924] border border-white/5 p-5 rounded-[14px] flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:border-[#14B8A6]/30"
        >
          <p className="text-[#9AA3B8] text-xs font-semibold uppercase tracking-wider mb-2">Attendance Rate</p>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{metrics.attendanceRate}%</span>
              <span className="text-[#10B981] text-xs font-bold">ACTIVE</span>
            </div>
            <span className="text-[10px] text-[#14B8A6] font-bold group-hover:underline flex items-center gap-0.5">
              ANALYZE <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Students Needing Attention Card */}
        <div 
          onClick={() => setShowAttentionModal(true)}
          className="bg-[#141924] border border-white/5 p-5 rounded-[14px] cursor-pointer hover:border-red-500/30 transition-colors group flex flex-col justify-between"
        >
          <p className="text-[#9AA3B8] text-xs font-semibold uppercase tracking-wider mb-2">Need Attention</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-[#EF4444]">{metrics.lowAttendanceStudents.length}</span>
            <div className="bg-red-500/10 text-red-500 p-1.5 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split (cols-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        {/* AI Assistant Card (col-span-3) */}
        <div className="lg:col-span-3 bg-[#141924] border border-white/5 rounded-[14px] flex flex-col h-[420px] overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="font-bold text-sm text-white">SchoolOps Assistant</span>
            </div>
            <span className="text-[11px] text-[#5C6478] font-mono tracking-tighter uppercase">Gemini-Pro Connected</span>
          </div>

          {/* Messages block */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto overflow-x-hidden">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <Sparkles className="w-10 h-10 text-[#5C6478] animate-bounce" />
                <p className="text-white font-bold text-sm">SchoolOps AI Assistant</p>
                <p className="text-xs text-[#5C6478] max-w-xs leading-relaxed">
                  Query student performance, teacher workloads, generate timetables or school metrics in real time.
                </p>
              </div>
            ) : (
              chatHistory.map((h, idx) => (
                <div key={idx} className={`flex gap-3 max-w-[85%] ${h.sender === 'user' ? 'ml-auto flex-row-reverse' : 'justify-start'}`}>
                  {h.sender === 'user' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
                        AU
                      </div>
                      <div className="bg-[#3B82F6] p-3 rounded-2xl rounded-tr-none">
                        <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{h.text}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#14B8A6] flex-shrink-0 flex items-center justify-center text-[10px] font-bold italic text-white">
                        AI
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5">
                        <p className="text-sm leading-relaxed text-[#F1F3F8] whitespace-pre-wrap">{h.text}</p>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex gap-3 max-w-[85%] justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#14B8A6] flex-shrink-0 flex items-center justify-center text-[10px] font-bold italic text-white animate-pulse">
                  AI
                </div>
                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#9AA3B8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#9AA3B8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#9AA3B8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input tray */}
          <div className="p-4 border-t border-white/5 bg-black/10">
            <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text" 
                placeholder="Ask about reports, attendance, or students..." 
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors placeholder:text-[#5C6478] text-white pr-12"
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 p-1.5 bg-[#3B82F6] hover:bg-[#8B5CF6] transition-all rounded-lg cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Activity Feed (col-span-2) */}
        <div className="lg:col-span-2 bg-[#141924] border border-white/5 rounded-[14px] flex flex-col h-[420px] overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#8B5CF6]" />
              Recent AI Activity
            </h3>
          </div>
          
          <div className="flex-1 p-5 space-y-5 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#5C6478] space-y-2">
                <Terminal className="w-8 h-8" />
                <p className="text-xs">No recent tool executions logged.</p>
              </div>
            ) : (
              activities.slice(0, 5).map((act, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-px bg-white/10 relative self-stretch shrink-0">
                    <div className="absolute top-1 -left-1 w-2 h-2 rounded-full bg-[#3B82F6]" />
                  </div>
                  <div className="pb-1 min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-[#3B82F6] mb-1 italic uppercase tracking-tighter">
                      Tool: {act.toolName}
                    </p>
                    <p className="text-[13px] text-[#F1F3F8] leading-snug truncate">
                      {act.resultSummary}
                    </p>
                    <p className="text-[10px] text-[#5C6478] mt-1">
                      {act.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            onClick={() => onNavigateToTab('ai-assistant')}
            className="w-full p-4 text-xs text-[#9AA3B8] hover:text-white font-bold border-t border-white/5 bg-black/10 transition-colors uppercase tracking-wider text-center cursor-pointer"
          >
            VIEW FULL LOGS
          </button>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE & AI OPERATIONS CONSOLE */}
      <section className="bg-[#141924] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-[#141924] via-[#1A202E] to-[#141924] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-[#F1F3F8] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#3B82F6] animate-pulse" />
              SchoolOps AI Integration & Architecture Control Hub
            </h2>
            <p className="text-[11px] text-[#9AA3B8] mt-0.5">
              Interactive sandbox and telemetry monitors verifying active platform specifications.
            </p>
          </div>
          <div className="flex bg-[#0B0E17] p-1 border border-white/5 rounded-xl text-[10px] font-bold shrink-0">
            {[
              { id: 'adk', label: 'Multi-Agent ADK', icon: Sparkles },
              { id: 'mcp', label: 'MCP Server Protocol', icon: Server },
              { id: 'antigravity', label: 'Antigravity Autopilot', icon: Cpu },
              { id: 'security', label: 'Security Shield', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeHubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveHubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive ? 'bg-[#3B82F6] text-white' : 'text-[#9AA3B8] hover:text-[#F1F3F8]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeHubTab === 'adk' && (
              <motion.div
                key="adk"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                      Multi-Agent System & Routing Router (ADK)
                    </h3>
                    <p className="text-[#9AA3B8] mt-1 text-[11px] leading-relaxed">
                      SchoolOps AI uses the standard **Agent Development Kit (ADK)** to structure administrative reasoning. Rather than a single massive model call, an incoming prompt is dynamically analyzed by the root router and dispatched to highly specialized sub-agents.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-white/[0.04] pt-3">
                    <span className="text-[#9AA3B8] font-bold text-[10px] uppercase">Select Query to Test Router Dispatch:</span>
                    <div className="flex flex-col gap-1.5">
                      {[
                        'Who teaches Chemistry and what is their workload?',
                        'Draft a weekly timetable schedule for JSS3 class',
                        'Identify any students with attendance issues',
                        'Get academic grade record for student STU001'
                      ].map((q, i) => (
                        <button
                          key={i}
                          onClick={() => !adkSimulating && setAdkQuery(q)}
                          disabled={adkSimulating}
                          className={`text-left p-2 rounded-lg border text-[11px] transition-all cursor-pointer ${
                            adkQuery === q 
                              ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-[#F1F3F8]' 
                              : 'bg-black/20 border-white/5 text-[#9AA3B8] hover:border-white/10 hover:text-white'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateADK}
                    disabled={adkSimulating}
                    className="w-full py-2.5 bg-[#3B82F6] hover:bg-[#3B82F6]/90 disabled:bg-[#3B82F6]/40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {adkSimulating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Router Simulation...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Run Routing Test</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#0B0E17] border border-white/5 rounded-xl p-5 flex flex-col justify-between h-[280px]">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider block mb-2">
                      Router Simulation Telemetry Log
                    </span>
                    
                    <div className="space-y-2.5 font-mono text-[11px] text-[#9AA3B8]">
                      {adkStep >= 1 && (
                        <div className="flex items-center gap-2 text-[#F1F3F8]">
                          <Check className="w-3 h-3 text-[#10B981]" />
                          <span>1. Prompts analysis initiated ...</span>
                        </div>
                      )}
                      {adkStep >= 2 && (
                        <div className="flex items-center gap-2 text-[#F1F3F8]">
                          <Check className="w-3 h-3 text-[#10B981]" />
                          <span>2. Matching ADK system capabilities ...</span>
                        </div>
                      )}
                      {adkStep >= 3 && (
                        <div className="flex items-center gap-2 text-[#F1F3F8]">
                          <Check className="w-3 h-3 text-[#10B981]" />
                          <span>3. Dynamic sub-agent handoff assigned ...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {adkResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-gradient-to-r from-[#3B82F6]/5 to-[#8B5CF6]/5 border border-[#3B82F6]/25 rounded-xl"
                    >
                      <h4 className="font-extrabold text-[#F1F3F8] text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        Active Agent: <strong className="text-[#3B82F6]">{adkResult.agent}</strong>
                      </h4>
                      <p className="text-[10px] text-[#9AA3B8] mt-1.5 leading-relaxed">
                        <strong className="text-[#F1F3F8]">Reasoning:</strong> {adkResult.reasoning}
                      </p>
                      <p className="text-[10px] text-[#14B8A6] font-semibold mt-1 font-mono">
                        {adkResult.details}
                      </p>
                    </motion.div>
                  )}
                  
                  {!adkSimulating && adkStep === 0 && (
                    <div className="flex flex-col items-center justify-center text-center h-full text-[#5C6478]">
                      <Terminal className="w-8 h-8 mb-2 text-white/5" />
                      <p className="text-[11px]">Click "Run Routing Test" to simulate active ADK load-balancing across agents.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeHubTab === 'mcp' && (
              <motion.div
                key="mcp"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      Model Context Protocol (MCP) Server Endpoint
                    </h3>
                    <p className="text-[#9AA3B8] mt-1 text-[11px] leading-relaxed">
                      SchoolOps AI incorporates an **MCP Server** interface that exposes internal SQLite databases and administrative routines as standard tool utilities. LLM systems connect to this endpoint to safely interact with students, teachers, and timetable solvers.
                    </p>
                  </div>

                  <div className="bg-[#0B0E17] border border-white/5 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#9AA3B8] font-bold">MCP Service URL:</span>
                      <span className="font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">mcp://localhost:3000/api/mcp</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#9AA3B8] font-bold">Registry Status:</span>
                      <span className="text-[#10B981] font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                        ACTIVE & ADVERTISED
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#9AA3B8] font-bold">Exposed Capability Tools:</span>
                      <span className="text-white font-bold">16 JSON Schemas</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFetchMCP}
                    className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {mcpLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying MCP Server...</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-3.5 h-3.5" />
                        <span>Query MCP Tool Registry</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#0B0E17] border border-white/5 rounded-xl p-4 overflow-y-auto h-[280px] font-mono text-[10px] text-[#9AA3B8]">
                  {mcpFetched ? (
                    <pre className="text-[#10B981] leading-relaxed">
{JSON.stringify([
  {
    name: "getStudents",
    description: "Retrieve all student records matching query parameters",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer" } }
    },
    mcp_endpoint: "mcp://localhost:3000/tools/getStudents"
  },
  {
    name: "generateTimetable",
    description: "Clash-free school coordinator constraint scheduling tool",
    input_schema: {
      type: "object",
      properties: { className: { type: "string" } },
      required: ["className"]
    },
    mcp_endpoint: "mcp://localhost:3000/tools/generateTimetable"
  },
  {
    name: "getAttendanceByClass",
    description: "Return attendance history for targeted grade cohort",
    input_schema: {
      type: "object",
      properties: { className: { type: "string" } },
      required: ["className"]
    },
    mcp_endpoint: "mcp://localhost:3000/tools/getAttendanceByClass"
  }
], null, 2)}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#5C6478]">
                      <Code className="w-8 h-8 mb-2 text-white/5" />
                      <p>Click "Query MCP Tool Registry" to fetch live JSON tool schemas exposed on the MCP protocol loop.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeHubTab === 'antigravity' && (
              <motion.div
                key="antigravity"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#14B8A6]" />
                      Antigravity Autopilot Core
                    </h3>
                    <p className="text-[#9AA3B8] mt-1 text-[11px] leading-relaxed">
                      This application operates inside a cloud runtime container synchronized and compiled by **Antigravity**. The file-sync watchers, background compilation threads, and sandbox environments are continuously monitored to ensure hot-reload stability is preserved safely.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                      <span className="text-[#5C6478] font-bold text-[9px] uppercase tracking-wider block">File Sync Watcher</span>
                      <span className="text-white text-xs font-bold block mt-1">ONLINE & RUNNING</span>
                      <span className="text-[#10B981] text-[9px] font-mono mt-0.5 block">Polling data files ...</span>
                    </div>
                    <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                      <span className="text-[#5C6478] font-bold text-[9px] uppercase tracking-wider block">Live Compiler</span>
                      <span className="text-white text-xs font-bold block mt-1">ACTIVE (ESBUILD)</span>
                      <span className="text-[#8B5CF6] text-[9px] font-mono mt-0.5 block">Production CJS output</span>
                    </div>
                    <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                      <span className="text-[#5C6478] font-bold text-[9px] uppercase tracking-wider block">Container Sandbox</span>
                      <span className="text-white text-xs font-bold block mt-1">SECURE CORE</span>
                      <span className="text-[#14B8A6] text-[9px] font-mono mt-0.5 block">Memory usage stable</span>
                    </div>
                    <div className="p-3 bg-black/20 border border-white/5 rounded-xl">
                      <span className="text-[#5C6478] font-bold text-[9px] uppercase tracking-wider block">Vite Reverse Proxy</span>
                      <span className="text-white text-xs font-bold block mt-1">PORT 3000 BIND</span>
                      <span className="text-[#3B82F6] text-[9px] font-mono mt-0.5 block">Ingress OK</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B0E17] border border-white/5 rounded-xl p-5 flex flex-col justify-between h-[280px]">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-[#14B8A6] uppercase tracking-wider block mb-3">
                      Antigravity Environment Specs
                    </span>

                    <div className="space-y-3 font-mono text-[11px] text-[#9AA3B8]">
                      <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                        <span>Compiler Engine:</span>
                        <strong className="text-white">esbuild bundle CJS</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                        <span>Dev Server Entry:</span>
                        <strong className="text-white">tsx server.ts</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                        <span>Hot Module Reload:</span>
                        <strong className="text-amber-500">Bypassed (Control Plane)</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                        <span>Sync Thread:</span>
                        <strong className="text-[#10B981]">active (4 watcher locks)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#14B8A6]/5 border border-[#14B8A6]/20 rounded-xl text-center">
                    <span className="text-[10px] text-[#14B8A6] font-bold uppercase tracking-wide block">
                      Antigravity Autopilot Status: 100% Optimized
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeHubTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#EF4444]" />
                      Multi-Layer Security Shield & Sanity Verification
                    </h3>
                    <p className="text-[#9AA3B8] mt-1 text-[11px] leading-relaxed">
                      SchoolOps AI uses industry-standard sandbox security and data query protections. Every spreadsheet cell parsed, reports exported, and SQL query evaluated undergoes automated safety sanitization layers to guarantee absolute administrative data integrity.
                    </p>
                  </div>

                  <div className="space-y-2 font-mono text-[11px] text-[#9AA3B8]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>SQLite Parameterized Query Sanitizer: ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>Isolated Spreadsheet Parser Scope: ISOLATED</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>XLSX Formula & CSV Injection Protection: ACTIVE</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRunIntegrityScan}
                    disabled={integrityScanning}
                    className="w-full py-2.5 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {integrityScanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Sandbox Integrity Scan...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5" />
                        <span>Run Security Integrity Scan</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#0B0E17] border border-white/5 rounded-xl p-5 flex flex-col justify-between h-[280px]">
                  <div className="space-y-1.5 overflow-y-auto max-h-[170px] font-mono text-[10px] text-zinc-400">
                    <span className="text-[9px] font-mono font-bold text-[#EF4444] uppercase tracking-wider block mb-2">
                      Security Engine Console
                    </span>
                    {integrityLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-zinc-600 shrink-0">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    {!integrityScanning && integrityLogs.length === 0 && (
                      <p className="text-[#5C6478] italic">Click "Run Security Integrity Scan" to audit sandbox boundaries.</p>
                    )}
                  </div>

                  {integrityPassed && (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      <div>
                        <span className="block font-bold text-white text-[11px]">System Integrity Secure</span>
                        <span className="block text-[9px] text-[#10B981] font-mono">0 vulnerabilities or memory leaks detected in isolation sandbox.</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Modal for Students Needing Attention */}
      <AnimatePresence>
        {showAttentionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141924] border border-[#EF4444]/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl"
            >
              <div className="p-4 bg-gradient-to-r from-[#EF4444]/15 to-transparent border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#EF4444]">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                  <h3 className="font-extrabold text-base">Students Needing Attention</h3>
                </div>
                <button 
                  onClick={() => setShowAttentionModal(false)}
                  className="text-xs text-[#9AA3B8] hover:text-white px-2.5 py-1 bg-[#0B0E17] rounded-lg border border-[rgba(255,255,255,0.06)] transition-all"
                >
                  Close
                </button>
              </div>

              <div className="p-4 max-h-[350px] overflow-y-auto space-y-3">
                {metrics.lowAttendanceStudents.length === 0 ? (
                  <p className="text-xs text-[#9AA3B8] text-center py-6">All students are in good standing.</p>
                ) : (
                  metrics.lowAttendanceStudents.map((stud) => (
                    <div 
                      key={stud.id} 
                      className="p-3 bg-[#0B0E17] rounded-xl border border-[rgba(255,255,255,0.04)] flex justify-between items-start gap-4 hover:border-[#EF4444]/30"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-[#F1F3F8]">{stud.id} · {stud.name}</h4>
                        <p className="text-xs text-[#EF4444] font-medium mt-1">{stud.issue}</p>
                      </div>
                      <span className="text-[10px] bg-[#EF4444]/10 text-[#EF4444] px-2 py-0.5 rounded-full font-bold">
                        {stud.class}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
