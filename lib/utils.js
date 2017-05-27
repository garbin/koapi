module.exports = {
  base64: {
    encode: str => Buffer.from(`${str}`).toString('base64'),
    decode: str => Buffer.from(`${str}`, 'base64').toString('ascii')
  }
}
