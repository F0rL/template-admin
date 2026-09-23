import md5 from 'node-forge/lib/md5.js'
import JSEncrypt from 'jsencrypt'

const publicKey = `MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCztAb4vXkNqlVHdbZjIrkjE/khX8QyKxmiECrwXZTtV37Z1t0LPMakhxnfJTdKeZiuWmm88kqV3RJEq5qURyAOJgeOci0QYC9oEcCxtGxaFLUTT9/ipdcqiqvjzPyBOY+rwznzT1OSHnIo3amOg7ldoKioatL2v9W3d9AnLTMuEQIDAQAB`
const encrypt = new JSEncrypt()
encrypt.setPublicKey(publicKey)

export function encryptPwdRsa(password: string): string {
  return encrypt.encrypt(password.toString()) || ''
}

export function md5Hash(text: string): string {
  const hash = md5.create()
  return hash.update(text).digest().toHex().toUpperCase()
}
