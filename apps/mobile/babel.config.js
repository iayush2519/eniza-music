// react-native-reanimated 4 moved its worklet transform out into the
// separate `react-native-worklets` package (see
// https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x).
// Its Babel plugin is NOT auto-injected by `babel-preset-expo` in the
// version this project is pinned to (57.0.3) — without this file, every
// `useAnimatedStyle`/`useSharedValue` call compiles to plain JS instead
// of a real worklet, and invoking it at runtime throws a generic
// "TypeError: Object is not a function" (no useful stack trace, since
// the failure is in the native JSI call, not JS). Per the plugin's own
// docs, it must be listed LAST in the plugins array.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
