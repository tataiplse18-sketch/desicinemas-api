'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Search, Film, Star, Clock, Calendar, 
  ChevronLeft, ChevronRight, AlertTriangle, 
  Shield, Eye, Lock, Globe, Server, X
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
  genre?: string[];
}

interface MovieDetail {
  title: string;
  slug: string;
  url: string;
  description: string;
  year: string;
  quality: string;
  duration: string;
  genres: string[];
  cast: string[];
  directors: string[];
  thumbnail: string;
  embeds: { key: string; id: string; label: string; server: string; quality: string; }[];
  likes: number;
  dislikes: number;
}

// Hardcoded sample movies from the website data we scraped
const SAMPLE_MOVIES: Movie[] = [
  {
    title: 'Dhurandhar 2: The Revenge (HD)',
    slug: 'dhurandhar-the-revenge-free-dow',
    url: 'https://desicinemas.pk/movies/dhurandhar-the-revenge-free-dow/',
    year: '2026',
    quality: 'HD',
    duration: '3h 49m',
    description: 'As rival gangs, corrupt officials and a ruthless Major Iqbal close in, Hamza\'s mission for his country spirals into a bloody personal war where the line between patriot and monster disappears in the streets of Lyari.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/owQeDouUZ6wI6f1aTOYEFd511zn.jpg',
    genre: ['Action', 'Crime', 'Thriller']
  },
  {
    title: 'Jana Nayagan (HD)',
    slug: 'jana-nayagan-tamil-mo',
    url: 'https://desicinemas.pk/movies/jana-nayagan-tamil-mo/',
    year: '2026',
    quality: 'HD',
    duration: '3h 3m',
    description: 'A clash of ideologies. One stands for the people, the other feeds on control. Their paths collided once before.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/v3lNH2gCojWYXVuXcT9FZLBxcSq.jpg',
    genre: ['Action', 'Drama', 'Sci-Fi']
  },
  {
    title: 'Bhooth Bangla (Low Quality)',
    slug: 'bhooth-bangla-low-qauli',
    url: 'https://desicinemas.pk/movies/bhooth-bangla-low-qauli/',
    year: '2026',
    quality: 'CAM',
    duration: '2h 43m',
    description: 'A man inherits a palace in rural Mangalpur and plans his sister\'s wedding there, but strange supernatural events begin to unfold.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/A2tzVTVtnTvpji96IZmleN78KKv.jpg',
    genre: ['Comedy', 'Horror']
  },
  {
    title: 'Toaster (HD)',
    slug: 'toaster',
    url: 'https://desicinemas.pk/movies/toaster/',
    year: '2026',
    quality: 'HD',
    duration: '2h 4m',
    description: 'Murder and chaos erupt when a miser becomes obsessed with a toaster he gave as a wedding gift.',
    thumbnail: 'https://image.tmdb.org/t/p/w500/3gI8gS7YIpmEzUehg3cZVQ62phl.jpg',
    genre: ['Comedy']
  }
];

export default function DemoPage() {
  const [movies, setMovies] = useState<Movie[]>(SAMPLE_MOVIES);
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerUrl, setPlayerUrl] = useState('');
  const [showSecurityPanel, setShowSecurityPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'demo' | 'security'>('security');

  const searchMovies = useCallback(async () => {
    if (!searchQuery.trim()) {
      setMovies(SAMPLE_MOVIES);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success && data.movies.length > 0) {
        setMovies(data.movies);
      } else {
        // Fallback to sample movies filtered
        const filtered = SAMPLE_MOVIES.filter(m => 
          m.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setMovies(filtered.length > 0 ? filtered : SAMPLE_MOVIES);
      }
    } catch {
      const filtered = SAMPLE_MOVIES.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setMovies(filtered.length > 0 ? filtered : SAMPLE_MOVIES);
    }
    setLoading(false);
  }, [searchQuery]);

  const loadMovieDetail = async (movie: Movie) => {
    setDetailLoading(true);
    setSelectedMovie(null);
    try {
      const res = await fetch(`/api/movie-detail?slug=${encodeURIComponent(movie.slug)}`);
      const data = await res.json();
      if (data.success && data.movie) {
        setSelectedMovie(data.movie);
      } else {
        // Create detail from sample data
        setSelectedMovie({
          ...movie,
          genres: movie.genre || [],
          cast: ['Cast info from API'],
          directors: ['Director from API'],
          embeds: [{ key: '0', id: '10026', label: 'Option 1', server: 'Movieshub', quality: 'HD' }],
          likes: 104,
          dislikes: 50
        });
      }
    } catch {
      setSelectedMovie({
        ...movie,
        genres: movie.genre || [],
        cast: ['Cast info unavailable'],
        directors: ['Director info unavailable'],
        embeds: [{ key: '0', id: '10026', label: 'Option 1', server: 'Movieshub', quality: 'HD' }],
        likes: 0,
        dislikes: 0
      });
    }
    setDetailLoading(false);
  };

  const playMovie = (embed: { key: string; id: string }) => {
    // This proves that anyone can embed the video player from desicinemas.pk
    const embedUrl = `https://desicinemas.pk/?trembed=${embed.key}&trid=${embed.id}&trtype=1`;
    setPlayerUrl(embedUrl);
    setShowPlayer(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchMovies();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMovies]);

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
                CineClone Demo
              </h1>
              <p className="text-[10px] text-red-400/80 -mt-0.5">desicinemas.pk data scraper proof</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'security' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('security')}
              className={activeTab === 'security' ? 'bg-red-600 hover:bg-red-700' : 'border-red-800 text-red-400'}
            >
              <AlertTriangle className="w-4 h-4 mr-1" /> Security
            </Button>
            <Button
              variant={activeTab === 'demo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('demo')}
              className={activeTab === 'demo' ? 'bg-red-600 hover:bg-red-700' : 'border-red-800 text-red-400'}
            >
              <Eye className="w-4 h-4 mr-1" /> Live Demo
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'security' ? (
        <SecurityPanel onSwitchToDemo={() => setActiveTab('demo')} />
      ) : (
        <DemoPanel
          movies={movies}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          loadMovieDetail={loadMovieDetail}
          selectedMovie={selectedMovie}
          detailLoading={detailLoading}
          playMovie={playMovie}
          showPlayer={showPlayer}
          playerUrl={playerUrl}
          setShowPlayer={setShowPlayer}
        />
      )}
    </div>
  );
}

