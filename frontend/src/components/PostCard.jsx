import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Handshake, Lightbulb, MessageSquare, Bookmark, BookmarkCheck, Sparkles, ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react';
import { reactToPost, savePost, summarizePost } from '../services/api';
import { reportPost } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SEVERITY_COLORS = {
  mild: 'tag-teal',
  moderate: 'tag-primary',
  severe: 'tag-accent',
  'very-severe': 'tag-rose',
};

export default function PostCard({ post, onUpdate }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [reporting, setReporting] = useState(false);

  const isAuthor = user?._id === (localPost.author?._id || localPost.author);
  const authorName = localPost.isAnonymous ? 'Anonymous User' : localPost.author?.name || 'Unknown';
  const isSaved = user?.savedPosts?.includes(localPost._id);

  const handleReaction = async (type) => {
    try {
      const res = await reactToPost(localPost._id, type);
      setLocalPost((prev) => ({ ...prev, reactions: res.data.reactions }));
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleSave = async () => {
    try {
      await savePost(localPost._id);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleSummarize = async () => {
    setAiLoading(true);
    try {
      const res = await summarizePost(localPost._id);
      setLocalPost((prev) => ({
        ...prev,
        aiSummary: res.data.summary,
        aiInsights: res.data.insights,
      }));
      setShowAI(true);
    } catch (err) {
      console.error('Summarize error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleReport = async () => {
    const reason = window.prompt('Report reason (fake/spam/promotion/misleading):', 'promotion');
    if (!reason) return;
    try {
      setReporting(true);
      await reportPost({ postId: localPost._id, reason: reason.toLowerCase(), details: '' });
      window.alert('Report submitted. Thank you for helping keep the community safe.');
    } catch (err) {
      window.alert(err.response?.data?.error || 'Failed to report post');
    } finally {
      setReporting(false);
    }
  };

  const reactionCount = (type) => localPost.reactions?.[type]?.length || 0;
  const hasReacted = (type) => localPost.reactions?.[type]?.includes(user?._id);

  return (
    <article
      className="glass rounded-2xl p-6 hover:border-white/15 transition-all duration-300 animate-fade-in-up"
      id={`post-${localPost._id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-primary-500 flex items-center justify-center text-white font-bold text-sm">
            {authorName[0]?.toUpperCase()}
          </div>
          <div>
            <Link
              to={localPost.isAnonymous ? '#' : `/profile/${localPost.author?._id}`}
              className="text-sm font-semibold text-white hover:text-teal-400 transition-colors"
            >
              {authorName}
            </Link>
            {localPost.author?.isVerified && (
              <span className="tag tag-teal">Verified User</span>
            )}
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <Clock className="w-3 h-3" />
              {new Date(localPost.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {localPost.isAnonymous && (
                <span className="flex items-center gap-1 text-accent-400">
                  <Shield className="w-3 h-3" /> Anonymous
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`tag ${SEVERITY_COLORS[localPost.severityLevel] || 'tag-primary'}`}>
          {localPost.severityLevel || 'moderate'}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2">{localPost.title}</h3>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="tag tag-primary">Trust {localPost.trustScore ?? 100}/100</span>
        {localPost.outcome && <span className="tag tag-teal">Outcome: {localPost.outcome}</span>}
        {localPost.moderationStatus === 'under-review' && <span className="tag tag-rose">Under Review</span>}
      </div>

      {/* Description */}
      <p className="text-dark-200 text-sm leading-relaxed mb-3">
        {expanded
          ? localPost.description
          : localPost.description?.length > 200
          ? localPost.description.substring(0, 200) + '...'
          : localPost.description}
      </p>
      {localPost.description?.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-teal-400 text-xs font-medium flex items-center gap-1 mb-3 hover:text-teal-300"
        >
          {expanded ? (
            <>Show less <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Read more <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}

      {/* Tags */}
      {(localPost.tags?.length > 0 || localPost.symptoms?.length > 0 || localPost.treatments?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {localPost.tags?.map((tag) => (
            <span key={tag} className="tag tag-primary">{tag}</span>
          ))}
          {localPost.symptoms?.map((s) => (
            <span key={s} className="tag tag-rose">🩺 {s}</span>
          ))}
          {localPost.treatments?.map((t) => (
            <span key={t} className="tag tag-teal">💊 {t}</span>
          ))}
        </div>
      )}

      {/* AI Summary */}
      {showAI && localPost.aiSummary && (
        <div className="glass rounded-xl p-4 mb-4 border-l-2 border-accent-500">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent-400" />
            <span className="text-xs font-semibold text-accent-400">AI Summary</span>
          </div>
          <p className="text-sm text-dark-200">{localPost.aiSummary}</p>
          {localPost.aiInsights && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {localPost.aiInsights.detectedTriggers?.map((t) => (
                <span key={t} className="tag tag-rose text-xs">⚡ {t}</span>
              ))}
              {localPost.aiInsights.detectedTreatments?.map((t) => (
                <span key={t} className="tag tag-teal text-xs">💊 {t}</span>
              ))}
              {localPost.aiInsights.detectedOutcomes?.map((t) => (
                <span key={t} className="tag tag-primary text-xs">📊 {t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReaction('relatable')}
            className={`reaction-btn ${hasReacted('relatable') ? 'active text-rose-400' : ''}`}
          >
            <Heart className="w-3.5 h-3.5" /> {reactionCount('relatable') || ''}
          </button>
          <button
            onClick={() => handleReaction('support')}
            className={`reaction-btn ${hasReacted('support') ? 'active text-primary-400' : ''}`}
          >
            <Handshake className="w-3.5 h-3.5" /> {reactionCount('support') || ''}
          </button>
          <button
            onClick={() => handleReaction('helpful')}
            className={`reaction-btn ${hasReacted('helpful') ? 'active text-teal-400' : ''}`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> {reactionCount('helpful') || ''}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSummarize}
            disabled={aiLoading}
            className="reaction-btn text-accent-400"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">AI</span>
          </button>
          <Link to={`/post/${localPost._id}`} className="reaction-btn">
            <MessageSquare className="w-3.5 h-3.5" />
          </Link>
          <button onClick={handleSave} className="reaction-btn">
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
          <button onClick={handleReport} disabled={reporting} className="reaction-btn text-rose-400">
            Report
          </button>
        </div>
      </div>
    </article>
  );
}
