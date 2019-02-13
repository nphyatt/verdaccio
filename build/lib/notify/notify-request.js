"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.notifyRequest = notifyRequest;

var _isNil = _interopRequireDefault(require("lodash/isNil"));

var _logger = _interopRequireDefault(require("../logger"));

var _request = _interopRequireDefault(require("request"));

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 */
function notifyRequest(options, content) {
  return new Promise((resolve, reject) => {
    (0, _request.default)(options, function (err, response, body) {
      if (err || response.statusCode >= _constants.HTTP_STATUS.BAD_REQUEST) {
        const errorMessage = (0, _isNil.default)(err) ? response.body : err.message;

        _logger.default.logger.error({
          errorMessage
        }, 'notify service has thrown an error: @{errorMessage}');

        reject(errorMessage);
      } else {
        _logger.default.logger.info({
          content
        }, 'A notification has been shipped: @{content}');

        if ((0, _isNil.default)(body) === false) {
          _logger.default.logger.debug({
            body
          }, ' body: @{body}');

          resolve(body);
        }

        reject(Error('body is missing'));
      }
    });
  });
}