import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Landing({ user, onLogin }: { user: any; onLogin: (id: string) => void }) {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    api.getPlatformInfo().then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Logged-in nav */}
      {user && (
        <div className="bg-white border-b border-stone-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg text-stone-800">
              <img src="/logo-small.png" alt="" className="w-8 h-8" />
              <span>Chop First</span>
            </div>
            <Link to="/dashboard" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-600 ring-2 ring-emerald-400/40 overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="Chop First" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-[64px] md:text-[80px] font-bold leading-none">
              <span className="text-white">Chop</span>{' '}
              <span className="text-emerald-200">First</span>
            </h1>
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            Eat Now. <span className="text-emerald-200">Pay with Dignity.</span>
          </h2>
            <p className="text-lg md:text-xl text-emerald-100 leading-relaxed mb-8 max-w-2xl">
              Chop First eliminates short-term food insecurity with a dignity-preserving micro-subsidy platform.
              When you can't afford a meal, we step in — no shame, no predatory interest, just a fair path forward.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-colors shadow-lg">
                  Go to Dashboard →
                </Link>
              ) : (
                <Link to="/login" className="px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-colors shadow-lg">
                  Try the Demo →
                </Link>
              )}
              <a href="#how" className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-medium text-lg hover:bg-emerald-500 transition-colors border border-emerald-400">
                How It Works
              </a>
            </div>
          </div>
        </div>
        {/* Stats bar */}
        {info && (
          <div className="border-t border-emerald-600 bg-emerald-900">
            <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{info.stats.totalMealsServed}</div>
                <div className="text-sm text-emerald-200">Meals Served</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{info.stats.activeMerchants}</div>
                <div className="text-sm text-emerald-200">Partner Merchants</div>
              </div>
              <div>
                <div className="text-2xl font-bold">₦{info.stats.totalSubsidyDispersed?.toLocaleString()}</div>
                <div className="text-sm text-emerald-200">Subsidy Dispersed</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Problem / Solution */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">The Problem</div>
              <h2 className="text-3xl font-bold mb-4">Food shouldn't be a luxury when money is tight.</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                Millions skip meals during financial shortfalls. Existing options — predatory loans, degrading charity, 
                or high-interest BNPL — punish people for being short. This destroys dignity and productivity.
              </p>
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="text-sm font-medium text-stone-500 mb-1">Average meal cost in Lagos today</div>
                <div className="text-3xl font-bold text-stone-800">₦2,500</div>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-200">
              <div className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Our Solution</div>
              <h2 className="text-3xl font-bold mb-4 text-emerald-800">"How much you get?"</h2>
              <p className="text-emerald-700 leading-relaxed mb-6">
                A simple, interactive checkout: you pay what you can afford today. We cover the rest instantly 
                and settle the merchant in full. No interest. No shame. Clear your balance with cash or community tasks.
              </p>
              <div className="space-y-4">
                {[
                  { icon: '🛡️', title: 'Merchants paid instantly', desc: '100% of meal cost remitted immediately. The user is a premium customer.' },
                  { icon: '⛔', title: 'No predatory interest', desc: 'Freeze guardrail blocks new orders, but no compounding fees or debt traps.' },
                  { icon: '🤝', title: 'Clear via tasks', desc: 'Can\'t pay cash? Complete local community tasks to clear your balance.' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3">
                    <div className="text-xl">{item.icon}</div>
                    <div>
                      <div className="font-semibold text-emerald-800">{item.title}</div>
                      <div className="text-sm text-emerald-600">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier System */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Progressive Trust Tiers</h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              Your subsidy power grows with every clean settlement cycle. The system rewards reliability.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Unverified', tier: 'UNVERIFIED', limit: '₦2,500', cap: '₦5,000', window: '7 days', cycles: '0–2', color: 'bg-stone-100 border-stone-300', textColor: 'text-stone-700', icon: '🌱' },
              { name: 'Verified', tier: 'VERIFIED', limit: '₦10,000', cap: '₦30,000', window: '14 days', cycles: '3–5', color: 'bg-emerald-50 border-emerald-300', textColor: 'text-emerald-700', icon: '⭐' },
              { name: 'Community', tier: 'COMMUNITY', limit: '₦25,000', cap: '₦150,000', window: '14 days', cycles: '6+', color: 'bg-amber-50 border-amber-300', textColor: 'text-amber-700', icon: '🏆' },
            ].map(t => (
              <div key={t.name} className={`rounded-2xl border-2 p-6 ${t.color}`}>
                <div className="text-3xl mb-3">{t.icon}</div>
                <h3 className={`text-xl font-bold mb-1 ${t.textColor}`}>{t.name}</h3>
                <div className="text-3xl font-bold text-stone-800 mb-4">{t.limit}</div>
                <div className="space-y-2 text-sm text-stone-600">
                  <div className="flex justify-between"><span>Settlement Window</span><span className="font-medium">{t.window}</span></div>
                  <div className="flex justify-between"><span>Clean Cycles Required</span><span className="font-medium">{t.cycles}</span></div>
                  <div className="flex justify-between"><span>Per-Order Subsidy</span><span className="font-medium">{t.limit}</span></div>
                  <div className="flex justify-between border-t border-stone-200 pt-2"><span>Total Credit Cap</span><span className="font-bold text-stone-800">{t.cap}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phased rollout */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Rollout Strategy</h2>
            <p className="text-stone-500 max-w-xl mx-auto">Three progressive phases from local to autonomous economy.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { phase: 'Phase 1', title: 'Local Micro-Subsidy', desc: 'Fiat-only sandbox with 3–5 vetted vendors on tech campuses. 7–14 day settlement windows.', tag: 'Current', color: 'bg-emerald-500' },
              { phase: 'Phase 2', title: 'Staple Supply Chain', desc: 'Expand into groceries and household sundries. Impact shifts from individuals to entire households.', tag: 'Next', color: 'bg-amber-500' },
              { phase: 'Phase 3', title: 'KINDRED Merger', desc: 'Autonomous decentralized gig platform. Clear debts via work, earn $KIND tokens, close the loop.', tag: 'Future', color: 'bg-purple-500' },
            ].map(p => (
              <div key={p.phase} className="border border-stone-200 rounded-2xl p-6 relative">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${p.color} mb-3`}>{p.tag}</span>
                <div className="text-sm font-bold text-emerald-600 mb-1">{p.phase}</div>
                <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to see it in action?</h2>
          <p className="text-emerald-100 mb-8 max-w-lg mx-auto">
            Explore the full prototype — experience the checkout flow, tier system, task marketplace, and management dashboards.
          </p>
          {user ? (
            <Link to="/dashboard" className="inline-flex items-center px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-colors shadow-lg">
              Go to Dashboard →
            </Link>
          ) : (
            <Link to="/login" className="inline-flex items-center px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-colors shadow-lg">
              Launch Demo →
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-stone-900 text-stone-400 text-sm text-center">
        <p className="mb-1">Chop First — A KINDRED Network Ecosystem by Hexadigitall Technologies</p>
        <p>Investor Prototype · © 2026</p>
      </footer>
    </div>
  );
}
