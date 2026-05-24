'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Search, Film, Star, Clock, Calendar, 
  AlertTriangle, Shield, Eye, Globe, Server, X,
  RefreshCw, Loader2, ExternalLink, ChevronRight
} from 'lucide-react';

interface Movie {
  title: string;
  slug: string;
  url: string;
  year: string;
  quality: string;
  duration: string;
  description: string;
  thumbnail: string;
  genres: string[];
}

interface MovieDetail {
  title: string;
  slug: string;
  url: string;
  description: string;
  year: string;
  quality: string;
  duration: string;
  thumbnail: string;
  genres: string[];
  directors: string[];
  cast: string[];
  embeds: {
    key: string;
    id: string;
    label: string;
    language: string;
    server: string;
    quality: string;
    embedUrl: string;
    playerUrl: string;
    videoId: string;
  }[];
  likes: number;
  dislikes: number;
}

export default function DemoPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'security' | 'demo'>('demo');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch movies from our API
  const fetchMovies = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/movies?page=${pageNum}`);
      const data = await res.json();
      if (data.success && data.movies.length > 0) {
        if (pageNum === 1) {
          setMovies(data.movies);
        } else {
          setMovies(prev => [...prev, ...data.movies]);
        }
        setLastUpdated(new Date());
      }
    } catch {
      // Fallback sample data
      if (pageNum === 1) {
        setMovies([{
          title: 'Dhurandhar 2: The Revenge (HD)',
          slug: 'dhurandhar-the-revenge-free-dow',
          url: 'https://desicinemas.pk/movies/dhurandhar-the-revenge-free-dow/',
          year: '2026', quality: 'HD', duration: '3h 49m',
          description: 'As rival gangs, corrupt officials and a ruthless Major Iqbal close in...',
          thumbnail: 'https://image.tmdb.org/t/p/w500/owQeDouUZ6wI6f1aTOYEFd511zn.jpg',
          genres: ['Action', 'Crime', 'Thriller']
        }]);
      }
    }
    setLoading(false);
  }, []);

  // Search movies
  const searchMovies = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchMovies(1);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success && data.movies.length > 0) {
        setMovies(data.movies);
      }
    } catch {
      // Keep current movies on search error
    }
    setLoading(false);
  }, [searchQuery, fetchMovies]);

  // Load movie detail
  const loadMovieDetail = async (movie: Movie) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const res = await fetch(`/api/movie-detail?slug=${encodeURIComponent(movie.slug)}`);
      const data = await res.json();
      if (data.success && data.movie) {
        setSelectedMovie(data.movie);
      } else {
        setSelectedMovie({
          ...movie,
          directors: [],
          cast: [],
          embeds: [],
          likes: 0,
          dislikes: 0,
        });
      }
    } catch {
      setSelectedMovie({
        ...movie,
        directors: [],
        cast: [],
        embeds: [],
        likes: 0,
        dislikes: 0,
      });
    }
    setDetailLoading(false);
  };

  // Initial fetch & Auto-refresh
  useEffect(() => {
    const doFetch = async () => { await fetchMovies(1); };
    doFetch();
  }, [fetchMovies]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      const doFetch = async () => { await fetchMovies(1); };
      doFetch();
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMovies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchMovies();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMovies]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMovies(nextPage);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur border-b border-red-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                CineClone API Demo
              </h1>
              <p className="text-[10px] text-red-400/80 -mt-0.5">desicinemas.pk data API with video</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'demo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('demo')}
              className={activeTab === 'demo' ? 'bg-red-600 hover:bg-red-700' : 'border-red-800 text-red-400'}
            >
              <Eye className="w-4 h-4 mr-1" /> Live Demo
            </Button>
            <Button
              variant={activeTab === 'security' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('security')}
              className={activeTab === 'security' ? 'bg-red-600 hover:bg-red-700' : 'border-red-800 text-red-400'}
            >
              <Shield className="w-4 h-4 mr-1" /> Security
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'security' ? (
        <SecurityPanel />
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* API Info Bar */}
          <div className="bg-[#12121a] border border-green-800/30 rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-green-400 font-semibold text-sm">API Active - desicinemas.pk</p>
                  <p className="text-gray-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-800 text-green-400"
                  onClick={() => fetchMovies(1)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
                <Button
                  size="sm"
                  variant={autoRefresh ? 'default' : 'outline'}
                  className={autoRefresh ? 'bg-green-600' : 'border-green-800 text-green-400'}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Auto {autoRefresh ? 'ON' : 'OFF'}
                </Button>
                <Badge variant="outline" className="border-red-700 text-red-400">
                  <Film className="w-3 h-3 mr-1" /> {movies.length} Movies
                </Badge>
              </div>
            </div>
            <div className="mt-3 bg-black/40 rounded-lg p-3">
              <p className="text-gray-500 text-xs font-mono">
                GET /api/movies?page=1 | /api/movie-detail?slug=&lt;slug&gt; | /api/video?videoId=&lt;id&gt; | /api/search?q=&lt;query&gt;
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies from desicinemas.pk..."
              className="pl-12 h-12 bg-[#1a1a24] border-red-900/30 text-white placeholder:text-gray-500 text-lg rounded-xl"
            />
            {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>}
          </div>

          {/* Movie Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {movies.map((movie, idx) => (
              <Card 
                key={`${movie.slug}-${idx}`}
                className="bg-[#12121a] border border-gray-800/50 hover:border-red-700/50 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-red-900/20 group"
                onClick={() => loadMovieDetail(movie)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-[2/3] bg-[#1a1a24] rounded-t-lg overflow-hidden">
                    {movie.thumbnail ? (
                      <img
                        src={movie.thumbnail}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                    {movie.quality && (
                      <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs">
                        {movie.quality}
                      </Badge>
                    )}
                    {movie.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {movie.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-white truncate">{movie.title}</h3>
                    <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {movie.year}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Loading / Load More */}
          {loading && movies.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-[#12121a] rounded-lg overflow-hidden">
                  <Skeleton className="aspect-[2/3] bg-red-900/10" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-red-900/10" />
                    <Skeleton className="h-3 w-1/2 bg-red-900/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center mb-8">
            <Button
              onClick={loadMore}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
              Load More Movies
            </Button>
          </div>

          {/* Movie Detail Dialog */}
          <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <DialogContent className="bg-[#0a0a0f] border-red-900/30 max-w-5xl max-h-[90vh] p-0 overflow-hidden">
              <DialogTitle className="sr-only">Movie Details</DialogTitle>
              {detailLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-8 w-3/4 bg-red-900/20" />
                  <Skeleton className="h-4 w-1/2 bg-red-900/20" />
                  <Skeleton className="h-64 w-full bg-red-900/20" />
                </div>
              ) : selectedMovie ? (
                <ScrollArea className="max-h-[90vh]">
                  {/* Backdrop */}
                  <div className="relative h-64 md:h-80">
                    {selectedMovie.thumbnail && (
                      <img src={selectedMovie.thumbnail} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6">
                      <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedMovie.title}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                        {selectedMovie.quality && <Badge className="bg-red-600">{selectedMovie.quality}</Badge>}
                        {selectedMovie.year && <span className="text-gray-300 flex items-center gap-1"><Calendar className="w-4 h-4" /> {selectedMovie.year}</span>}
                        {selectedMovie.duration && <span className="text-gray-300 flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedMovie.duration}</span>}
                        {selectedMovie.likes > 0 && <span className="text-gray-300 flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> {selectedMovie.likes} likes</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="absolute top-3 right-3 text-white hover:bg-red-600/50" onClick={() => setShowDetail(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Description */}
                    {selectedMovie.description && (
                      <p className="text-gray-300 leading-relaxed">{selectedMovie.description}</p>
                    )}

                    {/* Genres */}
                    {selectedMovie.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedMovie.genres.map((genre, idx) => (
                          <Badge key={idx} variant="outline" className="border-red-800 text-red-300">{genre}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Cast & Directors */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedMovie.directors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Directors</h4>
                          <p className="text-white text-sm">{selectedMovie.directors.join(', ')}</p>
                        </div>
                      )}
                      {selectedMovie.cast.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Cast</h4>
                          <p className="text-white text-sm">{selectedMovie.cast.slice(0, 8).join(', ')}{selectedMovie.cast.length > 8 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>

                    {/* Video Player Options */}
                    <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
                      <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4" /> Watch Movie
                      </h4>
                      
                      {selectedMovie.embeds.length > 0 ? (
                        <div className="space-y-3">
                          {selectedMovie.embeds.map((embed) => (
                            <VideoPlayerCard key={embed.key} embed={embed} movieTitle={selectedMovie.title} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-black/40 rounded-lg p-4 text-center">
                          <p className="text-gray-400 mb-3">No embed options found in API response.</p>
                          <p className="text-gray-500 text-xs">The embed data may require JavaScript rendering.</p>
                        </div>
                      )}
                    </div>

                    {/* Raw API Data */}
                    <details className="bg-black/40 rounded-lg">
                      <summary className="p-3 cursor-pointer text-yellow-400 text-sm font-semibold hover:text-yellow-300">
                        Raw API Response Data
                      </summary>
                      <pre className="p-3 text-xs text-green-400 overflow-x-auto max-h-60">
                        {JSON.stringify(selectedMovie, null, 2)}
                      </pre>
                    </details>
                  </div>
                </ScrollArea>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

// Video Player Component - opens in new tab to avoid sandbox blocking
function VideoPlayerCard({ embed, movieTitle }: { 
  embed: { key: string; id: string; label: string; language: string; server: string; quality: string; embedUrl: string; playerUrl: string; videoId: string };
  movieTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState('');

  const handlePlay = async () => {
    setLoading(true);
    try {
      // If we already have the player URL, open it directly
      if (embed.playerUrl) {
        window.open(embed.playerUrl, '_blank', 'noopener,noreferrer');
        setResolvedUrl(embed.playerUrl);
      } else if (embed.videoId) {
        // Construct the player URL from video ID
        const url = `https://movieshub.rpmplay.xyz/#${embed.videoId}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setResolvedUrl(url);
      } else {
        // Try to resolve via our API
        const res = await fetch(`/api/video?videoId=${embed.id}`);
        const data = await res.json();
        if (data.success && data.embedUrl) {
          window.open(data.embedUrl, '_blank', 'noopener,noreferrer');
          setResolvedUrl(data.embedUrl);
        } else {
          // Last resort: open the desicinemas embed page
          window.open(embed.embedUrl, '_blank', 'noopener,noreferrer');
          setResolvedUrl(embed.embedUrl);
        }
      }
    } catch {
      window.open(embed.embedUrl, '_blank', 'noopener,noreferrer');
      setResolvedUrl(embed.embedUrl);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="border-green-700 text-green-400">{embed.label}</Badge>
          <span className="text-gray-400 text-sm">{embed.language}</span>
          <span className="text-gray-500 text-xs">• {embed.server}</span>
          <Badge className="bg-red-600 text-xs">{embed.quality}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePlay} disabled={loading} className="bg-red-600 hover:bg-red-700">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
            Play Movie
          </Button>
        </div>
      </div>
      
      {/* Show resolved URL after play */}
      {resolvedUrl && (
        <div className="bg-green-950/30 border border-green-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-green-600 text-[10px]">VIDEO OPENED</Badge>
            <span className="text-green-300 text-xs">{movieTitle}</span>
          </div>
          <p className="text-green-400/60 text-[10px] font-mono break-all">
            Player URL: {resolvedUrl}
          </p>
          <p className="text-gray-500 text-[10px] mt-1">
            Video player naye tab me khula hai. Sandbox restriction ki wajah se iframe me block hota hai.
          </p>
        </div>
      )}
      
      {/* API Data Flow Proof */}
      <div className="bg-black/30 rounded-lg p-2">
        <p className="text-gray-600 text-[10px] font-mono">
          Data flow: /api/movie-detail → embedUrl({embed.embedUrl.substring(0, 50)}...) → playerUrl({(embed.playerUrl || 'resolving...').substring(0, 40)}...)
        </p>
      </div>
    </div>
  );
}

