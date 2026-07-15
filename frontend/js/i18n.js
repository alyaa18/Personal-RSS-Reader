// ── i18n: Arabic / English localization system ────────────────

const LANG_KEY = 'rss-reader:lang';

const translations = {
  en: {
    /* ── Auth ── */
    'app.name': 'RSS Reader',
    'app.eyebrow': 'The Daily',
    'auth.login': 'Log in',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.display_name': 'Display name',
    'auth.password_hint': 'At least 8 characters.',
    'auth.create_account': 'Create account',
    'auth.logging_in': 'Logging in\u2026',
    'auth.creating_account': 'Creating account\u2026',
    'auth.login_error': 'Could not log in.',
    'auth.register_error': 'Could not create account.',
    'auth.login_success': 'Logged in successfully.',
    'auth.logout': 'Log out',
    'auth.session_expired': 'Your session has expired. Please log in again.',
    'auth.verify_title': 'Check your email',
    'auth.verify_body': 'We sent a verification link to {email}. Please click the link to activate your account.',
    'auth.resend_verify': 'Resend verification email',
    'auth.resent': 'Sent!',
    'auth.sending': 'Sending\u2026',
    'auth.back_to_login': 'Back to sign in',

    /* ── Sidebar ── */
    'nav.all_articles': 'All Articles',
    'nav.starred': 'Starred',
    'nav.feeds': 'Feeds',
    'nav.playlists': 'Playlists',
    'sidebar.no_feeds': 'No feeds yet. Add one below to get started.',
    'sidebar.no_playlists': 'No playlists yet.',
    'sidebar.new_playlist': '+ New Playlist',
    'sidebar.refresh_feed': 'Refresh feed',
    'sidebar.remove_feed': 'Remove feed',
    'sidebar.delete_playlist': 'Delete playlist',
    'sidebar.scroll_left': 'Scroll feeds left',
    'sidebar.scroll_right': 'Scroll feeds right',

    /* ── Content ── */
    'content.add_feed': 'Add Feed',
    'content.refresh_all': 'Refresh All',
    'content.search_placeholder': 'Search articles by title or content\u2026',
    'content.all_articles': 'All Articles',
    'content.starred': 'Starred',
    'content.playlist': 'Playlist',
    'content.refreshing': 'Refreshing\u2026',

    /* ── States ── */
    'state.empty_title': 'No articles yet',
    'state.empty_body':
      'Paste an RSS or Atom feed URL above to start reading. Try something like BBC News or the GitHub Blog.',
    'state.add_first_feed': 'Add your first feed',
    'state.playlist_empty_title': 'This playlist is empty',
    'state.playlist_empty_body':
      'Use the 📁 button on any article to add it to this playlist.',
    'state.no_playlists_title': 'No playlists yet',
    'state.no_playlists_body':
      'Create your first playlist to start organizing your articles.',

    /* ── Pagination ── */
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.go_to': 'Go to',

    /* ── Modals: Add Feed ── */
    'modal.add_feed_title': 'Add a feed',
    'modal.add_feed_subtitle': 'Paste the URL of an RSS or Atom feed.',
    'modal.feed_url': 'Feed URL',
    'modal.cancel': 'Cancel',
    'modal.suggestions': 'Recommended feeds',
    'modal.suggestions_bbc': 'BBC News',
    'modal.suggestions_github': 'GitHub Blog',
    'modal.suggestions_mit': 'MIT News',
    'modal.suggestions_hackernews': 'Hacker News',
    'modal.add_feed': 'Add Feed',
    'modal.adding': 'Adding\u2026',

    /* ── Modals: Playlist ── */
    'modal.new_playlist_title': 'New playlist',
    'modal.new_playlist_subtitle': 'Give your playlist a name.',
    'modal.name': 'Name',
    'modal.create': 'Create',
    'modal.creating': 'Creating\u2026',
    'modal.add_to_playlist_title': 'Add to playlist',
    'modal.add_to_playlist_subtitle': 'Choose one or more playlists.',
    'modal.no_playlists': "You don't have any playlists yet.",
    'modal.done': 'Done',
    'modal.add': 'Add',
    'modal.added': 'Added \u2713',

    /* ── Modals: Confirm ── */
    'confirm.are_you_sure': 'Are you sure?',
    'confirm.remove_feed_title': 'Remove feed?',
    'confirm.remove_feed_message': 'Remove "{name}"? This also deletes its saved articles.',
    'confirm.delete_playlist_title': 'Delete playlist?',
    'confirm.delete_playlist_message':
      'Delete "{name}"? This does not delete the articles themselves, only the playlist.',
    'confirm.remove_label': 'Remove',
    'confirm.delete_label': 'Delete',
    'confirm.confirm_label': 'Confirm',

    /* ── Article Cards ── */
    'article.show_more': 'Show more',
    'article.show_less': 'Show less',
    'article.copy_link': '\u{1F4CE} Copy link',
    'article.copied': 'Copied!',
    'article.add_to_playlist': 'Add to playlist',
    'article.add_to_favorites': 'Add to favorites',

    /* ── Banners & Messages ── */
    'banner.added_feed': 'Added "{name}".',
    'banner.removed_feed': 'Removed "{name}".',
    'banner.created_playlist': 'Created playlist "{name}".',
    'banner.deleted_playlist': 'Deleted "{name}".',
    'banner.new_articles_single': '{count} new article from "{name}".',
    'banner.new_articles_plural': '{count} new articles from "{name}".',
    'banner.new_articles_total': '{count} new article(s) found.',
    'banner.feeds_refresh_failed': 'Could not refresh {count} feed(s)',
    'banner.load_error': 'Something went wrong loading your feeds.',
    'banner.server_error': 'Could not reach the server. Is the backend running?',
    'banner.favorite_error': 'Could not update favorite.',
    'banner.copy_error': 'Could not copy link \u2014 copy it manually from the address bar instead.',
    'banner.copy_url_error': 'Could not copy \u2014 select and copy the URL manually.',
    'banner.add_to_playlist_error': 'Could not add to playlist.',
    'banner.feed_exists': '"{name}" is already in your feeds \u2014 navigating there now.',

    /* ── Language ── */
    'lang.switch': '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
    'lang.current': 'English',

    /* ── Guest mode ── */
    'guest.welcome_title': 'Welcome to RSS Reader',
    'guest.welcome_body':
      'You are browsing a demo view. Sign in or create an account to save your feeds, favorites, and playlists.',
    'guest.guest_badge': 'Guest',
    'guest.login_prompt': 'Sign in',
    'guest.login_required': 'Please sign in or create an account to use this feature.',

    /* ── Onboarding ── */
    'onboarding.title': 'Welcome! Add some starter feeds',
    'onboarding.body': 'Get started by adding a few popular feeds with one click:',
    'onboarding.add_feed': 'Add',
    'onboarding.added': 'Added \u2713',
    'onboarding.skip': "Skip, I\u2019ll add my own",

    /* ── General ── */
    'general.or': 'or',
    'general.loading': 'Loading\u2026',
    'general.back_to_top': 'Back to top',

    /* ── Playlist toolbar ── */
    'playlist.public_rss': 'Public RSS feed:',
    'playlist.copy_url': 'Copy URL',
    'playlist.delete': 'Delete Playlist',
  },

  ar: {
    /* ── Auth ── */
    'app.name': '\u0642\u0627\u0631\u0626 RSS',
    'app.eyebrow': '\u0627\u0644\u064A\u0648\u0645\u064A',
    'auth.login': '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644',
    'auth.register': '\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628',
    'auth.email': '\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A',
    'auth.password': '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    'auth.display_name': '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0638\u0627\u0647\u0631',
    'auth.password_hint': '\u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 8 \u0623\u062D\u0631\u0641.',
    'auth.create_account': '\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628',
    'auth.logging_in': '\u062C\u0627\u0631\u064A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644\u2026',
    'auth.creating_account': '\u062C\u0627\u0631\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628\u2026',
    'auth.login_error': '\u062A\u0639\u0630\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644.',
    'auth.register_error': '\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628.',
    'auth.login_success': '\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D.',
    'auth.logout': '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C',
    'auth.session_expired': '\u0627\u0646\u062A\u0647\u062A \u062C\u0644\u0633\u062A\u0643. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.',
    'auth.verify_title': '\u062A\u062D\u0642\u0642 \u0645\u0646 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A',
    'auth.verify_body': '\u0644\u0642\u062F \u0623\u0631\u0633\u0644\u0646\u0627 \u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 {email}. \u064A\u0631\u062C\u0649 \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643.',
    'auth.resend_verify': '\u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644 \u0628\u0631\u064A\u062F \u0627\u0644\u062A\u062D\u0642\u0642',
    'auth.resent': '\u062A\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644!',
    'auth.sending': '\u062C\u0627\u0631\u064D \u0627\u0644\u0625\u0631\u0633\u0627\u0644\u2026',
    'auth.back_to_login': '\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644',

    /* ── Sidebar ── */
    'nav.all_articles': '\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A',
    'nav.starred': '\u0627\u0644\u0645\u0645\u064A\u0632\u0629',
    'nav.feeds': '\u0627\u0644\u0645\u0635\u0627\u062F\u0631',
    'nav.playlists': '\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u062A\u0634\u063A\u064A\u0644',
    'sidebar.no_feeds': '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0635\u0627\u062F\u0631 \u0628\u0639\u062F. \u0623\u0636\u0641 \u0648\u0627\u062D\u062F\u0627\u064B \u0623\u062F\u0646\u0627\u0647 \u0644\u0644\u0628\u062F\u0621.',
    'sidebar.no_playlists': '\u0644\u0627 \u062A\u0648\u062C\u062F \u0642\u0648\u0627\u0626\u0645 \u062A\u0634\u063A\u064A\u0644 \u0628\u0639\u062F.',
    'sidebar.new_playlist': '+\u200F \u0642\u0627\u0626\u0645\u0629 \u062A\u0634\u063A\u064A\u0644 \u062C\u062F\u064A\u062F\u0629',
    'sidebar.refresh_feed': '\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0635\u062F\u0631',
    'sidebar.remove_feed': '\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0645\u0635\u062F\u0631',
    'sidebar.delete_playlist': '\u062D\u0630\u0641 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644',
    'sidebar.scroll_left': '\u062A\u0645\u0631\u064A\u0631 \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0644\u0644\u064A\u0633\u0627\u0631',
    'sidebar.scroll_right': '\u062A\u0645\u0631\u064A\u0631 \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0644\u0644\u064A\u0645\u064A\u0646',

    /* ── Content ── */
    'content.add_feed': '\u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u062F\u0631',
    'content.refresh_all': '\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0643\u0644',
    'content.search_placeholder': '\u0627\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A \u0628\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0623\u0648 \u0627\u0644\u0645\u062D\u062A\u0648\u0649\u2026',
    'content.all_articles': '\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A',
    'content.starred': '\u0627\u0644\u0645\u0645\u064A\u0632\u0629',
    'content.playlist': '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644',
    'content.refreshing': '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u062F\u064A\u062B\u2026',

    /* ── States ── */
    'state.empty_title': '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0642\u0627\u0644\u0627\u062A \u0628\u0639\u062F',
    'state.empty_body':
      '\u0627\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 RSS \u0623\u0648 Atom \u0623\u0639\u0644\u0627\u0647 \u0644\u0644\u0628\u062F\u0621. \u062C\u0631\u0628 BBC News \u0623\u0648 \u0645\u062F\u0648\u0646\u0629 GitHub.',
    'state.add_first_feed': '\u0623\u0636\u0641 \u0645\u0635\u062F\u0631\u0643 \u0627\u0644\u0623\u0648\u0644',
    'state.playlist_empty_title': '\u0647\u0630\u0647 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0641\u0627\u0631\u063A\u0629',
    'state.playlist_empty_body':
      '\u0627\u0633\u062A\u062E\u062F\u0645 \u0632\u0631 \uD83D\uDCC2 \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0639\u0644\u0649 \u0623\u064A \u0645\u0642\u0627\u0644\u0629 \u0644\u0625\u0636\u0627\u0641\u062A\u0647\u0627 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.',
    'state.no_playlists_title': '\u0644\u0627 \u062A\u0648\u062C\u062F \u0642\u0648\u0627\u0626\u0645 \u062A\u0634\u063A\u064A\u0644 \u0628\u0639\u062F',
    'state.no_playlists_body':
      '\u0627\u0646\u0634\u0623 \u0642\u0627\u0626\u0645\u062A\u0643 \u0627\u0644\u0623\u0648\u0644\u0649 \u0644\u0628\u062F\u0621 \u062A\u0646\u0638\u064A\u0645 \u0645\u0642\u0627\u0644\u0627\u062A\u0643.',

    /* ── Pagination ── */
    'pagination.previous': '\u0627\u0644\u0633\u0627\u0628\u0642',
    'pagination.next': '\u0627\u0644\u062A\u0627\u0644\u064A',
    'pagination.go_to': '\u0627\u0630\u0647\u0628 \u0625\u0644\u0649',

    /* ── Modals: Add Feed ── */
    'modal.add_feed_title': '\u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u062F\u0631',
    'modal.add_feed_subtitle': '\u0623\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u062E\u0644\u0627\u0635\u0629 RSS \u0623\u0648 Atom.',
    'modal.feed_url': '\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0635\u062F\u0631',
    'modal.cancel': '\u0625\u0644\u063A\u0627\u0621',
    'modal.suggestions': '\u062C\u0631\u0628 \u0623\u062D\u062F \u0647\u0630\u0647:',
    'modal.suggestions_bbc': 'BBC News',
    'modal.suggestions_github': '\u0645\u062F\u0648\u0646\u0629 GitHub',
    'modal.suggestions_mit': 'MIT News',
    'modal.suggestions_hackernews': 'Hacker News',
    'modal.add_feed': '\u0625\u0636\u0627\u0641\u0629 \u0645\u0635\u062F\u0631',
    'modal.adding': '\u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0636\u0627\u0641\u0629\u2026',

    /* ── Modals: Playlist ── */
    'modal.new_playlist_title': '\u0642\u0627\u0626\u0645\u0629 \u062A\u0634\u063A\u064A\u0644 \u062C\u062F\u064A\u062F\u0629',
    'modal.new_playlist_subtitle': '\u0623\u0639\u0637 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0633\u0645\u0627\u064B.',
    'modal.name': '\u0627\u0644\u0627\u0633\u0645',
    'modal.create': '\u0625\u0646\u0634\u0627\u0621',
    'modal.creating': '\u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0646\u0634\u0627\u0621\u2026',
    'modal.add_to_playlist_title': '\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u062A\u0634\u063A\u064A\u0644',
    'modal.add_to_playlist_subtitle': '\u0627\u062E\u062A\u0631 \u0642\u0627\u0626\u0645\u0629 \u062A\u0634\u063A\u064A\u0644 \u0623\u0648 \u0623\u0643\u062B\u0631.',
    'modal.no_playlists': '\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0623\u064A \u0642\u0648\u0627\u0626\u0645 \u062A\u0634\u063A\u064A\u0644 \u0628\u0639\u062F.',
    'modal.done': '\u062A\u0645',
    'modal.add': '\u0625\u0636\u0627\u0641\u0629',
    'modal.added': '\u062A\u0645\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u2713',

    /* ── Modals: Confirm ── */
    'confirm.are_you_sure': '\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F\u061F',
    'confirm.remove_feed_title': '\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0645\u0635\u062F\u0631\u061F',
    'confirm.remove_feed_message': '\u0647\u0644 \u062A\u0631\u064A\u062F \u0625\u0632\u0627\u0644\u0629 "{name}"\u061F \u0633\u064A\u062A\u0645 \u0623\u064A\u0636\u0627\u064B \u062D\u0630\u0641 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629.',
    'confirm.delete_playlist_title': '\u062D\u0630\u0641 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u061F',
    'confirm.delete_playlist_message':
      '\u0647\u0644 \u062A\u0631\u064A\u062F \u062D\u0630\u0641 "{name}"\u061F \u0644\u0646 \u064A\u0624\u062B\u0631 \u0630\u0644\u0643 \u0639\u0644\u0649 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A \u0646\u0641\u0633\u0647\u0627\u060C \u0628\u0644 \u0639\u0644\u0649 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0641\u0642\u0637.',
    'confirm.remove_label': '\u0625\u0632\u0627\u0644\u0629',
    'confirm.delete_label': '\u062D\u0630\u0641',
    'confirm.confirm_label': '\u062A\u0623\u0643\u064A\u062F',

    /* ── Article Cards ── */
    'article.show_more': '\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064A\u062F',
    'article.show_less': '\u0639\u0631\u0636 \u0623\u0642\u0644',
    'article.copy_link': '\u{1F4CE} \u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637',
    'article.copied': '\u062A\u0645 \u0627\u0644\u0646\u0633\u062E!',
    'article.add_to_playlist': '\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u062A\u0634\u063A\u064A\u0644',
    'article.add_to_favorites': '\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0641\u0636\u0644\u0629',

    /* ── Banners & Messages ── */
    'banner.added_feed': '\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 "{name}".',
    'banner.removed_feed': '\u062A\u0645\u062A \u0625\u0632\u0627\u0644\u0629 "{name}".',
    'banner.created_playlist': '\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 "{name}".',
    'banner.deleted_playlist': '\u062A\u0645 \u062D\u0630\u0641 "{name}".',
    'banner.new_articles_single': '{count} \u0645\u0642\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 "{name}".',
    'banner.new_articles_plural': '{count} \u0645\u0642\u0627\u0644\u0627\u062A \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 "{name}".',
    'banner.new_articles_total': '\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 {count} \u0645\u0642\u0627\u0644\u0629(\u0627\u062A) \u062C\u062F\u064A\u062F\u0629.',
    'banner.feeds_refresh_failed': '\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062B {count} \u0645\u0635\u062F\u0631(\u0645\u0635\u0627\u062F\u0631).',
    'banner.load_error': '\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643.',
    'banner.server_error': '\u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062E\u0627\u062F\u0645. \u0647\u0644 \u0627\u0644\u062E\u0627\u062F\u0645 \u0627\u0644\u062E\u0644\u0641\u064A \u0639\u0645\u0644\u0627\u064B\u061F',
    'banner.favorite_error': '\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0641\u0636\u0644\u0629.',
    'banner.copy_error': '\u062A\u0639\u0630\u0631 \u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637 \u2014 \u0627\u0646\u0633\u062E\u0647 \u064A\u062F\u0648\u064A\u0627\u064B \u0645\u0646 \u0634\u0631\u064A\u0637 \u0627\u0644\u0639\u0646\u0648\u0627\u0646.',
    'banner.copy_url_error': '\u062A\u0639\u0630\u0631 \u0627\u0644\u0646\u0633\u062E \u2014 \u062D\u062F\u062F \u0648\u0627\u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u062F\u0648\u064A\u0627\u064B.',
    'banner.add_to_playlist_error': '\u062A\u0639\u0630\u0631\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644.',
    'banner.feed_exists': '"{name}" \u0645\u0648\u062C\u0648\u062F \u0641\u0639\u0644\u0627\u064B \u0641\u064A \u0645\u0635\u0627\u062F\u0631\u0643 \u2014 \u062C\u0627\u0631\u064D \u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u0625\u0644\u064A\u0647.',

    /* ── Language ── */
    'lang.switch': 'English',
    'lang.current': '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',

    /* ── Guest mode ── */
    'guest.welcome_title': '\u0645\u0631\u062D\u0628\u0627\u064B \u0641\u064A RSS Reader',
    'guest.welcome_body':
      '\u0623\u0646\u062A \u062A\u062A\u0635\u0641\u062D \u0639\u0631\u0636\u0627\u064B \u062A\u062C\u0631\u064A\u0628\u064A\u0627\u064B. \u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0623\u0646\u0634\u0621 \u062D\u0633\u0627\u0628\u0627\u064B \u0644\u062D\u0641\u0638 \u0645\u0635\u0627\u062F\u0631\u0643 \u0648\u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0648\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u062A\u0634\u063A\u064A\u0644.',
    'guest.guest_badge': '\u0636\u064A\u0641',
    'guest.login_prompt': '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644',
    'guest.login_required': '\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u0645\u064A\u0632\u0629.',

    /* ── Onboarding ── */
    'onboarding.title': '\u0645\u0631\u062D\u0628\u0627\u064B! \u0623\u0636\u0641 \u0628\u0639\u0636 \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629',
    'onboarding.body': '\u0627\u0628\u062F\u0623 \u0628\u0625\u0636\u0627\u0641\u0629 \u0628\u0639\u0636 \u0627\u0644\u0645\u0635\u0627\u062F\u0631 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0628\u0646\u0642\u0631\u0629 \u0648\u0627\u062D\u062F\u0629:',
    'onboarding.add_feed': '\u0625\u0636\u0627\u0641\u0629',
    'onboarding.added': '\u062A\u0645\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u2713',
    'onboarding.skip': '\u062A\u062C\u0627\u0648\u0632\u060C \u0633\u0623\u0636\u064A\u0641 \u0645\u0635\u0627\u062F\u0631\u064A \u062E\u0627\u0635\u0629',

    /* ── General ── */
    'general.or': '\u0623\u0648',
    'general.loading': '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026',
    'general.back_to_top': '\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0623\u0639\u0644\u0649',

    /* ── Playlist toolbar ── */
    'playlist.public_rss': '\u062E\u0644\u0627\u0635\u0629 RSS \u0639\u0627\u0645\u0629:',
    'playlist.copy_url': '\u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637',
    'playlist.delete': '\u062D\u0630\u0641 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644',
  },
};

