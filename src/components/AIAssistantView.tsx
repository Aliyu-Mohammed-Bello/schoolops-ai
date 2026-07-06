import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Trash2, HelpCircle, ArrowRight, Bot, User } from 'lucide-react';
import { motion } from 'motion/react';

export const AIAssistantView: React.FC = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'agent'; text: string }[]>([
    {
      sender: 'agent',
      text: 'Hello! I am SchoolOps AI, your administrative co-pilot. I can query our database, verify teacher workloads, parse attendance sheets, generate course timetables, and compile reports. Ask me anything to get started!'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Retrieve students with low attendance (under 75%)',
    'Who is the teacher assigned to Chemistry?',
    'What is the academic record for student STU001?',
    'Generate a weekly timetable for class JSS3'
  ];

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setChatMessage('');
    setChatHistory(prev => [...prev, { sender: 'user', text: textToSend }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/agent/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      setChatHistory(prev => [...prev, { sender: 'agent', text: data.response }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: 'agent', text: `Failed to contact AI Coordinator. Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    handleSendMessage(chatMessage);
  };

  const handleClearHistory = () => {
    setChatHistory([
      {
        sender: 'agent',
        text: 'Chat history cleared. I am ready for your next question!'
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#141924] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-xl">
      
      {/* Header bar */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-gradient-to-r from-[#3B82F6]/5 to-[#8B5CF6]/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#3B82F6]/10 rounded-lg text-[#3B82F6]">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-[#F1F3F8]">AI Co-Pilot Console</h2>
            <p className="text-[10px] text-[#9AA3B8] mt-0.5">Autonomous natural language database lookup and school operations agent</p>
          </div>
        </div>
        <button
          onClick={handleClearHistory}
          className="flex items-center gap-1 text-[10px] bg-[#0B0E17] text-[#9AA3B8] hover:text-white px-2.5 py-1.5 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[#EF4444]/40 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Main chat log */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {chatHistory.map((h, idx) => (
          <div key={idx} className={`flex ${h.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${h.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar circle */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold ${
                h.sender === 'user' 
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white border-transparent'
                  : 'bg-[#0B0E17] text-[#8B5CF6] border-[rgba(255,255,255,0.05)]'
              }`}>
                {h.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Msg bubble */}
              <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow ${
                h.sender === 'user'
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-tr-none'
                  : 'bg-[#1D2433] text-[#F1F3F8] border border-[rgba(255,255,255,0.04)] rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{h.text}</p>
              </div>

            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-xl bg-[#0B0E17] border border-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#8B5CF6]">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-[#1D2433] text-[#9AA3B8] rounded-2xl rounded-tl-none px-4 py-2.5 border border-[rgba(255,255,255,0.04)] flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 bg-[#9AA3B8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#9AA3B8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#9AA3B8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Suggestion block (only if history is short or user wants help) */}
      <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.04)] bg-[#0B0E17]/40 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-[#5C6478] uppercase flex items-center gap-1 mr-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Suggested:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp)}
            className="text-[10px] font-semibold text-[#9AA3B8] bg-[#141924] border border-[rgba(255,255,255,0.04)] hover:border-[#3B82F6]/40 hover:text-[#F1F3F8] py-1 px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{qp}</span>
            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
          </button>
        ))}
      </div>

      {/* Input Tray */}
      <form onSubmit={onSubmitForm} className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0B0E17]/70 flex gap-3 items-center">
        <input
          type="text"
          value={chatMessage}
          onChange={e => setChatMessage(e.target.value)}
          placeholder="Ask SchoolOps AI to fetch reports, coordinate timetables, audit roster records..."
          className="flex-1 bg-[#1D2433] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-2.5 text-xs text-[#F1F3F8] placeholder-[#5C6478] focus:outline-none focus:border-[#3B82F6]"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:brightness-110 text-white py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
        >
          <span>Send Message</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

    </div>
  );
};
