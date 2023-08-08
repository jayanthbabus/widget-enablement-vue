/**
 * Security Context gathering
 * Call 3DSpace code
 *
 * At change of tenant reload the right Security Contexts
 *
 * Hook to detect change of Security Context
 *
 * As a singleton in the widget
 */

import PlatformInterface from "./PlatformInterface";

const wdgPrefEnoCtx = "__enoCtx";

const hooks = {
    onSecurityContextChange: []
};

let currentSecCtx = "";
let currentCSRFToken = "";
const secCtxByTenantCache = {};

function initPrefs() {
    let prefEnoCtx = widget.getPreference(wdgPrefEnoCtx);
    if (typeof prefEnoCtx === "undefined") {
        // Create it
        widget.addPreference({
            name: wdgPrefEnoCtx,
            type: "text",
            label: "Credentials",
            defaultValue: ""
        });
    }

    currentSecCtx = widget.getValue(wdgPrefEnoCtx);

    // Add Preference value change listener
    prefEnoCtx = widget.getPreference(wdgPrefEnoCtx);
    prefEnoCtx.onchange = "onChangeSecurityContext";
    widget.addEvent("onChangeSecurityContext", onChangeSecurityContext);
}

function updateEnoCtxPref() {
    const tenant = PlatformInterface.getCurrentTenant();
    const enoCtxInfos = Platform3DSpace.getSecurityContextForTenant(tenant);

    // Save last selected SecCtx to check later if is still in the list
    const lastSecCtxSelected = widget.getValue(wdgPrefEnoCtx);
    let bLastSecCtxStillExist = false;

    const prefEnoCtx = widget.getPreference(wdgPrefEnoCtx);
    prefEnoCtx.type = "list";

    prefEnoCtx.options = enoCtxInfos.collabspaces.reduce((arrResult, itemCS) => {
        itemCS.couples.forEach(coupleRoleOrg => {
            const { role, organization } = coupleRoleOrg;
            arrResult.push({
                label: `${role.nls || role.name}.${organization.name}.${itemCS.name}`,
                value: `${role.name}.${organization.name}.${itemCS.name}`
            });
            if (lastSecCtxSelected === `${role.name}.${organization.name}.${itemCS.name}`) {
                bLastSecCtxStillExist = true;
            }
        });
        return arrResult;
    }, []);

    if (bLastSecCtxStillExist) {
        prefEnoCtx.defaultValue = lastSecCtxSelected;
    } else {
        // Use the prefered credentials
        const { collabspace, role, organization } = enoCtxInfos.preferredcredentials;
        prefEnoCtx.defaultValue = `${role.name}.${organization.name}.${collabspace.name}`;
    }

    widget.addPreference(prefEnoCtx);
    widget.setValue(wdgPrefEnoCtx, prefEnoCtx.defaultValue);
    currentSecCtx = prefEnoCtx.defaultValue;
}

function onChangeSecurityContext(namePref, valPref) {
    if (namePref === wdgPrefEnoCtx) {
        currentSecCtx = valPref;
        hooks.onSecurityContextChange.forEach(cbFct => {
            cbFct(currentSecCtx);
        });
    }
}

