'use client'

import { useState, useEffect, useRef } from 'react'

type Phase = 'hero' | 'chat'

interface Message {
  role: 'ai' | 'user'
  content: string
}

const STATUSES = [
  (d: string) => `Analysing ${d}...`,
  () => 'Fetching company data...',
  () => 'Almost there...',
]

const MOCK_AI_MESSAGE =
  `Here's what I found about your company:\n\n🏢 Company: Acme Corp\n🌍 Location: Amsterdam, Netherlands\n👥 Size: 50–200 employees\n🏷️ Industry: B2B SaaS\n\nDoes this look right? Feel free to correct anything before we start the benchmark.`

export default function Home() {
  const [phase, setPhase] = useState<Phase>('hero')
  const [domain, setDomain] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const [correction, setCorrection] = useState('')
  const [showFinalTyping, setShowFinalTyping] = useState(false)

  const submittedDomain = useRef('')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  function handleSubmit() {
    const trimmed = domain.trim()
    if (!trimmed) return
    submittedDomain.current = trimmed
    setPhase('chat')
    setIsTyping(true)
    setStatusIndex(0)
    window.history.pushState({}, '', '/benchmark')
  }

  function handleHeroKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  // Status cycling + resolve to AI message
  useEffect(() => {
    if (!isTyping || showFinalTyping) return
    const t1 = setTimeout(() => setStatusIndex(1), 1500)
    const t2 = setTimeout(() => setStatusIndex(2), 3000)
    const t3 = setTimeout(() => {
      setIsTyping(false)
      setMessages([{ role: 'ai', content: MOCK_AI_MESSAGE }])
      setShowOptions(true)
    }, 4500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [isTyping, showFinalTyping])

  // Scroll to bottom whenever chat updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, showOptions, showFinalTyping])

  function handleLooksGood() {
    setMessages(prev => [...prev, { role: 'user', content: 'Looks good' }])
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

  const currentStatus = STATUSES[statusIndex]?.(submittedDomain.current) ?? ''

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          phase === 'chat' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Fixed BYST wordmark — hero only */}
        <div className="fixed top-6 left-8 z-20 flex flex-col items-start">
          <span className="font-display font-normal text-xl tracking-[0.15em] text-white">BYST</span>
          <span className="mt-1 block h-[2px] w-full bg-[#009e8f]" />
        </div>

        <div className="flex flex-col items-center text-center px-6 w-full">
          <p className="text-xs tracking-widest uppercase text-muted-foreground fade-up" style={{ animationDelay: '0ms' }}>
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
          phase === 'hero' ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
                  <span className="text-sm text-white">Looks good</span>
                </button>

                {/* Row 2 — Something else (inline input) */}
                <form onSubmit={handleCorrection} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center">
                    {/* Pencil icon */}
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
