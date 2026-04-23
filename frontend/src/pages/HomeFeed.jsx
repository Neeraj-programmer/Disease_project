import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPosts } from '../services/api';
import PostCard from '../components/PostCard';
import { Filter, TrendingUp, Sparkles, X } from 'lucide-react';

const TAG_OPTIONS = ['stress', 'diet', 'medication', 'weather', 'lifestyle', 'natural', 'mental-health', 'exercise'];
const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe', 'very-severe'];

export default function HomeFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ tag: '', severity: '', search: '' });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const searchFromUrl = searchParams.get('search') || '';
    if (searchFromUrl) {
      setFilters((prev) => ({ ...prev, search: searchFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPosts();
  }, [page, filters]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.tag) params.tag = filters.tag;
      if (filters.severity) params.severity = filters.severity;
      if (filters.search) params.search = filters.search;

      const res = await getPosts(params);
      setPosts(res.data.posts);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ tag: '', severity: '', search: '' });
    setPage(1);
  };

  const hasActiveFilters = filters.tag || filters.severity || filters.search;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-teal-400" />
            Community Feed
          </h1>
          <p className="text-sm text-dark-400 mt-1">Shared experiences from the community</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-ghost flex items-center gap-2 text-sm ${hasActiveFilters ? 'border-teal-400/30 text-teal-400' : ''}`}
          id="feed-filter-toggle"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-teal-400" />}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass rounded-2xl p-5 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">Filter Posts</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Search</label>
              <input
                type="text"
                placeholder="Search keywords..."
                value={filters.search}
                onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
                className="input-dark text-sm"
                id="feed-search-input"
              />
            </div>

            <div>
              <label className="text-xs text-dark-400 mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setFilters({ ...filters, tag: filters.tag === tag ? '' : tag }); setPage(1); }}
                    className={`tag cursor-pointer ${filters.tag === tag ? 'tag-teal' : 'bg-white/5 text-dark-300 border border-white/10'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-dark-400 mb-2 block">Severity</label>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_OPTIONS.map((sev) => (
                  <button
                    key={sev}
                    onClick={() => { setFilters({ ...filters, severity: filters.severity === sev ? '' : sev }); setPage(1); }}
                    className={`tag cursor-pointer ${filters.severity === sev ? 'tag-primary' : 'bg-white/5 text-dark-300 border border-white/10'}`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="skeleton h-4 w-1/3 mb-3" />
              <div className="skeleton h-6 w-2/3 mb-3" />
              <div className="skeleton h-16 w-full mb-3" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Sparkles className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
          <p className="text-sm text-dark-400">
            {hasActiveFilters
              ? 'No posts match your filters. Try different criteria.'
              : 'Be the first to share your experience!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? 'bg-gradient-to-r from-teal-500 to-primary-500 text-white'
                  : 'glass text-dark-300 hover:text-white'
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
