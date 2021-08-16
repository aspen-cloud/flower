const CracoEsbuildPlugin = require('craco-esbuild');
const { ProvidePlugin } = require('webpack');

module.exports = {
    webpack: {
        plugins: [
          new ProvidePlugin({
            React: 'react',
          })
        ]
      },
    plugins: [
      {
        plugin: CracoEsbuildPlugin,
        options: {
          enableSvgr: true,
          esbuildLoaderOptions: {
            loader: 'tsx',
            target: 'es2015',
          },
          skipEsbuildJest: false, // Optional. Set to true if you want to use babel for jest tests,
          esbuildJestOptions: {
            loaders: {
              '.ts': 'ts',
              '.tsx': 'tsx',
            },
          },
        },
      },
    ],
  };