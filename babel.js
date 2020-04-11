// get imports to figure out what name is used for "createAction" utility
// transform action declarations from createAction(func) to createAction({ func, filename, functionName })
// verify that all actions are exported and throw an error if they aren't

const shortHash = require('short-hash');

module.exports = function ({ template, types: t }) {
  return {
    name: 'isomorphic-actions',
    pre(state) {
      this.root;
      this.actions = [];
      this.createActionAliases = [];
    },
    visitor: {
      Program(path) {
        this.root = path;
      },
      /** find the aliases of createAction and createSimpleAction */
      ImportDeclaration(path) {
        if (path.node.source.value !== 'isomorphic-actions') {
          return
        }

        const createActionAliases = path.node.specifiers
          .filter((specifier) => {
            return (
              specifier.type === 'ImportSpecifier' &&
              ['createAction','createSimpleAction'].includes(specifier.imported.name)
            )
          })
          .map((specifier) => {
            return specifier.local.name
          })

        this.createActionAliases = [ ...this.createActionAliases, ...createActionAliases ]
      },
      /** mark exported actions as exported */
      ExportNamedDeclaration(path) {
        if (!path.node.specifiers) {
          return
        }

        path.node.specifiers.forEach((specifier) => {
          const exportedAction = this.actions.find(({ name }) => name === specifier.local.name)

          if (specifier.local.name !== specifier.exported.name) {
            throw new Error(`Isomorphic action \`${specifier.local.name}\` was exported as \`${specifier.exported.name}\`. You can not rename actions on export. (${specifier.loc.start.line}:${specifier.loc.start.column})`)
          }

          exportedAction.isExported = true
        })
      },
      /** find createAction usage */
      CallExpression(path, { file, opts: { endpoint } }) {
        if (this.createActionAliases.length === 0) {
          return
        }

        const filename = file.opts.filename
        const expression = path.node

        if (!this.createActionAliases.includes(expression.callee.name)) {
          return
        }

        // first parent that isn't a function call wrapping createAction
        // const parent = path.findParent((path) => !path.isCallExpression()).node
        const parent = path.parent

        const isDefaultExport = parent.type === 'ExportDefaultDeclaration'
        const isAssignedToVariable = parent.type === 'VariableDeclarator'
        if (!isAssignedToVariable && !isDefaultExport) {
          throw new Error(`Isomorphic actions must be assigned to a variable or the default export. (${expression.loc.start.line}:${expression.loc.start.column})`)
        }

        const isExported = isDefaultExport || !!path.findParent((path) => path.isExportNamedDeclaration());
        const name = isDefaultExport ? 'default' : parent.id.name

        this.actions.push({
          name,
          isExported: isExported,
          loc: expression.loc
        })

        const func = expression.arguments.length > 0 ? expression.arguments[0] : t.nullLiteral()
        const fileId = t.stringLiteral(shortHash(filename))
        const functionName = t.stringLiteral(name)

        /** replace function call with object that contains the details for the helper to find and run the function */
        expression.arguments = [
          t.objectExpression([
            t.objectProperty(t.stringLiteral('fileId'), fileId),
            t.objectProperty(t.stringLiteral('functionName'), functionName),
            t.objectProperty(t.stringLiteral('endpoint'), t.stringLiteral(endpoint)),
          ])
        ]

        /** export the function at the bottom of the file with a prefixed name */
        this.root.unshiftContainer(
          'body',
          t.exportNamedDeclaration(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.Identifier('__action__'+name),
                func
              )
            ])
          )
        )
      },
    },
    post(state) {
      const actionsThatWereNotExported = this.actions.filter(({ isExported }) => isExported === false)

      if (actionsThatWereNotExported.length > 0) {
        throw new Error(`The following isomorphic actions were not exported: ${
          actionsThatWereNotExported.map(({ name, loc }) => `\`${name}\` (${loc.start.line}:${loc.start.column})`).join(', ')
        }`)
      }
    }
  };
}