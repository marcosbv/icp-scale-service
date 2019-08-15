var util = require('util')

/**
* Appends a message to log.
* @param {*} logger        log appender (string)
* @param {*} message       message to append (string) -> can be placeholders
* @param     restParams    parameters to fullfil placeholders
*/
util.appendLog = async function (logger, message, ...restParams) {
   let line=null;
   switch(restParams.length) {
      case 1 : line = util.format(message, restParams[0]); break;
      case 2 : line = util.format(message, restParams[0], restParams[1]); break;
      case 3 : line = util.format(message, restParams[0], restParams[1], restParams[2]); break;
      case 4 : line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3]); break;
      case 5 : line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3], restParams[4]); break;
      case 6 : line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3], restParams[4], restParams[5]); break;
      case 7 : line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3], restParams[4], restParams[5], restParams[6]); break;
      case 8 : line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3], restParams[4], restParams[5], restParams[6], restParams[7]); break;
      case 9 : line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3], restParams[4], restParams[5], restParams[6], restParams[7], restParams[8]); break;
      case 10: line = util.format(message, restParams[0], restParams[1], restParams[2], restParams[3], restParams[4], restParams[5], restParams[6], restParams[7], restParams[8], restParams[9]); break;
      default: line = util.format(message, restParams);

   }
   console.log("[" + logger + "] " +line);
   // logger.request_log+=line + "\n";
}

/**
 * Implements a simple sleep function using promises.
 * @param {*} ms - the amount of time to sleep in miliseconds
 */
util.sleep = async function (ms) {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

// extend Number to pad zeros
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}

// extend Array to remove objects by reference
Array.prototype.remove = function(obj) {
    for(let i=0;i<this.length;i++) {
        if(this[i] === obj) {
            this.splice(i, 1)
            break;
        }
    }
}

module.exports = util;