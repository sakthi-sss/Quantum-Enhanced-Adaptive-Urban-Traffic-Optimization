import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Zap, ChevronDown, ChevronUp, RefreshCw, Sparkles } from 'lucide-react';
import type { Intersection } from '../types/traffic';
import type { OptimizationResult } from '../types/optimization';
import { streamChatWithAdvisor, buildTrafficPrompt, type ChatMessage } from '../services/featherless';

interface Props {
  intersections: Intersection[];
  optResult: OptimizationResult | null;
  activeScenario?: string;
  emergencyActive?: boolean;
  className?: string;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const QUICK_PROMPTS = [
  'Analyze current traffic state',
  'Explain the optimization result',
  'Why did signals change?',
  'Compare classical vs quantum',
  'Estimate environmental impact',
  'How does the green corridor work?',
];

export default function AIAdvisorPanel({
  intersections,
  optResult,
  activeScenario,
  emergencyActive,
  className = '',
}: Props) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg = text.trim();
    setInput('');

    // Append user message
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    // Build context-aware message
    const contextMsg = buildTrafficPrompt({ intersections, optResult, activeScenario, emergencyActive });
    const fullUserMsg = `[Context: ${contextMsg}]\n\nUser question: ${userMsg}`;

    // Append streaming assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    let fullText = '';
    await streamChatWithAdvisor(
      fullUserMsg,
      history,
      (delta) => {
        fullText += delta;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText, streaming: true };
          return updated;
        });
      },
      (done) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: done, streaming: false };
          return updated;
        });
        setHistory(prev => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: done },
        ]);
        setStreaming(false);
      },
      (err) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${err}`, streaming: false };
          return updated;
        });
        setStreaming(false);
      }
    );
  };

  const autoAnalyze = () => {
    sendMessage('Give me a quick analysis of the current traffic state and any recommendations.');
  };

  const reset = () => {
    setMessages([]);
    setHistory([]);
    setInput('');
  };

  return (
    <div className={`glass rounded-xl border border-white/5 flex flex-col ${className}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between px-4 py-3 hover:bg-white/3 rounded-t-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <Sparkles size={12} className="text-purple-400" />
          </div>
          <span className="text-sm font-semibold text-slate-200">AI Traffic Advisor</span>
          <span className="px-1.5 py-0.5 rounded text-xs border border-purple-500/30 text-purple-400 bg-purple-500/10">
            Featherless AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); reset(); }}
              className="p-1 text-slate-600 hover:text-slate-400 transition-colors"
              title="Clear chat"
            >
              <RefreshCw size={12} />
            </button>
          )}
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Messages */}
            <div className="border-t border-white/5 px-3 py-3 max-h-72 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-4">
                  <Bot size={20} className="mx-auto text-purple-400/50 mb-2" />
                  <p className="text-xs text-slate-500 mb-3">
                    Ask me about traffic conditions, optimization results, or the quantum pipeline.
                  </p>
                  <button
                    onClick={autoAnalyze}
                    disabled={streaming}
                    className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs hover:bg-purple-500/25 transition-all"
                  >
                    <Zap size={11} />
                    Auto-analyze current state
                  </button>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={10} className="text-purple-400" />
                      </div>
                    )}
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500/15 border border-amber-500/20 text-amber-100'
                        : 'bg-slate-800/80 border border-white/8 text-slate-200'
                    }`}>
                      {msg.content || (msg.streaming && <span className="animate-pulse text-slate-500">●●●</span>)}
                      {msg.streaming && msg.content && (
                        <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={10} className="text-amber-400" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length === 0 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.slice(0, 4).map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    disabled={streaming}
                    className="px-2 py-1 rounded-md border border-white/10 text-xs text-slate-400 hover:border-purple-500/30 hover:text-purple-300 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-white/5 px-3 py-2.5 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
                placeholder="Ask the AI advisor..."
                disabled={streaming}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none min-w-0"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className={`shrink-0 p-1.5 rounded-lg transition-all ${
                  input.trim() && !streaming
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30'
                    : 'text-slate-700 cursor-not-allowed'
                }`}
              >
                {streaming
                  ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <Send size={13} />
                }
              </button>
            </div>

            {/* Model badge */}
            <div className="px-3 pb-2 text-center">
              <span className="text-xs text-slate-700">
                Powered by {import.meta.env.VITE_FEATHERLESS_MODEL?.split('/')[1] ?? 'Qwen2.5-72B'} via Featherless.ai
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
