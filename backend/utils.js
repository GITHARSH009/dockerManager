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
            AutoRemove: true,
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
    docker
};