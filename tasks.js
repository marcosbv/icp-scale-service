var util = require('./util.js')
var CAMClient = require('./cam.js')
var tasks = {}
var SSHClient = require('ssh2').Client

tasks.populateCache = async function (camClient, cacheObj, tenantId, namespaceUid) {

    let token = await camClient.getAuthToken();
    util.appendLog("populateCache", "Retrieving all stacks")
    let allStacks = await camClient.getAllStacks(tenantId, "all", namespaceUid, token);

    cacheObj.stackCounter = allStacks.length;

    for(let i=0;i<allStacks.length;i++) {
        let stackObj = allStacks[i];
        let stack_id = stackObj.id

        util.appendLog("populateCache", "Stack found: %s", stack_id)
        let name = stackObj.name;
        let splittedNames = name.split("-")
        
        if(splittedNames.length<2) {
            continue;
        }

        let number = parseInt(splittedNames[1])
        if(isNaN(number)) {
            continue;
        }

        let foundInCache = false;
        if(stackObj.applied_status != "SUCCESS") {
            continue;
        }

        for(let k=0;k<cacheObj.stacksById.length;k++) {
         
            if(cacheObj.stacksById[k] == stack_id) {
                foundInCache = true;
                break;
            }
        }

        if(!foundInCache) {
            setTimeout(function() {
                util.appendLog("populateCache", "Retrieving stack " + stack_id)
                let promise = camClient.retrieveStack(tenantId, "all", namespaceUid, stack_id, token)
                promise.then(function(detailedStackObj) {
                   //  console.log(JSON.stringify(detailedStackObj))
                   let outputParameters = detailedStackObj.data.details.outputs;
                   for(let j=0;j<outputParameters.length;j++) {
                       let outputParameter = outputParameters[j];
                       if(outputParameter.name == "ip_address") {
                          util.appendLog("populateCache", "Adding stack to cache for IP Address " + outputParameter.value)
                          cacheObj.stacksByIpCache.set(outputParameter.value, stack_id)
                          cacheObj.stacksById.push(stack_id)
                          break;
                       }
                   }
                })
             }, 1000)
        }
      
    }

}

tasks.follow = async function (camClient, tenantId, teamId, namespace, stackId, token, cacheObj, callback) {
    setTimeout(async function() {
       let stackDetails = await camClient.retrieveStack(tenantId, teamId, namespace, stackId, token) 
       util.appendLog("followup", "[Stack-%s] Status: %s", stackId, stackDetails.applied_status)
       if(stackDetails.applied_status == "IN_PROGRESS") {
         setTimeout(async function() {
            follow(camClient, tenantId, teamId, namespace, stackId, token, cacheObj, callback)
         }, 10000)
       }

       if(stackDetails.applied_status == "SUCCESS") {
        let outputParameters = stackDetails.data.details.outputs;
        for(let j=0;j<outputParameters.length;j++) {
            let outputParameter = outputParameters[j];
            if(outputParameter.name == "ip_address") {
               cacheObj.stacksByIpCache.set(outputParameter.value, stackId)
               cacheObj.stacksById.push(stackId)
               break;
            }
        }
        if(callback) {
            callback()
        }    
       }
    }, 10000)
}

tasks.pauseAlerts = async function (request, grafana_token, grafana_server, grafana_dashboard){
    const args = {
        headers: {"Content-Type":" application/json"},
    };
    baseUrl=`https://${grafana_token}@${grafana_server}/api/alerts/${grafana_dashboard}/pause`;
    request.post(baseUrl, args, function(err, httpResponse, body) {
      util.appendLog("pauseAlerts", "Error: %s", err);
      util.appendLog("pauseAlerts", "httpResonse: %s", httpResponse.statusCode);
      if (err || httpResponse.statusCode > 399) {
        util.appendLog("pauseAlerts", 'something went wrong on the request: %s', err && err.request.options);
        if (httpResponse.statusCode > 499) {
            util.appendLog("pauseAlerts", body);
        }
      } else {
        util.appendLog("pauseAlerts", 'Server responded with: %s', body);
      };
    });
    util.appendLog("pauseAlerts", "POST request submitted at : %s", baseUrl);
}

tasks.getOldestMachineIP = async function(bootnode_icp, user, password, label) {
    return new Promise(function(resolve, reject) {
        var conn = new Client();
        var buffer = [];

        conn.on('ready', function() {
         
           conn.shell(function(err, stream) {
              if (err) reject(err);
              stream.on('close', function() {
                  util.appendLog("getOldestMachineIP", 'Stream :: close');
                  conn.end();
                  resolve(Buffer.concat(buffer).toString())
              }).on('data', function(data) {
                  util.appendLog("getOldestMachineIP",'OUTPUT: ' + data);
                  buffer.push(data)
              });
              stream.end(`kubectl get nodes --show-labels |grep ${label} |grep -i ready| awk  '{if ($4~/d/) {print } else if ($4~/h/) {print } else  if ($4~/m/) {print }}' | sort -nk4 |tail -1 |awk '{print $1 }'  \nexit\n`);
          });
        }).connect({
          host: bootnode_icp,
          port: 22,
          username: user,
          password: password
        
        });
    })
   
}
tasks.renameNamespace = async function(bootnode_icp, user, password, namespace) {
    appendLog("renameNamespace", "Getting oldest machine from resource pool")
    tasks.getOldestMachineIP(bootnode_icp, user, password, "resourcepool").then(function (ip) {

    })
}

tasks.cordon = async function(bootnode_icp, user, password,ip_address) {
    return new Promise(async function() {
        var conn = new Client();
        var buffer = [];

        conn.on('ready', function() {
         
           conn.shell(function(err, stream) {
              if (err) reject(err);
              stream.on('close', function() {
                  util.appendLog("cordon", 'Stream :: close');
                  conn.end();
                  resolve(Buffer.concat(buffer).toString())
              }).on('data', function(data) {
                  util.appendLog("cordon",'OUTPUT: ' + data);
                  buffer.push(data)
              });
              stream.end(`kubectl cordon ${ip_address}`);
          });
        }).connect({
          host: bootnode_icp,
          port: 22,
          username: user,
          password: password
        
        });
    })   
}

tasks.removeMachine = async function(camClient, tenantId, teamId, namespaceUid, stackId, token, cacheObj, ip_address ) {
    let promise = camClient.destroyStack(tenantId, teamId, namespaceUid, stackId, token)
    promise.then(function(response) {
        console.log(JSON.stringify(response))
        util.appendLog("removeMachine", `Stack started to be destroyed... ID: ${stackId}`);
        setTimeout(function() {
            tasks.follow(camClient, tenantId, "all", namespaceUid, stackId, token, cacheObj, function() {
                util.appendLog("removeMachine", "[Stack-%s] Requesting deletion of stack...", stackId)
                let deletePromise = camClient.deleteStack(tenantId, teamId, namespaceUid, stackId, token)
                deletePromise.then(function() {
                    util.appendLog("removeMachine", "[Stack-%s] Stack deleted successfully!", stackId)
                    cacheObj.stacksByIpCache.delete(ip_address)
                    cacheObj.stacksById.remove(stackId)
                })
            })
        }, 500);
    })

}

module.exports = tasks