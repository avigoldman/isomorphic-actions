const path = require('path')
const webpack = require('webpack')
const IsomorphicActionsPlugin = require('./build/webpack')

module.exports = function withIsomorphicActionsGenerator({
  endpoint = "/api/actions",
  output = "./cache/actions"
} = {}) {
  return function withIsomorphicActions(nextConfig = {}) {
    return {
      ...nextConfig,
      webpack(config, options) {

        if (options.isServer) {
          config.plugins.push(
            new IsomorphicActionsPlugin({ output })
          )
        }

        config.plugins.push(new webpack.DefinePlugin({
          'process.env.ISOMORPHIC_ACTIONS_OUTPUT': JSON.stringify(path.join(config.output.path, output))
        }))


        config.module.rules.forEach((rule) => {
          if (rule.use && rule.use.loader === 'next-babel-loader') {
            rule.use.options.plugins = rule.use.options.plugins || []
            rule.use.options.plugins.push(["isomorphic-actions/build/babel/client", {
              endpoint
            }])
          }
        });
        
        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, options);
        }

        return config;
      }
    }
  }
}