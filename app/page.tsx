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
      {/* 3D Hero background */}
      <Hero3D />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 z-[1] mx-auto hidden h-[440px] max-w-7xl opacity-25 lg:block">
        <svg viewBox="0 0 1220 440" className="h-full w-full" fill="none">
          <defs>
            <radialGradient id="hero-core"><stop stopColor="#C4B5FD" stopOpacity=".9"/><stop offset="1" stopColor="#6366F1" stopOpacity=".12"/></radialGradient>
          </defs>
          <g transform="translate(210 0)">
          <ellipse cx="930" cy="226" rx="218" ry="71" transform="rotate(-24 930 226)" stroke="#818CF8" strokeOpacity=".6"/>
          <ellipse cx="930" cy="226" rx="157" ry="51" transform="rotate(26 930 226)" stroke="#22D3EE" strokeOpacity=".42"/>
          <circle cx="930" cy="226" r="30" fill="url(#hero-core)" stroke="#C4B5FD" strokeOpacity=".65"/>
          <circle cx="752" cy="148" r="7" fill="#A5B4FC"/>
          <circle cx="1057" cy="169" r="5" fill="#67E8F9"/>
          <circle cx="804" cy="291" r="3" fill="#C4B5FD"/>
          <path d="M930 188v-22m0 120v-22m38-38h22m-120 0h22" stroke="#C4B5FD" strokeOpacity=".48" strokeLinecap="round"/>
          <path d="M930 196v30l22 13" stroke="#E0E7FF" strokeOpacity=".78" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </svg>
      </div>

      {/* Hero content */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
        <div className="fade-up">
          <Badge className="mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive learning workspace</span>
          </Badge>
        </div>

        <h1 className="fade-up text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          <span className="gradient-text">Turn any question</span>
          <br />
          <span className="text-slate-200">into a simulation.</span>
        </h1>

        <p className="fade-up mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Explore physics, mathematics, computer science, economics and more through
          simulations you can adjust, measure and question.
        </p>

        <div className="fade-up mt-10 flex flex-wrap gap-3 justify-center">
          <Link href="/create">
            <Button size="lg" className="group">
              Start creating
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/gallery">
            <Button size="lg" variant="outline">
              Browse gallery
            </Button>
          </Link>
        </div>

        <div className="fade-up mt-6 text-xs text-slate-500">Start with a prompt, then explore the model through live controls and data.</div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
            An interactive lab, from every angle
          </h2>
          <p className="mt-3 text-slate-400">
            From a single sentence to a full interactive lab.
          </p>
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
