var express = require('express');
var request = require('request-promise-native');
var bodyParser = require('body-parser');
var extend = require('extend');

var CAMClient = require('./cam.js');
var util   = require('./util.js');
var tasks = require('./tasks.js');


var app = express();

app.use(bodyParser.json());

/*
var icp_host = '10.51.76.28:8443';
var cam_host = '10.51.76.29:30000';
var cam_user = 'admin';
var cam_password = '*****';
*/

/*
* ICO Global variables 
*/
var ico_host     = process.env.ICO_HOST;
var ico_user     = process.env.ICO_USER;
var ico_password = process.env.ICO_PASSWORD;
var ico_url      = process.env.ICO_URL;

/**
 * CAM global variables
 */
var icp_host = process.env.ICP_HOST;
var cam_host = process.env.CAM_HOST;
var cam_user = process.env.CAM_USER;
var cam_password = process.env.CAM_PASSWORD;
var cam_refresh_interval = process.env.CAM_REFRESH_CACHE_INTERVAL || 300000
// e3032294-9f6f-4855-b8a2-a79b61006846 all 00001
let tenantId = process.env.CAM_TENANT_ID;
let namespaceUid = process.env.CAM_NAMESPACE_UID;

/**
 * GRAFANA global variables
 */
var grafana_token = process.env.GRAFANA_TOKEN
var grafana_server = process.env.GRAFANA_SERVER
var grafana_dashboard = process.env.GRAFANA_DASHBOARD
var grafana_check_interval = process.env.GRAFANA_CHECK_INTERVAL || 600000

/**
 * SSH global variables
 */
var bootnode_ssh_user = process.env.BOOTNODE_SSH_USER
var bootnode_ssh_password = process.env.BOOTNODE_SSH_PASSWORD


// cache for CAM stacks
var cacheObj = {}
cacheObj.stacksByIpCache = new Map();
cacheObj.stacksById=[];
cacheObj.stackCounter=0;


app.use(bodyParser.json());

// POST https://localhost:8000/icp-scale/api/v1/uc1/scale
/**
 * {
 *    "count" : 1,
 *    "cam_namespace" : "1-namespace",
 *    "template_name" : "MeuTemplate",
 *    "cloud_connection" : "VMWareHomologacao",
 *    "hostname_prefix" : "meuprefixo"
 *    "template_input_params" : [
 *        { "name" : "vm_1_name", "value" : "HostMachine"  },
 *        { "name" : "param1"   , "value" : "OutroValor"   }
 *    ]
 * }
 */
//
/**
 * Endpoint for scale up
 */
