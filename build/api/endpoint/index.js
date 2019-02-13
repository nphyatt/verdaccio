"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _express = _interopRequireDefault(require("express"));

var _bodyParser = _interopRequireDefault(require("body-parser"));

var _whoami = _interopRequireDefault(require("./api/whoami"));

var _ping = _interopRequireDefault(require("./api/ping"));

var _user = _interopRequireDefault(require("./api/user"));

var _distTags = _interopRequireDefault(require("./api/dist-tags"));

var _publish = _interopRequireDefault(require("./api/publish"));

var _search = _interopRequireDefault(require("./api/search"));

var _package = _interopRequireDefault(require("./api/package"));

var _profile = _interopRequireDefault(require("./api/v1/profile"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
const {
  match,
  validateName,
  validatePackage,
  encodeScopePackage,
  antiLoop
} = require('../middleware');

function _default(config, auth, storage) {
  /* eslint new-cap:off */
  const app = _express.default.Router();
  /* eslint new-cap:off */
  // validate all of these params as a package name
  // this might be too harsh, so ask if it causes trouble
  // $FlowFixMe


  app.param('package', validatePackage); // $FlowFixMe

  app.param('filename', validateName);
  app.param('tag', validateName);
  app.param('version', validateName);
  app.param('revision', validateName);
  app.param('token', validateName); // these can't be safely put into express url for some reason
  // TODO: For some reason? what reason?

  app.param('_rev', match(/^-rev$/));
  app.param('org_couchdb_user', match(/^org\.couchdb\.user:/));
  app.param('anything', match(/.*/));
  app.use(auth.apiJWTmiddleware());
  app.use(_bodyParser.default.json({
    strict: false,
    limit: config.max_body_size || '10mb'
  }));
  app.use(antiLoop(config)); // encode / in a scoped package name to be matched as a single parameter in routes

  app.use(encodeScopePackage); // for "npm whoami"

  (0, _whoami.default)(app);
  (0, _package.default)(app, auth, storage, config);
  (0, _profile.default)(app, auth);
  (0, _search.default)(app, auth, storage);
  (0, _user.default)(app, auth, config);
  (0, _distTags.default)(app, auth, storage);
  (0, _publish.default)(app, auth, storage, config);
  (0, _ping.default)(app);
  return app;
}