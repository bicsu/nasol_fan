import '@apps-in-toss/web-framework';

export default {
  appName: 'nasol-fans',
  outdir: './dist',
  brand: {
    displayName: '나솔팬즈',
    primaryColor: '#D4537E',
    icon: './assets/icon-toss-600.png',
  },
  permissions: [],
  webViewProps: {
    type: 'partner' as const,
  },
  web: {
    commands: {
      build: 'expo export -p web --clear && bash scripts/patch-dist.sh',
    },
  },
};