app.post('/icp-scale/api/v1/uc1/scale', async function(req, res, next){
    let count = parseInt(req.body.count) || 1;
    let namespace = req.body.cam_namespace;
    let templateName = req.body.template_name;

    let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
    
    util.appendLog("scale-up", "Capturando token de autenticacao do token!")
    let token = await camClient.getAuthToken();
  
    let templateDetails = null;
    let cloudConnectionDetails = null;
    try {
        util.appendLog("scale-up", "Capturando template pelo nome...")
        templateDetails = await camClient.getTemplateByName(tenantId, "all", namespace, templateName, token);
        util.appendLog("scale-up", "Template ID=" + templateDetails.id)
        util.appendLog("scale-up", "Capturando Cloud Connection pelo nome...")
        cloudConnectionDetails = await camClient.getCloudConnectionByName(tenantId,"all",req.body.cloud_connection, token)
        util.appendLog("scale-up", "Cloud Connection ID=" + cloudConnectionDetails.id)
    }
    catch(e) {
        res.status(500).json({details: e})
        return;
    }
    

    let templateId = templateDetails.id;
    let cloudConnectionId = cloudConnectionDetails.id;
    let input_parameters = templateDetails.manifest.template.templateVariables.template_input_params

    
    let updated_input_parameters = req.body.template_input_params;

    // populate default options for value parameter
    for(let b=0;b<input_parameters.length;b++) {
        let inputObj = input_parameters[b]
        inputObj.value = inputObj.default
        // selection group (choose default)
        if(inputObj.options) {
            for(let b1=0;b1<inputObj.options.length; b1++) {
                let optionObj = inputObj.options[b1];
                if(optionObj.default == "true") {
                    inputObj.value = optionObj.value
                    break
                }
            }
        }
    }

    let hostnamePrefix = req.body.hostname_prefix

    // console.log(input_parameters)
    for(let i=0;i<count;i++) {
        let hostname = hostnamePrefix + "-" + (++cacheObj.stackCounter).pad(5)

        // replace only parameters received from JSON
        for(let a=0;a<updated_input_parameters.length;a++) {
           let property=updated_input_parameters[a];

           for(let b=0;b<input_parameters.length;b++) {
             if(property.name == input_parameters[b].name) {
                // Look for reference to $hostname
                input_parameters[b].value = property.value.replace(/\$hostname/g, hostname)
                break;
             }
           }
       }

        try {
            let response = await camClient.createStack(tenantId,"all",namespace,token,cloudConnectionId, templateId, hostname, input_parameters);
            console.log(JSON.stringify(response))
            util.appendLog("scale-up", `Stack created... ID: ${response.id} Status: ${response.applied_status}`);
            setTimeout(function() {
                tasks.follow(camClient, tenantId, "all", namespace, response.id, token, cacheObj)
            }, 500);

        } catch(e) {
            res.status(500).json({details : e})
        }
    } 

    res.status(200).json({details: "Success!" })
});



/**
 * POST https://localhost:8000//icp-scale/api/v1/uc2/renamenamespace
/*
 * {
 *    "icp_address" : "10.0.0.1",
 *    "bootnode_icp" : "10.0.0.2"
 *    "namespace" : "app-namespace"
 * }
 *
 * Endpoint to change a generic worker machine to a specific namespace
 */
app.post('/icp-scale/api/v1/uc2/renamenamespace',async function(req, res){
  
    let icp_address = req.body.icp_address;
    let bootnode_icp = req.body.bootnode_icp;
    let namespace = req.body.namespace;

    tasks.renameNamespace(bootnode_icp, bootnode_ssh_user, bootnode_ssh_password, namespace);
 
   res.status(200).json({message : "enviado"}).end();
});


//  POST https://localhost:8000/icp-scale/api/v1/cache-refresh
/**
 * Forces a cache refresh
 */
app.post('/icp-scale/api/v1/cache-refresh', async function(req, res) {
    cacheObj.stacksByIpCache = new Map();
    cacheObj.stacksById=[];
 
    util.appendLog("cache-refresh", "Atualizacao de cache solicitada...")
    setTimeout(async function() {
        let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
        tasks.populateCache(camClient, cacheObj, tenantId, namespaceUid)
    }, 1000)
    res.status(200).json({message : "ok"})
});

// POST https://localhost:8000/icp-scale/api/v1/uc3/remove
/*
 * {
 *    "cam_namespace" : "1-namespace",
 *    "bootnode_icp" : "10.0.2.3",
 *    "namespace" : "icp_namespace"
 * }
 * Remove a machine from an app and destroy that using CAM
 */
