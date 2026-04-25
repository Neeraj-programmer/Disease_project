import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPosts } from '../services/api';
import PostCard from '../components/PostCard';
import { Filter, TrendingUp, Sparkles, X } from 'lucide-react';

// Ye kuch fixed options hain jo hum buttons ke roop me dikhayenge
const TAG_OPTIONS = ['stress', 'diet', 'medication', 'weather', 'lifestyle', 'natural', 'mental-health', 'exercise'];
const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe', 'very-severe'];

export default function HomeFeed() {
  // ── STATES ──
  // posts: Jo posts backend se aayengi wo isme save hongi
  const [posts, setPosts] = useState([]);
  
  // loading: Jab tak posts load ho rahi hain (Spinner dikhane ke liye)
  const [loading, setLoading] = useState(true);
  
  // page: Hum abhi kon se page number par hain (Pagination)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // showFilters: Kya filter wala dabba khula hai ya band hai?
  const [showFilters, setShowFilters] = useState(false);
  
  // filters: User ne kya search kiya, konsa tag click kiya, wo sab isme hoga
  const [filters, setFilters] = useState({ tag: '', severity: '', search: '' });
  
  // URL me se search params nikalne ke liye (jaise ?search=acne)
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── EFFECTS ──
  // Jab page khule, toh check karo ki URL me koi search word toh nahi hai
  useEffect(() => {
    const searchFromUrl = searchParams.get('search') || '';
    setFilters((prev) => ({ ...prev, search: searchFromUrl }));
  }, [searchParams]);

  // Jab bhi page number change ho, ya koi filter change ho, tabhi posts wapas fetch karo
  useEffect(() => {
    fetchPosts();
  }, [page, filters]);

  // ── FUNCTIONS ──
  // Backend se posts laane ka function
  const fetchPosts = async () => {
    setLoading(true); // Pehle loading chalu karo
    try {
      // Backend ko bhejne ke liye options tayar karo
      const params = { page, limit: 10 };
      if (filters.tag) params.tag = filters.tag;
      if (filters.severity) params.severity = filters.severity;
      if (filters.search) params.search = filters.search;

      // API call
      const res = await getPosts(params);
      setPosts(res.data.posts); // Jo posts aayi, unko state me save kardo
      setTotalPages(res.data.pages); // Total pages kitne hain wo bhi save kardo
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false); // Aakhri me loading band kardo
    }
  };

  // Saare filters hata kar dobara sab kuch normal karne ke liye
  const clearFilters = () => {
    setFilters({ tag: '', severity: '', search: '' });
    setPage(1); // Pehle page pe wapas aa jao
    
    // Agar URL me search tha, toh URL ko bhi clean kardo
    if (searchParams.has('search')) {
      navigate('/');
    }
  };

  // Check karna ki kya koi ek bhi filter chalu hai?
  const hasActiveFilters = filters.tag || filters.severity || filters.search;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-10">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-teal-600" />
            Community Feed
          </h1>
          <p className="text-sm text-slate-500 mt-1">Shared experiences from the community</p>
        </div>
        
        {/* Filter on/off karne ka button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-ghost flex items-center gap-2 text-sm ${hasActiveFilters ? 'border-teal-400 text-teal-600' : ''}`}
          id="feed-filter-toggle"
        >
          <Filter className="w-4 h-4" />
          Filters
          {/* Agar koi filter chalu hai toh button pe ek chota sa green dot dikhao */}
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-teal-400" />}
        </button>
      </div>

      {/* ── FILTERS PANEL ── */}
      {/* Agar showFilters true hai, tabhi ye dabba dikhega */}
      {showFilters && (
        <div className="glass rounded-2xl p-5 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-800">Filter Posts</span>
            
            {/* Clear All ka button tabhi dikhao jab filter laga ho */}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Search Input Box */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Search</label>
              <input
                type="text"
                placeholder="Search keywords..."
                value={filters.search}
                onChange={(e) => { 
                  // Type karte hi state update kardo aur page 1 pe chale jao
                  setFilters({ ...filters, search: e.target.value }); 
                  setPage(1); 
                }}
                className="w-full bg-slate-100 hover:bg-slate-200/50 border border-transparent text-slate-900 rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white placeholder:text-slate-400"
                id="feed-search-input"
              />
            </div>

            {/* Tag Buttons */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { 
                      // Agar tag pehle se selected hai toh hata do, warna laga do (Toggle)
                      setFilters({ ...filters, tag: filters.tag === tag ? '' : tag }); 
                      setPage(1); 
                    }}
                    // Agar tag selected hai toh uska color alag rakho
                    className={`tag cursor-pointer ${filters.tag === tag ? 'tag-teal' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Buttons */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Severity</label>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_OPTIONS.map((sev) => (
                  <button
                    key={sev}
                    onClick={() => { 
                      setFilters({ ...filters, severity: filters.severity === sev ? '' : sev }); 
                      setPage(1); 
                    }}
                    className={`tag cursor-pointer ${filters.severity === sev ? 'tag-primary' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POSTS LIST ── */}
      {loading ? (
        // Agar loading ho rahi hai, toh skeleton (nakli khali dabbe) dikhao
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="skeleton h-4 w-1/3 mb-3 bg-slate-200" />
              <div className="skeleton h-6 w-2/3 mb-3 bg-slate-200" />
              <div className="skeleton h-16 w-full mb-3 bg-slate-200" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16 bg-slate-200" />
                <div className="skeleton h-6 w-16 bg-slate-200" />
                <div className="skeleton h-6 w-16 bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        // Agar loading khatam ho gayi lekin posts 0 aayi
        <div className="glass rounded-2xl p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No posts yet</h3>
          <p className="text-sm text-slate-500">
            {hasActiveFilters
              ? 'No posts match your filters. Try different criteria.'
              : 'Be the first to share your experience!'}
          </p>
        </div>
      ) : (
        // Agar posts aa gayi, toh ek ek karke PostCard component me bhej do
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}

      {/* ── PAGINATION (Pages 1, 2, 3...) ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {/* Ye code 1 se lekar totalPages tak array banata hai taaki buttons bana sakein */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                p === page
                  // Agar current page hai toh usko highlight karo
                  ? 'bg-gradient-to-r from-teal-500 to-primary-500 text-white'
                  // Warna normal color rakho
                  : 'glass text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
