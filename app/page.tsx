import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Zap,
  Bot,
  Share2,
  Target,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <section className="hero-shell relative mx-auto grid min-h-[calc(100svh-64px)] max-w-[1440px] grid-cols-1 items-center gap-y-1 px-5 pb-12 pt-10 sm:px-8 lg:grid-cols-[.96fr_1.04fr] lg:gap-x-5 lg:px-10 lg:py-8">
        <div className="relative z-10 order-1 mx-auto max-w-[570px] text-center lg:mx-0 lg:text-left">
        <div className="fade-up">
          <Badge className="mb-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI-powered interactive simulations</span>
          </Badge>
        </div>

        <h1 className="fade-up text-5xl font-semibold tracking-[-.055em] leading-[1.02] sm:text-6xl lg:text-[3.5rem] xl:text-[4.45rem]">
          <span className="gradient-text">Turn any question</span>
          <br />
          <span className="text-slate-200">into a simulation.</span>
        </h1>

        <p className="fade-up mx-auto mt-6 max-w-[510px] text-base leading-7 text-slate-400 sm:text-lg lg:mx-0">
          Explore ideas by turning natural language into interactive experiments you can manipulate, measure and understand.
        </p>
        </div>

        <div className="relative order-2 mx-auto -mt-1 h-[270px] w-full max-w-[560px] sm:h-[340px] lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0 lg:h-[min(72vh,620px)] lg:max-w-none">
          <Hero3D />
        </div>

        <div className="relative z-10 order-3 -mt-1 flex flex-wrap justify-center gap-3 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:justify-start">
          <Link href="/create">
            <Button size="lg" className="group">
              Start creating
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/gallery">
            <Button size="lg" variant="outline">
              Explore simulations
            </Button>
          </Link>
        </div>
      </section>

      {/* Describe → interact → understand */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
            From a question to a working model
          </h2>
          <p className="mt-3 text-slate-400">
            One experiment, with the tools to explore what changes and why.
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StepCard index="01" title="Describe it" desc="Start with a question in your own words. SimForge shapes it into an interactive experiment." icon={<Sparkles className="h-5 w-5" />} />
          <StepCard index="02" title="Interact with it" desc="Adjust the controls and watch the simulation respond as conditions change." icon={<Zap className="h-5 w-5" />} />
          <StepCard index="03" title="Understand it" desc="Read the measurements, follow the graph and learn from guided challenges and questions." icon={<BookOpen className="h-5 w-5" />} />
        </div>

        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Everything connected to the experiment</h2>
            <p className="mt-2 text-sm text-slate-400">A complete workspace for building, testing and sharing ideas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-indigo-400" />}
            title="AI-generated sims"
            desc="Ask in plain English. Get a playable simulation with sliders, animation, and live physics."
          />
          <FeatureCard
            icon={<Target className="w-5 h-5 text-purple-400" />}
            title="Challenge mode"
            desc="Every sim comes with a mission. Hit the goal and see how you did."
          />
          <FeatureCard
            icon={<BookOpen className="w-5 h-5 text-cyan-400" />}
            title="Socratic tutor"
            desc="Not just a visual. It asks questions, checks your answers, and explains why."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
            title="Data, live"
            desc="Watch meaningful measurements and graphs respond as you change a parameter."
          />
          <FeatureCard
            icon={<ArrowRight className="w-5 h-5 text-purple-400" />}
            title="Modify and remix"
            desc="Describe a change in plain language and explore a new version of the experiment."
          />
          <FeatureCard
            icon={<Bot className="w-5 h-5 text-indigo-400" />}
            title="Discord bot"
            desc="Slash command inside your study server. Get a sim link instantly."
          />
          <FeatureCard
            icon={<Share2 className="w-5 h-5 text-purple-400" />}
            title="Shareable URLs"
            desc="Save a simulation to the gallery and share a link others can explore."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
            title="Live measurements"
            desc="See the key values behind each experiment update as you adjust its parameters."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-32 text-center">
        <Card className="glass-strong p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none" />
          <h2 className="relative text-3xl md:text-4xl font-bold text-slate-100">
            Ready to build the future?
          </h2>
          <p className="relative mt-3 text-slate-400 max-w-xl mx-auto">
            Describe a question you want to understand. SimForge will turn it into an experiment you can explore.
          </p>
          <Link href="/create" className="relative inline-block mt-8">
            <Button size="lg" className="group">
              Try it now
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-slate-500">
        SimForge · Interactive simulations for curious minds
      </footer>
    </main>
  );
}

function StepCard({ index, title, desc, icon }: { index: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Card className="relative min-h-52 overflow-hidden p-6 transition-colors hover:border-indigo-300/20">
      <div className="mb-8 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-300/15 bg-indigo-300/[.07] text-indigo-200">{icon}</span>
        <span className="font-mono text-xs tracking-[.18em] text-slate-600">{index}</span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-slate-100">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{desc}</p>
    </Card>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card className="group transition-all hover:border-white/20 hover:-translate-y-0.5">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
    </Card>
  );
}
