/**
 * As a singleton in the widget
 */

import PlatformInterface from "./PlatformInterface";

const Platform3DDrive = {
    get3DDriveFileUrl({
        download = false,
        physicalId,
        tenant
    }) {
        return new Promise((resolve, reject) => {
            const doCall = () => {
                tenant = PlatformInterface.getCurrentTenant();
                const url3DDrive = PlatformInterface.getUrlForTenantAndService(tenant, "3DDrive");

                if (!url3DDrive) {
                    reject(new Error(`No 3DDrive url found for the tenant: ${tenant}`));
                }

                let webservice = `/resources/3ddrive/v1/bos/${physicalId}`;
                webservice += download ? "/download" : "/fileurl";
                webservice += `?tenant=${tenant}`;

                PlatformInterface.callWebService({
                    method: "GET",
                    url: url3DDrive + webservice,
                    headers: {},
                    data: {},
                    type: "json"
                })
                .then((response) => {
                    if (response.body.error) {
                        throw new Error(response.body.error);
                    } else if (response.body.url) {
                        resolve(response.body.url);
                    } else {
                        throw new Error("Error getting 3DDrive File Url");
                    }
                })
                .catch(error => {
                    console.error(error);
                    reject(error);
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
    },
    upload3DDriveFile({
        filename,
        physicalId = "DSROOT",
        tenant
    }) {
        return new Promise((resolve, reject) => {
            const doCall = () => {
                tenant = PlatformInterface.getCurrentTenant();
                const url3DDrive = PlatformInterface.getUrlForTenantAndService(tenant, "3DDrive");
                let csrfToken = "";
                if (!url3DDrive) {
                    reject(new Error(`No 3DDrive url found for the tenant: ${tenant}`));
                }

                const getFCSTicketURL = `/resources/3ddrive/v1/bos/ticket?tenant=${tenant}`;
                const upload3DDriveFileURL = `/resources/3ddrive/v1/bos/${physicalId}/contents?tenant=${tenant}&update=true`;

                PlatformInterface.callWebService({
                    method: "GET",
                    url: url3DDrive + getFCSTicketURL,
                    headers: {},
                    data: {}
                })
                .then((response) => {
                    if (response.body.error) {
                        reject(response.body.error);
                    } else if (!response.body.actionurl) {
                        throw new Error("Error getting 3DDrive FCS Ticket URL");
                    }

                    if (response.headers["x-ds-csrftoken"]) {
                        csrfToken = response.headers["x-ds-csrftoken"];
                    } else {
                        throw new Error("Error retrieving CSRF token");
                    }
                    return response.body;
                })
                .then(response => {
                    const formData = new FormData();
                    formData.append(response.jobticket, response.ticket);
                    formData.append("file_0", filename);
                    formData.append("__fcs__nohtml", "true");

                    return fetch(response.actionurl, {
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
                        url: url3DDrive + upload3DDriveFileURL,
                        type: "json",
                        headers: {
                            "X-DS-CSRFTOKEN": csrfToken,
                            "Content-Type": "application/json"
                        },
                        data: {
                            type: "DriveFile",
                            title: filename.name,
                            file: filename.name,
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
                    reject(new Error("Error saving file to 3DDrive: " + error));
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

export default Platform3DDrive;
