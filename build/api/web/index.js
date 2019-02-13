"use strict";

var _lodash = _interopRequireDefault(require("lodash"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _verror = _interopRequireDefault(require("verror"));

var _chalk = _interopRequireDefault(require("chalk"));

var _express = _interopRequireDefault(require("express"));

var _utils = require("../../lib/utils");

var _search = _interopRequireDefault(require("../../lib/search"));

var _constants = require("../../lib/constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 */
const {
  securityIframe
} = require('../middleware');
/* eslint new-cap:off */


const env = require('../../config/env');

const templatePath = _path.default.join(env.DIST_PATH, '/index.html');

const existTemplate = _fs.default.existsSync(templatePath);

if (!existTemplate) {
  const err = new _verror.default('missing file: "%s", run `yarn build:webui`', templatePath);
  /* eslint no-console:off */

  console.error(_chalk.default.red(err.message));
  /* eslint no-console:off */

  process.exit(2);
}

const template = _fs.default.readFileSync(templatePath).toString();

module.exports = function (config, auth, storage) {
  _search.default.configureStorage(storage);

  const router = _express.default.Router();

  router.use(auth.webUIJWTmiddleware());
  router.use(securityIframe); // Static

  router.get('/-/static/:filename', function (req, res, next) {
    const file = `${env.DIST_PATH}/${req.params.filename}`;
    res.sendFile(file, function (err) {
      if (!err) {
        return;
      }

      if (err.status === _constants.HTTP_STATUS.NOT_FOUND) {
        next();
      } else {
        next(err);
      }
    });
  });
  router.get('/', function (req, res) {
    const installPath = _lodash.default.get(config, 'url_prefix', '');

    const base = (0, _utils.combineBaseUrl)((0, _utils.getWebProtocol)(req.get(_constants.HEADERS.FORWARDED_PROTO), req.protocol), req.get('host'), installPath);
    const webPage = template.replace(/ToReplaceByVerdaccio/g, base).replace(/ToReplaceByTitle/g, _lodash.default.get(config, 'web.title') ? config.web.title : _constants.WEB_TITLE).replace(/ToReplaceByLogo/g, _lodash.default.get(config, 'web.logo') ? config.web.logo : null).replace(/ToReplaceByScope/g, _lodash.default.get(config, 'web.scope') ? config.web.scope : '');
    res.setHeader('Content-Type', 'text/html');
    res.send(webPage);
  });
  return router;
};