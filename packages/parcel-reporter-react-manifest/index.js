// @flow
const {Reporter} = require('@parcel/plugin');
const path = require('path');
const nullthrows = require('nullthrows');
const {pathToFileURL} = require('url');
const {resolveConfig} = require('@parcel/utils');

module.exports = (new Reporter({
  async report({event, options}) {
    if (event.type !== 'buildSuccess') {
      return;
    }

    let {bundleGraph} = event;
    let json = {};
    for (let bundle of bundleGraph.getBundles()) {
      if (bundle.isInline || bundle.type !== 'js') {
        continue;
      }

      bundle.traverse((node) => {
        if (node.type !== 'dependency' || !node.value.isAsync) {
          return;
        }

        let referencedBundle = bundleGraph.getReferencedBundle(
          node.value,
          bundle
        );
        let loader = bundleGraph.getDependencyResolution(node.value, bundle);
        if (!referencedBundle || !loader) {
          return;
        }

        referencedBundle.traverseAssets((asset) => {
          if (!/\.client\.js$/.test(asset.filePath)) {
            return;
          }

          let base = {
            id: bundleGraph.getAssetPublicId(asset),
            chunks: [bundleGraph.getAssetPublicId(loader)],
          };
          let moduleExports = {
            '': {
              ...base,
              name: '',
            },
            '*': {
              ...base,
              name: '*',
            },
          };

          let exportedSymbols = bundleGraph.getExportedSymbols(asset);
          if (exportedSymbols) {
            for (let symbol of exportedSymbols) {
              moduleExports[symbol.exportAs] = {
                ...base,
                name: symbol.exportAs,
              };
            }
          }

          const href = nullthrows(pathToFileURL(asset.filePath).href);
          json[href] = moduleExports;
        });
      });
    }

    let distDir = bundleGraph.getBundles()[0].target.distDir;

    await options.outputFS.writeFile(
      path.join(distDir, 'react-client-manifest.json'),
      JSON.stringify(json, null, 2)
    );
  },
}) /*: Reporter*/);
