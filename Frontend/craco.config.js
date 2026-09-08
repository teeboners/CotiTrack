// Compatibilidad entre CRA 5, React 17 y React PDF Renderer
module.exports = {
  webpack: {
    alias: {
      "react/jsx-runtime": require.resolve("react/jsx-runtime.js"),
      "react/jsx-dev-runtime": require.resolve("react/jsx-dev-runtime.js"),
    },
  },
};