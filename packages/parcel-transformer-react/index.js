'use strict';
// @flow
const {Transformer} = require('@parcel/plugin');
const {generate, parse} = require('@parcel/babel-ast-utils');
const {traverse2, REMOVE} = require('@parcel/babylon-walk');

const invariant = require('assert');
const t = require('@babel/types');

function isServerAsset(asset) {
  return Boolean(
    asset && asset.type === 'js' && /\.server\.\w+/.test(asset.filePath)
  );
}
function isClientAsset(asset) {
  return Boolean(
    asset && asset.type === 'js' && /\.client\.\w+/.test(asset.filePath)
  );
}
function isNonClientAsset(asset) {
  return Boolean(
    asset && asset.type === 'js' && !/\.client\.\w+/.test(asset.filePath)
  );
}

module.exports = (new Transformer({
  async parse({asset, options}) {
    let code = await asset.getCode();
    if (code.includes('import.meta.reactServer') || isNonClientAsset(asset)) {
      return parse({
        asset,
        code,
        options,
      });
    } else {
      return null;
    }
  },

  async transform({asset, options}) {
    let ast = await asset.getAST();
    if (!ast) {
      return [asset];
    }

    let serverDep;
    traverse2(ast.program, {
      CallExpression(node) {
        let {callee, arguments: args} = node;
        if (
          t.isMemberExpression(callee) &&
          t.isMetaProperty(callee.object) &&
          t.isIdentifier(callee.property, {name: 'reactServer'})
        ) {
          invariant(args.length === 1 && t.isStringLiteral(args[0]));
          serverDep = args[0].value;
          return REMOVE;
        }
      },
    });

    let isServer = isServerAsset(asset);
    if (serverDep != null) {
      if (isServer) {
        invariant(false);
      }

      asset.setAST(ast);
      asset.addDependency({
        moduleSpecifier: serverDep,
      });
    }

    if (isNonClientAsset(asset)) {
      for (let d of asset.getDependencies()) {
        if (/\.client(\.\w+)?$/.test(d.moduleSpecifier)) {
          asset.addDependency({
            moduleSpecifier: d.moduleSpecifier,
            isAsync: true,
          });
        }
      }
    }

    return [asset];
  },

  generate({asset, ast, options}) {
    return generate({asset, ast, options});
  },
}) /*: Transformer */);
