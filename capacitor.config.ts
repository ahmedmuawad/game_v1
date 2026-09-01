import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'me.splus.livi',
  appName: 'LIVI',
  webDir: 'dist',
  // الخلفية لازم تطابق `--c-bg` وإلا هتبان ومضة بيضا عند الإقلاع
  backgroundColor: '#0D0912',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0D0912',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0D0912',
  },
  plugins: {
    // الشريط شفاف والتطبيق يرسم تحته (viewport-fit=cover في index.html)
    StatusBar: { style: 'DARK', backgroundColor: '#0D0912', overlaysWebView: true },
  },
}

export default config
