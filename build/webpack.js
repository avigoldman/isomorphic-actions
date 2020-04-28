const hash = require('../utils/hash');
const _ = require('lodash')
const forEach = require('lodash/forEach')
const cloneDeep = require('lodash/cloneDeep')
const get = require('lodash/get')
const path = require('path')
const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const fs = require('fs')

const PLUGIN_NAME = 'IsomorphicActionsPlugin';

class IsomorphicActionsPlugin {
  constructor(options = {}) {
    this.output = options.output

    if (!this.output) {
      throw new Error(`\`output\` option is required`)
    }
  }

  apply(compiler) {
    let actionFilesMap = {}
    compiler.hooks.emit.tapAsync(PLUGIN_NAME, async (compilation, callback) => {
      
      compilation.chunks.forEach(chunk => {
        chunk.getModules().forEach(module => {
          const moduleImportsIsomorphicActions = !!module.dependencies.find(d => d.request === 'isomorphic-actions')
          if (moduleImportsIsomorphicActions) {
            actionFilesMap[module.resource] = true
          }
        });
      });
    
      const compiledActions = await compileActions(compilation, Object.keys(actionFilesMap))

      forEach(compiledActions, ({ content }, filename) => {
        compilation.assets[path.join(this.output, `${hash(filename)}.js`)] = {
          source: () => content,
          size: () => content.length
        };
      })

      callback()
    })
  }
}

module.exports = IsomorphicActionsPlugin;


// Modified from:
//   * https://github.com/jantimon/html-webpack-plugin/blob/a2ad30ae9ea66157b7e21f441e9adbbf9085d9b2/lib/compiler.js#L95
//   * https://github.com/prateekbh/babel-esm-plugin/blob/master/src/index.js
function compileActions(mainCompilation, actions) {
  const childOptions = cloneDeep(mainCompilation.compiler.options)
  childOptions.target ='node'
  childOptions.output.globalObject ='global'
  childOptions.output.filename ='__child-[name]'
  childOptions.output.publicPath = mainCompilation.compiler.options.publicPath
  childOptions.module.rules.forEach((rule) => {
    if (!get(rule, 'use.options.plugins')) {
      return
    }

    rule.use.options.plugins = rule.use.options.plugins.map((plugin) => {
      if ((Array.isArray(plugin) ? plugin[0] : plugin) === 'isomorphic-actions/build/babel/client') {
        return ['isomorphic-actions/build/babel/server', ...plugin.slice(1)]
      }

      return plugin
    })
  })


  const childCompiler = mainCompilation.createChildCompiler(`${PLUGIN_NAME}Compiler`, childOptions.output);
  childCompiler.options = childOptions
  childCompiler.context = mainCompilation.compiler.context;
  childCompiler.inputFileSystem = mainCompilation.compiler.inputFileSystem;
  childCompiler.outputFileSystem = mainCompilation.compiler.outputFileSystem;

  new NodeTemplatePlugin(childOptions.output).apply(childCompiler);
  new NodeTargetPlugin().apply(childCompiler);
  new LibraryTemplatePlugin('default', 'commonjs2').apply(childCompiler);
  new LoaderTargetPlugin('node').apply(childCompiler);

  childCompiler.hooks.compilation.tap({ name: PLUGIN_NAME }, (compilation) => {
    if (compilation.cache) {
      if (!compilation.cache[PLUGIN_NAME]) {
        compilation.cache[PLUGIN_NAME] = {};
      }

      compilation.cache = compilation.cache[PLUGIN_NAME];
    }
  });


  const plugins = mainCompilation.compiler.options.plugins || []
  // Call the `apply` method of all plugins by ourselves.
  if (Array.isArray(plugins)) {
    for (const plugin of plugins) {
      plugin.apply(childCompiler);
    }
  }

  childCompiler.hooks.afterPlugins.call(childCompiler);

  actions.forEach((action, index) => {
    new SingleEntryPlugin(childCompiler.context, `./${path.relative(childCompiler.context, action)}`, `${PLUGIN_NAME}_${index}`).apply(childCompiler);
  });

  return new Promise((resolve, reject) => {
    childCompiler.runAsChild((err, entries, childCompilation) => {
      // Extract actions
      const compiledActions = entries
        ? extractHelperFilesFromCompilation(mainCompilation, childCompilation, childOptions.output.filename, entries)
        : [];
      // Extract file dependencies
      // if (entries) {
      //   this.fileDependencies = Array.from(childCompilation.fileDependencies);
      // }
      // Reject the promise if the childCompilation contains error
      if (childCompilation && childCompilation.errors && childCompilation.errors.length) {
        const errorDetails = childCompilation.errors.map(error => error.message + (error.error ? ':\n' + error.error : '')).join('\n');
        reject(new Error('Child compilation failed:\n' + errorDetails));
        return;
      }

      // Reject if the error object contains errors
      if (err) {
        reject(err);
        return;
      }
     
      const result = {};
      compiledActions.forEach((actionSource, entryIndex) => {
        result[actions[entryIndex]] = {
          content: actionSource,
          hash: childCompilation.hash,
          entry: entries[entryIndex]
        };
      });
      resolve(result);
    });
  });
}


function extractHelperFilesFromCompilation (mainCompilation, childCompilation, filename, childEntryChunks) {
  const helperAssetNames = childEntryChunks.map((entryChunk, index) => {
    return mainCompilation.mainTemplate.getAssetPath(filename, {
      hash: childCompilation.hash,
      chunk: entryChunk,
      name: `${PLUGIN_NAME}_${index}`
    });
  });

  helperAssetNames.forEach((helperFileName) => {
    delete mainCompilation.assets[helperFileName];
  });

  const helperContents = helperAssetNames.map((helperFileName) => {
    return childCompilation.assets[helperFileName].source();
  });

  return helperContents;
}