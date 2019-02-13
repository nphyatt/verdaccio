"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeVersions = mergeVersions;

var _semver = _interopRequireDefault(require("semver"));

var _lodash = _interopRequireDefault(require("lodash"));

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */

/**
 * Function gets a local info and an info from uplinks and tries to merge it
 exported for unit tests only.
  * @param {*} local
  * @param {*} up
  * @param {*} config
  * @static
  */
function mergeVersions(local, up) {
  // copy new versions to a cache
  // NOTE: if a certain version was updated, we can't refresh it reliably
  for (const i in up.versions) {
    if (_lodash.default.isNil(local.versions[i])) {
      local.versions[i] = up.versions[i];
    }
  }

  for (const i in up[_constants.DIST_TAGS]) {
    if (local[_constants.DIST_TAGS][i] !== up[_constants.DIST_TAGS][i]) {
      if (!local[_constants.DIST_TAGS][i] || _semver.default.lte(local[_constants.DIST_TAGS][i], up[_constants.DIST_TAGS][i])) {
        local[_constants.DIST_TAGS][i] = up[_constants.DIST_TAGS][i];
      }

      if (i === 'latest' && local[_constants.DIST_TAGS][i] === up[_constants.DIST_TAGS][i]) {
        // if remote has more fresh package, we should borrow its readme
        local.readme = up.readme;
      }
    }
  }
}