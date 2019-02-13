"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _lodash = _interopRequireDefault(require("lodash"));

var _cookies = _interopRequireDefault(require("cookies"));

var _utils = require("../../../lib/utils");

var _constants = require("../../../lib/constants");

var _authUtils = require("../../../lib/auth-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _default(route, auth, config) {
  route.get('/-/user/:org_couchdb_user', function (req, res, next) {
    res.status(_constants.HTTP_STATUS.OK);
    next({
      ok: (0, _authUtils.getAuthenticatedMessage)(req.remote_user.name)
    });
  });
  route.put('/-/user/:org_couchdb_user/:_rev?/:revision?',
  /*#__PURE__*/
  function () {
    var _ref = _asyncToGenerator(function* (req, res, next) {
      const {
        name,
        password
      } = req.body;

      if (_lodash.default.isNil(req.remote_user.name) === false) {
        const token = name && password ? yield (0, _authUtils.getApiToken)(auth, config, req.remote_user, password) : undefined;
        res.status(_constants.HTTP_STATUS.CREATED);
        return next({
          ok: (0, _authUtils.getAuthenticatedMessage)(req.remote_user.name),
          token
        });
      } else {
        if ((0, _authUtils.validatePassword)(password) === false) {
          // eslint-disable-next-line new-cap
          return next(_utils.ErrorCode.getCode(_constants.HTTP_STATUS.BAD_REQUEST, _constants.API_ERROR.PASSWORD_SHORT()));
        }

        auth.add_user(name, password,
        /*#__PURE__*/
        function () {
          var _ref2 = _asyncToGenerator(function* (err, user) {
            if (err) {
              if (err.status >= _constants.HTTP_STATUS.BAD_REQUEST && err.status < _constants.HTTP_STATUS.INTERNAL_ERROR) {
                // With npm registering is the same as logging in,
                // and npm accepts only an 409 error.
                // So, changing status code here.
                return next(_utils.ErrorCode.getCode(err.status, err.message) || _utils.ErrorCode.getConflict(err.message));
              }

              return next(err);
            }

            const token = name && password ? yield (0, _authUtils.getApiToken)(auth, config, user, password) : undefined;
            req.remote_user = user;
            res.status(_constants.HTTP_STATUS.CREATED);
            return next({
              ok: `user '${req.body.name}' created`,
              token
            });
          });

          return function (_x4, _x5) {
            return _ref2.apply(this, arguments);
          };
        }());
      }
    });

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }());
  route.delete('/-/user/token/*', function (req, res, next) {
    res.status(_constants.HTTP_STATUS.OK);
    next({
      ok: _constants.API_MESSAGE.LOGGED_OUT
    });
  }); // placeholder 'cause npm require to be authenticated to publish
  // we do not do any real authentication yet

  route.post('/_session', _cookies.default.express(), function (req, res, next) {
    res.cookies.set('AuthSession', String(Math.random()), (0, _authUtils.createSessionToken)());
    next({
      ok: true,
      name: 'somebody',
      roles: []
    });
  });
}