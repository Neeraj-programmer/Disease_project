import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, updateProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { User, Mail, Calendar, Shield, Edit3, Save, X, Sparkles, Stethoscope, Pill, Flame, Loader, MapPin, FileText, Heart, Activity } from 'lucide-react';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', skinCondition: '', conditionDetails: '', triggers: '', treatments: '' });

  const isOwn = currentUser?._id === id;

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getUserProfile(id);
      setProfile(res.data.user);
      setPosts(res.data.posts || []);
      if (res.data.user) {
        setForm({
          name: res.data.user.name || '',
          bio: res.data.user.bio || '',
          skinCondition: res.data.user.skinCondition || '',
          conditionDetails: res.data.user.conditionDetails || '',
          triggers: (res.data.user.triggers || []).join(', '),
          treatments: (res.data.user.treatments || []).join(', '),
        });
      }
    } catch {}
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name,
        bio: form.bio,
        skinCondition: form.skinCondition,
        conditionDetails: form.conditionDetails,
        triggers: form.triggers.split(',').map(s => s.trim()).filter(Boolean),
        treatments: form.treatments.split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await updateProfile(data);
      setProfile(res.data.user);
      updateUser(res.data.user);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="skeleton h-48 rounded-2xl" />
      {[1,2].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
  );

  if (!profile) return <div className="text-center py-20 text-dark-400">User not found</div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up pb-12">
      {/* Profile Header & Banner */}
      <div className="relative mb-20">
        {/* Banner */}
        <div className="h-48 sm:h-64 w-full rounded-3xl bg-gradient-to-r from-primary-600 via-accent-600 to-teal-500 overflow-hidden relative shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl" />
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute -bottom-16 left-6 right-6 flex flex-col sm:flex-row items-end gap-6 px-4">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-slate-900 p-1 shadow-2xl overflow-hidden">
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/10 relative">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div className="flex flex-col items-center">
                    <User className="w-12 h-12 sm:w-16 sm:h-16 text-teal-400 mb-1" />
                    <span className="text-[10px] font-bold text-teal-500/50 uppercase tracking-widest">Profile</span>
                  </div>
                )}
                {profile.isVerified && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg" title="Verified Expert">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Name & Actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="text-left">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">{profile.name}</h1>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                  profile.trustLevel === 'expert' ? 'bg-amber-500 text-white shadow-glow-amber' :
                  profile.trustLevel === 'trusted' ? 'bg-teal-500 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {profile.trustLevel || 'Member'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-dark-300 font-medium text-sm">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                {profile.skinCondition && <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5 text-teal-400" /> {profile.skinCondition}</span>}
              </div>
            </div>

            {isOwn && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="btn-glass px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-xl">
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & About */}
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="glass rounded-3xl p-6 grid grid-cols-2 gap-4 border border-white/5 shadow-xl">
            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-white">{posts.length}</p>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest mt-1">Experiences</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-teal-400">{profile.reputationPoints ?? 0}</p>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest mt-1">Reputation</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-rose-400">{profile.postsHelpful ?? 0}</p>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest mt-1">Helpful</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-primary-400">{profile.warningCount ?? 0}</p>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest mt-1">Warns</p>
            </div>
          </div>

          {/* About Section */}
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-400" /> About
            </h3>
            {editing ? (
              <div className="space-y-4">
                <textarea 
                  value={form.bio} 
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  className="input-dark w-full text-sm min-h-[100px]" 
                  placeholder="Tell your story..." 
                />
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Skin Condition</label>
                   <input type="text" value={form.skinCondition} onChange={e => setForm({ ...form, skinCondition: e.target.value })} className="input-dark w-full text-sm" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    {saving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost py-2 px-4 rounded-xl text-xs font-bold">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-dark-200 text-sm leading-relaxed">
                  {profile.bio || "No bio added yet. Share a bit about your journey to help others connect with you."}
                </p>
                
                {profile.conditionDetails && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">Diagnosis Notes</p>
                    <p className="text-xs text-dark-300 italic">"{profile.conditionDetails}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Experience & Tags */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Profile Card */}
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="w-8 h-8 text-teal-500/10" />
            </div>
            
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" /> Health Profile
            </h3>

            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Triggers (comma separated)</label>
                  <input type="text" value={form.triggers} onChange={e => setForm({ ...form, triggers: e.target.value })} className="input-dark w-full text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Treatments (comma separated)</label>
                  <input type="text" value={form.treatments} onChange={e => setForm({ ...form, treatments: e.target.value })} className="input-dark w-full text-sm" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Detailed Context</label>
                  <textarea value={form.conditionDetails} onChange={e => setForm({ ...form, conditionDetails: e.target.value })} className="input-dark w-full text-sm min-h-[80px]" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-black text-accent-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Flame className="w-3 h-3" /> Identified Triggers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.triggers?.length > 0 ? profile.triggers.map(t => (
                      <span key={t} className="px-3 py-1 rounded-lg bg-accent-500/10 text-accent-400 text-xs font-bold border border-accent-500/20">{t}</span>
                    )) : <span className="text-xs text-dark-500 italic">No triggers identified</span>}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Pill className="w-3 h-3" /> Current Regimen
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.treatments?.length > 0 ? profile.treatments.map(t => (
                      <span key={t} className="px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20">{t}</span>
                    )) : <span className="text-xs text-dark-500 italic">No treatments listed</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Posts Section within Right Column */}
          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-white">Shared Experiences</h2>
              <span className="text-sm text-dark-400">({posts.length})</span>
            </div>

            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map(post => <PostCard key={post._id} post={post} />)}
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <Sparkles className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">No experiences shared yet</p>
                {isOwn && (
                  <Link to="/create" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
                    Share your first experience
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
