import { useEffect, useState } from 'react';
import {
  getFlaggedPosts,
  reviewModerationPost,
  getUserTrustScores,
  toggleBanUser,
} from '../services/api';

export default function AdminModeration() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postRes, userRes] = await Promise.all([getFlaggedPosts(), getUserTrustScores()]);
      setPosts(postRes.data.posts || []);
      setUsers(userRes.data.users || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin moderation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const moderatePost = async (postId, action) => {
    await reviewModerationPost(postId, { action });
    fetchData();
  };

  const banToggle = async (userId, isBanned) => {
    await toggleBanUser(userId, { ban: !isBanned, reason: 'Suspicious activity' });
    fetchData();
  };

  if (loading) return <div className="text-dark-300">Loading moderation dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="card-32 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Moderation Panel</h1>
        <p className="text-sm text-slate-600 mt-2">Review flagged posts, trust scores, and suspicious users.</p>
        {error && <p className="text-rose-600 mt-2 text-sm">{error}</p>}
      </div>

      <div className="card-32 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Flagged Posts</h2>
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post._id} className="rounded-2xl border border-slate-200 p-4 bg-white">
              <p className="font-semibold text-slate-900">{post.title}</p>
              <p className="text-sm text-slate-600">Status: {post.moderationStatus} | Reports: {post.reportCount}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary-lite" onClick={() => moderatePost(post._id, 'approve')}>Approve</button>
                <button className="btn-info-lite" onClick={() => moderatePost(post._id, 'hide')}>Hide</button>
                <button className="btn-danger-lite" onClick={() => moderatePost(post._id, 'delete')}>Delete</button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-slate-500">No flagged posts.</p>}
        </div>
      </div>

      <div className="card-32 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">User Trust Scores</h2>
        <div className="space-y-3">
          {users.slice(0, 25).map((user) => (
            <div key={user._id} className="rounded-2xl border border-slate-200 p-4 bg-white flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-600">
                  {user.email} | Trust: {user.trustLevel} | Points: {user.reputationPoints}
                </p>
              </div>
              <button className={user.isBanned ? 'btn-info-lite' : 'btn-danger-lite'} onClick={() => banToggle(user._id, user.isBanned)}>
                {user.isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
