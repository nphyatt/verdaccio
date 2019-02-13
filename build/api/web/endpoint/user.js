"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _constants = require("../../../lib/constants");

var _utils = require("../../../lib/utils");

var _authUtils = require("../../../lib/auth-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function addUserAuthApi(route, auth, config) {
  route.post('/login', function (req, res, next) {
    const {
      username,
      password
    } = req.body;
    auth.authenticate(username, password,
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(function* (err, user) {
        if (err) {
          const errorCode = err.message ? _constants.HTTP_STATUS.UNAUTHORIZED : _constants.HTTP_STATUS.INTERNAL_ERROR;
          next(_utils.ErrorCode.getCode(errorCode, err.message));
        } else {
          req.remote_user = user;
          const jWTSignOptions = (0, _authUtils.getSecurity)(config).web.sign;
          next({
            token: yield auth.jwtEncrypt(user, jWTSignOptions),
            username: req.remote_user.name
          });
        }
      });

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }());
  });
  route.put('/reset_password', function (req, res, next) {
    if (_lodash.default.isNil(req.remote_user.name)) {
      res.status(_constants.HTTP_STATUS.UNAUTHORIZED);
      return next({
        // FUTURE: update to a more meaningful message
        message: _constants.API_ERROR.MUST_BE_LOGGED
      });
    }

    const {
      password
    } = req.body;
    const {
      name
    } = req.remote_user;

    if ((0, _authUtils.validatePassword)(password.new) === false) {
      auth.changePassword(name, password.old, password.new, (err, isUpdated) => {
        if (_lodash.default.isNil(err) && isUpdated) {
          next({
            ok: true
          });
        } else {
          return next(_utils.ErrorCode.getInternalError(_constants.API_ERROR.INTERNAL_SERVER_ERROR));
        }
      });
    } else {
      return next(_utils.ErrorCode.getCode(_constants.HTTP_STATUS.BAD_REQUEST, _constants.APP_ERROR.PASSWORD_VALIDATION));
    }
  });
}

var _default = addUserAuthApi;
exports.default = _default;