// ── Current language state ──

let currentLang = localStorage.getItem(LANG_KEY) || 'en';

// ── Article translation cache ──
const translationCache = new Map(); // key -> { ar: '...' }

// ── DOM elements cache ──
let langSwitchBtn = null;

// ── Language change listener ──
let onLangChanged = null;
export function setOnLangChanged(callback) {
  onLangChanged = callback;
}

// ── Apply language to HTML element ──

function applyLangToHtml(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}

// ── Load saved language preference immediately ──
applyLangToHtml(currentLang);

// ── Core translate function ──

export function t(key, ...args) {
  const dict = translations[currentLang] || translations.en;
  let msg = dict[key];
  if (msg === undefined) {
    // Fall back to English
    msg = translations.en[key];
    if (msg === undefined) return key;
  }
  // Simple interpolation: replace {0}, {1}, etc AND {name}
  if (args.length > 0) {
    const params = args[0] || {};
    if (typeof params === 'object') {
      msg = msg.replace(/\{(count|name)\}/g, (_, k) => params[k] ?? '');
    } else {
      msg = msg.replace(/\{(\d+)\}/g, (_, i) => args[parseInt(i)] ?? '');
    }
  }
  return msg;
}

// ── Get current language ──

export function getCurrentLang() {
  return currentLang;
}

