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
          className="mt-10 max-w-4xl text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] fade-up"
          style={{ animationDelay: '180ms' }}
        >
          Do you have leading AI Sales Systems?
        </h1>

        {/* Subline */}
        <p
          className="mt-6 max-w-xl text-[0.81rem] md:text-[1.015rem] leading-relaxed text-secondary-foreground fade-up"
          style={{ animationDelay: '280ms' }}
        >
          89% of enterprises are actively investing in AI, but 53% of sales professionals admit they don&apos;t get much value out of AI tools.
          <br /><br />
          Will AI be your competitive advantage, or will you fall behind your competitors?
        </p>

        {/* CTA */}
        <Link
          href="/benchmark"
          className="mt-10 rounded-full text-sm font-medium px-7 py-3.5 bg-primary text-white border border-primary/60 hover:bg-primary/90 transition-colors fade-up"
          style={{ animationDelay: '380ms' }}
        >
          Benchmark Your AI Sales Systems
        </Link>

      </div>
    </main>
  )
}
