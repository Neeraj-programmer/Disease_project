import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, updateProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { User, Mail, Calendar, Shield, Edit3, Save, X, Sparkles, Stethoscope, Pill, Flame, Loader, MapPin, FileText, Heart } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* Profile Header */}
      <div className="glass rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-400/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent-400/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-400 via-primary-500 to-accent-500 flex items-center justify-center glow-teal">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-dark text-lg font-bold" placeholder="Your name" />
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  className="input-dark resize-y" placeholder="Tell others about yourself..." rows={2} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={form.skinCondition} onChange={e => setForm({ ...form, skinCondition: e.target.value })}
                    className="input-dark" placeholder="Skin condition" />
                  <input type="text" value={form.conditionDetails} onChange={e => setForm({ ...form, conditionDetails: e.target.value })}
                    className="input-dark" placeholder="Condition details" />
                  <input type="text" value={form.triggers} onChange={e => setForm({ ...form, triggers: e.target.value })}
                    className="input-dark" placeholder="Triggers (comma separated)" />
                  <input type="text" value={form.treatments} onChange={e => setForm({ ...form, treatments: e.target.value })}
                    className="input-dark" placeholder="Treatments (comma separated)" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-2 text-sm">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                    {profile.bio && <p className="text-dark-300 mt-1">{profile.bio}</p>}
                  </div>
                  {isOwn && (
                    <button onClick={() => setEditing(true)} className="btn-ghost flex items-center gap-2 text-sm" id="profile-edit">
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.skinCondition && (
                    <span className="tag tag-teal"><Stethoscope className="w-3 h-3" />{profile.skinCondition}</span>
                  )}
                  {profile.diagnosedYear && (
                    <span className="tag tag-primary"><Calendar className="w-3 h-3" />Since {profile.diagnosedYear}</span>
                  )}
                  <span className="tag tag-accent"><FileText className="w-3 h-3" />{posts.length} posts</span>
                  <span className="tag tag-primary"><Calendar className="w-3 h-3" />Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  {profile.isVerified && <span className="tag tag-teal"><Shield className="w-3 h-3" />Verified User</span>}
                  <span className="tag tag-primary">Trust: {profile.trustLevel || 'new'}</span>
                  <span className="tag tag-accent">Points: {profile.reputationPoints ?? 0}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Triggers & Treatments */}
        {!editing && (profile.triggers?.length > 0 || profile.treatments?.length > 0) && (
          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.triggers?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-2"><Flame className="w-4 h-4 text-accent-400" />Known Triggers</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.triggers.map(t => <span key={t} className="tag tag-accent">{t}</span>)}
                </div>
              </div>
            )}
            {profile.treatments?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-2"><Pill className="w-4 h-4 text-teal-400" />Current Treatments</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.treatments.map(t => <span key={t} className="tag tag-teal">{t}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {profile.conditionDetails && !editing && (
          <div className="mt-4 glass rounded-xl p-4">
            <p className="text-sm text-dark-300 font-medium mb-1">Condition Details</p>
            <p className="text-sm text-dark-200">{profile.conditionDetails}</p>
          </div>
        )}
      </div>

      {/* Posts */}
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
  );
}
