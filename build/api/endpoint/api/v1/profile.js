"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _lodash = _interopRequireDefault(require("lodash"));

var _constants = require("../../../../lib/constants");

var _utils = require("../../../../lib/utils");

var _authUtils = require("../../../../lib/auth-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 */
function _default(route, auth) {
  const buildProfile = name => ({
    tfa: false,
    name,
    email: '',
    email_verified: false,
    created: '',
    updated: '',
    cidr_whitelist: null,
    fullname: ''
  });

  route.get('/-/npm/v1/user', function (req, res, next) {
    if (_lodash.default.isNil(req.remote_user.name) === false) {
      return next(buildProfile(req.remote_user.name));
    }

    res.status(_constants.HTTP_STATUS.UNAUTHORIZED);
    return next({
      message: _constants.API_ERROR.MUST_BE_LOGGED
    });
  });
  route.post('/-/npm/v1/user', function (req, res, next) {
    if (_lodash.default.isNil(req.remote_user.name)) {
      res.status(_constants.HTTP_STATUS.UNAUTHORIZED);
      return next({
        message: _constants.API_ERROR.MUST_BE_LOGGED
      });
    }

    const {
      password,
      tfa
    } = req.body;
    const {
      name
    } = req.remote_user;

    if (_lodash.default.isNil(password) === false) {
      if ((0, _authUtils.validatePassword)(password.new) === false) {
        /* eslint new-cap:off */
        return next(_utils.ErrorCode.getCode(_constants.HTTP_STATUS.UNAUTHORIZED, _constants.API_ERROR.PASSWORD_SHORT()));
        /* eslint new-cap:off */
      }

      auth.changePassword(name, password.old, password.new, (err, isUpdated) => {
        if (_lodash.default.isNull(err) === false) {
          return next(_utils.ErrorCode.getCode(err.status, err.message) || _utils.ErrorCode.getConflict(err.message));
        }

        if (isUpdated) {
          return next(buildProfile(req.remote_user.name));
        } else {
          return next(_utils.ErrorCode.getInternalError(_constants.API_ERROR.INTERNAL_SERVER_ERROR));
        }
      });
    } else if (_lodash.default.isNil(tfa) === false) {
      return next(_utils.ErrorCode.getCode(_constants.HTTP_STATUS.SERVICE_UNAVAILABLE, _constants.SUPPORT_ERRORS.TFA_DISABLED));
    } else {
      return next(_utils.ErrorCode.getCode(_constants.HTTP_STATUS.INTERNAL_ERROR, _constants.APP_ERROR.PROFILE_ERROR));
    }
  });
}