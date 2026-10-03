import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6 py-24">
        <h1 className="text-6xl font-bold tracking-tight">
          SimForge <span className="text-blue-400">Studio</span>
        </h1>
        <p className="mt-4 text-xl text-slate-300">
          Turn any question into an interactive simulation.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/create"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold"
          >
            Create a Simulation
          </Link>
          <Link
            href="/gallery"
            className="px-6 py-3 border border-slate-700 hover:border-slate-500 rounded-lg font-semibold"
          >
            Browse Gallery
          </Link>
        </div>
        <div className="mt-20 grid grid-cols-3 gap-6 text-slate-400">
          <div>
            <p className="text-3xl font-bold text-white">8+</p>
            <p>Domains</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">AI</p>
            <p>Generated</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">Free</p>
            <p>For students</p>
          </div>
        </div>
      </div>
    </main>
  );
}