// ── Set language and update UI ──

export function setLanguage(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyLangToHtml(lang);
  updateUILanguage();
  updateLangSwitchButton();
  if (onLangChanged) onLangChanged();

  // Also update the session-stored user object so it survives page refresh
  updateSessionUserLanguage(lang);

  // Persist to backend (fire-and-forget — don't block UI on this)
  syncLanguageToServer(lang);
}

function updateSessionUserLanguage(lang) {
  try {
    const raw = sessionStorage.getItem('rss-reader:user');
    if (raw) {
      const user = JSON.parse(raw);
      user.preferredLanguage = lang;
      sessionStorage.setItem('rss-reader:user', JSON.stringify(user));
    }
  } catch {
    // Ignore — not critical
  }
}

async function syncLanguageToServer(lang) {
  try {
    const token = getAuthToken();
    if (!token) return;
    await api.updateLanguage(lang);
  } catch {
    // Silently ignore — localStorage preference is the source of truth
    // and will be re-synced on next successful change.
  }
}

// ── Update all static UI text ──

export function updateUILanguage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  });
}

// ── Create and manage the language switch button ──

export function initLangSwitch(container) {
  langSwitchBtn = document.createElement('button');
  langSwitchBtn.type = 'button';
  langSwitchBtn.className = 'lang-switch-btn';
  updateLangSwitchButton();
  langSwitchBtn.addEventListener('click', () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
  });
  container.appendChild(langSwitchBtn);
}

