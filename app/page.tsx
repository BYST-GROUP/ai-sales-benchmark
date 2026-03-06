'use client'

import { useState, useEffect, useRef } from 'react'
import { QUESTIONS, QUESTION_MAP } from '@/lib/questions'
import { BenchmarkState, createInitialBenchmarkState, applyScores } from '@/lib/benchmark-state'
import { scoreAnswer, getSkippedQuestions } from '@/lib/benchmark-scoring'
import { MaturityLabel, CURRENT_STAGE_CONTENT, NEXT_STAGE_CONTENT } from '@/lib/results-content'
import MaturityCurveChart from '@/components/MaturityCurveChart'

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

const INTRO_MESSAGE =
  "Awesome! Let me ask a few questions about your sales operations so we can assess your maturity level with AI sales systems."

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

  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const submittedDomain = useRef('')
  const sessionIdRef = useRef('')
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const statusTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const resolvedMessage = useRef<string | null>(null)
  const apiDone = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
      recognitionRef.current?.stop()
    }
  }, [])

  function clearStatusTimers() {
    statusTimers.current.forEach(clearTimeout)
    statusTimers.current = []
  }

  // Stream an AI message character-by-character, then commit to messages array
  function streamAiMessage(text: string, onComplete?: () => void) {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    setIsStreaming(true)
    setStreamingMessage('')
    let i = 0
    streamIntervalRef.current = setInterval(() => {
      i++
      setStreamingMessage(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(streamIntervalRef.current!)
        streamIntervalRef.current = null
        setStreamingMessage(null)
        setIsStreaming(false)
        setMessages(prev => [...prev, { role: 'ai', content: text }])
        onComplete?.()
      }
    }, 14)
  }

  // Voice input
  function toggleMic(setInput: React.Dispatch<React.SetStateAction<string>>) {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      setInput(transcript)
    }
    rec.onerror = () => setIsRecording(false)
    rec.onend = () => setIsRecording(false)
    recognitionRef.current = rec
    setIsRecording(true)
    rec.start()
  }

  function handleSubmit() {
    const trimmed = domain.trim()
    if (!trimmed) return
    submittedDomain.current = trimmed
    sessionIdRef.current = crypto.randomUUID()
    resolvedMessage.current = null
    apiDone.current = false
    setPhase('chat')
    setIsTyping(true)
    setStatusIndex(0)
    window.history.pushState({}, '', '/benchmark')
    // Fire-and-forget: log domain submission
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'domain_submit', sessionId: sessionIdRef.current, domain: trimmed }),
    }).catch(() => {})
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
        body: JSON.stringify({ domain: d, sessionId: sessionIdRef.current }),
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
      const t = setTimeout(() => setStatusIndex(idx), delay)
      statusTimers.current.push(t)
    }

    advance(1, 1500)
    advance(2, 3000)
    advance(3, 4500)

    const poll = setInterval(() => {
      if (apiDone.current && resolvedMessage.current !== null) {
        clearInterval(poll)
        clearStatusTimers()
        setIsTyping(false)
        const msg = resolvedMessage.current
        const isFallback = msg.startsWith("I couldn't find") || msg.startsWith('The benchmark is unavailable')
        streamAiMessage(msg, () => setShowOptions(!isFallback))
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
  }, [messages, isTyping, showOptions, showFinalTyping, isBenchmarkLoading, streamingMessage])

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

  // When "Great, let's begin..." animation ends, stream intro then Q1
  useEffect(() => {
    if (!showFinalTyping) return
    const t = setTimeout(() => {
      setShowFinalTyping(false)
      streamAiMessage(INTRO_MESSAGE, () => {
        streamAiMessage(QUESTIONS[0].text, () => {
          setCurrentQuestionId('Q1')
          setBenchmarkPhase('questioning')
        })
      })
    }, 1800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFinalTyping])

  async function handleBenchmarkAnswer(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = benchmarkInput.trim()
    if (!trimmed || !currentQuestionId || isBenchmarkLoading || isStreaming) return

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setBenchmarkInput('')
    setIsBenchmarkLoading(true)

    try {
      const remainingForScoring = benchmarkState.remainingQuestions
      const newScores = await scoreAnswer(currentQuestionId, trimmed, remainingForScoring, sessionIdRef.current)

      const remainingExcludingCurrent = remainingForScoring.filter(id => id !== currentQuestionId)
      const skipped = getSkippedQuestions(remainingExcludingCurrent, newScores, currentQuestionId)

      const updatedState = applyScores(benchmarkState, trimmed, currentQuestionId, newScores)
      setBenchmarkState(updatedState)

      const nextId = updatedState.remainingQuestions[0] ?? null
      setIsBenchmarkLoading(false)

      if (!nextId) {
        setBenchmarkPhase('complete')
        setCurrentQuestionId(null)
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'benchmark_complete',
            sessionId: sessionIdRef.current,
            totalScore: updatedState.totalScore,
            maturityLabel: updatedState.maturityLabel,
            pillarScores: updatedState.pillarScores,
            answers: updatedState.answers,
            scores: updatedState.scores,
          }),
        }).catch(() => {})
        streamAiMessage("That covers everything — let me put your results together.", () => {
          setTimeout(() => setPhase('results'), 600)
        })
      } else {
        const nextQuestion = QUESTION_MAP[nextId]
        const aiText = skipped.length > 0
          ? `Got it — that covers a few things.\n\n${nextQuestion.text}`
          : nextQuestion.text
        streamAiMessage(aiText, () => setCurrentQuestionId(nextId))
      }
    } catch {
      setIsBenchmarkLoading(false)
      streamAiMessage("Something went wrong on my end — could you repeat that?")
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
        <div className="chat-scroll flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-2xl flex flex-col gap-4">

            {messages.map((msg, i) =>
              msg.role === 'ai' ? (
                <AiBubble key={i} content={msg.content} />
              ) : (
                <UserBubble key={i} content={msg.content} />
              )
            )}

            {/* Streaming AI message */}
            {isStreaming && streamingMessage !== null && streamingMessage.length > 0 && (
              <AiBubble content={streamingMessage} />
            )}

            {isTyping && (
              <div className="flex flex-col gap-2">
                <AiTypingBubble />
                <p className="text-xs text-muted-foreground">
                  {currentStatus}
                </p>
              </div>
            )}

            {showFinalTyping && (
              <div className="flex flex-col gap-2">
                <AiTypingBubble />
                <p className="text-xs text-muted-foreground">
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
                <form onSubmit={handleCorrection} className="flex items-center gap-3 px-4 py-3.5">
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
                  <MicButton isRecording={isRecording} onClick={() => toggleMic(setCorrection)} />
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
            ) : benchmarkPhase === 'questioning' && !isBenchmarkLoading && !isStreaming ? (
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
                <MicButton isRecording={isRecording} onClick={() => toggleMic(setBenchmarkInput)} />
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
                <MicButton isRecording={isRecording} onClick={() => toggleMic(setCorrection)} />
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

        <div className="chat-scroll flex-1 overflow-y-auto px-4 py-10">
          <div className="mx-auto max-w-2xl flex flex-col gap-6">

            {/* 1 — Overall score */}
            <div className="border border-border rounded-xl p-8 flex flex-col items-center text-center gap-3 bg-card">
              <p className="text-xs tracking-widest uppercase text-muted-foreground">Overall AI Maturity</p>
              <div className="text-7xl font-display font-semibold text-primary leading-none py-2">
                {benchmarkState.totalScore}
              </div>
              <p className="text-xl font-display font-semibold text-white">{benchmarkState.maturityLabel}</p>
            </div>

            {/* 2 — Pillar scores */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { label: 'AE Systems', score: benchmarkState.pillarScores.pillar1 },
                  { label: 'Leadership Systems', score: benchmarkState.pillarScores.pillar2 },
                  { label: 'Enablement', score: benchmarkState.pillarScores.pillar3 },
                ] as const
              ).map(({ label, score }) => (
                <div key={label} className="border border-border rounded-xl p-5 flex flex-col items-center gap-2 bg-card">
                  <p className="text-xs text-muted-foreground text-center leading-snug">{label}</p>
                  <p className="text-3xl font-display font-semibold text-white">{score}</p>
                  <div className="w-full h-1 rounded-full bg-border overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 3 — What this means for you */}
            {benchmarkState.maturityLabel && (() => {
              const label = benchmarkState.maturityLabel as MaturityLabel
              const content = CURRENT_STAGE_CONTENT[label]
              if (!content) return null
              return (
                <div className="border border-border rounded-xl p-6 bg-card flex flex-col gap-4">
                  <p className="text-xs tracking-widest uppercase text-muted-foreground">What This Means For You</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">What you&apos;re doing</p>
                      <p className="text-sm text-secondary-foreground leading-relaxed">{content.whatYoureDoing}</p>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">What you&apos;re experiencing</p>
                      <p className="text-sm text-secondary-foreground leading-relaxed">{content.whatYoureExperiencing}</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 4 — What the next stage looks like */}
            {benchmarkState.maturityLabel && (() => {
              const label = benchmarkState.maturityLabel as MaturityLabel
              const next = NEXT_STAGE_CONTENT[label]
              if (!next) {
                return (
                  <div className="border border-primary/20 rounded-xl p-6 bg-primary/5 flex flex-col gap-3">
                    <p className="text-xs tracking-widest uppercase text-primary">You&apos;re at the Top</p>
                    <p className="text-sm text-secondary-foreground leading-relaxed">
                      You&apos;re operating at the highest level of AI maturity. The focus now is staying ahead — continuously retraining your systems, embedding new capabilities, and using your proprietary data as a competitive moat.
                    </p>
                  </div>
                )
              }
              return (
                <div className="border border-border rounded-xl p-6 bg-card flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <p className="text-xs tracking-widest uppercase text-muted-foreground">The Next Stage</p>
                    <span className="text-xs font-medium text-primary border border-primary/30 rounded-full px-2.5 py-0.5">
                      {next.title}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">What it looks like</p>
                      <p className="text-sm text-secondary-foreground leading-relaxed">{next.whatItLooksLike}</p>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">Why it matters</p>
                      <p className="text-sm text-secondary-foreground leading-relaxed">{next.whyItMatters}</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 5 — Maturity curve */}
            <div className="border border-border rounded-xl p-6 bg-card flex flex-col gap-4">
              <p className="text-xs tracking-widest uppercase text-muted-foreground">AI Maturity Curve</p>
              {benchmarkState.maturityLabel && (
                <MaturityCurveChart maturityLabel={benchmarkState.maturityLabel as MaturityLabel} />
              )}
            </div>

            {/* 6 — CTA */}
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
    <div className="max-w-xl text-sm text-white leading-relaxed whitespace-pre-line py-1">
      {content}
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
    <div className="flex items-center gap-1.5 py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

function MicButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : 'text-[#8c8c8c] hover:text-white'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    </button>
  )
}
