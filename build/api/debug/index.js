"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
var _default = (app, selfPath) => {
  // Hook for tests only
  app.get('/-/_debug', function (req, res, next) {
    const doGarbabeCollector = _lodash.default.isNil(global.gc) === false;

    if (doGarbabeCollector) {
      global.gc();
    }

    next({
      pid: process.pid,
      main: process.mainModule.filename,
      conf: selfPath,
      mem: process.memoryUsage(),
      gc: doGarbabeCollector
    });
  });
};

exports.default = _default;