function updateLangSwitchButton() {
  if (!langSwitchBtn) return;
  langSwitchBtn.textContent = t('lang.switch');
}

// ── Article content translation ──
// Uses the global `api` object and auth token from localStorage

function getAuthToken() {
  try {
    return localStorage.getItem('rss-reader:token');
  } catch {
    return null;
  }
}

export async function translateArticleContent(article) {
  if (currentLang !== 'ar') return article;

  const cacheKey = `article:${article.id}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return { ...article, ...cached };

  // Build texts to translate
  const textsToTranslate = {};
  if (article.title) textsToTranslate.title = article.title;
  // For summary, strip HTML tags first for translation
  if (article.summary) {
    const div = document.createElement('div');
    div.innerHTML = article.summary;
    textsToTranslate.summary = div.textContent || '';
  }

  if (Object.keys(textsToTranslate).length === 0) return article;

  const token = getAuthToken();
  if (!token) return article;

  try {
    const response = await fetch(`${api.API_BASE_URL}/translate/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        texts: textsToTranslate,
        source: 'auto',
        target: 'ar',
      }),
    });

    if (!response.ok) return article;

    const result = await response.json();
    const translations = result.translations || {};

    const translated = {};
    if (translations.title) translated.title = translations.title;
    if (translations.summary) translated.summary = translations.summary;
    // Keep the original if translation failed
    if (!translated.title) translated.title = article.title;
    if (!translated.summary) translated.summary = article.summary;

    translationCache.set(cacheKey, translated);
    return { ...article, ...translated };
  } catch {
    return article;
  }
}

