import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Handshake, Lightbulb, MessageSquare, Bookmark, BookmarkCheck, Sparkles, ChevronDown, ChevronUp, Clock, Shield, Send, User, Lock, Globe, Eye, EyeOff } from 'lucide-react';
import { reactToPost, savePost, summarizePost, getPost, addComment, reportPost } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Ye color codes hain alag-alag severity (bimari kitni serious hai) ke hisaab se
const SEVERITY_COLORS = {
  mild: 'tag-teal',       // Halki problem -> Green/Teal tag
  moderate: 'tag-primary',// Normal problem -> Blue tag
  severe: 'tag-accent',   // Serious problem -> Purple tag
  'very-severe': 'tag-rose',// Bahut serious -> Red tag
};

export default function PostCard({ post, onUpdate }) {
  // Global auth state se current logged-in user ki details nikalna
  const { user } = useAuth();
  
  // ── LOCAL STATES ──
  // expanded: Agar description bahut lamba hai, toh pehle thoda sa dikhao, "Read More" pe click karne par pura dikhao
  const [expanded, setExpanded] = useState(false);
  
  // showAI: AI ki summary dikhani hai ya nahi
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // localPost: Post ki details ko state me rakhna taaki like/comment aane par real-time me update ho sake
  const [localPost, setLocalPost] = useState(post);
  const [reporting, setReporting] = useState(false);

  // ── COMMENTS STATES ──
  const [showComments, setShowComments] = useState(false); // Comment section khula hai ya band
  const [comments, setComments] = useState([]); // Saare comments is array me save honge
  const [commentsLoading, setCommentsLoading] = useState(false); // Comments backend se aane me time lagta hai
  const [commentText, setCommentText] = useState(''); // User jo naya comment type kar raha hai
  const [submittingComment, setSubmittingComment] = useState(false); // Jab comment backend pe save ho raha ho

  // Check karna ki kya ye post us user ne hi likhi hai jo abhi login hai?
  const isAuthor = user?._id === (localPost.author?._id || localPost.author);
  
  // Author ka naam nikalna (Agar usne anonymous post kiya hai toh naam chupana)
  const authorName = localPost.isAnonymous ? 'Anonymous User' : localPost.author?.name || 'Unknown';
  
  // Check karna ki is user ne ye post save/bookmark ki hui hai ya nahi
  const isSaved = user?.savedPosts?.includes(localPost._id);

  // Reaction ('relatable', 'support', 'helpful') add ya remove karne ka function
  const handleReaction = async (type) => {
    try {
      // Backend ko API call bhejna
      const res = await reactToPost(localPost._id, type);
      // Backend se jo nayi reaction list aayi, usko UI me update kar dena
      setLocalPost((prev) => ({ ...prev, reactions: res.data.reactions }));
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // Post ko Bookmark (Save) karne ka function
  const handleSave = async () => {
    try {
      await savePost(localPost._id);
      // yahan state manually change nahi kar rahe kyunki wo Navbar walo ne handle kiya hai
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // AI Summary mangwane ka function
  const handleSummarize = async () => {
    // Agar pehle se AI summary aa chuki hai aur dikh rahi hai, toh isko hide (toggle off) kar do
    if (showAI && localPost.aiSummary) {
      setShowAI(false);
      return;
    }
    
    setAiLoading(true);
    try {
      // Backend se API ke through AI insights lena
      const res = await summarizePost(localPost._id);
      
      // Nayi AI summary ko localPost me save kar dena
      setLocalPost((prev) => ({
        ...prev,
        aiSummary: res.data.summary,
        aiInsights: res.data.insights,
      }));
      setShowAI(true); // AI wala dabba dikhana shuru karo
    } catch (err) {
      console.error('Summarize error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Agar post me kuch galat hai toh usko report karna
  const handleReport = async () => {
    // Browser ka in-built prompt dikhana reason puchne ke liye
    const reason = window.prompt('Report reason (fake/spam/promotion/misleading):', 'promotion');
    if (!reason) return; // Agar user ne cancel kar diya toh kuch mat karo
    
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

  // Inline comment section ko kholne ya band karne ka function
  const toggleComments = async () => {
    if (!showComments) {
      setShowComments(true); // Comments ka dabba khol do
      
      // Agar list pehle se khali hai, tabhi backend se fetch karo (baar baar fetch na ho)
      if (comments.length === 0) {
        setCommentsLoading(true);
        try {
          const res = await getPost(localPost._id);
          setComments(res.data.comments || []);
        } catch (err) {
          console.error('Failed to load comments', err);
        } finally {
          setCommentsLoading(false);
        }
      }
    } else {
      setShowComments(false); // Dabba band kar do
    }
  };

  // Naya comment post karne ka function
  const handleCommentSubmit = async (e) => {
    e.preventDefault(); // Page refresh hone se roko
    if (!commentText.trim()) return; // Agar khali comment hai toh bhejo mat
    
    setSubmittingComment(true);
    try {
      // Backend pe comment save karna
      const res = await addComment(localPost._id, { content: commentText, isAnonymous: false });
      
      // Jo naya comment aaya hai usko purane comments ki list me sabse upar laga do
      setComments([res.data.comment, ...comments]);
      
      // Input box ko khali kardo
      setCommentText('');
      
      // Total comment count badha do UI me
      setLocalPost(prev => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setSubmittingComment(false);
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
        <div className="flex items-center gap-2">
          {localPost.isPrivate ? (
            <span className="tag tag-rose flex items-center gap-1"><Lock className="w-3 h-3" /> Private</span>
          ) : (
            <span className="tag tag-teal flex items-center gap-1"><Globe className="w-3 h-3" /> Public</span>
          )}
          <span className={`tag ${SEVERITY_COLORS[localPost.severityLevel] || 'tag-primary'}`}>
            {localPost.severityLevel || 'moderate'}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2">{localPost.title}</h3>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="tag tag-primary">Trust {localPost.trustScore ?? 100}/100</span>
        {localPost.outcome && (
          <span className={`tag ${localPost.outcome === 'worse' ? 'tag-rose' : localPost.outcome === 'improved' ? 'tag-teal' : 'tag-primary'}`}>
            Outcome: {localPost.outcome}
          </span>
        )}
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

      {/* Images */}
      {localPost.images?.length > 0 && (
        <div className={`grid gap-2 mb-4 ${localPost.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {localPost.images.map((img, i) => (
            <div key={i} className="relative aspect-video rounded-xl overflow-hidden group">
              <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
          ))}
        </div>
      )}

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
            className={`reaction-btn active:scale-90 transition-transform ${hasReacted('relatable') ? 'active text-rose-400' : ''}`}
          >
            <Heart className="w-3.5 h-3.5" /> {reactionCount('relatable') || ''}
          </button>
          <button
            onClick={() => handleReaction('support')}
            className={`reaction-btn active:scale-90 transition-transform ${hasReacted('support') ? 'active text-primary-400' : ''}`}
          >
            <Handshake className="w-3.5 h-3.5" /> {reactionCount('support') || ''}
          </button>
          <button
            onClick={() => handleReaction('helpful')}
            className={`reaction-btn active:scale-90 transition-transform ${hasReacted('helpful') ? 'active text-teal-400' : ''}`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> {reactionCount('helpful') || ''}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSummarize}
            disabled={aiLoading}
            className={`reaction-btn ${showAI ? 'text-white bg-accent-500/20' : 'text-accent-400'}`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">AI</span>
          </button>
          <button onClick={toggleComments} className="reaction-btn text-teal-400 hover:bg-teal-400/10">
            <MessageSquare className="w-3.5 h-3.5" /> {localPost.commentCount || 0}
          </button>
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

      {/* Inline Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in-up">
          <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="input-dark flex-1 text-sm py-2 px-3"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="btn-primary p-2 px-4 flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {commentsLoading ? (
              <div className="text-center text-xs text-dark-400 py-2">Loading comments...</div>
            ) : comments.length > 0 ? (
              comments.map(c => (
                <div key={c._id} className="bg-white/5 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-white text-xs">{c.isAnonymous ? 'Anonymous' : c.author?.name}</span>
                    <span className="text-[10px] text-dark-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-dark-200 pl-7 text-xs">{c.content}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-dark-500 py-2">No comments yet. Be the first to share your thoughts!</p>
            )}
          </div>
          <div className="mt-2 text-center">
             <Link to={`/post/${localPost._id}`} className="text-xs text-teal-400 hover:underline">
               View full discussion
             </Link>
          </div>
        </div>
      )}
    </article>
  );
}
