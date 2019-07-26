class CAMClient {

    constructor(icp_host, cam_host, cam_user, cam_password, httpClient) {
        this.icp_host = icp_host;
        this.cam_host = cam_host;
        this.cam_user = cam_user;
        this.cam_password = cam_password
        this.httpClient = httpClient;
    }

    async getAuthToken() {
        let icp_url = "https://" + this.icp_host + "/idprovider/v1/auth/identitytoken" ;
        let request_options = {
            url: icp_url,
            form: {
                grant_type: "password",
                username: this.cam_user,
                password: this.cam_password,
                scope: "openid"
            },
            json: true,
            rejectUnauthorized: false,
            
        }

        let httpClient = this.httpClient;

        return new Promise (function (resolve, reject) {
            httpClient.post(request_options).then(function (response) {
                resolve(response.access_token);
            }).catch(function (err) {
                console.log("Erro ao capturar token: " + err);
                reject(err);
            });
        });
       
    }

    getStackByStackId(tenantId, teamId, namespaceUid, stackId, token, templateName) {
        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks?tenantId=" + tenantId +
                          "&ace_orgGuid=" + teamId +
                          "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            }
        }

        return new Promise(function (resolve, reject) {
            httpClient.get(request_options).then(function(response) {
                for(let j=0;j<response.length; j++) {
                    let objInstance = response[j];

                    if(objInstance.stack_id == stackId) {
                        resolve(objInstance);
                        return;
                    }
                }
                reject({message: "Stack with STACKID " + stackId + " not found."});
        }).catch(function (err) {
            console.log("Erro ao ler informacoes do stack: " + err);
            reject(err);
        });

        })

    }

    retrieveStack(tenantId, teamId, namespaceUid, stackId, token) {
        // URL: "https://${CAM_HOST}:30000/cam/api/v1/stacks/5c8a93391b5e14001cd79948/retrieve?
        // tenantId=${CAM_TENANT_ID}&ace_orgGuid=${ICP_TEAM}&cloudOE_spaceGuid=${ICP_NAMESPACE}"

        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks/" +
                      stackId + "/retrieve?tenantId=" + tenantId +
                                        "&ace_orgGuid=" + teamId +
                                        "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            }
        }

        return new Promise(function (resolve, reject) {
            httpClient.post(request_options).then(function(response) {
                resolve(response);
            }).catch(function (err) {
                console.log("Erro ao ler informacoes do stack: " + err);
                reject(err);
            });

        })
    }

    planStackChanges(tenantId, teamId, namespaceUid, stackId, token, bodyRequest) {
        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks/" +
            stackId + "/plan?tenantId=" + tenantId +
                          "&ace_orgGuid=" + teamId +
                          "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            },
            body: bodyRequest
        }

        return new Promise(function (resolve, reject) {
           httpClient.post(request_options).then(function(response) {
                resolve(response);
            }).catch(function (err) {
                console.log("Erro ao realizar o plan: " + err);
                reject(err);
            });

        })

    }

    modifyStack(tenantId, teamId, namespaceUid, stackId, token, bodyRequest) {
        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks/" +
            stackId + "/apply?tenantId=" + tenantId +
                          "&ace_orgGuid=" + teamId +
                          "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            },
            body: bodyRequest
        }

        return new Promise(function (resolve, reject) {
           httpClient.post(request_options).then(function(response) {
                resolve(response);
            }).catch(function (err) {
                console.log("Erro ao realizar o apply: " + err);
                reject(err);
            });

        })

    }

    destroyStack(tenantId, teamId, namespaceUid, stackId, token) {
        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks/" +
        stackId + "/delete?tenantId=" + tenantId +
                      "&ace_orgGuid=" + teamId +
                      "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
           url: cam_url,
           json: true,
           rejectUnauthorized: false,
           headers: {
            'Authorization' : 'Bearer ' + token
           },
        }

        return new Promise(function (resolve, reject) {
           httpClient.delete(request_options).then(function(response) {
            resolve(response);
           }).catch(function (err) {
            console.log("Erro ao realizar o destroy do stack: " + err);
            reject(err);
           });

        })

    }

    deleteStack(tenantId, teamId, namespaceUid, stackId, token) {
        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks/" +
        stackId +     "?tenantId=" + tenantId +
                      "&ace_orgGuid=" + teamId +
                      "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
           url: cam_url,
           json: true,
           rejectUnauthorized: false,
           headers: {
            'Authorization' : 'Bearer ' + token
           },
        }

        return new Promise(function (resolve, reject) {
           httpClient.delete(request_options).then(function(response) {
            resolve(response);
           }).catch(function (err) {
            console.log("Erro ao realizar o delete do stack: " + err);
            reject(err);
           });

        })

    }

    getStackByPartialStackName(tenantId, teamId, namespaceUid, partialName, token) {
        let cam_url = "https://" + this.cam_host + "/cam/api/v1/stacks?tenantId=" + tenantId +
        "&ace_orgGuid=" + teamId +
        "&cloudOE_spaceGuid=" +namespaceUid +
        "&filter[where][name][like]=" + partialName + 
        "&filter[order]=created_at%20ASC";

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            }
        }

        return new Promise(function (resolve, reject) {
            httpClient.get(request_options).then(function(response) {
              resolve(response);
      
            }).catch(function (err) {
               console.log("Erro ao procurar stacks por nome parcial: " + err);
               reject(err);
            })
        });
    }

    createStack(tenantId, teamId, namespaceUid, token, bodyRequest) {

    }

    async getTemplateDetails(tenantId, teamId, namespaceUid, templateId, token, self) {

        let cam_url = "https://" + this.cam_host + "/cam/api/v1/templates/" + templateId +
        "?tenantId=" + tenantId +
        "&ace_orgGuid=" + teamId +
        "&cloudOE_spaceGuid=" +namespaceUid;

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            }
        }

        return new Promise(function (resolve, reject) {
            httpClient.get(request_options).then(function(response) {
               resolve(response)
      
            }).catch(function (err) {
               console.log("Erro ao procurar stacks por nome parcial: " + err);
               reject(err);
            })
        });
    }
    async getTemplateByName(tenantId, teamId, namespaceUid, templateName, token) {

        let cam_url = "https://" + this.cam_host + "/cam/api/v1/templates?tenantId=" + tenantId +
        "&ace_orgGuid=" + teamId +
        "&cloudOE_spaceGuid=" +namespaceUid +
        "&filter[where][name]=" + templateName + 
        "&filter[order]=created_at%20ASC";

        let httpClient = this.httpClient;
        let request_options = {
            url: cam_url,
            json: true,
            rejectUnauthorized: false,
            headers: {
                'Authorization' : 'Bearer ' + token
            }
        }

        let self = this;

        return new Promise(async function (resolve, reject) {
            httpClient.get(request_options).then(async function(response) {

              if(response.length > 0) {
                let templateId = response[0].id
                let detailedResponse = await self.getTemplateDetails(tenantId, teamId, namespaceUid, templateId, token)
                resolve(detailedResponse);
              }
              else {
                reject("No template found!");
              }
              
      
            }).catch(function (err) {
               console.log("Erro ao procurar templates por nome: " + err);
               reject(err);
            })
        });
    }
}

module.exports = CAMClient;