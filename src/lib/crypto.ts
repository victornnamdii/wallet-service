import crypto from "node:crypto";
import env from "../config/env";

const algorithm = env.CRYPTO_ALGORITHM;
const IV = env.CRYPTO_IV;
const crypto_key = env.CRYPTO_KEY;

class Crypto {
  private cipher: crypto.Cipher;
  private decipher: crypto.Decipher;
  constructor() {
    this.cipher = crypto.createCipheriv(algorithm, crypto_key, IV);
    this.decipher = crypto.createDecipheriv(algorithm, crypto_key, IV);
  }

  encrypt(message: string) {
    let encryptedMessage = this.cipher.update(
      encodeURI(message),
      "utf-8",
      "hex"
    );
    encryptedMessage += this.cipher.final("hex");

    return encryptedMessage;
  }

  decrypt(data: string) {
    let decryptedMessage = this.decipher.update(data, "hex", "utf-8");
    decryptedMessage += this.decipher.final("utf-8");

    return decodeURI(decryptedMessage);
  }
}

export const encrypt = (string: string): string => {
  const cryptoClient = new Crypto();
  return cryptoClient.encrypt(string);
};

export const decrypt = (string: string): string => {
  const cryptoClient = new Crypto();
  return cryptoClient.decrypt(string);
};