app.post('/icp-scale/api/v1/uc3/remove',async function(req, res){
    
    let namespace = req.body.cam_namespace;
    let bootnode_icp = req.body.bootnode_icp;
    let icp_namespace = req.body.namespace;

    let teamId = "all"

    let ip_address = req.body.ip_address
    let stackId = cacheObj.stacksByIpCache.get(ip_address)
    
    if(stackId == null) {
        res.status(500).json({details: `IP ${ip_address} nao encontrado no cache... Aplique uma atualizacao de cache e tente novamente.`})
        return;
    }

    let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
    
    util.appendLog("untag", "Capturando token de autenticacao do token!")
    let token = await camClient.getAuthToken();
    tasks.removeMachine(camClient, tenantId, teamId, namespace, stackId, token, cacheObj, ip_address)

    // Step 1: gather IP address from boot node
    /*
    let ip_address = await tasks.getOldestMachineIP(bootnode_icp, bootnode_ssh_user, bootnode_ssh_password, icp_namespace)
 
    if(ip_address == "") {
        res.status(500).json({details: `IP nao encontrado a partir da execucao do comando kubectl.`})
        return;
    }
    let stackId = cacheObj.stacksByIpCache.get(ip_address)
    
    if(stackId == null) {
        res.status(500).json({details: `IP ${ip_address} nao encontrado no cache... Aplique uma atualizacao de cache e tente novamente.`})
        return;
    }

    // Step 2: execute cordon
    tasks.cordon(bootnode_icp, bootnode_ssh_user, bootnode_ssh_password, ip_address).then(async function(data) {
        // Step 3: wait for some time and execution destroy and delete from CAM
        await util.sleep(30000)
        let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
        
        util.appendLog("untag", "Capturando token de autenticacao do token!")
        let token = await camClient.getAuthToken();
        tasks.removeMachine(camClient, tenantId, teamId, namespaceUid, stackId, token, cacheObj, ip_address)
    })
*/
    res.status(200).json({details:  "Success!"})
  
});

app.get('/ico-scale/api/v1/scale', async function(req,res) {
    
    console.log(req.body)

    let body = {
        parm:{
            OperationParameter: "<variable type=\"AddNode\"><icoClusterHost type= \"String\"><![CDATA[" + icp_host + "]]><\/icpClusterHost></variable>"
        }
    }

    let request_options = {
        url: ico_url,
        json: true,
        auth : {
            user:     ico_user,
            password: ico_password
        },
        body: body
    }

    /**
     * curl -k -u admin:xxxxxx --header "Content-Type: application/json"-- 
     * request POST -d 
     * '{"parm":{"OperationParameter": 
     * "<variable type=\"AddNode\"><icoClusterHost type= \"String\"><![CDATA['${IPICP}']]><\/icpClusterHost></variable>"
     * }}' 
     * https://servidorICO/orchestrator/v2/offerings/8003/launch
     */
    request.post(request_options)
           .then(function () {
               res.status(200).json({message: "Successfully sent!"})
            })
           .catch(function (err) {
               res.status(500).json({message: "Failed!", error: err})
            })
});

app.get('/api/v1/health', async function(req, res) {
    res.status(200).json({message : "ok"}).end();
})

/**
 * Background Task: populate stack cache (5 minutes)
 */
let initialPopulateCacheTask = new Promise(function(resolve, reject) {
    util.appendLog("initialTask-populateCache", "Starting populateCache ")
    let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
    tasks.populateCache(camClient, cacheObj, tenantId, namespaceUid)
    resolve()
})

setInterval(function() {
    util.appendLog("asyncTask-populateCache", "Starting populateCache ")
    let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
    tasks.populateCache(camClient, cacheObj, tenantId, namespaceUid)
}, cam_refresh_interval)

/**
 * Background Task: pause Grafana alerts
 */
setInterval(function() {
    util.appendLog("asyncTask-pauseAlerts", "Starting pause alerts")
    if(grafana_token && grafana_server && grafana_dashboard) {
        tasks.pauseAlerts(request, grafana_token, grafana_server, grafana_dashboard);
    }
}, grafana_check_interval)


/**
 * Express Server
 */

initialPopulateCacheTask.then(function() {
    var server = app.listen(3000, function () {
        var host = server.address().address
        var port = server.address().port
        
        console.log("Micro-servico ICP scale inicializado em http://%s:%s", host, port);
        console.log("Variaveis: ");
        console.log("ICP_HOST        => %s", icp_host);
        console.log("CAM_HOST        => %s", cam_host);
        console.log("CAM_USER        => %s", cam_user);
        console.log("CAM_TENANT_ID   => %s", tenantId);
     })
})


