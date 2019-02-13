"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

/**
 * @prettier
 * 
 */
function _default(route) {
  route.get('/-/ping', function (req, res, next) {
    next({});
  });
}