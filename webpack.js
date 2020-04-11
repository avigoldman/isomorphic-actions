const uniq = require('lodash/uniq')
const VirtualModulesPlugin = require('webpack-virtual-modules');
const { join } = require('path')
const shortHash = require('short-hash')
const handlerCode = require('fs').readFileSync(join(__dirname, 'internals', 'handler.js'))

const k = Object.keys
const s = (v) => JSON.stringify(v, null, 2)

module.exports = function() {
  let actionFilesMap = {}
  let handlerModulesMap = {}
  let handlerGenerated = false;
  let virtualModules = new VirtualModulesPlugin();

  return class IsomorphicActionsPlugin {
    apply(compiler) {
      virtualModules.apply(compiler)


      compiler.hooks.emit.tapAsync('IsomorphicActionsPlugin', async (compilation, callback) => {
      const rebuildModule = (m) => {
        return new Promise((resolve) => {
          compilation.rebuildModule(m, () => resolve())
        })
      }

        compilation.chunks.forEach(chunk => {
          chunk.getModules().forEach(module => {
            const moduleImportsIsomorphicActions = !!module.dependencies.find(d => d.request === 'isomorphic-actions')
            if (moduleImportsIsomorphicActions) {
              actionFilesMap[module.resource] = true
            }
          });
        });

        if (Object.keys(actionFilesMap).length > 0 || handlerGenerated === false) {
          virtualModules.writeModule('node_modules/isomorphic-actions/handler.js', `
            const actionFilesMap = {${
              Object.keys(actionFilesMap).map((filepath) => (
                `"${shortHash(filepath)}": () => import("${filepath}")`
              )).join(',\n')
            }}


            ${handlerCode}
          `);
          handlerGenerated = true;
        }

        callback();
      });
    }
  }
}