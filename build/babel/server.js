/**
 * Goal: Convert a client-side file with actions into a serverless function
 * 
 * Steps:
 *   1. Gather all referenced identifiers
 *   2. Gather all action constructor aliases
 *   3. Move all action constructor calls to the root of the program
 *   4. Replace all calls to action constructors (e.g. `createAction`) with action configs
 *   5. Remove all exports
 *   6. Import the action and actionRouter and export an actionRouter as the default
 *   7. Remove all declarations of identifiers that are no longer referenced
 *   
 * Modified from https://github.com/zeit/next.js/blob/b274fe39d38111588e625342a89dc568ad38fff5/packages/next/build/babel/plugins/next-ssg-transform.ts
 */

const hash = require('../../utils/hash');
const { default: generate } = require('@babel/generator');

function getIdentifier(path) {
  const parentPath = path.parentPath
  if (parentPath.type === 'VariableDeclarator') {
    const name = parentPath.get('id')
    return name.node.type === 'Identifier'
      ? name
      : null
  }

  if (parentPath.type === 'AssignmentExpression') {
    const name = parentPath.get('left')
    return name.node.type === 'Identifier'
      ? name
      : null
  }

  if (path.node.type === 'ArrowFunctionExpression') {
    return null
  }

  return path.node.id && path.node.id.type === 'Identifier'
    ? path.get('id')
    : null
}

function isIdentifierReferenced(ident) {
  const b = ident.scope.getBinding(ident.node.name)
  return b != null && b.referenced
}

function markVariable(path, state) {
  if (path.node.id.type !== 'Identifier') {
    return
  }

  const local = path.get('id')
  if (isIdentifierReferenced(local)) {
    state.refs.add(local)
  }
}

function markFunction(path, state) {
  const ident = getIdentifier(path)
  if (ident && ident.node && isIdentifierReferenced(ident)) {
    state.refs.add(ident)
  }
}

function markImport(path, state) {
  const local = path.get('local')
  if (isIdentifierReferenced(local)) {
    state.refs.add(local)
  }
}

module.exports = ({ template, types: t }) => {
  const internalImports = template(`
    import $$actionRouter from 'isomorphic-actions/runtime/server/actionRouter'
    import $$action from 'isomorphic-actions/runtime/server/action'
  `)();

  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.root = path
          state.constructors = new Set()
          state.actions = new Set()
          state.refs = new Set()
        },
        exit(path, state) {
          // remove all exports after all transforms are complete
          path.traverse({
            ExportDeclaration(path) {
              path.remove()
            }
          })

          // add imports for action and actionRouter
          state.root.unshiftContainer('body', internalImports);
          state.root.pushContainer(
            'body',
            t.exportDefaultDeclaration(
              t.callExpression(
                t.identifier('$$actionRouter'),
                [
                  t.objectExpression(
                    Array.from(state.actions)
                      .map((actionId) => t.objectProperty(t.identifier(actionId),t.identifier(actionId)))
                  )
                ]
              )
            )
          )          

          const refs = state.refs
          let count = 0

          function sweepVariable(path) {
            if (path.node.id.type !== 'Identifier') {
              return
            }

            const local = path.get('id')
            if (refs.has(local) && !isIdentifierReferenced(local)) {
              ++count
              path.remove()
            }
          }

          function sweepFunction(
            path) {
            const ident = getIdentifier(path)
            if (
              ident &&
              ident.node &&
              refs.has(ident) &&
              !isIdentifierReferenced(ident)
            ) {
              ++count

              if (
                t.isAssignmentExpression(path.parentPath) ||
                t.isVariableDeclarator(path.parentPath)
              ) {
                path.parentPath.remove()
              } else {
                path.remove()
              }
            }
          }

          function sweepImport(path) {
            const local = path.get('local')
            if (refs.has(local) && !isIdentifierReferenced(local)) {
              ++count
              path.remove()
              if (
                (path.parent).specifiers
                  .length === 0
              ) {
                path.parentPath.remove()
              }
            }
          }

          /**
           * Repeat the sweep until we don't preform any modifications.
           *
           * That way when action1 reference func1 and func1 references func2,
           * both func1 and func2 are removed.
           */
          do {
            ;(path.scope).crawl()
            count = 0

            path.traverse({
              VariableDeclarator: sweepVariable,
              FunctionDeclaration: sweepFunction,
              FunctionExpression: sweepFunction,
              ArrowFunctionExpression: sweepFunction,
              ImportSpecifier: sweepImport,
              ImportDefaultSpecifier: sweepImport,
              ImportNamespaceSpecifier: sweepImport,
            })
          } while (count)
        }
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value !== 'isomorphic-actions') {
          return
        }

        const constructors = path.node.specifiers
          .filter((specifier) => {
            return (
              specifier.type === 'ImportSpecifier' &&
              specifier.imported.name === 'createAction'
            )
          })
          .forEach((specifier) => {
            state.constructors.add(specifier.local.name)
          })
      },
      CallExpression(path, state) {
        if (state.constructors.size === 0) {
          return
        }

        const expression = path.node

        if (!state.constructors.has(expression.callee.name)) {
          return
        }

        if (expression.arguments[0].type === 'ObjectExpression') {
          return
        }

        const name = getIdentifier(path)
        const actionId = hash(generate(expression).code)
        const filename = state.file.opts.filename
        const endpoint = state.opts.endpoint
        const functions = expression.arguments.length > 0 ? expression.arguments : t.nullLiteral()

        // Replace function call with object that contains the details for the helper to find and run the function 
        expression.arguments = [
          t.objectExpression([
            t.objectProperty(t.stringLiteral('actionId'), t.stringLiteral(actionId)),
            t.objectProperty(t.stringLiteral('fileId'), t.stringLiteral(hash(filename))),
            t.objectProperty(t.stringLiteral('endpoint'), t.stringLiteral(endpoint)),
            t.objectProperty(t.stringLiteral('debug'),
              t.objectExpression([
                t.objectProperty(t.stringLiteral('functionName'), t.stringLiteral(name ? name.node.name : '[Anonymous Function]')),
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

        state.root.pushContainer(
          'body',
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(actionId),
              t.callExpression(
                t.identifier('$$action'), functions)
            )
          ])
        )

        state.actions.add(actionId)
      },
      VariableDeclarator: markVariable,
      FunctionDeclaration: markFunction,
      FunctionExpression: markFunction,
      ArrowFunctionExpression: markFunction,
      ImportSpecifier: markImport,
      ImportDefaultSpecifier: markImport,
      ImportNamespaceSpecifier: markImport,
    }
  }
}