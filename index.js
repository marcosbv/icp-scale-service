var express = require('express');
var request = require('request-promise-native');
var bodyParser = require('body-parser');
var util   = require('util');
var extend = require('extend');

var CAMClient = require('./cam.js');

var app = express();

app.use(bodyParser.json());

/*
var icp_host = '10.51.76.28:8443';
var cam_host = '10.51.76.29:30000';
var cam_user = 'admin';
var cam_password = '*****';
*/

/*
* Global variables 
*/
var ico_host     = process.env.ICO_HOST;
var ico_user     = process.env.ICO_USER;
var ico_password = process.env.ICO_PASSWORD;
var ico_url      = process.env.ICO_URL;

var icp_host = process.env.ICP_HOST;
var cam_host = process.env.CAM_HOST;
var cam_user = process.env.CAM_USER;
var cam_password = process.env.CAM_PASSWORD;
var cloud_id = process.env.CLOUD_CONNECTION_ID;

// e3032294-9f6f-4855-b8a2-a79b61006846 all 00001
let tenantId = process.env.CAM_TENANT_ID;

// cache for stacks that are available for usage in application pools
var unallocated_stacks = [];

// cache for 

/**
 * Appends a message to log.
 * @param {*} logger        log appender (string)
 * @param {*} message       message to append (string) -> can be placeholders
 * @param     restParams    parameters to fullfil placeholders
 */
async function appendLog(logger, message, ...restParams) {
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
    console.log(line);
    logger.request_log+=line + "\n";
}



/**
 * Implements a simple sleep function using promises.
 * @param {*} ms - the amount of time to sleep in miliseconds
 */
async function sleep(ms) {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}


/**
 * Endpoint for scale up
 */
app.post('/icp-scale/api/v1/scale', async function(req, res){
    let count = parseInt(req.query.count) || 1;
    let namespace = req.query.namespace;
    let templateName = req.query.templateName;
    let stackTemplate = req.query.stackTemplate;

    let camClient = new CAMClient(icp_host,cam_host,cam_user, cam_password,request);
    
    let token = await camClient.getAuthToken();
  
    let templateDetails = await camClient.getTemplateByName(tenantId, "all", namespace, templateName, token);
    let templateId = templateDetails.id;
    let stackTemplateObj = await camClient.getStackByPartialStackName(tenantId, "all", namespace, stackTemplate, token);

    let input_parameters = stackTemplateObj.parameters.template_input_params;

    for(let i=0;i<count;i++) {
        let hostname = "icp-pool-" + Date.now();
        let template_input = {};
        template_input.name = hostname;
        template_input.cloud_connection_ids[0] = cloud_id;
        template_input.templateId = templateId;
        template_input.parameters = [];
        for(let j=0;j<input_parameters.length;j++) {
            let parameter_name = input_parameters[j].name;
            let parameterObj = {}
            parameterObj.name = parameter_name;

            if(parameter_name == "vm_1_name") {
                parameterObj.value = hostname;
            }
            else {
                parameterObj.value = input_parameters[j].value
            }

            template_input.parameters[j]=parameterObj;
        }
        let response = await camClient.createStack(tenantId,"all",namespace,token,input_parameters);
    }
  
    
   
    
});

/**
 * Endpoint for tag an existing resource pool into an application
 */
app.post('/icp-scale/api/v1/tag',async function(req, res){
    let count = parseInt(req.query.count) || 1;
    let namespace = req.query.namespace;
    let templateName = req.query.templateName;


  
});

/**
 * Remove the tag from app and destroy resource
 */
app.post('/icp-scale/api/v1/untag',async function(req, res){
    let amount = parseInt(req.params.count);   
  
});

app.get('/ico-scale/api/v1/scale', async function(req,res) {
    
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
 * Express Server
 */
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