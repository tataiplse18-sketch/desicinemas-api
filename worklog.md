---
Task ID: 1
Agent: Main Agent
Task: Fix sandbox error and implement iframe video player with proxy API

Work Log:
- Analyzed previous session's code and video flow
- Discovered that embed page at ?trembed=0&trid=10026&trtype=1 contains iframe to movieshub.rpmplay.xyz
- The rpmplay.xyz player has sandbox detection that blocks iframe embedding
- Created /api/stream endpoint - server-side proxy that fetches player HTML and serves it from our own domain
- The proxy rewrites relative URLs to absolute, injects sandbox bypass and ad removal scripts
- Updated frontend to use iframe with /api/stream URL instead of opening in new tab
- Added fullscreen player overlay mode
- Created /api/latest endpoint for auto-updating latest movies
- Built and tested successfully - stream API returns 200 with proper HTML

Stage Summary:
- /api/stream proxy working - fetches player page, rewrites URLs, injects bypass scripts
- Video player now plays in iframe on same domain (no sandbox error)
- Frontend updated with iframe player, fullscreen mode, and server selection
- /api/latest endpoint provides auto-updating movie list
- All API endpoints: /api/movies, /api/movie-detail, /api/stream, /api/search, /api/latest, /api/embed, /api/video
