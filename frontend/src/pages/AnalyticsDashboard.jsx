import { useState, useEffect } from 'react';
import { getTriggerAnalytics, getSymptomAnalytics, getTreatmentAnalytics, getSeverityAnalytics, getAnalyticsOverview } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3, Activity, Pill, Flame, TrendingUp, Users, FileText, Loader, AlertTriangle } from 'lucide-react';

const COLORS = ['#2dd4bf', '#60a5fa', '#a78bfa', '#fb7185', '#f59e0b', '#34d399', '#818cf8', '#f472b6', '#38bdf8', '#c084fc'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-4 py-3 text-sm">
      <p className="text-white font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-dark-200">{p.name || 'Count'}: <span className="text-teal-400 font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm text-dark-300">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">
        {value !== undefined && value !== null ? value : (loading ? '...' : '—')}
      </p>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, loading }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-teal-400" />{title}
      </h3>
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader className="w-6 h-6 text-teal-400 animate-spin" /></div>
      ) : children}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [triggers, setTriggers] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [trigRes, symRes, treatRes, sevRes, ovRes] = await Promise.all([
        getTriggerAnalytics(),
        getSymptomAnalytics(),
        getTreatmentAnalytics(),
        getSeverityAnalytics(),
        getAnalyticsOverview(),
      ]);
      setTriggers(trigRes.data.triggers || []);
      setSymptoms(symRes.data.symptoms || []);
      setTreatments(treatRes.data.treatments || []);
      setSeverity(sevRes.data.severity || []);
      setOverview(ovRes.data);
      console.log('Analytics Overview:', ovRes.data);
    } catch (err) {
      console.error('Analytics Error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'triggers', label: 'Triggers', icon: Flame },
    { key: 'symptoms', label: 'Symptoms', icon: Activity },
    { key: 'treatments', label: 'Treatments', icon: Pill },
  ];

  const sevColors = { mild: '#2dd4bf', moderate: '#60a5fa', severe: '#a78bfa', 'very-severe': '#fb7185' };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Community Analytics</h1>
            <p className="text-sm text-dark-300">AI-powered insights from community data</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key ? 'bg-white/10 text-teal-400 border border-teal-400/30' : 'text-dark-300 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={FileText} 
              label="Total Posts" 
              value={overview?.totalPosts} 
              color="bg-gradient-to-br from-teal-500 to-teal-600" 
              delay={0}
              loading={loading}
            />
            <StatCard 
              icon={Users} 
              label="Total Users" 
              value={overview?.totalUsers} 
              color="bg-gradient-to-br from-primary-500 to-primary-600" 
              delay={100}
              loading={loading}
            />
            <StatCard 
              icon={Activity} 
              label="Avg Severity" 
              value={overview?.avgSeverity} 
              color="bg-gradient-to-br from-accent-500 to-accent-600" 
              delay={200}
              loading={loading}
            />
            <StatCard 
              icon={TrendingUp} 
              label="This Month" 
              value={overview?.postsThisMonth} 
              color="bg-gradient-to-br from-rose-500 to-rose-600" 
              delay={300}
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Severity Distribution" icon={Activity} loading={loading}>
              {severity.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={severity.map(s => ({ name: s._id, value: s.count }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {severity.map((s, i) => <Cell key={s._id} fill={sevColors[s._id] || COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-dark-500 py-12">No data yet</p>}
            </ChartCard>

            <ChartCard title="Top Triggers" icon={Flame} loading={loading}>
              {triggers.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={triggers.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#5a5a8f" fontSize={12} />
                    <YAxis type="category" dataKey="_id" stroke="#5a5a8f" fontSize={12} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#2dd4bf" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-dark-500 py-12">No data yet</p>}
            </ChartCard>
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Outcome-Based Insights</h3>
            <div className="space-y-2 text-sm text-dark-200">
              {overview?.treatmentOutcomeInsights?.slice(0, 3).map((item) => (
                <p key={item._id}>
                  {item.improvedRate}% users saw improvement with <span className="text-teal-400 font-semibold">{item._id}</span>
                </p>
              ))}
              {overview?.topTrigger?._id && (
                <p>
                  <span className="text-primary-400 font-semibold">{overview.topTrigger._id}</span> is the most common trigger.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Triggers Tab */}
      {activeTab === 'triggers' && (
        <ChartCard title="All Triggers" icon={Flame} loading={loading}>
          {triggers.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={triggers} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="_id" stroke="#5a5a8f" fontSize={12} angle={-45} textAnchor="end" />
                <YAxis stroke="#5a5a8f" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]}>
                  {triggers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-dark-500 py-12">No trigger data available</p>}
        </ChartCard>
      )}

      {/* Symptoms Tab */}
      {activeTab === 'symptoms' && (
        <ChartCard title="Reported Symptoms" icon={Activity} loading={loading}>
          {symptoms.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={symptoms.slice(0, 10).map(s => ({ subject: s._id, count: s.count }))}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" stroke="#8888b3" fontSize={12} />
                <PolarRadiusAxis stroke="#5a5a8f" fontSize={10} />
                <Radar name="Reports" dataKey="count" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-dark-500 py-12">No symptom data available</p>}
        </ChartCard>
      )}

      {/* Treatments Tab */}
      {activeTab === 'treatments' && (
        <ChartCard title="Treatment Usage" icon={Pill} loading={loading}>
          {treatments.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={treatments} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="_id" stroke="#5a5a8f" fontSize={12} angle={-45} textAnchor="end" />
                <YAxis stroke="#5a5a8f" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#60a5fa" radius={[6, 6, 0, 0]}>
                  {treatments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-dark-500 py-12">No treatment data available</p>}
        </ChartCard>
      )}
    </div>
  );
}
