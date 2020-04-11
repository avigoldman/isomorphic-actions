const IsomorphicActionsPlugin = require('./webpack')()

module.exports = function withIsomorphicActionsGenerator({
  endpoint = "/api/action"
} = {}) {
  return function withIsomorphicActions(nextConfig = {}) {
    return {
      webpack(config, options) {
        config.plugins.push(
          new IsomorphicActionsPlugin()
        )

        config.module.rules.forEach((rule) => {
          if (rule.use && rule.use.loader === 'next-babel-loader') {
            rule.use.options.plugins = rule.use.options.plugins || []
            rule.use.options.plugins.push(["isomorphic-actions/babel", {
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