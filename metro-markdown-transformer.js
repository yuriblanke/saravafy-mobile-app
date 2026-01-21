const upstreamTransformer = require("metro-react-native-babel-transformer");

module.exports.transform = function transform({ src, filename, options }) {
  if (filename.endsWith(".md")) {
    const escaped = JSON.stringify(String(src));
    const code = `module.exports = ${escaped};`;
    return upstreamTransformer.transform({ src: code, filename, options });
  }

  return upstreamTransformer.transform({ src, filename, options });
};
