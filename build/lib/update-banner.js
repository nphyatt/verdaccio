"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBanner = createBanner;
exports.createErrorBanner = createErrorBanner;
exports.verdaccioUpdateBanner = verdaccioUpdateBanner;

var _request = _interopRequireDefault(require("request"));

var _semver = _interopRequireDefault(require("semver"));

var _chalk = _interopRequireDefault(require("chalk"));

var _lodash = _interopRequireDefault(require("lodash"));

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
const VERDACCIO_LATEST_REGISTRY_URL = `${_constants.DEFAULT_REGISTRY}/verdaccio/latest`;
/**
 * Creates NPM update banner using chalk
 */

function createBanner(currentVersion, newVersion, releaseType) {
  const changelog = `${_constants.UPDATE_BANNER.CHANGELOG_URL}v${newVersion}`;
  const versionUpdate = `${_chalk.default.bold.red(currentVersion)} → ${_chalk.default.bold.green(newVersion)}`;
  const banner = _chalk.default`
        {white.bold A new ${_lodash.default.upperCase(releaseType)} version of Verdaccio is available. ${versionUpdate} }
        {white.bold Run ${_chalk.default.green.bold('npm install -g verdaccio')} to update}.
        {white.bold Registry: ${_constants.DEFAULT_REGISTRY}}
        {blue.bold Changelog: ${changelog}}
    `;
  return banner;
}
/**
 * creates error banner
 */


function createErrorBanner(message) {
  const banner = _chalk.default`
        {red.bold Unable to check verdaccio version on ${_constants.DEFAULT_REGISTRY}}
        {red.bold Error: ${message}}
    `;
  return banner;
}
/**
 * Show verdaccio update banner on start
 */


function verdaccioUpdateBanner(pkgVersion) {
  (0, _request.default)(VERDACCIO_LATEST_REGISTRY_URL, function (error = null, response = {}) {
    if (!error && response.statusCode === _constants.HTTP_STATUS.OK && response.body) {
      // In case, NPM does not returns version, keeping version equals to
      // verdaccio version.
      const {
        version = pkgVersion
      } = JSON.parse(response.body);

      const releaseType = _semver.default.diff(version, pkgVersion);

      if (releaseType && _semver.default.gt(version, pkgVersion)) {
        const banner = createBanner(pkgVersion, version, releaseType);
        /* eslint-disable-next-line */

        console.log(banner);
      }
    } else {
      const errorBanner = createErrorBanner(JSON.stringify(error));
      /* eslint-disable-next-line */

      console.log(errorBanner);
    }
  });
}