// Site-wide settings.
//
// leaderboardUrl:
//   ''    -> use the same origin (works when served by server/leaderboard.js)
//   'https://your-server.example.com' -> a leaderboard server hosted elsewhere
//   null  -> never contact a server; scores stay in this browser only
//
// If the server can't be reached, the games quietly fall back to local scores.
// GitHub Pages is static hosting, so there's no server to ask there.
window.OFFICE_CONFIG = {
  leaderboardUrl: location.hostname.endsWith('github.io') ? null : '',
};
