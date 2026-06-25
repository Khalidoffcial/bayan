const FEATURES = [
  { icon: "🧠", title: "AI Writing Assistant",    desc: "Get real-time suggestions, rewrites, and idea expansion as you write." },
  { icon: "📝", title: "AI Article Summaries",    desc: "Instantly summarize long-form content into key insights." },
  { icon: "📊", title: "Advanced Analytics",      desc: "Deep engagement metrics, reader demographics, and growth trends." },
  { icon: "∞",  title: "Unlimited Spaces",        desc: "Create and manage as many Spaces as your thinking requires." },
  { icon: "🎨", title: "Custom Space Themes",     desc: "Full design control over your Space's look and feel." },
  { icon: "💰", title: "Monetization Tools",      desc: "Charge for access to your Spaces with Stripe-powered payments." },
];

const PLANS = [
  { id: "explorer", name: "Explorer", price: "$0",   period: "forever",    current: true },
  { id: "thinker",  name: "Thinker",  price: "$12",  period: "per month",  current: false },
  { id: "builder",  name: "Builder",  price: "$39",  period: "per month",  current: false },
];

export default function PremiumSettings() {
  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Premium</h1>
        <p className="section-subtitle">Unlock AI tools, advanced analytics, and creator monetization</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Current Plan</div>
        <div className="plan-current">
          <div>
            <div className="plan-name-badge">⚡ Explorer — Free</div>
            <div className="plan-label">Your current plan · Renews never</div>
          </div>
          <button className="btn btn-outline btn-sm">Manage billing</button>
        </div>
        <p style={{ fontSize:13, color:"var(--text2)", marginBottom:16 }}>Upgrade to unlock the full Bayan experience.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12,direction: "ltr",width:"100%" }} className="plans-grid">
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              padding:"18px 16px", borderRadius:"var(--radius-md)",
              border: plan.id === "thinker" ? "1px solid var(--gold)" : "0.5px solid var(--border)",
              background: plan.id === "thinker" ? "var(--gold-dim)" : "var(--card-bg)",
              textAlign:"center", position:"relative"
            }}>
              {plan.id === "thinker" && (
                <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"var(--gold)", color:"#0C0D10", fontSize:9, fontWeight:700, padding:"2px 10px", borderRadius:20, letterSpacing:"0.5px", whiteSpace:"nowrap" }}>MOST POPULAR</div>
              )}
              <div style={{ fontSize:15, fontWeight:500, color:"var(--text)", marginBottom:4 }}>{plan.name}</div>
              <div style={{ fontSize:26, fontWeight:300, letterSpacing:"-1px", color:"var(--text)" }}>{plan.price}</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:12 }}>{plan.period}</div>
              {plan.current ? (
                <div style={{ fontSize:11, color:"var(--teal)" }}>✓ Current plan</div>
              ) : (
                <button className={`btn btn-sm btn-full ${plan.id === "thinker" ? "btn-primary" : "btn-outline"}`}>
                  Upgrade
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Premium Features</div>
        <div className="feature-list">
          {FEATURES.map(f => (
            <div className="feature-item" key={f.title}>
              <span style={{ fontSize:18, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight:500, color:"var(--text)", fontSize:14, marginBottom:2 }}>{f.title}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
