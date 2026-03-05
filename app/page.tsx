import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background flex flex-col overflow-hidden">

      {/* Fixed BYST wordmark — top left */}
      <div className="fixed top-6 left-8 z-10 flex flex-col items-start">
        <span className="font-display font-normal text-xl tracking-[0.15em] text-white">
          BYST
        </span>
        <span className="mt-1 block h-[2px] w-full bg-[#009e8f]" />
      </div>

      {/* Hero content — slightly below center */}
      <div className="flex flex-col items-center text-center px-6 w-full mt-[20vh] md:mt-[28vh]">

        {/* H1 */}
        <h1
          className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] fade-up"
          style={{ animationDelay: '0ms' }}
        >
          Discover if you have leading AI Sales Systems
        </h1>

        {/* Subline */}
        <p
          className="mt-8 max-w-xl text-lg leading-relaxed text-secondary-foreground fade-up"
          style={{ animationDelay: '120ms' }}
        >
          89% of enterprises are actively investing in AI, but 53% of sales professionals admit they don&apos;t get much value out of AI tools. Will AI be your competitive advantage, or will you fall behind your competitors?
        </p>

        {/* CTA */}
        <Link
          href="/benchmark"
          className="mt-10 rounded px-7 py-3.5 text-sm font-medium border border-primary text-primary bg-background hover:bg-primary/10 transition-colors fade-up"
          style={{ animationDelay: '240ms' }}
        >
          Benchmark Your AI Sales Systems
        </Link>

      </div>
    </main>
  )
}
