import tld from 'tldjs'
import wildcard from 'wildcard'
import isIP from 'isipaddress'

export const subdomain = function(wc, middleware){
  return async (ctx, next) => {
    if (!isIP.test(this.hostname) && wildcard(wc, this.hostname)) {
      this.subdomain = tld.getSubdomain(this.hostname);
      await middleware.bind(this, ctx, next);
    } else {
      await middleware()
    }
  }
}
