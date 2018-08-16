import winston, { format } from 'winston'
import moment from 'moment'

const logger = winston.createLogger({
  format: format.combine(format.timestamp(), format.prettyPrint()),
  transports: [
    new winston.transports.Console()
  ]
})

export {winston}
export default logger
