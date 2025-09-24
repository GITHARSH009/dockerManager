var Docker = require('dockerode');
const { validateOperation } = require('./validation');

var docker = new Docker({socketPath: '/var/run/docker.sock'});

const pullImage = async (imageName, tagName = 'latest') => {
    validateOperation('pull');
    
    const image = `${imageName}:${tagName}`;
    return new Promise((resolve, reject) => {
        docker.pull(image, (err, stream) => {
            if (err) {
                console.error("Error in pulling the image:", err);
                return reject("Error in pulling the image");
            }
            
            function onFinished(err, output) {
                if (err) {
                    console.error("Error in pulling the image:", err);
                    return reject("Error in pulling the image");
                }
                resolve(output);
            }
            
            function onProgress(event) {
                console.log(`Pulling image ${image}: ${event.status}`);
                if (event.status === 'Download complete') {
                    console.log(`Image ${image} pulled successfully.`);
                }
            }
            
            docker.modem.followProgress(stream, onFinished, onProgress);
        });
    });
};

const imageList = async () => {
    validateOperation('list');
    
    return new Promise((resolve, reject) => {
        docker.listImages((err, images) => {
            if (err) {
                console.error("Error in fetching the images:", err);
                return reject("Error fetching Images");
            }
            resolve(images);
        });
    });
};

const volumeList=async()=>{
    validateOperation('list');

    return new Promise((resolve,reject)=>{
        docker.listVolumes((err,data)=>{
            if(err){
                console.error("Error in fetching the volumes:",err);
                return reject("Error fetching Volumes");
            }
            // Docker API returns an object with 'Volumes' property, not direct array
                if (data && data.Volumes) {
                    resolve(data.Volumes);
                } else {
                    // Handle case where no volumes exist (Docker returns { Volumes: null })
                    console.log("No volumes found or unexpected response format");
                    resolve([]);
                }
        });
    });
};

const networkList=async(options={all:true})=>{
    validateOperation('list');
    return new Promise((resolve,reject)=>{
        docker.listNetworks(options,(err,networks)=>{
            if(err){
                console.error("Error in fetching the networks:",err);
                return reject("Error fetching Networks");
            }
            resolve(networks);
        });
    });
}

const containerList = async (options = {all: true}) => {
    validateOperation('list');
    
    return new Promise((resolve, reject) => {
        docker.listContainers(options, (err, containers) => {
            if (err) {
                console.error("Error in fetching the containers:", err);
                return reject("Error fetching Containers");
            }
            resolve(containers);
        });
    });
};

const performContainerAction = async (containerId, actionType) => {
    validateOperation(actionType);
    
    return new Promise((resolve, reject) => {
        const container = docker.getContainer(containerId);
        
        if (!container) {
            return reject(new Error("Container not found"));
        }
        
        const actionMap = {
            start: container.start.bind(container),
            stop: container.stop.bind(container),
            inspect: container.inspect.bind(container),
            remove: container.remove.bind(container)
        };
        
        const actionFunction = actionMap[actionType];
        if (!actionFunction) {
            return reject(new Error("Invalid action type"));
        }
        
        actionFunction((err, data) => {
            if (err) {
                console.error(`Error in ${actionType}ing the container:`, err);
                return reject(new Error(`Error in ${actionType}ing the container`));
            }
            resolve(data);
        });
    });
};

const createContainer = async (imageName, tagName = 'latest', containerName) => {
    const image = `${imageName}:${tagName}`;
    
    // Check if image exists, pull if not
    const images = await imageList();
    let isPresent = false;
    
    images.forEach((img) => {
        if (img.RepoTags && img.RepoTags.includes(image)) {
            isPresent = true;
            return;
        }
    });
    
    if (!isPresent) {
        await pullImage(imageName, tagName);
    }
    
    const containerConfig = {
        Image: image,
        name: containerName,
        Tty: true,
        HostConfig: {
            AutoRemove: false,
            PublishAllPorts: true,
            // Removed docker socket binding for user-created containers
            // Users shouldn't create containers with management privileges
        }
    };
    
    // Validate before creation
    validateOperation('create', containerConfig);
    
    return new Promise((resolve, reject) => {
        docker.createContainer(containerConfig, (err, container) => {
            if (err) {
                console.error("Error in creating the container:", err);
                return reject(new Error("Error in creating the container"));
            }
            resolve(container);
        });
    });
};

const createVolume=async(volumeName)=>{
     const volumeConfig={
        Name:volumeName,
        Driver:'local'
     };
     validateOperation('create',volumeConfig);
     
     return new Promise((resolve,reject)=>{
        docker.createVolume(volumeConfig,(err,volume)=>{
            if(err){
                console.error("Error in creating the volume:",err);
                return reject(new Error("Error in creating the volume"));
            }
            resolve(volume);
        });
        });    
}

const createNetwork=async(networkName)=>{
    const networkConfig={
        Name:networkName,
        Driver:'bridge'
    }
    validateOperation('create',networkConfig);
    return new Promise((resolve,reject)=>{
        docker.createNetwork(networkConfig,(err,network)=>{
            if(err){
                console.error("Error in creating the network:",err);
                return reject(new Error("Error in creating the network"));
            }
            resolve(network);
        });
    })
}

