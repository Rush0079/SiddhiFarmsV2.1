'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Terminal,
  Shield,
  Code,
  GitBranch,
  Cpu,
  RefreshCw,
  Sparkles,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Key,
  Layers,
  ArrowLeft,
  Settings2,
  FileCode,
  Sliders
} from 'lucide-react'

export default function JarvisHUDPage() {
  // Authentication & Security
  const [pin, setPin] = useState('')
  const [enteredPin, setEnteredPin] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  // Assistant State
  const [persona, setPersona] = useState('friday') // 'jarvis' | 'friday'
  const [isDiscussionMode, setIsDiscussionMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Systems initialized. I am ready to inspect, diagnose, and modify the Siddhi Farms codebase. What is our objective, Boss?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [activeActions, setActiveActions] = useState([])
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [showTerminal, setShowTerminal] = useState(false)
  const [systemStats, setSystemStats] = useState({
    branch: 'main',
    status: 'ONLINE',
    ping: '24ms',
    geminiModel: 'Gemini 2.5 Flash'
  })

  // Speech Recognition & Synthesis references
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Load saved PIN and check authentication on load
  useEffect(() => {
    const savedPin = localStorage.getItem('jarvis_dev_pin')
    if (savedPin) {
      setPin(savedPin)
      setIsAuthenticated(true)
    }
  }, [])

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing, activeActions])

  // Setup Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setIsListening(false)
          if (transcript.trim()) {
            handleSendMessage(transcript)
          }
        }

        recognition.onerror = (e) => {
          console.warn('Speech recognition error', e)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }
  }, [pin, persona, isDiscussionMode, voiceEnabled])

  // Spoken voice output using SpeechSynthesis
  const speakText = (text) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel() // Stop prior speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block updated.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')

    const utterance = new SpeechSynthesisUtterance(cleanText)
    const voices = window.speechSynthesis.getVoices()

    if (persona === 'jarvis') {
      // Look for a British or deep male voice
      const ukVoice = voices.find(v => v.lang.includes('en-GB') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('male'))
      if (ukVoice) utterance.voice = ukVoice
      utterance.pitch = 0.85
      utterance.rate = 0.95
    } else {
      // FRIDAY: crisp, warm female or natural voice
      const femaleVoice = voices.find(v => v.lang.includes('en-US') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('google')))
      if (femaleVoice) utterance.voice = femaleVoice
      utterance.pitch = 1.05
      utterance.rate = 1.05
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      // If discussion mode is enabled, reactivate microphone loop automatically
      if (isDiscussionMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start()
          } catch {}
        }, 500)
      }
    }
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  // Toggle Discussion Mode
  const toggleDiscussionMode = () => {
    if (!isDiscussionMode) {
      setIsDiscussionMode(true)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {}
      }
    } else {
      setIsDiscussionMode(false)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
      setIsListening(false)
      setIsSpeaking(false)
    }
  }

  // Handle Manual Mic Click
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. You can type commands below!')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Send Message to Agent API
  const handleSendMessage = async (textToSend = inputText) => {
    const query = textToSend.trim()
    if (!query || isProcessing) return

    setInputText('')
    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setIsProcessing(true)

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          pin: pin,
          persona: persona,
          conversationHistory: messages.slice(-5),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.authRequired) {
          setIsAuthenticated(false)
          localStorage.removeItem('jarvis_dev_pin')
          setAuthError('Authentication expired or invalid PIN.')
        }
        throw new Error(data.error || 'Failed to reach agent')
      }

      if (data.actions && data.actions.length > 0) {
        setActiveActions(prev => [...prev, ...data.actions])
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        actions: data.actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages(prev => [...prev, assistantMsg])
      speakText(data.reply)
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ Warning: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMsg])
      speakText(`Error encountered: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // PIN Authentication Handler
  const handleAuthSubmit = (e) => {
    e.preventDefault()
    if (enteredPin.trim().length >= 4) {
      setPin(enteredPin.trim())
      localStorage.setItem('jarvis_dev_pin', enteredPin.trim())
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Please enter your 4-6 digit Developer Passkey PIN')
    }
  }

  // Theme styling based on Persona
  const isCyan = persona === 'jarvis'
  const primaryColor = isCyan ? 'cyan' : 'amber'
  const glowBorder = isCyan ? 'border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.25)]' : 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
  const arcGlow = isCyan ? 'from-cyan-500 to-blue-600 shadow-[0_0_50px_rgba(6,182,212,0.6)]' : 'from-amber-400 to-orange-600 shadow-[0_0_50px_rgba(245,158,11,0.6)]'

  return (
    <main className="min-h-screen bg-[#050b14] text-slate-100 flex flex-col font-sans relative overflow-hidden select-none">
      {/* Background Holographic Grid Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#0e2a47_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-gradient-to-b from-cyan-900/20 to-transparent blur-3xl pointer-events-none" />

      {/* --- AUTHENTICATION MODAL --- */}
      {!isAuthenticated ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl border p-6 bg-[#0a1220]/90 backdrop-blur-xl ${glowBorder} text-center space-y-5`}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-wider text-cyan-300 uppercase">Stark Protocol Auth</h2>
              <p className="text-xs text-slate-400 mt-1">Enter Developer Passkey PIN to unlock mobile repository control</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter Passkey PIN"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 rounded-xl bg-black/50 border border-cyan-500/40 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  autoFocus
                />
              </div>

              {authError && <p className="text-xs text-rose-400 font-medium">{authError}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
              >
                Engage Systems
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}

      {/* --- TOP HUD BAR --- */}
      <header className="z-10 px-4 py-3 border-b border-cyan-950/60 bg-[#070e1b]/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCyan ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'} animate-pulse`} />
              <h1 className="text-xs font-black tracking-widest uppercase text-slate-200">
                {persona.toUpperCase()} <span className="text-slate-500 font-mono text-[10px]">v3.7</span>
              </h1>
            </div>
            <p className="text-[10px] font-mono text-cyan-500/80">SIDDHI-FARMS // LIVE DEV AGENT</p>
          </div>
        </div>

        {/* Persona & Controls Switch */}
        <div className="flex items-center gap-2">
          {/* Persona Toggle */}
          <button
            onClick={() => setPersona(p => p === 'friday' ? 'jarvis' : 'friday')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase border transition-all ${
              isCyan
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
            }`}
          >
            {persona}
          </button>

          {/* Voice Output Toggle */}
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${voiceEnabled ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            title="Toggle Voice Synthesis"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Terminal Toggle */}
          <button
            onClick={() => setShowTerminal(t => !t)}
            className={`p-1.5 rounded-lg border transition-colors ${showTerminal ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
            title="Action Terminal"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* --- TELEMETRY & SYSTEM STATUS CHIPS --- */}
      <div className="px-4 py-1.5 bg-[#03070f] border-b border-cyan-950/40 flex items-center justify-between text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none gap-4">
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3 text-cyan-400" />
          <span>BRANCH: <b className="text-slate-200">main</b></span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span>CORE: <b className="text-emerald-400">ONLINE</b></span>
        </div>
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-amber-400" />
          <span>TOOLS: <b className="text-amber-300">8 ACTIVE</b></span>
        </div>
      </div>

      {/* --- MAIN HUD DISPLAY & ARC REACTOR --- */}
      <div className="flex-1 flex flex-col p-4 max-w-xl mx-auto w-full relative z-10 overflow-hidden">
        
        {/* Holographic Arc Reactor Core (Centerpiece) */}
        <div className="py-2 flex flex-col items-center justify-center shrink-0">
          <div className="relative flex items-center justify-center w-36 h-36">
            
            {/* Outer Spinning Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: isProcessing ? 3 : 15, ease: 'linear' }}
              className={`absolute inset-0 rounded-full border border-dashed ${isCyan ? 'border-cyan-500/40' : 'border-amber-500/40'}`}
            />

            {/* Middle Frequency Wave Ring */}
            <motion.div
              animate={{
                scale: isListening ? [1, 1.15, 1] : isSpeaking ? [1, 1.25, 1.05, 1] : [1, 1.03, 1],
                opacity: isListening || isSpeaking ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3],
              }}
              transition={{ repeat: Infinity, duration: isListening ? 1.2 : 2.5 }}
              className={`absolute inset-2 rounded-full border-2 ${isCyan ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.4)]'}`}
            />

            {/* Inner Arc Reactor Core */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleDiscussionMode}
              className={`w-20 h-20 rounded-full bg-gradient-to-tr ${arcGlow} flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 relative z-20`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 text-black animate-bounce" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-black animate-pulse" />
              ) : isProcessing ? (
                <RefreshCw className="w-8 h-8 text-black animate-spin" />
              ) : (
                <Sparkles className="w-7 h-7 text-black" />
              )}
              <span className="text-[8px] font-black tracking-widest text-black/90 uppercase mt-0.5">
                {isDiscussionMode ? 'LIVE' : 'ENGAGE'}
              </span>
            </motion.button>

            {/* Audio Wave Visualizer Bars */}
            {(isListening || isSpeaking) && (
              <div className="absolute -bottom-2 flex items-end gap-1 h-5">
                {[40, 80, 100, 60, 90, 45, 70].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ['20%', `${h}%`, '30%'] }}
                    transition={{ repeat: Infinity, duration: 0.4 + i * 0.1 }}
                    className={`w-1 rounded-full ${isCyan ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mode Indicator & Voice Prompt */}
          <div className="mt-2 text-center">
            <button
              onClick={toggleDiscussionMode}
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider transition-all ${
                isDiscussionMode
                  ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 hover:border-cyan-500/60'
              }`}
            >
              {isDiscussionMode ? '🟢 DISCUSSION MODE ACTIVE (HANDS-FREE)' : '🎙️ TAP CORE FOR DISCUSSION MODE'}
            </button>
          </div>
        </div>

        {/* --- TERMINAL / ACTION LOG DRAWER --- */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="my-2 rounded-xl border border-cyan-900/60 bg-black/90 p-3 font-mono text-[11px] text-cyan-400 space-y-1.5 max-h-48 overflow-y-auto shadow-inner"
            >
              <div className="flex items-center justify-between text-slate-400 border-b border-cyan-950 pb-1">
                <span>// AGENT ACTION TERMINAL</span>
                <span className="text-[10px] text-emerald-400">READY</span>
              </div>
              {activeActions.length === 0 ? (
                <p className="text-slate-600 italic">No tools executed in current session.</p>
              ) : (
                activeActions.map((act, i) => (
                  <div key={i} className="space-y-0.5 border-b border-cyan-950/40 pb-1">
                    <span className="text-amber-400 font-bold">[{act.tool.toUpperCase()}]</span>{' '}
                    <span className="text-slate-300">{JSON.stringify(act.args)}</span>
                    {act.result?.message && (
                      <p className="text-emerald-300 text-[10px]">↳ {act.result.message}</p>
                    )}
                    {act.result?.diff && (
                      <div className="bg-slate-950 p-1.5 rounded text-[9px] border border-slate-800 mt-1">
                        <span className="text-rose-400">- {act.result.diff.before.slice(0, 100)}...</span>
                        <br />
                        <span className="text-emerald-400">+ {act.result.diff.after.slice(0, 100)}...</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- CHAT & CONVERSATION STREAM --- */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2 scrollbar-thin scrollbar-thumb-cyan-950">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 mb-1 px-1">
                <span>{msg.role === 'user' ? 'YOU (OPERATOR)' : `${persona.toUpperCase()} AGENT`}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/20'
                    : `bg-[#0a1424]/90 border ${glowBorder} text-slate-100 backdrop-blur-md`
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Display Action Chips attached to message */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-cyan-900/40 space-y-1">
                    {msg.actions.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-1 text-[10px] font-mono text-cyan-300">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Executed: <b>{a.tool}</b> ({a.args?.filePath || a.args?.query || 'ok'})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-cyan-400 font-mono p-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>{persona.toUpperCase()} is analyzing codebase & executing tools...</span>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- QUICK ACTION CHIPS --- */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px] shrink-0">
          <button
            onClick={() => handleSendMessage('Run a full health diagnostic check on our repository.')}
            className="px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/40 shrink-0 flex items-center gap-1"
          >
            🛡️ Health Check
          </button>
          <button
            onClick={() => handleSendMessage('Check git status and tell me what files are changed or uncommitted.')}
            className="px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/40 shrink-0 flex items-center gap-1"
          >
            ⚡ Git Status
          </button>
          <button
            onClick={() => handleSendMessage('Inspect app/page.js and tell me where pricing or booking details are handled.')}
            className="px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/40 shrink-0 flex items-center gap-1"
          >
            🔍 Inspect Booking
          </button>
        </div>

        {/* --- INPUT COMMAND BAR --- */}
        <div className="pt-2 border-t border-cyan-950/60 shrink-0">
          <div className="flex items-center gap-2 bg-[#081220]/90 border border-cyan-800/50 rounded-2xl p-1.5 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 backdrop-blur-md">
            <button
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_12px_#f43f5e]'
                  : isCyan
                  ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              placeholder={`Ask ${persona.toUpperCase()} to fix a bug or add a feature...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isProcessing}
              className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none px-1"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isProcessing}
              className={`p-2 rounded-xl transition-all ${
                inputText.trim() && !isProcessing
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}
