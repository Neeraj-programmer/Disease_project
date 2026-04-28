import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Handshake, Lightbulb, MessageSquare, Bookmark, BookmarkCheck, Sparkles, ChevronDown, ChevronUp, Clock, Shield, Send, User, Lock, Globe, Eye, EyeOff } from 'lucide-react';
import { reactToPost, savePost, summarizePost, addComment, reportPost } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Ye color codes hain alag-alag severity (bimari kitni serious hai) ke hisaab se
const SEVERITY_COLORS = {
  mild: 'tag-teal',       // Halki problem -> Green/Teal tag
  moderate: 'tag-primary',// Normal problem -> Blue tag
  severe: 'tag-accent',   // Serious problem -> Purple tag
  'very-severe': 'tag-rose',// Bahut serious -> Red tag
};

export default function PostCard({ post: propPost, onUpdate }) {
  // Global auth state se current logged-in user ki details nikalna
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ── LOCAL STATES ──
  // post: Post ki details ko state me rakhna taaki like/comment aane par real-time me update ho sake
  const [post, setPost] = useState(propPost);
  
  // expanded: Agar description bahut lamba hai, toh pehle thoda sa dikhao, "Read More" pe click karne par pura dikhao
  const [expanded, setExpanded] = useState(false);
  
  // showAI: AI ki summary dikhani hai ya nahi
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [reporting, setReporting] = useState(false);

  // ── COMMENTS STATES ──
  const [showComments, setShowComments] = useState(false); // Comment section khula hai ya band
  const [comments, setComments] = useState([]); // Saare comments is array me save honge
  const [commentsLoading, setCommentsLoading] = useState(false); // Comments backend se aane me time lagta hai
  const [commentText, setCommentText] = useState(''); // User jo naya comment type kar raha hai
  const [submittingComment, setSubmittingComment] = useState(false); // Jab comment backend pe save ho raha ho

  // Effect to sync when prop changes
  useEffect(() => {
    setPost(propPost);
  }, [propPost]);

  // Check karna ki kya ye post us user ne hi likhi hai jo abhi login hai?
  const isAuthor = user?._id === (post.author?._id || post.author);
  
  // Author ka naam nikalna (Agar usne anonymous post kiya hai toh naam chupana)
  const authorName = post.isAnonymous ? 'Anonymous User' : post.author?.name || 'Unknown';
  
  // Check karna ki is user ne ye post save/bookmark ki hui hai ya nahi
  const isSaved = user?.savedPosts?.includes(post._id);

  // Reaction ('relatable', 'support', 'helpful') add ya remove karne ka function
  const handleReaction = async (type) => {
    try {
      // Backend ko API call bhejna
      const res = await reactToPost(post._id, type);
      // Backend se jo nayi reaction list aayi, usko UI me update kar dena
      setPost((prev) => ({ ...prev, reactions: res.data.reactions }));
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  // Post ko Bookmark (Save) karne ka function
  const handleSave = async () => {
    try {
      await savePost(post._id);
      // yahan state manually change nahi kar rahe kyunki wo Navbar walo ne handle kiya hai
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // AI Summary mangwane ka function
  const handleSummarize = async () => {
    // Agar pehle se AI summary aa chuki hai aur dikh rahi hai, toh isko hide (toggle off) kar do
    if (showAI && post.aiSummary) {
      setShowAI(false);
      return;
    }
    
    setAiLoading(true);
    try {
      // Backend se API ke through AI insights lena
      const res = await summarizePost(post._id);
      
      // Nayi AI summary ko post me save kar dena
      setPost((prev) => ({
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
    const reason = window.prompt('Report reason (fake/spam/promotion/misleading):', 'promotion');
    if (!reason) return;
    
    setReporting(true);
    try {
      await reportPost(post._id, reason);
      alert('Thank you for reporting. Our team will review it.');
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="card-glass p-5 mb-6 group animate-fade-in hover:shadow-2xl transition-all duration-300">
      {/* Header: Author Info & Privacy */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-lg">
            {post.isAnonymous ? (
              <Shield className="w-5 h-5" />
            ) : post.author?.avatar ? (
              <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">{authorName}</h3>
            <div className="flex items-center gap-2 text-[10px] text-dark-500 font-medium">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(post.createdAt).toLocaleDateString()}</span>
              {post.isPrivate ? (
                <span className="flex items-center gap-1 text-amber-500"><Lock className="w-3 h-3" /> Private</span>
              ) : (
                <span className="flex items-center gap-1 text-teal-500"><Globe className="w-3 h-3" /> Public</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Severity Badge */}
        <div className="flex flex-col items-end gap-2">
          <span className={`tag ${SEVERITY_COLORS[post.severityLevel] || 'tag-primary'} text-[10px] uppercase tracking-wider font-bold px-2 py-1`}>
            {post.severityLevel}
          </span>
          {isAuthor && <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded">YOUR POST</span>}
        </div>
      </div>

      {/* Post Title */}
      <Link to={`/post/${post._id}`} className="block group/title">
        <h2 className="text-xl font-extrabold text-slate-900 mb-2 leading-tight group-hover/title:text-primary-600 transition-colors">
          {post.title}
        </h2>
      </Link>

      {/* Status Badges (Hidden if none) */}
      <div className="flex flex-wrap gap-2 mb-3">
        {post.moderationStatus === 'published' && <span className="tag tag-teal">Verified Experience</span>}
        {post.moderationStatus === 'under-review' && <span className="tag tag-rose">Under Review</span>}
      </div>

      {/* Description */}
      <p className="text-slate-600 text-sm leading-relaxed mb-4 font-medium">
        {expanded
          ? post.description
          : post.description?.length > 200
          ? post.description.substring(0, 200) + '...'
          : post.description}
      </p>

      {/* Images */}
      {post.images?.length > 0 && (
        <div className={`grid gap-2 mb-4 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.images.map((img, i) => (
            <div key={i} className="relative aspect-video rounded-xl overflow-hidden group shadow-md bg-slate-100">
              <img 
                src={img} 
                alt="" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                loading="lazy"
            </div>
          ))}
        </div>
      )}

      {post.description?.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-teal-400 text-xs font-medium flex items-center gap-1 mb-3 hover:text-teal-300"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show Less</> : <><ChevronDown className="w-3 h-3" /> Read More</>}
        </button>
      )}

      {/* Tags & Symptoms */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {post.tags?.map((t, i) => (
          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full font-bold">#{t}</span>
        ))}
        {post.treatments?.map((t, i) => (
          <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[10px] rounded-full font-bold flex items-center gap-1">
            <Handshake className="w-2.5 h-2.5" /> {t}
          </span>
        ))}
      </div>

      {/* Actions: Reactions & Sharing */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Relatable Reaction */}
          <button
            onClick={() => handleReaction('relatable')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 text-xs font-bold ${
              post.reactions?.relatable?.includes(user?._id)
                ? 'bg-rose-50 text-rose-500'
                : 'hover:bg-slate-50 text-dark-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.reactions?.relatable?.includes(user?._id) ? 'fill-current' : ''}`} />
            <span>{post.reactions?.relatable?.length || 0}</span>
          </button>

          {/* Support Reaction */}
          <button
            onClick={() => handleReaction('support')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 text-xs font-bold ${
              post.reactions?.support?.includes(user?._id)
                ? 'bg-primary-50 text-primary-500'
                : 'hover:bg-slate-50 text-dark-400'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>{post.reactions?.support?.length || 0}</span>
          </button>

          {/* Helpful Reaction */}
          <button
            onClick={() => handleReaction('helpful')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 text-xs font-bold ${
              post.reactions?.helpful?.includes(user?._id)
                ? 'bg-amber-50 text-amber-500'
                : 'hover:bg-slate-50 text-dark-400'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{post.reactions?.helpful?.length || 0}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Toggle */}
          <button
            onClick={handleSummarize}
            disabled={aiLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              showAI ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
            {aiLoading ? 'Thinking...' : 'AI Insights'}
          </button>

          <button onClick={handleSave} className="p-2 rounded-full hover:bg-slate-50 transition-colors text-dark-400">
            {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary-500" /> : <Bookmark className="w-5 h-5" />}
          </button>
          
          <Link to={`/post/${post._id}`} className="p-2 rounded-full hover:bg-slate-50 transition-colors text-dark-400">
            <Eye className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* AI Summary Box */}
      {showAI && (post.aiSummary || post.aiInsights) && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3 text-primary-600">
            <Sparkles className="w-4 h-4" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest">AI Experience Analysis</h4>
          </div>
          {post.aiSummary && <p className="text-slate-700 text-xs italic leading-relaxed mb-3">"{post.aiSummary}"</p>}
          {post.aiInsights?.length > 0 && (
            <div className="space-y-2">
              {post.aiInsights.map((insight, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-slate-600">
                  <div className="w-1 h-1 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                  <span className="font-medium">{insight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
