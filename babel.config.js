module.exports = {
  presets: [['@babel/env', { modules: false }], '@babel/react'],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    'react-node-key/babel',
    [
      'babel-plugin-import',
      {
        libraryName: 'szfe-tools',
        camel2DashComponentName: false,
      },
    ],
  ],
}
