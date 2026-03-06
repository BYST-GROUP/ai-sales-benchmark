'use client'

import { useState, useEffect, useRef } from 'react'
import { QUESTIONS, QUESTION_MAP } from '@/lib/questions'
import { BenchmarkState, createInitialBenchmarkState, applyScores } from '@/lib/benchmark-state'
import { scoreAnswer, getSkippedQuestions } from '@/lib/benchmark-scoring'

type Phase = 'hero' | 'chat' | 'results'

interface Message {
  role: 'ai' | 'user'
  content: string
}

const STATUSES = [
  (d: string) => `Analysing ${d}...`,
  () => 'Fetching company data...',
  () => 'Researching website...',
  () => 'Almost there...',
]

export default function Home() {
  const [phase, setPhase] = useState<Phase>('hero')
  const [domain, setDomain] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const [correction, setCorrection] = useState('')
  const [showFinalTyping, setShowFinalTyping] = useState(false)

  // Benchmark state
  const [benchmarkState, setBenchmarkState] = useState<BenchmarkState>(createInitialBenchmarkState())
  const [benchmarkPhase, setBenchmarkPhase] = useState<'idle' | 'questioning' | 'complete'>('idle')
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false)
  const [benchmarkInput, setBenchmarkInput] = useState('')

  const submittedDomain = useRef('')
  const chatBottomRef = useRef<HTMLDivElement>(null)
  // Refs to control the status cycling and API resolution
  const statusTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const resolvedMessage = useRef<string | null>(null)
  const apiDone = useRef(false)

  function clearStatusTimers() {
    statusTimers.current.forEach(clearTimeout)
    statusTimers.current = []
  }

  function handleSubmit() {
    const trimmed = domain.trim()
    if (!trimmed) return
    submittedDomain.current = trimmed
    resolvedMessage.current = null
    apiDone.current = false
    setPhase('chat')
    setIsTyping(true)
    setStatusIndex(0)
    window.history.pushState({}, '', '/benchmark')
    runEnrichment(trimmed)
  }

  function handleHeroKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  async function runEnrichment(d: string) {
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        resolvedMessage.current =
          body?.error ?? "I couldn't find data for this domain. Can you tell me a bit about your company?"
      } else {
        const data = await res.json()
        resolvedMessage.current = data.enrichment_message ?? "I couldn't find data for this domain. Can you tell me a bit about your company?"
      }
    } catch {
      resolvedMessage.current =
        "I couldn't find data for this domain. Can you tell me a bit about your company?"
    }
    apiDone.current = true
  }

  // Status cycling — advances every 1.5s, waits for API before resolving
  useEffect(() => {
    if (!isTyping || showFinalTyping) return

    clearStatusTimers()

    const advance = (idx: number, delay: number) => {
      const t = setTimeout(() => {
        setStatusIndex(idx)
      }, delay)
      statusTimers.current.push(t)
    }

    advance(1, 1500)
    advance(2, 3000)
    advance(3, 4500)

    // Poll for API completion from 4.5s onward
    const poll = setInterval(() => {
      if (apiDone.current && resolvedMessage.current !== null) {
        clearInterval(poll)
        clearStatusTimers()
        setIsTyping(false)
        const msg = resolvedMessage.current
        const isFallback = msg.startsWith("I couldn't find") || msg.startsWith('The benchmark is unavailable')
        setMessages([{ role: 'ai', content: msg }])
        setShowOptions(!isFallback)
      }
    }, 300)

    return () => {
      clearStatusTimers()
      clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping])

  // Scroll to bottom whenever chat updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, showOptions, showFinalTyping, isBenchmarkLoading])

  function handleLooksGood() {
    setMessages(prev => [...prev, { role: 'user', content: 'Looks good ✓' }])
    setShowOptions(false)
    setShowFinalTyping(true)
  }

  function handleCorrection(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = correction.trim()
    if (!trimmed) return
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setCorrection('')
    setShowOptions(false)
    setShowFinalTyping(true)
  }

  // When "Great, let's begin..." animation ends, fire Q1
  useEffect(() => {
    if (!showFinalTyping) return
    const t = setTimeout(() => {
      setShowFinalTyping(false)
      setMessages(prev => [...prev, { role: 'ai', content: QUESTIONS[0].text }])
      setCurrentQuestionId('Q1')
      setBenchmarkPhase('questioning')
    }, 1800)
    return () => clearTimeout(t)
  }, [showFinalTyping])

  async function handleBenchmarkAnswer(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = benchmarkInput.trim()
    if (!trimmed || !currentQuestionId || isBenchmarkLoading) return

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setBenchmarkInput('')
    setIsBenchmarkLoading(true)

    try {
      const remainingForScoring = benchmarkState.remainingQuestions
      const newScores = await scoreAnswer(currentQuestionId, trimmed, remainingForScoring)

      const remainingExcludingCurrent = remainingForScoring.filter(id => id !== currentQuestionId)
      const skipped = getSkippedQuestions(remainingExcludingCurrent, newScores, currentQuestionId)

      const updatedState = applyScores(benchmarkState, trimmed, currentQuestionId, newScores)
      setBenchmarkState(updatedState)

      const nextId = updatedState.remainingQuestions[0] ?? null

      if (!nextId) {
        setBenchmarkPhase('complete')
        setCurrentQuestionId(null)
        setMessages(prev => [...prev, {
          role: 'ai',
          content: "That covers everything — let me put your results together.",
        }])
        setTimeout(() => setPhase('results'), 1800)
      } else {
        const nextQuestion = QUESTION_MAP[nextId]
        const aiMessage = skipped.length > 0
          ? `Got it — that covers a few things.\n\n${nextQuestion.text}`
          : nextQuestion.text
        setMessages(prev => [...prev, { role: 'ai', content: aiMessage }])
        setCurrentQuestionId(nextId)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: "Something went wrong on my end — could you repeat that?",
      }])
    } finally {
      setIsBenchmarkLoading(false)
    }
  }

  const currentStatus = STATUSES[statusIndex]?.(submittedDomain.current) ?? ''

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          phase !== 'hero' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Fixed BYST wordmark — hero only */}
        <div className="fixed top-6 left-8 z-20 flex flex-col items-start">
          <span className="font-display font-normal text-xl tracking-[0.15em] text-white">BYST</span>
          <span className="mt-1 block h-[2px] w-full bg-[#009e8f]" />
        </div>

        <div className="flex flex-col items-center text-center px-6 w-full">
          <span
            className="text-xs tracking-widest uppercase text-primary border border-primary rounded-full px-4 py-1.5 inline-block bg-background fade-up"
            style={{ animationDelay: '0ms' }}
          >
            For B2B AI &amp; SaaS
          </span>

          <p className="text-xs tracking-widest uppercase text-muted-foreground fade-up mt-3" style={{ animationDelay: '40ms' }}>
            AI Sales Systems Benchmark
          </p>

          <div className="accent-line mx-auto mt-4 fade-up" style={{ animationDelay: '80ms' }} />

          <h1
            className="mt-10 max-w-6xl text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] fade-up"
            style={{ animationDelay: '180ms' }}
          >
            Do you have leading AI Sales Systems?
          </h1>

          <p
            className="mt-6 max-w-6xl text-[0.81rem] md:text-[1.015rem] leading-relaxed text-secondary-foreground fade-up"
            style={{ animationDelay: '280ms' }}
          >
            89% of enterprises are investing in AI, but only a fraction have built the systems that actually win deals.<br />
            <em className="text-primary">Find out where you stand.</em>
          </p>

          <div className="mt-10 w-full max-w-xl fade-up" style={{ animationDelay: '380ms' }}>
            <div className="flex items-center rounded-full bg-[#1a1a1a] border border-white/10 px-5 py-3">
              <input
                type="text"
                placeholder="yourdomain.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                onKeyDown={handleHeroKey}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none py-1.5"
              />
              <button
                onClick={handleSubmit}
                className="ml-3 flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#009e8f] flex items-center justify-center hover:bg-[#222] transition-colors"
                aria-label="Start benchmark"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-primary">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="mt-4 rounded-full text-sm font-medium px-7 py-3.5 bg-primary text-white border border-primary/60 hover:bg-primary/90 transition-colors fade-up"
            style={{ animationDelay: '420ms' }}
          >
            Benchmark Your AI Sales Systems
          </button>

          <p
            className="mt-6 text-[0.81rem] md:text-[1.015rem] leading-relaxed text-secondary-foreground fade-up"
            style={{ animationDelay: '460ms' }}
          >
            Your AI sales systems will be your GTM competitive advantage
          </p>
        </div>
      </div>

      {/* ── Chat ──────────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col font-sans transition-opacity duration-500 ${
          phase === 'hero' || phase === 'results' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Header */}
        <header className="flex-shrink-0 h-14 border-b border-border flex items-center px-6">
          <div className="flex flex-col items-start">
            <span className="font-display font-normal text-xl tracking-[0.15em] text-white">BYST</span>
            <span className="mt-0.5 block h-[2px] w-full bg-[#009e8f]" />
          </div>
          <span className="ml-auto font-sans text-sm font-normal text-white">Sales Systems Benchmark</span>
        </header>

        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-2xl flex flex-col gap-4">

            {messages.map((msg, i) =>
              msg.role === 'ai' ? (
                <AiBubble key={i} content={msg.content} />
              ) : (
                <UserBubble key={i} content={msg.content} />
              )
            )}

            {isTyping && (
              <div className="flex flex-col gap-2">
                <AiTypingBubble />
                <p className="text-xs text-muted-foreground pl-11">
                  {currentStatus}
                </p>
              </div>
            )}

            {showFinalTyping && (
              <div className="flex flex-col gap-2">
                <AiTypingBubble />
                <p className="text-xs text-muted-foreground pl-11">
                  Great, let&apos;s begin...
                </p>
              </div>
            )}

            {isBenchmarkLoading && <AiTypingBubble />}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Fixed input bar */}
        <div className="flex-shrink-0 border-t border-border bg-background px-4 py-4">
          <div className="mx-auto max-w-2xl">

            {showOptions && !showFinalTyping ? (
              /* Options panel */
              <div className="bg-card border border-border rounded-xl overflow-hidden">

                {/* Row 1 — Looks good */}
                <button
                  type="button"
                  onClick={handleLooksGood}
                  className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border hover:bg-white/5 transition-colors text-left"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center text-xs font-medium text-muted-foreground">
                    1
                  </span>
                  <span className="text-sm text-white">Looks good ✓</span>
                </button>

                {/* Row 2 — Something else (inline input) */}
                <form onSubmit={handleCorrection} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3 fill-muted-foreground">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Something else..."
                    value={correction}
                    onChange={e => setCorrection(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!correction.trim()}
                    aria-label="Send correction"
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>

              </div>
            ) : benchmarkPhase === 'questioning' && !isBenchmarkLoading ? (
              /* Benchmark free-text answer input */
              <form onSubmit={handleBenchmarkAnswer} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
                <input
                  type="text"
                  placeholder="Your answer..."
                  value={benchmarkInput}
                  onChange={e => setBenchmarkInput(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!benchmarkInput.trim()}
                  aria-label="Send answer"
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            ) : !showOptions && !isTyping && messages.length > 0 && messages[messages.length - 1].role === 'ai' && messages[messages.length - 1].content.startsWith("I couldn't find") ? (
              /* Fallback free-text input */
              <form onSubmit={handleCorrection} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
                <input
                  type="text"
                  placeholder="Tell us about your company..."
                  value={correction}
                  onChange={e => setCorrection(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!correction.trim()}
                  aria-label="Send"
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            ) : (
              /* Default input bar (inactive) */
              <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 opacity-40">
                <span className="flex-1 text-sm text-muted-foreground">Message...</span>
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col font-sans transition-opacity duration-500 ${
          phase !== 'results' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <header className="flex-shrink-0 h-14 border-b border-border flex items-center px-6">
          <div className="flex flex-col items-start">
            <span className="font-display font-normal text-xl tracking-[0.15em] text-white">BYST</span>
            <span className="mt-0.5 block h-[2px] w-full bg-[#009e8f]" />
          </div>
          <span className="ml-auto font-sans text-sm font-normal text-white">Sales Systems Benchmark</span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-10">
          <div className="mx-auto max-w-2xl flex flex-col gap-8">

            {/* Overall score */}
            <div className="border border-border rounded-xl p-8 flex flex-col items-center text-center gap-3">
              <p className="text-xs tracking-widest uppercase text-muted-foreground">Overall AI Maturity</p>
              <div className="text-7xl font-display font-semibold text-primary">{benchmarkState.totalScore}</div>
              <p className="text-lg font-display font-semibold text-white">{benchmarkState.maturityLabel}</p>
              <p className="text-sm text-muted-foreground">{benchmarkState.maturityStage}</p>
            </div>

            {/* Pillar scores */}
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  { label: 'AE Systems', score: benchmarkState.pillarScores.pillar1 },
                  { label: 'Leadership Systems', score: benchmarkState.pillarScores.pillar2 },
                  { label: 'Enablement', score: benchmarkState.pillarScores.pillar3 },
                ] as const
              ).map(({ label, score }) => (
                <div key={label} className="border border-border rounded-xl p-5 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground text-center leading-snug">{label}</p>
                  <p className="text-3xl font-display font-semibold text-white">{score}</p>
                  <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="border border-primary/30 rounded-xl p-8 flex flex-col items-center text-center gap-4 bg-primary/5">
              <p className="font-display font-semibold text-white text-xl">See what AI-native looks like for your team</p>
              <p className="text-sm text-secondary-foreground max-w-md">
                Book a free 30-minute call. We&apos;ll walk you through exactly what AI-native companies at your stage are doing — and what it would take to get there.
              </p>
              <a
                href="https://calendly.com/byst-group/ai-sales-benchmark"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-full text-sm font-medium px-7 py-3.5 bg-primary text-white border border-primary/60 hover:bg-primary/90 transition-colors"
              >
                Book a Call
              </a>
            </div>

          </div>
        </div>
      </div>

    </main>
  )
}

function AiBubble({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-black border border-[#009e8f] flex items-center justify-center">
        <span className="text-xs font-semibold text-[#009e8f]">B</span>
      </div>
      <div className="max-w-xl p-4 text-sm text-white leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xl bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm text-white">
        {content}
      </div>
    </div>
  )
}

function AiTypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-black border border-[#009e8f] flex items-center justify-center">
        <span className="text-xs font-semibold text-[#009e8f]">B</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
