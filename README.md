# DesiCinemas API

Movie API with video proxy and ad blocking for desicinemas.pk

## API Endpoints

- `GET /api/movies?page=1` - List all movies
- `GET /api/movie-detail?slug=<slug>` - Movie details with video embeds
- `GET /api/stream?trembed=0&trid=<id>&trtype=1` - Video proxy (no sandbox error, no ads)
- `GET /api/search?q=<query>` - Search movies
- `GET /api/latest` - Latest movies (auto-update)

## Deploy on Vercel

1. Import this repo on [vercel.com](https://vercel.com)
2. Framework: Next.js (auto-detected)
3. Click Deploy

## Tech Stack

- Next.js 16
- TypeScript
- Cheerio (HTML scraping)
- Tailwind CSS + shadcn/ui
