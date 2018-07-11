import typescript from 'typescript'
import nodeResolve from 'rollup-plugin-node-resolve'
import ts from 'rollup-plugin-typescript2'

export default {
  plugins: [
    nodeResolve(),
    ts({ typescript })
  ],
  output: [{
    format: 'iife',
    sourcemap: true
  }]
}