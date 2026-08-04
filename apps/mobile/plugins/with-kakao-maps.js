/**
 * Expo config plugin — inject Kakao Maps Native App Key for @jiggag/react-native-kakao-maps.
 */
const {
  withInfoPlist,
  withStringsXml,
  createRunOncePlugin,
} = require("@expo/config-plugins");

function withKakaoMaps(config, props = {}) {
  const appKey =
    props.kakaoAppKey ||
    process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ||
    process.env.KAKAO_NATIVE_APP_KEY ||
    "";

  config = withInfoPlist(config, (cfg) => {
    if (appKey) {
      cfg.modResults.KAKAO_APP_KEY = appKey;
    }
    return cfg;
  });

  config = withStringsXml(config, (cfg) => {
    if (!appKey) return cfg;
    const resources = cfg.modResults.resources;
    if (!resources) return cfg;
    const strings = resources.string ?? [];
    const filtered = strings.filter(
      (item) => item?.$?.name !== "kakao_app_key"
    );
    filtered.push({
      $: { name: "kakao_app_key" },
      _: appKey,
    });
    resources.string = filtered;
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(withKakaoMaps, "with-kakao-maps", "1.0.0");
