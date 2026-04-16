export default {
  appName: 'nasolFans',
  outdir: './dist',
  brand: {
    displayName: '나솔팬즈',
    primaryColor: '#D4537E',
    icon: './assets/icon-toss-600.png',
  },
  permissions: [],
  webViewProps: {
    type: 'partner',
  },
  web: {
    commands: {
      build: 'expo export -p web --clear',
    },
  },
};
