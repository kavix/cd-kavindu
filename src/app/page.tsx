import Link from 'next/link';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

const highlights = [
  {
    value: '12%',
    label: 'Average monthly savings when households act on alerts.',
  },
  {
    value: '4.8 ★',
    label: 'Homeowners rate our insights for clarity and reliability.',
  },
  {
    value: '24/7',
    label: 'Real-time monitoring with proactive notification coverage.',
  },
];

const features = [
  {
    title: 'Real-time analytics',
    copy: 'Stream live consumption, generation, and cost metrics with second-by-second precision.',
  },
  {
    title: 'Smart automations',
    copy: 'Trigger routines that balance comfort and efficiency based on your usage patterns.',
  },
  {
    title: 'Forecasting & goals',
    copy: 'Predict upcoming bills, compare to historical trends, and stay on track with energy goals.',
  },
];

export default function Home() {
  return (
    <>
      <SignedIn>
        <RedirectToSignIn redirectUrl="/dashboard" />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%)]" />
            <div className="relative z-10">
              <header className="max-w-6xl mx-auto px-6 pt-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 font-semibold">EM</span>
                  <p className="text-slate-200 font-semibold tracking-wide uppercase text-xs">Energy Monitor</p>
                </div>
                <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
                  <a href="#features" className="hover:text-white transition">Features</a>
                  <a href="#insights" className="hover:text-white transition">Insights</a>
                  <a href="#cta" className="hover:text-white transition">Get Started</a>
                </nav>
                <Link
                  href="/login"
                  className="rounded-full bg-white text-slate-900 px-5 py-2 text-sm font-semibold shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Login
                </Link>
              </header>

              <main className="max-w-6xl mx-auto px-6 pb-20">
                <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center pt-16">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                      Smarter homes, greener future
                    </span>
                    <h1 className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight text-white">
                      Illuminate your energy story with live insights and intelligent automation.
                    </h1>
                    <p className="mt-6 text-lg text-slate-300">
                      Energy Monitor keeps every circuit in check with actionable analytics, adaptive alerts, and tailored recommendations that help you make confident energy choices—day or night.
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4">
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-full bg-sky-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/40 transition hover:bg-sky-400 hover:-translate-y-0.5"
                      >
                        Sign in to your dashboard
                      </Link>
                      <a
                        href="#insights"
                        className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-base font-semibold text-slate-100 transition hover:border-white/40"
                      >
                        Preview live insights
                      </a>
                    </div>
                    <div className="mt-12 grid gap-6 sm:grid-cols-3">
                      {highlights.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                          <p className="text-3xl font-semibold text-white">{item.value}</p>
                          <p className="mt-3 text-sm text-slate-300">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-sky-500/30 via-slate-800/30 to-transparent blur" />
                    <div className="relative rounded-3xl bg-slate-900/80 p-8 backdrop-blur-xl border border-white/10 shadow-2xl shadow-sky-500/20">
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Live Overview</p>
                      <h2 className="mt-4 text-2xl font-semibold text-white">Today&apos;s energy pulse</h2>
                      <div className="mt-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Current load</span>
                          <span className="text-xl font-semibold text-white">2.5 kW</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Projected spend</span>
                          <span className="text-xl font-semibold text-white">$68.40</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Solar offset</span>
                          <span className="text-xl font-semibold text-emerald-400">37%</span>
                        </div>
                      </div>
                      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                        <p className="text-sm text-slate-300">Alerts enabled</p>
                        <p className="mt-3 text-lg font-semibold text-white">Peak surge protection active</p>
                        <p className="mt-2 text-xs text-slate-400">We&apos;ll notify you if your load climbs above the configured threshold.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </main>
            </div>
          </div>

          <section id="features" className="bg-white text-slate-900 py-20">
            <div className="max-w-6xl mx-auto px-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight">Designed to make mindful energy effortless.</h2>
                <p className="mt-4 text-slate-600">
                  From live dashboards to automated routines, every detail helps you understand and adapt your consumption without friction.
                </p>
              </div>
              <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm hover:shadow-md transition">
                    <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="insights" className="bg-slate-950 text-slate-100 py-20">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="lg:max-w-xl">
                  <h2 className="text-3xl font-semibold text-white">See the flow, stay in control.</h2>
                  <p className="mt-4 text-slate-300">
                    Drill into daily, weekly, and seasonal patterns with visual storytelling that highlights what to tweak and when to act.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-slate-50 transition hover:border-sky-300 hover:text-sky-300"
                >
                  Explore the live dashboard
                </Link>
              </div>
              <div className="mt-12 grid gap-8 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-sky-500/10 p-8">
                  <h3 className="text-xl font-semibold">Consumption forecast</h3>
                  <p className="mt-3 text-sm text-slate-300">
                    Anticipate the week ahead with adaptive projections that adjust to weather, occupancy, and renewable production forecasts.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li>• Daily outlook with confidence intervals</li>
                    <li>• Personalized energy-saving playbooks</li>
                    <li>• Export-ready reports for rebates & audits</li>
                  </ul>
                </div>
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-emerald-500/10 p-8">
                  <h3 className="text-xl font-semibold">Wellness & comfort balance</h3>
                  <p className="mt-3 text-sm text-slate-300">
                    Align comfort targets with eco-friendly goals using insights that highlight when climate control and appliance schedules are in sync with your lifestyle.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li>• Recommendations tuned to your preferences</li>
                    <li>• Integrations with leading smart-home ecosystems</li>
                    <li>• Instant alerts if comfort thresholds are at risk</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="cta" className="bg-white py-20">
            <div className="max-w-5xl mx-auto px-6 text-center">
              <h2 className="text-3xl font-semibold text-slate-900">Ready to see your home&apos;s full energy potential?</h2>
              <p className="mt-4 text-slate-600">
                Join thousands of households who trust Energy Monitor to reveal actionable insights, prevent costly surprises, and stay ahead of peak rates.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                >
                  Log in and personalize your home
                </Link>
                <a
                  href="mailto:hello@energymonitor.app"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-3 text-base font-semibold text-slate-900 transition hover:border-slate-400"
                >
                  Talk with our energy experts
                </a>
              </div>
            </div>
          </section>
        </div>
      </SignedOut>
    </>
  );
}