const Platform3DSpace = {
    isLoaded() {
        const tenant = PlatformInterface.getCurrentTenant();
        const enoCtxInfos = Platform3DSpace.getSecurityContextForTenant(tenant);
        if (enoCtxInfos) {
            return true;
        }
        return false;
    },
    addEventListener(eventName, callbackFct) {
        if (!hooks[eventName]) throw new Error(`Invalid event name '${eventName}'`);
        hooks[eventName].push(callbackFct);
    },
    removeEventListener(eventName, callbackFct) {
        hooks[eventName].splice(hooks[eventName].indexOf(callbackFct), 1);
    },

    getSecurityContextForTenant(tenant) {
        return secCtxByTenantCache[tenant];
    },

    getCSRFToken() {
        return currentCSRFToken;
    },

    loadSecurityContexts() {
        return new Promise((resolve, reject) => {
            const loadSecCtx = () => {
                const tenant = PlatformInterface.getCurrentTenant();
                const url3DSpace = PlatformInterface.getUrlForTenantAndService(tenant, "3DSpace");
                if (!url3DSpace || url3DSpace === "") {
                    reject(new Error(`Impossible to retrieve 3DSpace url for tenant ${tenant}`));
                } else {
                    // Call 3DSpace server to get Security Contexts from OOTB Web Service
                    const servicePath = `/resources/modeler/pno/person?current=true&select=preferredcredentials&select=collabspaces&select=firstname&select=lastname&tenant=${tenant}`;
                    // Call
                    requirejs(["DS/WAFData/WAFData"], WAFData => {
                        WAFData.authenticatedRequest(url3DSpace + servicePath, {
                            method: "GET",
                            headers: {
                                SecurityContext: ""
                            },
                            data: {},
                            type: "json",
                            onComplete: response => {
                                secCtxByTenantCache[tenant] = response;

                                updateEnoCtxPref();
                                resolve();
                            },
                            onFailure: error => {
                                // P&O web services are not supported in 16x.  Make this a soft failure with
                                // a warning to console.
                                console.warn(error);
                                console.warn("WARNING: Error while calling the Web Service to retrieve the Security Contexts.  Any web service calls requiring Security Context will fail");
                                resolve();
                            }
                        });
                    });

                    // Call 3dspace server to get the CSRF token for any PUT, POST, OR DELETE calls
                    const csrfPath = "/resources/v1/application/CSRF";
                    // Call
                    requirejs(["DS/WAFData/WAFData"], WAFData => {
                        WAFData.authenticatedRequest(url3DSpace + csrfPath, {
                            method: "GET",
                            headers: {
                                SecurityContext: ""
                            },
                            data: {},
                            type: "json",
                            onComplete: response => {
                                if (response.success === "false") {
                                    reject(new Error("Error calling the Web Service to retrieve the CSRF token"), response);
                                } else {
                                    currentCSRFToken = response.csrf.value;
                                }
                                resolve();
                            },
                            onFailure: error => {
                                reject(new Error("Error calling the Web Service to retrieve the CSRF token"), error);
                            }
                        });
                    });
                }
            };
            if (!PlatformInterface.isLoaded()) {
                PlatformInterface.reload3DExpUrls().then(() => {
                    loadSecCtx();
                });
            } else {
                loadSecCtx();
            }
        });
    },

    call3DSpace({
        tenant,
        url,
        method = "GET",
        headers = {},
        data,
        type,
        dataType,
        includePlatform = false,
        includeCSRF = false
    }) {
        return new Promise((resolve, reject) => {
            const doCall = () => {
                tenant = PlatformInterface.getCurrentTenant();
                const url3DSpace = PlatformInterface.getUrlForTenantAndService(tenant, "3DSpace");
                headers.SecurityContext = currentSecCtx;
                if (includeCSRF || method === "POST" || method === "PATCH" || method === "PUT") {
                    headers.ENO_CSRF_TOKEN = currentCSRFToken;
                }

                if (!url3DSpace) {
                    reject(new Error(`No 3DSpace url found for the tenant: ${tenant}`));
                }

                if (includePlatform) url += "&platform=" + tenant;
                PlatformInterface.callWebService({
                    method: method,
                    url: url3DSpace + url,
                    headers: headers,
                    data: data,
                    type: type,
                    dataType: dataType
                })
                .then((response) => {
                    if (type && type === "json") {
                        if (response.body.error) {
                            throw new Error(response.body.error);
                        } else {
                            resolve(response.body);
                        }
                    } else {
                        resolve(response);
                    }
                })
                .catch(error => {
                    console.error(error);
                    reject(error);
                });
            };
            if (!Platform3DSpace.isLoaded()) {
                Platform3DSpace.loadSecurityContexts()
                    .then(() => {
                        doCall();
                    })
                    .catch((errs) => {
                        console.error(errs);
                        reject(errs);
                    });
            } else {
                doCall();
            }
        });
    },
    get3DSpaceFileUrl({
        physicalId,
        tenant = PlatformInterface.getCurrentTenant()
    }) {
        return new Promise((resolve, reject) => {
            const doCall = () => {
                const url3DSpace = PlatformInterface.getUrlForTenantAndService(tenant, "3DSpace");

                if (!url3DSpace) {
                    reject(new Error(`No 3DSpace url found for the tenant: ${tenant}`));
                }

                const webservice = `/resources/v1/modeler/documents/${physicalId}/files/DownloadTicket?fileStream=true&tenant=${tenant}`;

                PlatformInterface.callWebService({
                    method: "PUT",
                    url: url3DSpace + webservice,
                    headers: {
                        SecurityContext: currentSecCtx,
                        ENO_CSRF_TOKEN: currentCSRFToken
                    },
                    data: {},
                    type: "json"
                })
                .then((response) => {
                    if (response.body.error) {
                        throw new Error(response.body.error);
                    } else if (response.body.data[0] && response.body.data[0].dataelements.ticketURL) {
                        resolve(response.body.data[0].dataelements.ticketURL);
                    } else {
                        throw new Error("Error getting 3DSpace File Url");
                    }
                })
                .catch(error => {
                    console.error(error);
                    reject(error);
                });
            };

            if (!Platform3DSpace.isLoaded()) {
                Platform3DSpace.loadSecurityContexts()
                    .then(() => {
                        doCall();
                    })
                    .catch((errs) => {
                        console.error(errs);
                        reject(errs);
                    });
            } else {
                doCall();
            }
        });
    },
    upload3DSpaceFile({
        filename,
        physicalId,
        tenant = PlatformInterface.getCurrentTenant()
    }) {
        return new Promise((resolve, reject) => {
            const doCall = () => {
                const url3DSpace = PlatformInterface.getUrlForTenantAndService(tenant, "3DSpace");

                if (!url3DSpace) {
                    reject(new Error(`No 3DSpace url found for the tenant: ${tenant}`));
                }

                const getFCSTicketURL = `/resources/v1/modeler/documents${physicalId ? "/" + physicalId : ""}/files/CheckinTicket?tenant=${tenant}`;
                // const upload3DSpaceFileURL = `/resources/v1/modeler/documents${physicalId ? "/" + physicalId : ""}?tenant=${tenant}`;
                let ENO_CSRF_TOKEN = "";
                PlatformInterface.callWebService({
                    method: "PUT",
                    url: url3DSpace + getFCSTicketURL,
                    headers: {
                        SecurityContext: currentSecCtx
                    },
                    data: {}
                })
                .then((response) => {
                    if (response.body.error) {
                        reject(response.body.error);
                    }

                    if (response.body.data[0] && !response.body.data[0].dataelements) {
                        throw new Error("Error getting 3DSpace FCS Ticket URL");
                    }

                    if (response.body.csrf && response.body.csrf.value) {
                        ENO_CSRF_TOKEN = response.body.csrf.value;
                    } else {
                        throw new Error("Unable to retrieve CSRF from FCS Ticket Request");
                    }
                    return response.body.data[0].dataelements;
                })
                .then(response => {
                    const formData = new FormData();
                    formData.append(response.ticketparamname, response.ticket);
                    formData.append("file_0", filename);
                    // formData.append("__fcs__nohtml", "true");

                    return fetch(response.ticketURL, {
                        method: "POST",
                        body: formData
                    });
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("POST of file data to FCS failed");
                    }
                    return response.text();
                })
                .then(responseText => {
                    return PlatformInterface.callWebService({
                        method: "POST",
                        url: `${url3DSpace}/UM5Tools/DocFile/checkin/${physicalId}/generic/${filename.name}`,
                        type: "json",
                        headers: {
                            SecurityContext: currentSecCtx,
                            ENO_CSRF_TOKEN: ENO_CSRF_TOKEN,
                            "Content-Type": "application/json"
                        },
                        data: {
                            receipt: responseText.trim()
                        }
                    });
                })
                .then(response => {
                    if (response.body.error) {
                        reject(response.body.error);
                    }
                    resolve(response.body);
                })
                .catch(error => {
                    reject(new Error("Error saving file to 3DSpace: " + error));
                });
            };

            if (!PlatformInterface.isLoaded()) {
                PlatformInterface.reload3DExpUrls()
                .then(() => {
                    doCall();
                })
                .catch((errs) => {
                    console.error(errs);
                    reject(errs);
                });
            } else {
                doCall();
            }
        });
    }
};

initPrefs();

PlatformInterface.addEventListener("onTenantChange", () => {
    Platform3DSpace.loadSecurityContexts()
        .then(() => {
            widget.dispatchEvent("onEdit");
        })
        .catch((...errs) => {
            console.error(...errs);
        });
});

Platform3DSpace.loadSecurityContexts().catch((...errs) => {
    console.error(...errs);
});

export default Platform3DSpace;
