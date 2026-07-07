export const state = {
  feeds: [],
  articles: [],
  activeFeedId: 'all',      
  activeView: 'all',        
  searchQuery: '',
  currentPage: 1,
  pageSize: 10,
  favorites: new Set(),
  expandedArticleIds: new Set(),
};