import Link from "next/link";

const features = [
  {
    icon: "🧪",
    title: "AI-Generated Simulations",
    desc: "Type any physics, math, or CS question and get an interactive, runnable simulation in seconds.",
  },
  {
    icon: "🎮",
    title: "Real-Time Controls",
    desc: "Sliders, toggles, and dropdowns let you tweak parameters and see results instantly.",
  },
  {
    icon: "🏆",
    title: "Challenge Mode",
    desc: "Each simulation comes with a goal challenge to deepen your intuition.",
  },
  {
    icon: "🧠",
    title: "Socratic Tutor",
    desc: "Guided questions help you think through the physics, not just watch it happen.",
  },
  {
    icon: "🌐",
    title: "Public Gallery",
    desc: "Browse and remix simulations created by the community.",
  },
  {
    icon: "🤖",
    title: "Discord Bot",
    desc: "Use /simforge in Discord to generate and share simulations right in your server.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/40 border border-blue-800 rounded-full text-blue-400 text-xs mb-6">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          Hackathon Build — SimForge Studio
        </div>
        <h1 className="text-6xl font-bold tracking-tight leading-tight">
          Turn any question into an<br />
          <span className="text-blue-400">interactive simulation.</span>
        </h1>
        <p className="mt-6 text-xl text-slate-300 max-w-2xl">
          SimForge uses AI to instantly generate physics, math, and CS simulations
          you can explore, manipulate, and learn from — no code required.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/create"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-lg transition"
          >
            🚀 Create a Simulation
          </Link>
          <Link
            href="/gallery"
            className="px-8 py-4 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 rounded-lg font-semibold text-lg transition"
          >
            Browse Gallery
          </Link>
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold mb-8 text-slate-200">What SimForge can do</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}