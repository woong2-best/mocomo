/**
 * Android video surface only — PlayerPool behind existing feed card chrome.
 * Do not mount NativeFeedView (custom cards) in product UI; 128 design stays on FlashList.
 */
export { MocomoPooledVideoView, isPooledVideoSupported } from "mocomo-native-feed";
