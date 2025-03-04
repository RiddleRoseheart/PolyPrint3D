const baseUrl = 'http://127.0.0.1:8000';

// Function to connect to OctoPrint server
async function connect(ip, apiKey) {
    const response = await fetch(`${baseUrl}/connect?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to disconnect from OctoPrint server
async function disconnect(ip, apiKey) {
    const response = await fetch(`${baseUrl}/disconnect?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to get connection info
async function getConnectionInfo(ip, apiKey) {
    const response = await fetch(`${baseUrl}/connection?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to get flags
async function getFlags(ip, apiKey) {
    const response = await fetch(`${baseUrl}/temperature/flags?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}
async function getBedTemperature(ip, apiKey) {
    const response = await fetch(`${baseUrl}/temperature/bed?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}
// Function to get tool0 temperature
async function getTool0Temperature(ip, apiKey) {
    const response = await fetch(`${baseUrl}/temperature/tool0?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to get target bed temperature
async function getTargetBedTemperature(ip, apiKey) {
    const response = await fetch(`${baseUrl}/temperature/bed/target?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to get target tool0 temperature
async function getTargetTool0Temperature(ip, apiKey) {
    const response = await fetch(`${baseUrl}/temperature/tool0/target?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to get job status
async function getJobStatus(ip, apiKey) {
    const response = await fetch(`${baseUrl}/job/status?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to get all files
async function getAllFiles(ip, apiKey) {
    const response = await fetch(`${baseUrl}/files?ip=${ip}&api_key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to delete a file
async function deleteFile(ip, apiKey, name) {
    const response = await fetch(`${baseUrl}/delete?ip=${ip}&api_key=${apiKey}&name=${name}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to upload a file
async function uploadFile(ip, apiKey, path) {
    const response = await fetch(`${baseUrl}/upload?ip=${ip}&api_key=${apiKey}&path=${path}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to select a file
async function selectFile(ip, apiKey, name) {
    const response = await fetch(`${baseUrl}/select_file?ip=${ip}&api_key=${apiKey}&name=${name}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to start a print job
async function startPrintJob(ip, apiKey) {
    const response = await fetch(`${baseUrl}/job?ip=${ip}&api_key=${apiKey}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to cancel a print job
async function cancelPrintJob(ip, apiKey) {
    const response = await fetch(`${baseUrl}/job/cancel?ip=${ip}&api_key=${apiKey}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to pause a print job
async function pausePrintJob(ip, apiKey) {
    const response = await fetch(`${baseUrl}/job/pause?ip=${ip}&api_key=${apiKey}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

// Function to resume a print job
async function resumePrintJob(ip, apiKey) {
    const response = await fetch(`${baseUrl}/job/resume?ip=${ip}&api_key=${apiKey}`, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
}

async function getPrintJobDetails(ip, apiKey) {
    try {
        // Get connection info
        const connectionInfo = await getConnectionInfo(ip, apiKey);
        const state = connectionInfo.current.state;

        // Get job status
        const jobStatus = await getJobStatus(ip, apiKey);
        const printTime = jobStatus.progress.printTime;
        const printTimeLeft = jobStatus.progress.printTimeLeft;
        const completion = jobStatus.progress.completion;

        return {
            state,
            printTime,
            printTimeLeft,
            completion
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Sample data for testing
// const ip = '192.168.1.9';
// const apiKey = '0sEcfqbyAUqaBX-LySJAHY7xANs-_ge1_L7JnpdWz4Y';
const ip = '10.0.0.18';
const apiKey = 'hFswwTnAYX5NloewqL4MHfW_LyTqF7_GZ3qPB4WenFI';
// const fileName = 'test_file.gcode';
// const filePath = '/path/to/test_file.gcode';

// Test each function
async function testFunctions() {
    try {
        // console.log('Connecting to OctoPrint server...');
        // let result = await connect(ip, apiKey);
        // console.log('Connect:', result);

        console.log('Getting connection info...');
        result = await getConnectionInfo(ip, apiKey);
        console.log('Connection Info:', result.current.state);

        // console.log('Getting flags...');
        // result = await getFlags(ip, apiKey);
        // console.log('Flags:', result);

        // console.log('Getting bed temperature...');
        // result = await getBedTemperature(ip, apiKey);
        // console.log('Bed Temperature:', result);
        //
        // console.log('Getting tool0 temperature...');
        // result = await getTool0Temperature(ip, apiKey);
        // console.log('Tool0 Temperature:', result);
        //
        // console.log('Getting target bed temperature...');
        // result = await getTargetBedTemperature(ip, apiKey);
        // console.log('Target Bed Temperature:', result);
        //
        // console.log('Getting target tool0 temperature...');
        // result = await getTargetTool0Temperature(ip, apiKey);
        // console.log('Target Tool0 Temperature:', result);

        console.log('Getting job status...');
        result = await getJobStatus(ip, apiKey);
        console.log('Job Status:', result.progress.printTime);
        console.log('Job Status:', result.progress.printTimeLeft);
        console.log('Job Status:', result.progress.completion);

        console.log('Getting all files...');
        result = await getAllFiles(ip, apiKey);
        console.log('All Files:', result);

        // console.log('Uploading a file...');
        // result = await uploadFile(ip, apiKey, filePath);
        // console.log('Upload File:', result);
        //
        // console.log('Selecting a file...');
        // result = await selectFile(ip, apiKey, fileName);
        // console.log('Select File:', result);

        // console.log('Starting a print job...');
        // result = await startPrintJob(ip, apiKey);
        // console.log('Start Print Job:', result);
        //
        // console.log('Pausing a print job...');
        // result = await pausePrintJob(ip, apiKey);
        // console.log('Pause Print Job:', result);
        //
        // console.log('Resuming a print job...');
        // result = await resumePrintJob(ip, apiKey);
        // console.log('Resume Print Job:', result);
        //
        // console.log('Cancelling a print job...');
        // result = await cancelPrintJob(ip, apiKey);
        // console.log('Cancel Print Job:', result);
        //
        // console.log('Deleting a file...');
        // result = await deleteFile(ip, apiKey, fileName);
        // console.log('Delete File:', result);

        // console.log('Disconnecting from OctoPrint server...');
        // result = await disconnect(ip, apiKey);
        // console.log('Disconnect:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Call the test function
testFunctions();

// Exporting the functions
export {
    connect,
    disconnect,
    getConnectionInfo,
    getFlags,
    getBedTemperature,
    getTool0Temperature,
    getTargetBedTemperature,
    getTargetTool0Temperature,
    getJobStatus,
    getAllFiles,
    deleteFile,
    uploadFile,
    selectFile,
    startPrintJob,
    cancelPrintJob,
    pausePrintJob,
    resumePrintJob,
    getPrintJobDetails // Added this line
};