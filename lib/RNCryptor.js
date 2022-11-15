(function() {
  var crypto = require('crypto');

  var _settings = {};

  var _configure_settings = function(version) {
    var settings = {
      algorithm: 'aes-256-cbc',
      salt_length: 8,
      iv_length: 16,
      pbkdf2: {
        iterations: 10000,
        key_length: 32
      },
      hmac: {
        length: 32
      }
    };

    switch(version) {
      case 3:
        settings.options = 1;
        settings.hmac.includes_header = true;
        settings.hmac.algorithm = 'sha256';
        break;
      default:
        var err = "Unsupported schema version " + version;
        throw err
    }

    _settings = settings;
  };

  var _unpack_encrypted_base64_data = function(b64str) {
    var data = new Buffer(b64str, 'base64');

    var components = {
      headers: _parseHeaders(data),
      hmac: data.slice(data.length -_settings.hmac.length)
    };

    var header_length = components.headers.length;
    var cipher_text_length = data.length - header_length - components.hmac.length;

    components.cipher_text = data.slice(header_length, header_length + cipher_text_length);

    return components;
  };

  var _parseHeaders = function(buffer_data) {
    var offset = 0;

    var version_char = buffer_data.slice(offset, offset + 1);
    offset += version_char.length;

    _configure_settings(version_char.toString('binary').charCodeAt());

    var options_char = buffer_data.slice(offset, offset + 1);
    offset += options_char.length;

    var encryption_salt = buffer_data.slice(offset, offset + _settings.salt_length);
    offset += encryption_salt.length;

    var hmac_salt = buffer_data.slice(offset, offset + _settings.salt_length);
    offset += hmac_salt.length;

    var iv = buffer_data.slice(offset, offset + _settings.iv_length);
    offset += iv.length;

    return {
      version: version_char,
      options: options_char,
      encryption_salt: encryption_salt,
      hmac_salt: hmac_salt,
      iv: iv,
      length: offset
    };
  };

  var _hmac_is_valid = function(components, password) {
    var hmac_key = _generate_key(password, components.headers.hmac_salt);

    // For 0.11+ we can use Buffer.compare
    return components.hmac.toString('hex') == _generate_hmac(components, hmac_key).toString('hex');
  };

  var _generate_key = function (password, salt) {
    return crypto.pbkdf2Sync(password, salt, _settings.pbkdf2.iterations, _settings.pbkdf2.key_length, 'SHA1');
  };

  var _generate_hmac = function(components, hmac_key) {
    var hmac_message = new Buffer('');

    if (_settings.hmac.includes_header) {
      hmac_message = Buffer.concat([
        hmac_message,
        components.headers.version,
        components.headers.options,
        components.headers.encryption_salt || new Buffer(''),
        components.headers.hmac_salt || new Buffer(''),
        components.headers.iv
      ]);
    }

    hmac_message = Buffer.concat([hmac_message, components.cipher_text]);

    return crypto.createHmac(_settings.hmac.algorithm, hmac_key).update(hmac_message).digest();
  };

  var _generate_initialized_components = function(version) {
    return {
      headers: {
        version: new Buffer(String.fromCharCode(version)),
        options: new Buffer(String.fromCharCode(_settings.options))
      }
    };
  };

  var _generate_salt = function() {
    return _generate_iv(_settings.salt_length);
  };

  var _generate_iv = function (block_size) {
    return crypto.randomBytes(block_size)
  };

  var _encrypt = function(plain_text, components, encryption_key, hmac_key) {
    var cipher = crypto.createCipheriv(_settings.algorithm, encryption_key, components.headers.iv);
    var encrypted = Buffer.concat([cipher.update(plain_text), cipher.final()]);
    components.cipher_text = encrypted;

    var data = Buffer.concat([
      components.headers.version,
      components.headers.options,
      components.headers.encryption_salt || new Buffer(''),
      components.headers.hmac_salt || new Buffer(''),
      components.headers.iv,
      components.cipher_text
    ]);

    var hmac = _generate_hmac(components, hmac_key);

    return Buffer.concat([data, hmac]).toString('base64');
  };

  var RNCryptor = {};

  RNCryptor.GenerateKey = _generate_key;

  RNCryptor.Encrypt = function(plain_text, password, version) {
    version || (version = 3);
    Buffer.isBuffer(plain_text) || (plain_text = new Buffer(plain_text, 'binary'));
    Buffer.isBuffer(password) || (password = new Buffer(password, 'binary'));

    _configure_settings(version);

    var components = _generate_initialized_components(version);
    components.headers.encryption_salt = _generate_salt();
    components.headers.hmac_salt = _generate_salt();
    components.headers.iv = _generate_iv(_settings.iv_length);

    var encryption_key = _generate_key(password, components.headers.encryption_salt);
    var hmac_key = _generate_key(password, components.headers.hmac_salt);

    return _encrypt(plain_text, components, encryption_key, hmac_key);
  };

  RNCryptor.EncryptWithArbitrarySalts = function(plain_text, password, encryption_salt, hmac_salt, iv, version) {
    version || (version = 3);
    Buffer.isBuffer(plain_text) || (plain_text = new Buffer(plain_text, 'binary'));
    Buffer.isBuffer(password) || (password = new Buffer(password));
    Buffer.isBuffer(encryption_salt) || (encryption_salt = new Buffer(encryption_salt, 'binary'));
    Buffer.isBuffer(hmac_salt) || (hmac_salt = new Buffer(hmac_salt, 'binary'));
    Buffer.isBuffer(iv) || (iv = new Buffer(iv, 'binary'));

    _configure_settings(version);

    var components = _generate_initialized_components(version);
    components.headers.encryption_salt = encryption_salt;
    components.headers.hmac_salt = hmac_salt;
    components.headers.iv = iv;

    var encryption_key = _generate_key(password, encryption_salt);
    var hmac_key = _generate_key(password, hmac_salt);

    return _encrypt(plain_text, components, encryption_key, hmac_key);
  };

  RNCryptor.EncryptWithArbitraryKeys = function (plain_text, encryption_key, hmac_key, iv, version) {
    version || (version = 3);
    Buffer.isBuffer(plain_text) || (plain_text = new Buffer(plain_text, 'binary'));
    Buffer.isBuffer(encryption_key) || (encryption_key = new Buffer(encryption_key, 'binary'));
    Buffer.isBuffer(hmac_key) || (hmac_key = new Buffer(hmac_key, 'binary'));
    Buffer.isBuffer(iv) || (iv = new Buffer(iv, 'binary'));

    _settings.options = 0;

    var components = _generate_initialized_components(version);
    components.headers.iv = iv;

    return _encrypt(plain_text, components, encryption_key, hmac_key);
  };

  RNCryptor.Decrypt = function(b64str, password) {
    var components = _unpack_encrypted_base64_data(b64str);

    Buffer.isBuffer(password) || (password = new Buffer(password, 'binary'));

    if (!_hmac_is_valid(components, password)) {
      return;
    }

    var key = _generate_key(password, components.headers.encryption_salt);

    var decipher = crypto.createDecipheriv(_settings.algorithm, key, components.headers.iv);
    var decrypted = Buffer.concat([decipher.update(components.cipher_text), decipher.final()]);
    return decrypted
  };

  module.exports = RNCryptor;
})();
