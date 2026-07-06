import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  Sparkles, 
  FileText, 
  LogOut, 
  Lock, 
  UserCheck, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports of custom views
import { Logo } from './components/Logo';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { TeachersView } from './components/TeachersView';
import { AttendanceView } from './components/AttendanceView';
import { TimetableView } from './components/TimetableView';
import { ReportsView } from './components/ReportsView';
import { AIAssistantView } from './components/AIAssistantView';

import { ActiveTab, WatchConfig } from './types';

// Default mock configuration for upload tracking
const defaultWatchConfig: WatchConfig = {
  students: { uploaded: false, filePath: null, lastSynced: null },
  teachers: { uploaded: false, filePath: null, lastSynced: null },
  attendance: { uploaded: false, filePath: null, lastSynced: null },
  results: { uploaded: false, filePath: null, lastSynced: null },
};

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('schoolops_auth') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Tab routing state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Unified file watch status config fetched from backend
  const [watchConfig, setWatchConfig] = useState<WatchConfig>(defaultWatchConfig);

  const fetchWatchStatus = async () => {
    try {
      const res = await fetch('/api/data/status');
      if (res.ok) {
        const data = await res.json();
        setWatchConfig(data);
      }
    } catch (err) {
      console.error('Failed to retrieve file sync watch configuration', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWatchStatus();
      // Periodically poll watch configs to display real-time auto-sync timestamps
      const interval = setInterval(fetchWatchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // --- DEMO GATE ONLY ---
    // This is a mockup/stand-in demo gating routine for evaluation purposes.
    // There is no server-side session, JWT encryption, or database verification.
    if (username === 'admin' && password === 'demo123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('schoolops_auth', 'true');
    } else {
      setLoginError('Invalid Administrator credentials. Try admin / demo123');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('schoolops_auth');
    setActiveTab('dashboard');
  };

  // Render Login Form if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0E17] flex items-center justify-center p-4">
        {/* Subtle glowing radial background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-2xl relative"
        >
          {/* Logo Heading */}
          <div className="flex flex-col items-center text-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-extrabold text-[#F1F3F8] tracking-tight">
                SchoolOps <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#14B8A6] bg-clip-text text-transparent">AI</span>
              </h1>
              <p className="text-xs text-[#9AA3B8] mt-1 font-medium">Administrative Core Portal</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4 text-xs">
            {loginError && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] rounded-lg font-semibold text-center leading-relaxed">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[#9AA3B8] font-bold uppercase tracking-wider block">Username</label>
              <input
                type="text"
                required
                placeholder="e.g., admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-xl px-3.5 py-2.5 text-sm text-[#F1F3F8] placeholder-[#5C6478] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#9AA3B8] font-bold uppercase tracking-wider block">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0B0E17] border border-[rgba(255,255,255,0.07)] rounded-xl px-3.5 py-2.5 text-sm text-[#F1F3F8] placeholder-[#5C6478] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:brightness-110 text-white font-bold py-2.5 rounded-xl text-xs tracking-wide transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In to Console</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.04)] text-center">
            <span className="text-[10px] text-[#5C6478] font-medium leading-relaxed block">
              Demo Access Credentials: <strong className="text-[#3B82F6]">admin</strong> / <strong className="text-[#8B5CF6]">demo123</strong>
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Navigation Items specification
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'timetables', label: 'Timetables', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0B0E17] flex relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#3B82F6] opacity-10 blur-[100px] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#8B5CF6] opacity-10 blur-[100px] pointer-events-none"></div>
      
      {/* FIXED LEFT SIDEBAR (248px) */}
      <aside className="w-[248px] bg-[#0B0E17] border-r border-white/5 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-10">
        <div>
          {/* Logo Wordmark Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <Logo />
            <div>
              <h2 className="text-base font-extrabold text-[#F1F3F8] tracking-tight leading-none">
                SchoolOps
              </h2>
              <span className="text-[10px] font-bold bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#14B8A6] bg-clip-text text-transparent mt-1 block">
                AI COORDINATOR
              </span>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="p-4 space-y-1 mt-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-white/5 border border-white/5 text-[#3B82F6]'
                      : 'text-[#9AA3B8] hover:bg-white/5 hover:text-[#F1F3F8]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#3B82F6]' : 'text-[#5C6478]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pinned User card at bottom */}
        <div className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between m-4 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            {/* Initials circular avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center font-extrabold text-sm text-white shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#F1F3F8] truncate">Admin User</span>
              <span className="block text-[11px] text-[#5C6478] font-bold uppercase tracking-wider">Administrator</span>
            </div>
          </div>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="Log out of session"
            className="p-1.5 bg-[#0B0E17]/60 hover:bg-[#EF4444]/15 hover:text-[#EF4444] text-[#5C6478] border border-[rgba(255,255,255,0.05)] hover:border-[#EF4444]/30 rounded-lg transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT PORT */}
      <main className="flex-1 overflow-x-hidden p-8 max-w-7xl mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'dashboard' && <DashboardView onNavigateToTab={(tab) => setActiveTab(tab)} />}
            {activeTab === 'students' && <StudentsView watchConfig={watchConfig} onRefreshConfig={fetchWatchStatus} />}
            {activeTab === 'teachers' && <TeachersView watchConfig={watchConfig} onRefreshConfig={fetchWatchStatus} />}
            {activeTab === 'attendance' && <AttendanceView watchConfig={watchConfig} onRefreshConfig={fetchWatchStatus} />}
            {activeTab === 'timetables' && <TimetableView />}
            {activeTab === 'reports' && <ReportsView watchConfig={watchConfig} onRefreshConfig={fetchWatchStatus} />}
            {activeTab === 'ai-assistant' && <AIAssistantView />}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
