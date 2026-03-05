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

      {/* Fixed BYST wordmark — top left */}
      <div className="fixed top-6 left-8 z-20 flex flex-col items-start">
        <span className="font-display font-normal text-xl tracking-[0.15em] text-white">
          BYST
        </span>
        <span className="mt-1 block h-[2px] w-full bg-[#009e8f]" />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          phase === 'chat' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col items-center text-center px-6 w-full">

          <p
            className="text-xs tracking-widest uppercase text-muted-foreground fade-up"
            style={{ animationDelay: '0ms' }}
          >
            AI Sales Systems Benchmark
          </p>

          <div
            className="accent-line mx-auto mt-4 fade-up"
            style={{ animationDelay: '80ms' }}
          />

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

          {/* Domain input */}
          <div
            className="mt-10 w-full max-w-xl fade-up"
            style={{ animationDelay: '380ms' }}
          >
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 translate-x-[1px] fill-primary">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* CTA */}
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
        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${
          phase === 'hero' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Scrollable messages area */}
        <div className="flex-1 overflow-y-auto pt-24 pb-6 px-4">
          <div className="mx-auto max-w-2xl flex flex-col gap-4">

            {/* Rendered messages */}
            {messages.map((msg, i) =>
              msg.role === 'ai' ? (
                <AiBubble key={i} content={msg.content} />
              ) : (
                <UserBubble key={i} content={msg.content} />
              )
            )}

            {/* Typing indicator — initial analysis */}
            {isTyping && (
              <div className="flex flex-col gap-2">
                <AiTypingBubble />
                <p className="text-xs text-muted-foreground pl-1 transition-opacity duration-500">
                  {currentStatus}
                </p>
              </div>
            )}

            {/* Options row */}
            {showOptions && !showFinalTyping && (
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={handleLooksGood}
                  className="rounded-full text-sm font-medium px-5 py-2.5 bg-primary text-white border border-primary/60 hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  Looks good
                </button>
                <form onSubmit={handleCorrection} className="flex flex-1 items-center rounded-full bg-[#1a1a1a] border border-white/10 px-4 py-2">
                  <input
                    type="text"
                    placeholder="Correct something..."
                    value={correction}
                    onChange={e => setCorrection(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
                  />
                  <button
                    type="submit"
                    className="ml-2 flex-shrink-0 w-7 h-7 rounded-full border border-[#009e8f] flex items-center justify-center hover:bg-[#222] transition-colors"
                    aria-label="Send correction"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-primary">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </div>
            )}

            {/* Typing indicator — final */}
            {showFinalTyping && (
              <div className="flex flex-col gap-2">
                <AiTypingBubble />
                <p className="text-xs text-muted-foreground pl-1">
                  Great, let&apos;s begin...
                </p>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>
      </div>

    </main>
  )
}

function AiBubble({ content }: { content: string }) {
  return (
    <div className="self-start max-w-[85%] bg-card border border-border rounded p-4 text-sm text-foreground whitespace-pre-line">
      {content}
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="self-end max-w-[85%] bg-primary/10 border border-primary/20 rounded p-4 text-sm text-right text-foreground">
      {content}
    </div>
  )
}

function AiTypingBubble() {
  return (
    <div className="self-start bg-card border border-border rounded p-4">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