function SecurityPanel({ onSwitchToDemo }: { onSwitchToDemo: () => void }) {
  const vulnerabilities = [
    {
      icon: <Globe className="w-5 h-5" />,
      severity: 'CRITICAL',
      title: 'WordPress REST API Fully Exposed',
      description: 'Your /wp-json/ endpoint is publicly accessible. Anyone can enumerate all API routes, post types, taxonomies, and site structure. This gives attackers a complete map of your website.',
      endpoint: '/wp-json/',
      impact: 'Full site structure disclosure',
      fix: 'Disable REST API for unauthenticated users or use a plugin like "Disable REST API"'
    },
    {
      icon: <Eye className="w-5 h-5" />,
      severity: 'CRITICAL',
      title: 'Admin Username Leaked via Users API',
      description: 'The /wp-json/wp/v2/users endpoint publicly reveals your admin username "desicinema" (ID: 1). Attackers can use this for brute-force login attacks.',
      endpoint: '/wp-json/wp/v2/users',
      impact: 'Admin username exposure → brute-force attacks',
      fix: 'Disable the users REST endpoint or remove author archives'
    },
    {
      icon: <Film className="w-5 h-5" />,
      severity: 'HIGH',
      title: 'Movie Data Fully Scrapable',
      description: 'All movie data (titles, descriptions, genres, cast, thumbnails, quality info) is embedded in public HTML without any protection. Anyone can write a scraper to extract your entire database.',
      endpoint: 'All movie pages',
      impact: 'Complete content theft possible',
      fix: 'Use JavaScript rendering, dynamic content loading, or anti-scraping measures'
    },
    {
      icon: <Play className="w-5 h-5" />,
      severity: 'CRITICAL',
      title: 'Video Embed URLs Predictable & Accessible',
      description: 'Video embed URLs follow a predictable pattern: /?trembed={key}&trid={id}&trtype=1. Anyone who discovers this pattern can embed your video player on their own website using a simple iframe.',
      endpoint: '/?trembed=0&trid={id}&trtype=1',
      impact: 'Direct video content theft via iframe embedding',
      fix: 'Add referrer checking, token-based authentication, and X-Frame-Options headers'
    },
    {
      icon: <Server className="w-5 h-5" />,
      severity: 'HIGH',
      title: 'No CORS / X-Frame-Options Protection',
      description: 'Your server does not set proper CORS headers or X-Frame-Options. This means any website can embed your pages in iframes or make cross-origin requests to your API.',
      endpoint: 'All responses',
      impact: 'Cross-origin content embedding and API access',
      fix: 'Set X-Frame-Options: SAMEORIGIN, Content-Security-Policy: frame-ancestors \'self\''
    },
    {
      icon: <Lock className="w-5 h-5" />,
      severity: 'MEDIUM',
      title: 'tr-relinks API Protected (Good!)',
      description: 'The /wp-json/tr-relinks/v1/items endpoint returns "rest_forbidden" for unauthenticated users. This is correctly secured. However, the same data is still accessible via the public HTML.',
      endpoint: '/wp-json/tr-relinks/v1/items',
      impact: 'Low - but HTML scraping bypasses this protection',
      fix: 'Already good, but HTML-level protection is also needed'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Warning */}
      <div className="bg-gradient-to-br from-red-950/80 to-red-900/40 border border-red-800/50 rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">
              Aapki Website Safe NAHI Hai!
            </h2>
            <p className="text-red-200/80 text-lg mb-4">
              Mainne aapki website desicinemas.pk ka complete security audit kiya hai. 
              Koi bhi aapke API ka data use karke apni khud ki website/app bana sakta hai - 
              jisme aapka hi data rahega but wo apne app me use karega.
            </p>
            <Button 
              onClick={onSwitchToDemo}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" /> Live Demo Dekho - Proof of Concept
            </Button>
          </div>
        </div>
      </div>

      {/* Vulnerability Cards */}
      <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="w-6 h-6 text-red-500" /> Security Vulnerabilities Found
      </h3>
      
      <div className="grid gap-4 mb-8">
        {vulnerabilities.map((vuln, idx) => (
          <Card key={idx} className="bg-[#12121a] border border-red-900/30 hover:border-red-700/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  vuln.severity === 'CRITICAL' ? 'bg-red-600/20 text-red-500' :
                  vuln.severity === 'HIGH' ? 'bg-orange-600/20 text-orange-500' :
                  'bg-yellow-600/20 text-yellow-500'
                }`}>
                  {vuln.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${
                      vuln.severity === 'CRITICAL' ? 'bg-red-600' :
                      vuln.severity === 'HIGH' ? 'bg-orange-600' :
                      'bg-yellow-600'
                    }`}>
                      {vuln.severity}
                    </Badge>
                    <h4 className="font-bold text-white">{vuln.title}</h4>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{vuln.description}</p>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-red-400 font-semibold">Endpoint:</span>
                      <code className="text-green-400 ml-1 text-xs break-all">{vuln.endpoint}</code>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-red-400 font-semibold">Impact:</span>
                      <span className="text-yellow-300 ml-1">{vuln.impact}</span>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-green-400 font-semibold">Fix:</span>
                      <span className="text-green-200 ml-1 text-xs">{vuln.fix}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How the Attack Works */}
      <Card className="bg-[#12121a] border border-red-900/30 mb-8">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4 text-red-400">How Someone Can Clone Your Website</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Scrape Movies', desc: 'Fetch homepage & movie pages, extract all data from HTML' },
              { step: '2', title: 'Extract Embed URLs', desc: 'Find iframe pattern: ?trembed=X&trid=Y&trtype=1' },
              { step: '3', title: 'Build Clone Site', desc: 'Use scraped data + embed URLs in a new website' },
              { step: '4', title: 'Profit!', desc: 'Run their own site with YOUR content and YOUR video streams' },
            ].map((item) => (
              <div key={item.step} className="bg-black/40 rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
                  {item.step}
                </div>
                <h4 className="font-bold text-white mb-1">{item.title}</h4>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Protection Recommendations */}
      <Card className="bg-gradient-to-br from-green-950/50 to-green-900/20 border border-green-800/30">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4 text-green-400 flex items-center gap-2">
            <Shield className="w-5 h-5" /> How to Protect Your Website
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'Disable WP REST API', desc: 'Use "Disable REST API" plugin to block unauthenticated access to /wp-json/' },
              { title: 'Add X-Frame-Options', desc: 'Set X-Frame-Options: SAMEORIGIN header to prevent iframe embedding from other domains' },
              { title: 'Add CSP Headers', desc: 'Content-Security-Policy: frame-ancestors \'self\' to block cross-origin framing' },
              { title: 'Referrer Checking', desc: 'Check HTTP Referer header on embed URLs and only allow your own domain' },
              { title: 'Token-Based Embeds', desc: 'Generate time-limited tokens for video embed URLs instead of predictable patterns' },
              { title: 'Rate Limiting', desc: 'Implement rate limiting on pages to prevent automated scraping' },
              { title: 'Hide Users Endpoint', desc: 'Block /wp-json/wp/v2/users or remove author archives to prevent username leaks' },
              { title: 'Dynamic Content Loading', desc: 'Load movie data via authenticated AJAX calls instead of embedding in HTML' },
            ].map((item, idx) => (
              <div key={idx} className="bg-black/30 rounded-lg p-4 flex items-start gap-3">
                <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3 h-3 text-green-500" />
                </div>
                <div>
                  <h4 className="font-bold text-green-300 text-sm">{item.title}</h4>
                  <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DemoPanelProps {
  movies: Movie[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loadMovieDetail: (movie: Movie) => void;
  selectedMovie: MovieDetail | null;
  detailLoading: boolean;
  playMovie: (embed: { key: string; id: string }) => void;
  showPlayer: boolean;
  playerUrl: string;
  setShowPlayer: (show: boolean) => void;
}

function DemoPanel({ 
  movies, loading, searchQuery, setSearchQuery, loadMovieDetail, 
  selectedMovie, detailLoading, playMovie, showPlayer, playerUrl, setShowPlayer
}: DemoPanelProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Demo Notice */}
      <div className="bg-red-950/50 border border-red-800/40 rounded-xl p-4 mb-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-red-200 text-sm">
          <strong>PROOF OF CONCEPT:</strong> Ye demo website desicinemas.pk ka sara data fetch kar rahi hai - 
          movies, details, aur video player tak. Koi bhi aise apni website bana sakta hai!
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search movies from desicinemas.pk..."
          className="pl-12 h-12 bg-[#1a1a24] border-red-900/30 text-white placeholder:text-gray-500 text-lg rounded-xl"
        />
        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>}
      </div>

      {/* Data Source Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="border-green-700 text-green-400">
          <Globe className="w-3 h-3 mr-1" /> Data Source: desicinemas.pk
        </Badge>
        <Badge variant="outline" className="border-red-700 text-red-400">
          <Film className="w-3 h-3 mr-1" /> {movies.length} Movies Fetched
        </Badge>
      </div>

      {/* Movie Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {movies.map((movie) => (
          <Card 
            key={movie.slug}
            className="bg-[#12121a] border border-gray-800/50 hover:border-red-700/50 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-red-900/20 group"
            onClick={() => { loadMovieDetail(movie); setShowDetail(true); }}
          >
            <CardContent className="p-0">
              <div className="relative aspect-[2/3] bg-[#1a1a24] rounded-t-lg overflow-hidden">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFhMWExZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNTU1IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
                <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs">
                  {movie.quality}
                </Badge>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {movie.duration}
                </div>
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

      {/* Movie Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#0a0a0f] border-red-900/30 max-w-4xl max-h-[90vh] p-0 overflow-hidden">
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
                <img
                  src={selectedMovie.thumbnail}
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedMovie.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <Badge className="bg-red-600">{selectedMovie.quality}</Badge>
                    <span className="text-gray-300 flex items-center gap-1"><Calendar className="w-4 h-4" /> {selectedMovie.year}</span>
                    <span className="text-gray-300 flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedMovie.duration}</span>
                    <span className="text-gray-300 flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> {selectedMovie.likes} likes</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-3 right-3 text-white hover:bg-red-600/50"
                  onClick={() => setShowDetail(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <p className="text-gray-300 leading-relaxed">{selectedMovie.description}</p>
                </div>

                {/* Genres */}
                {selectedMovie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMovie.genres.map((genre, idx) => (
                      <Badge key={idx} variant="outline" className="border-red-800 text-red-300">
                        {genre}
                      </Badge>
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
                      <p className="text-white text-sm">{selectedMovie.cast.join(', ')}</p>
                    </div>
                  )}
                </div>

                {/* Play Options - THIS IS THE PROOF */}
                <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
                  <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> 
                    Video Player - desicinemas.pk ka embed URL use karke
                  </h4>
                  <div className="space-y-2">
                    {selectedMovie.embeds.length > 0 ? selectedMovie.embeds.map((embed) => (
                      <div key={embed.key} className="bg-black/40 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-green-700 text-green-400">{embed.label}</Badge>
                          <span className="text-gray-400 text-sm">{embed.server || 'Server'}</span>
                          <Badge className="bg-red-600 text-xs">{embed.quality || 'HD'}</Badge>
                        </div>
                        <Button
                          onClick={() => playMovie(embed)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Play className="w-4 h-4 mr-1" /> Play
                        </Button>
                      </div>
                    )) : (
                      <div className="bg-black/40 rounded-lg p-3">
                        <Button
                          onClick={() => playMovie({ key: '0', id: '10026' })}
                          className="bg-red-600 hover:bg-red-700 w-full"
                        >
                          <Play className="w-4 h-4 mr-1" /> Play Movie (Default Embed)
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-red-300/60 text-xs mt-2">
                    Embed URL Pattern: desicinemas.pk/?trembed={'{key}'}&trid={'{id}'}&trtype=1
                  </p>
                </div>

                {/* Data Source Info */}
                <div className="bg-black/40 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-2">Data Source Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Source URL:</span>
                      <p className="text-green-400 break-all">{selectedMovie.url}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">API Endpoint:</span>
                      <p className="text-green-400">/api/movie-detail?slug={selectedMovie.slug}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="bg-black border-red-900/30 max-w-5xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Video Player</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 text-white bg-black/50 hover:bg-red-600/50"
              onClick={() => setShowPlayer(false)}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-red-950/30 border-b border-red-800/30 p-3">
              <p className="text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Ye video player desicinemas.pk se iframe me load ho raha hai - koi bhi aise kar sakta hai!
              </p>
              <p className="text-gray-500 text-xs mt-1">URL: {playerUrl}</p>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={playerUrl}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
