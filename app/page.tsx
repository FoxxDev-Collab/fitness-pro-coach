import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Dumbbell,
  LineChart,
  Users,
  ClipboardList,
  Shield,
  Zap,
  Check,
} from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") redirect("/admin/dashboard");
    if (session.user.role === "CLIENT") redirect("/dashboard");
    redirect("/clients");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <LogoBar />
        <Features />
        <Workflow />
        <Stats />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <span className="inline-flex size-7 items-center justify-center bg-primary text-primary-foreground">
        <Dumbbell className="size-4" />
      </span>
      <span className="text-lg">Praevio</span>
    </Link>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#workflow" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">
              Get started
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-secondary text-secondary-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 border border-border/30 bg-background/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Built for elite coaches
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Lead every athlete
            <br />
            <span className="text-primary">like they&apos;re your only one.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Praevio is the coaching platform for trainers who run real programs.
            Build workouts, assign them to clients and teams, and watch every set, rep, and
            personal record roll in.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Start coaching free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-border/40 bg-transparent text-secondary-foreground hover:bg-background/10 hover:text-secondary-foreground sm:w-auto"
            >
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required. Bring your first 3 athletes free.
          </p>
        </div>
      </div>
    </section>
  );
}

function LogoBar() {
  const items = [
    "Strength & Conditioning",
    "CrossFit Boxes",
    "Sports Performance",
    "Online Coaches",
    "Hybrid Athletes",
  ];
  return (
    <section className="border-b border-border/60 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by coaches who train
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground/80">
          {items.map((label) => (
            <li key={label} className="tracking-tight">
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Dumbbell,
      title: "Program builder",
      copy: "Compose workouts from a reusable exercise library. Reorder, supersets, conditioning blocks — it all lives in one program.",
    },
    {
      icon: Users,
      title: "Clients & teams",
      copy: "Manage one-on-one athletes or whole rosters. Assign a program once and every client gets their own snapshot.",
    },
    {
      icon: ClipboardList,
      title: "Live sessions",
      copy: "Athletes log sets, reps, and weight in real time. Coaches see the work as it happens — not a week later.",
    },
    {
      icon: LineChart,
      title: "Progress that proves it",
      copy: "PRs, volume trends, and measurements roll up automatically. Show clients exactly how far they&rsquo;ve come.",
    },
    {
      icon: Shield,
      title: "Built-in intake",
      copy: "Custom intake forms with your branded URL. Health screening, goals, and waivers signed before day one.",
    },
    {
      icon: Zap,
      title: "Fast by default",
      copy: "Built on a modern stack so the app stays out of your way — on the gym floor or in the office.",
    },
  ];
  return (
    <section id="features" className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Everything you need
          </p>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            One platform from intake to PR.
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Stop stitching together spreadsheets, group chats, and PDF programs.
            Praevio runs the whole loop.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="group bg-background p-6 transition-colors hover:bg-card">
              <div className="inline-flex size-10 items-center justify-center bg-primary/15 text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: copy }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    {
      n: "01",
      title: "Build the program",
      copy: "Drag exercises into workouts. Set targets for weight, reps, RPE, or time. Save once, reuse forever.",
    },
    {
      n: "02",
      title: "Assign to athletes",
      copy: "Send a program to one client or an entire team. Each athlete gets their own copy you can tune.",
    },
    {
      n: "03",
      title: "They train. You coach.",
      copy: "Athletes log live from their phone. You see progress, leave notes, adjust the next block accordingly.",
    },
  ];
  return (
    <section id="workflow" className="border-b border-border/60 bg-card py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Three steps. One coaching loop.
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            Praevio mirrors the way you already coach — you just stop losing the data
            between conversations.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map(({ n, title, copy }) => (
            <li
              key={n}
              className="relative border border-border bg-background p-6 transition-shadow hover:shadow-md"
            >
              <span className="font-mono text-xs tracking-widest text-primary">{n}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { v: "5 min", label: "From signup to your first program" },
    { v: "Unlimited", label: "Exercises, programs, and workouts" },
    { v: "Real-time", label: "Set-by-set logging from any phone" },
    { v: "1 source", label: "Of truth for every athlete you train" },
  ];
  return (
    <section className="border-b border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border lg:grid-cols-4">
          {stats.map(({ v, label }) => (
            <div key={label} className="bg-background p-6 sm:p-8">
              <dt className="text-3xl font-semibold tracking-tight sm:text-4xl">{v}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Pricing() {
  const features = [
    "Unlimited programs & workouts",
    "Up to 3 active athletes",
    "Live session logging",
    "Custom intake form",
    "Progress reports & PRs",
  ];
  return (
    <section id="pricing" className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Pricing
        </p>
        <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Start free. Scale when you do.
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          Get the full coaching workflow with your first three athletes — on us. Add more
          when your roster grows.
        </p>

        <div className="mx-auto mt-12 max-w-md border border-border bg-card p-8 text-left shadow-md">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-semibold tracking-tight">Coach</h3>
            <span className="inline-flex items-center bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
              Free to start
            </span>
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight">$0</span>
            <span className="text-sm text-muted-foreground">/ first 3 athletes</span>
          </div>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/signup">
              Create your account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <ul className="mt-6 space-y-3 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-b border-border/60 bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-24 lg:flex-row lg:justify-between lg:text-left">
        <div className="max-w-2xl">
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Lead the way.
          </h2>
          <p className="mt-3 text-pretty text-lg text-muted-foreground">
            Bring your first athletes onto Praevio today and see how much better the
            coaching loop runs when nothing slips through.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-border/40 bg-transparent text-secondary-foreground hover:bg-background/10 hover:text-secondary-foreground"
          >
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Wordmark />
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Praevio. Lead the way.
        </p>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-foreground transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
