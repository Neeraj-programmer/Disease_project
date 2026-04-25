import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPost, addComment, deleteComment, deletePost, reactToPost, savePost, summarizePost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Heart, Handshake, Lightbulb, MessageSquare, Trash2, ArrowLeft, Sparkles, Shield, Clock, Send, Bookmark, BookmarkCheck, User, AlertTriangle, Loader } from 'lucide-react';

const SEVERITY_COLORS = { mild: 'tag-teal', moderate: 'tag-primary', severe: 'tag-accent', 'very-severe': 'tag-rose' };
const REACTION_ICONS = { relatable: Heart, support: Handshake, helpful: Lightbulb };
const REACTION_COLORS = { relatable: 'text-rose-400', support: 'text-teal-400', helpful: 'text-primary-400' };

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => { fetchPost(); }, [id]);

  const fetchPost = async () => {
    try {
      const res = await getPost(id);
      setPost(res.data.post);
      setComments(res.data.comments);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const handleReact = async (type) => {
    try {
      const res = await reactToPost(id, type);
      setPost(p => ({ ...p, reactions: res.data.reactions }));
    } catch {}
  };

  const handleSave = async () => {
    try { await savePost(id); } catch {}
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await summarizePost(id);
      setPost(p => ({ ...p, aiSummary: res.data.summary, aiInsights: res.data.insights }));
    } catch {}
    finally { setSummarizing(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await addComment(id, { content: commentText, isAnonymous: isAnon });
      setComments([res.data.comment, ...comments]);
      setCommentText('');
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (cid) => {
    try { await deleteComment(id, cid); setComments(comments.filter(c => c._id !== cid)); } catch {}
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await deletePost(id); navigate('/'); } catch {}
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
  );

  if (!post) return <div className="text-center py-20 text-dark-400">Post not found</div>;

  const authorName = post.isAnonymous ? 'Anonymous' : post.author?.name || 'Unknown';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-semibold">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Post Card */}
      <div className="glass rounded-2xl p-6 sm:p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center">
              {post.isAnonymous ? <Shield className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
            </div>
            <div>
              <Link to={post.isAnonymous ? '#' : `/profile/${post.author?._id}`} className="font-bold text-slate-800 hover:text-teal-600 transition-colors">{authorName}</Link>
              <p className="text-xs text-slate-400 flex items-center gap-1 font-medium"><Clock className="w-3 h-3" />{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          {user?._id === post.author?._id && (
            <button onClick={handleDelete} className="text-dark-400 hover:text-rose-400 transition-colors p-2" id="post-delete"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>

        <span className={`tag ${SEVERITY_COLORS[post.severityLevel]} mb-3 inline-block font-semibold uppercase tracking-wider text-[10px]`}>{post.severityLevel}</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-5 leading-tight">{post.title}</h1>
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-8 text-lg">{post.description}</p>

        {post.startTimeline && <div className="glass rounded-xl p-3 mb-4 text-sm"><span className="text-dark-400">Timeline:</span> <span className="text-dark-200">{post.startTimeline}</span></div>}
        {post.results && <div className="glass rounded-xl p-3 mb-4 text-sm"><span className="text-teal-400 font-medium">Results:</span> <span className="text-dark-200">{post.results}</span></div>}
        {post.mistakes && <div className="glass rounded-xl p-3 mb-4 text-sm"><span className="text-rose-400 font-medium">Mistakes:</span> <span className="text-dark-200">{post.mistakes}</span></div>}
        {post.advice && <div className="glass rounded-xl p-3 mb-4 text-sm"><span className="text-primary-400 font-medium">Advice:</span> <span className="text-dark-200">{post.advice}</span></div>}

        {/* Images */}
        {post.images?.length > 0 && (
          <div className={`grid gap-4 mb-8 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.images.map((img, i) => (
              <img 
                key={i} 
                src={img.startsWith('http') ? img : `https://disease-project-1.onrender.com${img}`} 
                alt={`Post image ${i + 1}`} 
                className="w-full rounded-3xl object-cover max-h-[500px] shadow-2xl shadow-slate-200/50 hover:scale-[1.01] transition-transform duration-500" 
              />
            ))}
          </div>
        )}

        {/* Tags */}
        {(post.symptoms?.length > 0 || post.treatments?.length > 0 || post.triggers?.length > 0 || post.tags?.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.symptoms?.map(s => <span key={s} className="tag tag-rose">{s}</span>)}
            {post.treatments?.map(t => <span key={t} className="tag tag-teal">{t}</span>)}
            {post.triggers?.map(t => <span key={t} className="tag tag-accent">{t}</span>)}
            {post.tags?.map(t => <span key={t} className="tag tag-primary">{t}</span>)}
          </div>
        )}

        {/* Reactions */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5">
          {Object.entries(REACTION_ICONS).map(([type, Icon]) => (
            <button key={type} onClick={() => handleReact(type)}
              className={`reaction-btn ${post.reactions?.[type]?.includes(user?._id) ? `active ${REACTION_COLORS[type]}` : ''}`}>
              <Icon className="w-4 h-4" /> {post.reactions?.[type]?.length || 0}
            </button>
          ))}
          <button onClick={handleSave} className="reaction-btn ml-auto"><Bookmark className="w-4 h-4" /> Save</button>
          <button onClick={handleSummarize} disabled={summarizing} className="reaction-btn">
            {summarizing ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent-400" />} AI Summary
          </button>
        </div>

        {/* AI Summary */}
        {post.aiSummary && (
          <div className="mt-4 glass rounded-xl p-4 border-l-2 border-accent-400">
            <p className="text-sm font-medium text-accent-400 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" />AI Summary</p>
            <p className="text-sm text-dark-200">{post.aiSummary}</p>
            {post.aiInsights && (
              <div className="mt-3 flex flex-wrap gap-1">
                {post.aiInsights.detectedTriggers?.map(t => <span key={t} className="tag tag-accent text-xs">{t}</span>)}
                {post.aiInsights.detectedTreatments?.map(t => <span key={t} className="tag tag-teal text-xs">{t}</span>)}
                {post.aiInsights.detectedOutcomes?.map(t => <span key={t} className="tag tag-primary text-xs">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-teal-500" />Comments ({comments.length})</h2>

        <form onSubmit={handleComment} className="mb-6">
          <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Share your thoughts..." rows={3} className="input-dark resize-y mb-3" id="comment-input" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer">
              <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="rounded" /> Post anonymously
            </label>
            <button type="submit" disabled={submitting || !commentText.trim()} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" id="comment-submit">
              <Send className="w-4 h-4" /> Comment
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {comments.map(c => (
            <div key={c._id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{c.isAnonymous ? 'Anonymous' : c.author?.name}</span>
                  <span className="text-xs text-dark-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                {user?._id === c.author?._id && (
                  <button onClick={() => handleDeleteComment(c._id)} className="text-dark-500 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <p className="text-sm text-dark-200 pl-9">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-center text-dark-500 py-6 text-sm">No comments yet. Be the first to share your thoughts!</p>}
        </div>
      </div>
    </div>
  );
}
