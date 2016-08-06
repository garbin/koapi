import winston from 'winston'
import moment from 'moment'

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  timestamp: function() {
    return moment().format();
  },
  formatter(options){
    return `${options.timestamp()} [${options.level.toUpperCase()}] ${options.message !== undefined ? options.message : ''} ${options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' }`
  }
});

export default winston;
