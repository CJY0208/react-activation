import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import { uglify } from 'rollup-plugin-uglify'

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'lib/index.min.js',
      format: 'umd',
      name: 'ReactActivation',
      exports: 'named',
    },
    external: (name) =>
      [
        'react',
        'create-react-context',
        'hoist-non-react-statics',
        'react-node-key',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ].includes(name) || /szfe-tools/.test(name),
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**',
      }),
      uglify(),
    ],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'lib/index.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    external: (name) =>
      [
        'react',
        'create-react-context',
        'hoist-non-react-statics',
        'react-node-key',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ].includes(name) || /szfe-tools/.test(name),
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**',
      }),
    ],
  },
]
