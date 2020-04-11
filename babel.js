// get imports to figure out what name is used for "defineAction" utility
// transform action declarations from defineAction(func) to defineAction({ func, filename, functionName })
// verify that all actions are exported and throw an error if they aren't

const shortHash = require('short-hash');
const { default: generate } = require('@babel/generator');

module.exports = function ({ template, types: t, ...other }) {
  return {
    name: 'isomorphic-actions',
    pre(state) {
      this.root;
      this.defineActionAliases = [];
    },
    visitor: {
      Program(path) {
        this.root = path;
      },
      /** find the aliases of defineAction */
      ImportDeclaration(path) {
        if (path.node.source.value !== 'isomorphic-actions') {
          return
        }

        const defineActionAliases = path.node.specifiers
          .filter((specifier) => {
            return (
              specifier.type === 'ImportSpecifier' &&
              ['defineAction'].includes(specifier.imported.name)
            )
          })
          .map((specifier) => {
            return specifier.local.name
          })

        this.defineActionAliases = [ ...this.defineActionAliases, ...defineActionAliases ]
      },
      /** find defineAction usage */
      CallExpression(path, { file, opts: { endpoint } }) {
        if (this.defineActionAliases.length === 0) {
          return
        }

        const filename = file.opts.filename
        const expression = path.node

        if (!this.defineActionAliases.includes(expression.callee.name)) {
          return
        }

        // todo - also account for arrays
        // todo - if assigned to property in an object, use that as the name
        // first parent that isn't a function call wrapping defineAction
        const parent = path.findParent((path) => !path.isCallExpression()).node

        const name = parent.type === 'VariableDeclarator' ? parent.id.name : parent.type === 'ExportDefaultDeclaration' ? '[Default Export Function]' : '[Anonymous Function]'
        const func = expression.arguments.length > 0 ? expression.arguments[0] : t.nullLiteral()

        // todo check if it is an ObjectExpression with an exportId property
        if (func.type === 'ObjectExpression') {
          return
        }

        const exportId = shortHash(generate(expression).code)

        /** replace function call with object that contains the details for the helper to find and run the function */
        expression.arguments = [
          t.objectExpression([
            t.objectProperty(t.stringLiteral('exportId'), t.stringLiteral(exportId)),
            t.objectProperty(t.stringLiteral('fileId'), t.stringLiteral(shortHash(filename))),
            t.objectProperty(t.stringLiteral('endpoint'), t.stringLiteral(endpoint)),
            t.objectProperty(t.stringLiteral('debug'),
              t.objectExpression([
                t.objectProperty(t.stringLiteral('functionName'), t.stringLiteral(name)),
                t.objectProperty(t.stringLiteral('filename'), t.stringLiteral(filename)),
                t.objectProperty(t.stringLiteral('loc'),
                  t.objectExpression([
                    t.objectProperty(t.stringLiteral('line'), t.numericLiteral(expression.loc.start.line)),
                    t.objectProperty(t.stringLiteral('column'), t.numericLiteral(expression.loc.start.column))
                  ])
                )
              ])
            )
          ])
        ]

        /** export the function at the bottom of the file with a prefixed name */
        this.root.unshiftContainer(
          'body',
          t.exportNamedDeclaration(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('__action__'+exportId),
                func
              )
            ])
          )
        )
      },
    }
  };
}