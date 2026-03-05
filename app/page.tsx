import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden">

      {/* Fixed BYST wordmark — top left */}
      <div className="fixed top-6 left-8 z-10 flex flex-col items-start">
        <span className="font-display font-normal text-xl tracking-[0.15em] text-white">
          BYST
        </span>
        <span className="mt-1 block h-[2px] w-full bg-[#009e8f]" />
      </div>

      {/* Hero content — centered */}
      <div className="flex flex-col items-center text-center px-6 w-full">

        {/* Label */}
        <p
          className="text-xs tracking-widest uppercase text-muted-foreground fade-up"
          style={{ animationDelay: '0ms' }}
        >
          AI Sales Systems Benchmark
        </p>

        {/* Accent line */}
        <div
          className="accent-line mx-auto mt-4 fade-up"
          style={{ animationDelay: '80ms' }}
        />

        {/* H1 */}
        <h1
          className="mt-10 max-w-6xl text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] fade-up"
          style={{ animationDelay: '180ms' }}
        >
          Do you have leading AI Sales Systems?
        </h1>

        {/* Subline */}
        <p
          className="mt-6 max-w-xl text-[0.81rem] md:text-[1.015rem] leading-relaxed text-secondary-foreground fade-up"
          style={{ animationDelay: '280ms' }}
        >
          89% of enterprises are investing in AI, but only a fraction have built the systems that actually win deals.<br /><em>Find out where you stand.</em>
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
              className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none py-1.5"
            />
            <button
              className="ml-3 flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#009e8f] flex items-center justify-center hover:bg-[#222] transition-colors"
              aria-label="Start benchmark"
            >
              {/* Play icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-7 h-7 translate-x-[1px] fill-primary"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/benchmark"
          className="mt-4 rounded-full text-sm font-medium px-7 py-3.5 bg-primary text-white border border-primary/60 hover:bg-primary/90 transition-colors fade-up"
          style={{ animationDelay: '420ms' }}
        >
          Benchmark Your AI Sales Systems
        </Link>

        {/* Below-CTA line */}
        <p
          className="mt-6 text-[0.81rem] md:text-[1.015rem] leading-relaxed text-secondary-foreground fade-up"
          style={{ animationDelay: '460ms' }}
        >
          Your AI sales systems will be your GTM competitive advantage
        </p>

      </div>
    </main>
  )
}
