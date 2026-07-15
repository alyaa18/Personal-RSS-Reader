export const state = {
  feeds: [],
  articles: [],
  playlists: [],
  playlistArticles: [],
  currentPlaylistMeta: null,
  activeFeedId: 'all',
  sidebarMode: 'feeds',       // 'feeds' | 'playlists'
  activeView: 'all',          // 'all' | 'starred' | 'playlist'
  activePlaylistId: null,
  searchQuery: '',
  currentPage: 1,
  pageSize: 10,
  favorites: new Set(),
  expandedArticleIds: new Set(),
};