export async function translateArticles(articles) {
  if (currentLang !== 'ar') return articles;

  // Check cache first
  const uncached = articles.filter((a) => !translationCache.has(`article:${a.id}`));
  if (uncached.length === 0) {
    return articles.map((a) => {
      const cached = translationCache.get(`article:${a.id}`);
      return cached ? { ...a, ...cached } : a;
    });
  }

  const token = getAuthToken();
  if (!token) return articles;

  // For articles with no cache, translate in batches
  const batchSize = 5;
  const results = [...articles];

  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    const textsMap = {};
    const idMap = {};

    batch.forEach((a) => {
      const key = `title_${a.id}`;
      textsMap[key] = a.title || '';
      idMap[key] = a.id;
      if (a.summary) {
        const div = document.createElement('div');
        div.innerHTML = a.summary;
        const plainSummary = div.textContent || '';
        const summaryKey = `summary_${a.id}`;
        textsMap[summaryKey] = plainSummary;
        idMap[summaryKey] = a.id;
      }
    });

    if (Object.keys(textsMap).length === 0) continue;

    try {
      const response = await fetch(`${api.API_BASE_URL}/translate/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          texts: textsMap,
          source: 'auto',
          target: 'ar',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const translations = result.translations || {};

        // Cache results
        batch.forEach((a) => {
          const translated = {};
          const tTitle = translations[`title_${a.id}`];
          const tSummary = translations[`summary_${a.id}`];
          if (tTitle) translated.title = tTitle;
          if (tSummary) translated.summary = tSummary;
          if (Object.keys(translated).length > 0) {
            translationCache.set(`article:${a.id}`, translated);
          }
        });
      }
    } catch {
      // If translation fails, just use original text
    }
  }

  return results.map((a) => {
    const cached = translationCache.get(`article:${a.id}`);
    return cached ? { ...a, ...cached } : a;
  });
}

// ── Export for article card building ──
export { translationCache };
