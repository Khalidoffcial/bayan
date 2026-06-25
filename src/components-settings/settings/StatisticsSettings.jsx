const TOP_STATS = [
  { label: "Total Posts",    value: "142",   change: "+12 this month", color: "var(--gold)" },
  { label: "Articles",       value: "38",    change: "+4 this month",  color: "var(--teal)" },
  { label: "Ideas",          value: "76",    change: "+8 this month",  color: "var(--purple)" },
  { label: "Total Views",    value: "24.3K", change: "+18%",           color: "var(--gold)" },
  { label: "Followers",      value: "412",   change: "+34 this week",  color: "var(--teal)" },
  { label: "Avg Read Time",  value: "4.2m",  change: "per article",    color: "var(--purple)" },
  { label: "Reading Hours",  value: "67h",   change: "this month",     color: "var(--gold)" },
  { label: "Engagement Rate",value: "8.4%",  change: "↑ above avg",   color: "var(--teal)" },
];

const WEEKLY = [42, 68, 35, 90, 55, 78, 61];
const MONTHLY = [30, 42, 38, 60, 52, 71, 65, 80, 74, 88, 82, 95];
const DAYS = ["M","T","W","T","F","S","S"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BarChart = ({ data, labels, color = "var(--gold)", height = 80 }) => {
  const max = Math.max(...data);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height, marginTop:12 ,direction: "ltr",width:"100%"}}>
      {data.map((val, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{
            width:"100%", height: Math.round((val / max) * height * 0.85),
            background: i === data.indexOf(Math.max(...data)) ? color : "var(--surface)",
            borderRadius:"3px 3px 0 0", transition:"background 0.2s",
            cursor:"default"
          }}
            onMouseEnter={e => e.currentTarget.style.background = color}
            onMouseLeave={(e, idx = i) => e.currentTarget.style.background = idx === data.indexOf(Math.max(...data)) ? color : "var(--surface)"}
          />
          <span style={{ fontSize:9, color:"var(--text3)" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

export default function StatisticsSettings() {
  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Statistics</h1>
        <p className="section-subtitle">Your Bayan Space activity and growth at a glance</p>
      </div>

      <div className="settings-card">
        <div className="card-title"><span className="card-title-icon">◈</span> Overview</div>
        <div className="stats-grid">
          {TOP_STATS.map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-change">{s.change}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-card-title">Weekly Views</div>
          <div className="chart-card-sub">Last 7 days</div>
          <BarChart data={WEEKLY} labels={DAYS} color="var(--gold)" height={80} />
        </div>
        <div className="chart-card">
          <div className="chart-card-title">Monthly Growth</div>
          <div className="chart-card-sub">Views this year</div>
          <BarChart data={MONTHLY} labels={MONTHS} color="var(--teal)" height={80} />
        </div>
      </div>

      <div className="settings-card" style={{ marginTop:12 }}>
        <div className="card-title"><span className="card-title-icon">◈</span> Reading Activity</div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16,direction: "ltr" ,width:"100%"}}>
          {[
            { label:"Streak", value:"12 days", icon:"🔥" },
            { label:"This week", value:"3h 22m", icon:"📖" },
            { label:"All time", value:"67h 14m", icon:"⏱" },
          ].map(item => (
            <div key={item.label} style={{ textAlign:"center", flex:1 ,direction: "ltr"}}>
              <div style={{ fontSize:22, marginBottom:4 }}>{item.icon}</div>
              <div style={{ fontSize:16, fontWeight:600, color:"var(--text)" }}>{item.value}</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>{item.label}</div>
            </div>
          ))}
        </div>
        <BarChart data={[40, 55, 30, 70, 45, 80, 60]} labels={DAYS} color="var(--purple)" height={60} />
      </div>


    </div>
  );
}