const deleteVolume=async(volumeName)=>{
    validateOperation('remove');
    const volume=docker.getVolume(volumeName);
    return new Promise((resolve,reject)=>{
        volume.remove((err,data)=>{
            if(err){
                console.error("Error in deleting the volume:",err);
                return reject(new Error("Error in deleting the volume"));
            }
            resolve(data);
        });
    });
}

const deleteNetwork=async(networkName)=>{
    validateOperation('remove');
    const network=docker.getNetwork(networkName);
    return new Promise((resolve,reject)=>{
        network.remove((err,data)=>{
            if(err){
                console.error("Error in deleting the network:",err);
                return reject(new Error("Error in deleting the network"));
            }
            resolve(data);
        })
    })
}

const inspectVolume=async(volumeName)=>{
    validateOperation('inspect');
    const volume=docker.getVolume(volumeName);
    return new Promise((resolve,reject)=>{
        volume.inspect((err,data)=>{
            if(err){
                console.error("Error in inspecting the volume:",err);
                return reject(new Error("Error in inspecting the volume"));
            }
            resolve(data);
        });
    });
}

const inspectNetwork=async(networkName)=>{
    validateOperation('inspect');
    const network=docker.getNetwork(networkName);
    return new Promise((resolve,reject)=>{
        network.inspect((err,data)=>{
            if(err){
                console.error("Error in inspecting the network:",err);
                return reject(new Error("Error in inspecting the network"));
            }
            resolve(data);
        });
    });
}


const pruneNetworks=async()=>{
    validateOperation('remove');
    return new Promise((resolve,reject)=>{
        docker.pruneNetworks((err,data)=>{
            if(err){
                console.error("Error in deleting unused networks:",err);
                return reject(new Error("Error in deleting unused networks"));
            }
            resolve(data);
        });
    });
}

const pruneVolumes=async()=>{
    validateOperation('remove');
    return new Promise((resolve,reject)=>{
        docker.pruneVolumes((err,data)=>{
            if(err){
                console.error("Error in deleting unused volumes:",err);
                return reject(new Error("Error in deleting unused volumes"));
            }
            resolve(data);
        });
    });
}

const pruneContainers=async()=>{
    validateOperation('remove');
    return new Promise((resolve,reject)=>{
        docker.pruneContainers((err,data)=>{
            if(err){
                console.error("Error in deleting unused containers:",err);
                return reject(new Error("Error in deleting unused containers"));
            }
            resolve(data);
        });
    });
}

const pruneImages=async()=>{
    validateOperation('remove');
    return new Promise((resolve,reject)=>{
        docker.pruneImages((err,data)=>{
            if(err){
                console.error("Error in deleting unused images:",err);
                return reject(new Error("Error in deleting unused images"));
            }
            resolve(data);
        });
    });
}

const systemInfo=async()=>{
    validateOperation('list');
    return new Promise((resolve,reject)=>{
        docker.info((err,data)=>{
            if(err){
                console.error("Error in fetching system info:",err);
                return reject(new Error("Error in fetching system info"));
            }
            resolve(data);
        })
    })
}

const formatContainerData = (containers) => {
    return containers.map((container) => ({
        id: container.Id,
        name: container.Names[0].replace('/', ''),
        image: container.Image,
        status: container.State,
    }));
};

const formatImageData = (images) => {
    return images.map((image) => ({
        id: image.Id,
        repoTags: image.RepoTags || [],
        labels: image.Labels || {},
        created: new Date(image.Created * 1000).toLocaleString(),
        size: (image.Size / (1024 * 1024)).toFixed(2) + ' MB',
    }));
};

const setupDockerEvents = (proxyMap) => {
    docker.getEvents((err, stream) => {
        if (err) {
            console.error("Error getting Docker events:", err);
            return;
        }
        
        stream.on('data', async (data) => {
            if (!data) {
                console.error("No data received from Docker events stream");
                return;
            }
            
            const eventData = JSON.parse(data.toString());
            
            if (eventData.Type === 'container' && eventData.Action === 'start') {
                const currentContainer = docker.getContainer(eventData.id);
                
                try {
                    const containerInfo = await currentContainer.inspect();
                    const containerName = containerInfo.Name.replace('/', '');
                    const ipAddress = containerInfo.NetworkSettings.IPAddress;
                    const exposedPorts = containerInfo.Config.ExposedPorts;
                    let defaultPort = null;
                    
                    if (exposedPorts && Object.keys(exposedPorts).length > 0) {
                        const [port, type] = Object.keys(exposedPorts)[0].split('/');
                        if (type === 'tcp') {
                            defaultPort = port;
                        }
                    }
                    
                    console.log(`Registering the container: ${containerName}.localhost to the url at http://${ipAddress}:${defaultPort}`);
                    proxyMap.set(containerName, { ip: ipAddress, port: defaultPort });
                } catch (inspectError) {
                    console.error("Error inspecting container:", inspectError);
                }
            }
        });
    });
};

module.exports = {
    pullImage,
    imageList,
    containerList,
    performContainerAction,
    createContainer,
    formatContainerData,
    formatImageData,
    setupDockerEvents,
    volumeList,
    createVolume,
    deleteVolume,
    inspectVolume,
    networkList,
    createNetwork,
    deleteNetwork,
    inspectNetwork,
    pruneNetworks,
    pruneVolumes,
    pruneContainers,
    pruneImages,
    systemInfo,
    docker,
};