'use strict';
// @flow
const {Runtime} = require('@parcel/plugin');

module.exports = (new Runtime({
  async apply({bundle, bundleGraph}) {
    // if (bundle.type !== 'js') return;
    // let entry = bundle.getMainEntry();
    // console.log(bundle.name);
    // bundle.traverse((node) => {
    //   console.log(node.value);
    // });
  },
}) /*: Runtime */);