function SecurityPanel() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-red-950/80 to-red-900/40 border border-red-800/50 rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">Aapki Website Safe NAHI Hai!</h2>
            <p className="text-red-200/80 text-lg mb-4">
              Koi bhi aapke API ka data use karke apni khud ki website/app bana sakta hai.
              Ye demo website LIVE data fetch kar rahi hai desicinemas.pk se.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 mb-8">
        {[
          { severity: 'CRITICAL', title: 'WordPress REST API Fully Exposed', desc: '/wp-json/ publicly accessible - 100+ routes exposed', fix: 'Disable REST API plugin' },
          { severity: 'CRITICAL', title: 'Admin Username Leaked', desc: '/wp-json/wp/v2/users reveals "desicinema" username', fix: 'Block users endpoint' },
          { severity: 'CRITICAL', title: 'Video Embed URLs Predictable', desc: 'Pattern: ?trembed=X&trid=Y&trtype=1 - anyone can embed', fix: 'Token-based auth + X-Frame-Options' },
          { severity: 'HIGH', title: 'Movie Data Fully Scrapable', desc: 'All data in HTML - scraper can clone entire database', fix: 'JS rendering + anti-scraping' },
          { severity: 'HIGH', title: 'No CORS/X-Frame-Options', desc: 'Any website can iframe your content', fix: 'CSP + X-Frame-Options headers' },
        ].map((v, idx) => (
          <Card key={idx} className="bg-[#12121a] border border-red-900/30">
            <CardContent className="p-4 flex items-center gap-4">
              <Badge className={v.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-orange-600'}>{v.severity}</Badge>
              <div className="flex-1">
                <h4 className="font-bold text-white">{v.title}</h4>
                <p className="text-gray-400 text-sm">{v.desc}</p>
              </div>
              <Badge variant="outline" className="border-green-700 text-green-400 text-xs">{v.fix}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-green-950/50 to-green-900/20 border border-green-800/30">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4 text-green-400">How to Protect</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              'Disable WP REST API for unauthenticated users',
              'Add X-Frame-Options: SAMEORIGIN header',
              'Add Content-Security-Policy: frame-ancestors self',
              'Use token-based video embed URLs',
              'Check Referer header on embed pages',
              'Implement rate limiting against scraping',
              'Block /wp-json/wp/v2/users endpoint',
              'Load content via authenticated AJAX calls',
            ].map((fix, idx) => (
              <div key={idx} className="bg-black/30 rounded-lg p-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-green-200 text-sm">{fix}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
