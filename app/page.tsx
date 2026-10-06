import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";
import { GalleryShowcase } from "@/components/GalleryShowcase";
import { GalleryPreview } from "@/components/GalleryPreview";
import { buttonStyles } from "@/components/ui/Button";
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
  MessageSquare,
  SlidersHorizontal,
  Lightbulb,
} from "lucide-react";

const DOMAINS = ["Physics", "Data", "Algorithms", "Systems", "Biology", "Engineering", "Anything"];

const STEPS = [
  {
    index: "01",
    title: "Describe it",
    desc: "Describe an idea using natural language.",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    index: "02",
    title: "Interact with it",
    desc: "Manipulate parameters and experiment with the simulation.",
    icon: <SlidersHorizontal className="h-5 w-5" />,
  },
  {
    index: "03",
    title: "Understand it",
    desc: "Measure results, inspect data, visualize behavior, and learn.",
    icon: <Lightbulb className="h-5 w-5" />,
  },
];

export default function Home() {
  return (
    <main className="home-page relative isolate min-h-screen overflow-hidden">
      <div className="space-stars" aria-hidden="true" />

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-y-2 px-5 pb-6 pt-8 sm:px-8 lg:min-h-[600px] lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] lg:gap-x-4 lg:px-10 lg:pb-10 lg:pt-4">
        <div className="relative z-10 mx-auto max-w-[600px] text-center lg:mx-0 lg:text-left">
          <div className="fade-up">
            <Badge className="mb-7 border-indigo-300/25 bg-indigo-300/[.06] px-3 py-1.5 text-[11px] tracking-[.04em] text-indigo-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>AI-powered interactive simulations</span>
            </Badge>
          </div>

          <h1 className="fade-up text-[2.35rem] font-semibold leading-[1.03] tracking-[-.05em] min-[400px]:text-[2.7rem] sm:text-6xl lg:text-[3.2rem] xl:text-[4rem]">
            <span className="gradient-text">Turn any question</span>
            <br />
            <span className="gradient-text-cool">into a simulation.</span>
          </h1>

          <p className="fade-up mx-auto mt-6 max-w-[480px] text-base leading-7 text-slate-300/80 sm:text-lg lg:mx-0">
            Explore ideas by turning natural language into interactive experiments you can manipulate, measure and understand.
          </p>

          <div className="fade-up mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/create" className={buttonStyles({ size: "lg", className: "group rounded-full px-7" })}>
              Start creating
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/gallery" className={buttonStyles({ size: "lg", variant: "outline", className: "rounded-full px-7" })}>
              Explore simulations
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs tracking-wide text-slate-500 lg:justify-start" aria-label="Domains you can simulate">
            <li aria-hidden="true"><Sparkles className="h-3 w-3 text-indigo-400/70" /></li>
            {DOMAINS.map((domain, i) => (
              <li key={domain} className="flex items-center gap-2">
                {domain}
                {i < DOMAINS.length - 1 && <span aria-hidden="true" className="text-indigo-300/40">·</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* The scene bleeds into the surrounding space; no card, no frame */}
        <div className="relative mx-auto -mt-4 h-[380px] w-full max-w-[560px] sm:mt-0 sm:h-[420px] md:max-w-[760px] lg:-mr-10 lg:h-[560px] lg:max-w-none xl:-mr-16 xl:h-[600px]">
          <Hero3D />
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <div className="horizon-line" aria-hidden="true" />
      </div>

      {/* Describe → interact → understand */}
      <section className="relative z-10 mx-auto max-w-[1320px] px-6 pb-12 pt-16 sm:pb-16">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-semibold tracking-[.28em] text-fuchsia-300">HOW IT WORKS</p>
          <h2 className="text-3xl font-semibold tracking-[-.04em] text-slate-100 md:text-4xl">From words to worlds</h2>
        </div>

        <ol className="mx-auto mb-24 grid max-w-[1050px] gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((step) => (
            <li key={step.index} className="step-item relative">
              <div className="step-icon mb-5">{step.icon}</div>
              <p className="mb-1 font-mono text-[11px] tracking-[.2em] text-indigo-300/70">{step.index}</p>
              <h3 className="text-lg font-semibold tracking-tight text-slate-100">{step.title}</h3>
              <p className="mt-1.5 max-w-[280px] text-sm leading-6 text-slate-400">{step.desc}</p>
            </li>
          ))}
        </ol>

        <GalleryShowcase />

        <div className="mt-16">
          <GalleryPreview />
        </div>

        <div className="mb-7 mt-28 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Everything connected to the experiment</h2>
            <p className="mt-2 text-sm text-slate-400">A complete workspace for building, testing and sharing ideas.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <FeatureCard
            icon={<Zap className="h-5 w-5 text-indigo-400" />}
            title="AI-generated sims"
            desc="Ask in plain English. Get a playable simulation with sliders, animation, and live physics."
          />
          <FeatureCard
            icon={<Target className="h-5 w-5 text-purple-400" />}
            title="Challenge mode"
            desc="Every sim comes with a mission. Hit the goal and see how you did."
          />
          <FeatureCard
            icon={<BookOpen className="h-5 w-5 text-cyan-400" />}
            title="Socratic tutor"
            desc="Not just a visual. It asks questions, checks your answers, and explains why."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-cyan-400" />}
            title="Data, live"
            desc="Watch meaningful measurements and graphs respond as you change a parameter."
          />
          <FeatureCard
            icon={<ArrowRight className="h-5 w-5 text-purple-400" />}
            title="Modify and remix"
            desc="Describe a change in plain language and explore a new version of the experiment."
          />
          <FeatureCard
            icon={<Bot className="h-5 w-5 text-indigo-400" />}
            title="Discord bot"
            desc="Slash command inside your study server. Get a sim link instantly."
          />
          <FeatureCard
            icon={<Share2 className="h-5 w-5 text-purple-400" />}
            title="Shareable URLs"
            desc="Save a simulation to the gallery and share a link others can explore."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-cyan-400" />}
            title="Live measurements"
            desc="See the key values behind each experiment update as you adjust its parameters."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-32 text-center">
        <Card className="glass-strong relative overflow-hidden p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,.22),transparent_60%),radial-gradient(ellipse_at_90%_100%,rgba(47,123,255,.12),transparent_55%)]" />
          <h2 className="relative text-3xl font-semibold tracking-[-.03em] text-slate-100 md:text-4xl">
            Ready to build the future?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-slate-400">
            Describe a question you want to understand. SimForge will turn it into an experiment you can explore.
          </p>
          <Link href="/create" className={buttonStyles({ size: "lg", className: "group relative mt-8 rounded-full px-7" })}>
            Try it now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
    <Card className="group border-white/[.07] bg-white/[.02] p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300/25 sm:p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-transform group-hover:scale-110 sm:mb-4 sm:h-10 sm:w-10">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold leading-tight text-slate-100 sm:text-base">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-5 text-slate-400 sm:mt-2 sm:text-sm sm:leading-relaxed">{desc}</p>
    </Card>
  );
}
