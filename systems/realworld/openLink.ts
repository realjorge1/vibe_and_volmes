import { Linking } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Open a real article: in the in-app browser sheet when the build has it
 * (like Google News does), otherwise in the phone's browser.
 */
export async function openLink(url: string | undefined): Promise<void> {
  if (!url || !/^https?:\/\//i.test(url)) return;
  try {
    if (requireOptionalNativeModule('ExpoWebBrowser')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WebBrowser = require('expo-web-browser') as typeof import('expo-web-browser');
      await WebBrowser.openBrowserAsync(url, { toolbarColor: '#FFFFFF', controlsColor: '#0B57D0', showTitle: true });
      return;
    }
  } catch {
    /* fall through to the phone's browser */
  }
  try {
    await Linking.openURL(url);
  } catch {
    /* nothing to open it with */
  }
}
