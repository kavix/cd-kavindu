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
        <div className="min-h-screen bg-white text-slate-900">
          <div className="relative overflow-hidden">
            <div className="relative z-10">
              <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">EM</span>
                  </div>
                  <span className="text-slate-900 font-medium tracking-tight text-sm">Energy Monitor</span>
                </div>
                <nav className="hidden md:flex items-center gap-8 text-sm font-normal text-slate-600">
                  <a href="#features" className="transition hover:text-slate-900">Features</a>
                  <a href="#insights" className="transition hover:text-slate-900">Insights</a>
                  <a href="#cta" className="transition hover:text-slate-900">Get Started</a>
                </nav>
                <Link
                  href="/login"
                  className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Login
                </Link>
              </header>

              <main className="max-w-7xl mx-auto px-6 pb-20">
                <section className="grid lg:grid-cols-2 gap-16 items-center pt-20 pb-24">
                  <div className="max-w-2xl">
                    <h1 className="text-6xl sm:text-7xl font-semibold leading-[1.05] tracking-tight text-slate-900">
                      Illuminate your energy story.
                    </h1>
                    <p className="mt-6 text-xl text-slate-600 leading-relaxed">
                      Monitor your home&apos;s energy with live insights and intelligent automation. Make confident decisions, reduce costs, and create a greener future.
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4">
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3.5 text-base font-medium text-white transition hover:bg-blue-600"
                      >
                        Get started
                      </Link>
                      <a
                        href="#insights"
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-3.5 text-base font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Learn more
                      </a>
                    </div>
                    <div className="mt-16 grid gap-8 sm:grid-cols-3">
                      {highlights.map((item) => (
                        <div key={item.label}>
                          <p className="text-4xl font-semibold text-slate-900">{item.value}</p>
                          <p className="mt-2 text-sm text-slate-600 leading-snug">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 shadow-xl">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Overview</p>
                      <h2 className="mt-4 text-2xl font-semibold text-slate-900">Today&apos;s energy pulse</h2>
                      <div className="mt-10 space-y-8">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Current load</span>
                          <span className="text-2xl font-semibold text-slate-900">2.5 kW</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Projected spend</span>
                          <span className="text-2xl font-semibold text-slate-900">$68.40</span>
                        </div>
                      </div>
                      <div className="mt-10 rounded-2xl bg-blue-50 p-6">
                        <p className="text-sm text-slate-600">Alerts enabled</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">Peak surge protection active</p>
                        <p className="mt-2 text-sm text-slate-600">We&apos;ll notify you if your load climbs above the configured threshold.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </main>
            </div>
          </div>

          <section id="features" className="bg-slate-50 py-24">
            <div className="max-w-7xl mx-auto px-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-900">Designed to make mindful energy effortless.</h2>
                <p className="mt-5 text-xl text-slate-600">
                  From live dashboards to automated routines, every detail helps you understand and adapt your consumption without friction.
                </p>
              </div>
              <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-2xl bg-white border border-slate-200 p-8 transition hover:shadow-lg">
                    <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-4 text-base leading-relaxed text-slate-600">{feature.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="insights" className="bg-white py-24">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-16">
                <div className="lg:max-w-xl">
                  <h2 className="text-4xl font-semibold text-slate-900">See the flow, stay in control.</h2>
                  <p className="mt-5 text-xl text-slate-600">
                    Drill into daily, weekly, and seasonal patterns with visual storytelling that highlights what to tweak and when to act.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-base font-medium text-white transition hover:bg-slate-800"
                >
                  Explore dashboard
                </Link>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-white border border-slate-200 p-10">
                  <h3 className="text-2xl font-semibold text-slate-900">Consumption forecast</h3>
                  <p className="mt-4 text-base text-slate-600">
                    Anticipate the week ahead with adaptive projections that adjust to weather, occupancy, and renewable production forecasts.
                  </p>
                  <ul className="mt-8 space-y-4 text-base text-slate-700">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Daily outlook with confidence intervals
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Personalized energy-saving playbooks
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Export-ready reports for rebates & audits
                    </li>
                  </ul>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-green-50 to-white border border-slate-200 p-10">
                  <h3 className="text-2xl font-semibold text-slate-900">Wellness & comfort balance</h3>
                  <p className="mt-4 text-base text-slate-600">
                    Align comfort targets with eco-friendly goals using insights that highlight when climate control and appliance schedules are in sync with your lifestyle.
                  </p>
                  <ul className="mt-8 space-y-4 text-base text-slate-700">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Recommendations tuned to your preferences
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Integrations with leading smart-home ecosystems
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Instant alerts if comfort thresholds are at risk
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="cta" className="bg-slate-50 py-24">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-4xl font-semibold text-slate-900">Ready to see your home&apos;s full energy potential?</h2>
              <p className="mt-6 text-xl text-slate-600">
                Join thousands of households who trust Energy Monitor to reveal actionable insights, prevent costly surprises, and stay ahead of peak rates.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-base font-medium text-white transition hover:bg-slate-800"
                >
                  Log in and personalize your home
                </Link>
                <a
                  href="mailto:hello@energymonitor.app"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-3.5 text-base font-medium text-slate-900 transition hover:border-slate-300 hover:bg-white"
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
