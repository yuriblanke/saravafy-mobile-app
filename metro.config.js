const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "md"
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "md"];
config.transformer.babelTransformerPath = require.resolve(
  "./metro-markdown-transformer"
);

module.exports = config;
