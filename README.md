# RNCryptor-node

> This repo hard forks from [chesstrian/JSCryptor](https://github.com/chesstrian/JSCryptor) and use native `crypto` instead of [mcrypt](https://www.npmjs.com/package/mcrypt).

*Javascript implementation of [RNCryptor](https://github.com/RNCryptor/RNCryptor-Spec)*

This implementation tries to be compatible with [Rob Napier's Objective-C implementation of RNCryptor](https://github.com/RNCryptor/RNCryptor), It supports schema version 3.
This code is based on the [PHP implementation of RNCryptor](https://github.com/RNCryptor/RNCryptor-php).

## Install

```bash
npm i rncryptor-node
```

## Test
```bash
npm test
```

## Example
```js
// Example taken from https://github.com/RNCryptor/RNCryptor-php/blob/master/examples/decrypt.php

var password = 'myPassword';
var b64string = "AwHsr+ZD87myaoHm51kZX96u4hhaTuLkEsHwpCRpDywMO1Moz35wdS6OuDgq+SIAK6BOSVKQFSbX/GiFSKhWNy1q94JidKc8hs581JwVJBrEEoxDaMwYE+a+sZeirThbfpup9WZQgp3XuZsGuZPGvy6CvHWt08vsxFAn9tiHW9EFVtdSK7kAGzpnx53OUSt451Jpy6lXl1TKek8m64RT4XPr";

var RNCryptor = require('rncryptor-node');

console.time('Decrypting example');
var decrypted = RNCryptor.Decrypt(b64string, password);
console.timeEnd('Decrypting example');
console.log("Result:", decrypted.toString());
```

### A very good example, provided by @enricodeleo
```js
var fs = require('fs');
var RNCryptor = require('rncryptor-node');

var password = 'myPassword';

var img = fs.readFileSync('./Octocat.jpg');
var enc = RNCryptor.Encrypt(img, password);

// Save encrypted image to a file, for sending to anywhere
fs.writeFileSync('./Octocat.enc', enc);

// Now, to decrypt the image:
var b64 = new Buffer(fs.readFileSync('./Octocat.enc').toString(), 'base64');
var dec = RNCryptor.Decrypt(b64, password);

fs.writeFileSync('./Octocat2.jpg', dec);  // Image should open.
```

## API
### RNCryptor()
Object exposed by `require('rncryptor-node')`;

### RNCryptor.Encrypt
* plain_text: *String* or *Buffer*
* password: *String* or *Buffer*
* version: *Number* (3 by default, not mandatory)
* seeded: *Boolean* (false by default, not mandatory)

### RNCryptor.Decrypt
* b64_str: *String* or *Buffer*
* password: *String* or *Buffer*

### RNCryptor.EncryptWithArbitrarySalts
* plain_text: *String* or *Buffer*
* password: *String* or *Buffer*
* encryption_salt: *String* or *Buffer*
* hmac_salt: *String* or *Buffer*
* iv: *String* or *Buffer*
* version: *Number* (3 by default, not mandatory)

### RNCryptor.EncryptWithArbitraryKeys
* plain_text: *String* or *Buffer*
* encryption_key: *String* or *Buffer*
* hmac_key: *String* or *Buffer*
* iv: *String* or *Buffer*
* version: *Number* (3 by default, not mandatory)
