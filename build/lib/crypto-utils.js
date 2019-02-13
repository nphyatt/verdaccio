"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.aesEncrypt = aesEncrypt;
exports.aesDecrypt = aesDecrypt;
exports.createTarballHash = createTarballHash;
exports.stringToMD5 = stringToMD5;
exports.generateRandomHexString = generateRandomHexString;
exports.signPayload = signPayload;
exports.verifyPayload = verifyPayload;
exports.defaultTarballHashAlgorithm = exports.defaultAlgorithm = void 0;

var _crypto = require("crypto");

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const defaultAlgorithm = 'aes192';
exports.defaultAlgorithm = defaultAlgorithm;
const defaultTarballHashAlgorithm = 'sha1';
exports.defaultTarballHashAlgorithm = defaultTarballHashAlgorithm;

function aesEncrypt(buf, secret) {
  // deprecated
  // https://nodejs.org/api/crypto.html#crypto_crypto_createcipher_algorithm_password_options
  const c = (0, _crypto.createCipher)(defaultAlgorithm, secret);
  const b1 = c.update(buf);
  const b2 = c.final();
  return Buffer.concat([b1, b2]);
}

function aesDecrypt(buf, secret) {
  try {
    // deprecated
    // https://nodejs.org/api/crypto.html#crypto_crypto_createdecipher_algorithm_password_options
    const c = (0, _crypto.createDecipher)(defaultAlgorithm, secret);
    const b1 = c.update(buf);
    const b2 = c.final();
    return Buffer.concat([b1, b2]);
  } catch (_) {
    return new Buffer(0);
  }
}

function createTarballHash() {
  return (0, _crypto.createHash)(defaultTarballHashAlgorithm);
}
/**
 * Express doesn't do ETAGS with requests <= 1024b
 * we use md5 here, it works well on 1k+ bytes, but sucks with fewer data
 * could improve performance using crc32 after benchmarks.
 * @param {Object} data
 * @return {String}
 */


function stringToMD5(data) {
  return (0, _crypto.createHash)('md5').update(data).digest('hex');
}

function generateRandomHexString(length = 8) {
  return (0, _crypto.pseudoRandomBytes)(length).toString('hex');
}

function signPayload(_x, _x2, _x3) {
  return _signPayload.apply(this, arguments);
}

function _signPayload() {
  _signPayload = _asyncToGenerator(function* (payload, secretOrPrivateKey, options) {
    return new Promise(function (resolve, reject) {
      return _jsonwebtoken.default.sign(payload, secretOrPrivateKey, _objectSpread({
        notBefore: '1'
      }, options), (error, token) => error ? reject(error) : resolve(token));
    });
  });
  return _signPayload.apply(this, arguments);
}

function verifyPayload(token, secretOrPrivateKey) {
  return _jsonwebtoken.default.verify(token, secretOrPrivateKey);
}