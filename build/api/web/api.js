"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _express = require("express");

var _bodyParser = _interopRequireDefault(require("body-parser"));

var _user = _interopRequireDefault(require("./endpoint/user"));

var _package = _interopRequireDefault(require("./endpoint/package"));

var _search = _interopRequireDefault(require("./endpoint/search"));

var _search2 = _interopRequireDefault(require("../../lib/search"));

var _middleware = require("../middleware");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
const route = (0, _express.Router)();
/* eslint new-cap: 0 */

/*
 This file include all verdaccio only API(Web UI), for npm API please see ../endpoint/
*/

function _default(config, auth, storage) {
  _search2.default.configureStorage(storage); // validate all of these params as a package name
  // this might be too harsh, so ask if it causes trouble
  // $FlowFixMe


  route.param('package', _middleware.validatePackage); // $FlowFixMe

  route.param('filename', _middleware.validateName);
  route.param('version', _middleware.validateName);
  route.param('anything', (0, _middleware.match)(/.*/));
  route.use(_bodyParser.default.urlencoded({
    extended: false
  }));
  route.use(auth.webUIJWTmiddleware());
  route.use(_middleware.securityIframe);
  (0, _package.default)(route, storage, auth, config);
  (0, _search.default)(route, storage, auth);
  (0, _user.default)(route, auth, config); // What are you looking for? logout? client side will remove token when user click logout,
  // or it will auto expire after 24 hours.
  // This token is different with the token send to npm client.
  // We will/may replace current token with JWT in next major release, and it will not expire at all(configurable).

  return route;
}