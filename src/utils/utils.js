import axios from "axios";
export function filterColumnsBasedOnAccessExpression(columns) {
    return columns.filter(column => {
        const fieldSettings = Object.keys(column.customFieldSetting);
        return !fieldSettings.includes("Access Expression") && !column.customFieldSetting["Access Expression"];
        // Check if any field setting object has "fieldSettingName": "Access Expression" and "fieldSettingValue": false
    });
}

export function filterColumnsBasedOnFieldSettingFunction(columns) {
    return columns.filter(column => column.fieldSettingList.fieldSetting.some(setting => setting.fieldSettingName === "function"));
}

export function filterObjectsByFieldSetting(data, fieldSettingName) {
    const withFieldSetting = [];
    const withoutFieldSetting = [];

    data.forEach(obj => {
        if (obj.fieldSettingList) {
            const fieldSettings = obj.fieldSettingList.fieldSetting;
            let hasFieldSetting = false;

            fieldSettings.forEach(setting => {
                if (setting.fieldSettingName === fieldSettingName) {
                    hasFieldSetting = true;
                }
            });

            if (hasFieldSetting) {
                withFieldSetting.push(obj);
            } else {
                withoutFieldSetting.push(obj);
            }
        }
    });

    return [withFieldSetting, withoutFieldSetting];
}

export function getColumnsBasedOnFieldSettingNameAndValue(columns, fieldSetting, fieldSettingValue) {
    return columns.filter(obj => {
        const fieldSettings = obj.fieldSettingList.fieldSetting;
        return fieldSettings.some(setting => setting.fieldSettingName === fieldSetting && setting.fieldSettingValue === fieldSettingValue);
    });
}

// Retry function to attempt failed API calls up to specified times
async function retry(fn, retries) {
    let error;
    for (let i = 0; i < retries; i++) {
        try {
            const result = await fn();
            return result;
        } catch (err) {
            error = err;
        }
    }
    throw error;
}

export async function makeSingleApiCall(apiPostBody, url) {
    try {
        const response = await axios.post(url, apiPostBody);
        return response.data;
    } catch (error) {
        throw new Error("API call failed");
    }
}

export async function makeMultipleApiCalls(apiPostBodies, url) {
    try {
        const apiCalls = apiPostBodies.map(apiPostBody => makeSingleApiCall(apiPostBody, url));
        const responses = await Promise.allSettled(apiCalls);
        const successfulResponses = responses.filter(response => response.status === "fulfilled").map(response => response.value);
        const failedRequests = responses.filter(response => response.status === "rejected").map(response => response.reason.config.data);
        return { successfulResponses, failedRequests };
    } catch (error) {
        throw new Error("API calls failed");
    }
}

// async function makeMultipleApiCalls(apiPostBodies, url) {
//     try {
//       const apiCalls = apiPostBodies.map((apiPostBody) => makeSingleApiCall(apiPostBody, url));
//       const responses = await Promise.allSettled(apiCalls);

//       const successfulResponses = responses
//         .filter((response) => response.status === "fulfilled")
//         .map((response) => response.value);

//       const failedRequests = responses
//         .filter((response) => response.status === "rejected")
//         .map((response) => response.reason.config.data);

//       return { successfulResponses, failedRequests };
//     } catch (error) {
//       throw new Error("API calls failed");
//     }
//   }
