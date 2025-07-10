module.exports = function(api) {
  api.cache(true);
  
  const plugins = [];

  // Add custom console removal plugin only in production
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      ({ types: t }) => ({
        visitor: {
          CallExpression(path) {
            if (
              t.isMemberExpression(path.node.callee) &&
              t.isIdentifier(path.node.callee.object, { name: 'console' }) &&
              t.isIdentifier(path.node.callee.property) &&
              !['error', 'warn'].includes(path.node.callee.property.name)
            ) {
              // Replace console.log(), console.info(), etc. with undefined
              // but keep console.error() and console.warn()
              path.remove();
            }
          }
        }
      })
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: plugins,
  };
}; 