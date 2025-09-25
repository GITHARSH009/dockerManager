const express = require('express');
const path = require('path');
const cors = require('cors');
var httpProxy = require('http-proxy');
const http = require('http');

// Import utility functions
const {
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
    removeImage,
    docker,
} = require('./utils');

const app = express();

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./frontend")));

// Proxy setup
const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    ws: true
});

const proxyMap = new Map();

// Serve frontend
app.get("/", (req, res) => {
    return res.sendFile(path.resolve("./frontend/index.html"));
});

// Setup Docker events listener
setupDockerEvents(proxyMap);

// API Endpoints
app.get("/api/health", (req, res) => {
    res.send("Hello from Docker Backend!");
});

app.get("/api/containers", async (req, res) => {
    try {
        const containers = await containerList();
        const containerDetails = formatContainerData(containers);
        res.status(200).send(containerDetails);
    } catch (error) {
        console.error("Error in fetching the containers:", error);
        return res.status(500).send("Error fetching Containers, Please refresh the page..");
    }
});

app.get("/api/images", async (req, res) => {
    try {
        const images = await imageList();
        const imageDetails = formatImageData(images);
        res.status(200).json({ message: "Images fetched successfully", data: imageDetails });
    } catch (error) {
        console.error("Error in fetching the images:", error);
        return res.status(500).send("Error fetching Images, Please refresh the page..");
    }
});

app.get("/api/volumes", async(req,res)=>{
    try {
        const volumes=await volumeList();
        res.status(200).json({message:"Volumes fetched successfully",data:volumes});
    } catch (error) {
        console.error("Error in fetching the volumes:", error);
        return res.status(500).send("Error fetching Volumes, Please refresh the page..");
    }
});

app.get("/api/networks", async(req,res)=>{
    try {
       const networks=await networkList();
       res.status(200).json({message:"Networks fetched successfully",data:networks}); 
    } catch (error) {
        console.error("Error in fetching the networks:", error);
        return res.status(500).send("Error fetching Networks, Please refresh the page..");
    }
});

app.get("/api/volume-inspect/:id", async(req,res)=>{
    const volumeId=req.params.id;
    if(!volumeId){
        return res.status(400).send("Volume ID is required");
    }
    try {
        const volume = await inspectVolume(volumeId);
        res.status(200).json({ message: "Volume inspected successfully", data: volume });
    } catch (error) {
        console.error("Error in inspecting the volume:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.get("/api/network-inspect/:id", async(req,res)=>{
    const networkId=req.params.id;
    if(!networkId){
        return res.status(400).send("Network ID is required");
    }
    try {
        const network = await inspectNetwork(networkId);
        res.status(200).json({ message: "Network inspected successfully", data: network });
    } catch (error) {
        console.error("Error in inspecting the network:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.post("/api/container-Action", async (req, res) => {
    const { containerId, type } = req.body;
    
    if (!containerId || !type) {
        return res.status(400).send("Container ID and Type are required");
    }

    try {
        const data = await performContainerAction(containerId, type);
        const actionPastTense = type === 'inspect' ? 'inspected' : `${type}${type.endsWith('e') ? 'd' : 'ed'}`;
        res.status(200).json({ message: `Container ${actionPastTense} successfully`, data });
    } catch (error) {
        console.error(`Error in ${type}ing the container:`, error);
        return res.status(500).send(error.message);
    }
});

app.post("/api/create-container", async (req, res) => {
    const { imageName, tagName = 'latest', containerName } = req.body;
    
    if (!imageName || !containerName) {
        return res.status(400).send("Image name and container name are required");
    }

    try {
        const container = await createContainer(imageName, tagName, containerName);
        return res.status(200).json({ message: "Container created successfully", data: container });
    } catch (error) {
        console.error("Error in creating the container:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.post("/api/pull-image", async (req, res) => {
    const { imageName, tagName = 'latest' } = req.body;
    
    if (!imageName) {
        return res.status(400).send("Image name is required");
    }
    
    try {
        const image = await pullImage(imageName, tagName);
        res.status(200).json({ message: "Image pulled successfully", data: image });
    } catch (error) {
        console.error("Error in pulling the image:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.post("/api/create-volume", async(req,res)=>{
    const {volumeName}=req.body;
    if(!volumeName){
        return res.status(400).send("Volume name is required");
    }
    try {
        const volume = await createVolume(volumeName);
        res.status(200).json({ message: "Volume created successfully", data: volume });
    } catch (error) {
        console.error("Error in creating the volume:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/delete-volume", async(req,res)=>{
    const {volumeName}=req.body;
    if(!volumeName){
        return res.status(400).send("Volume name is required");
    }
    try {
        const result = await deleteVolume(volumeName);
        res.status(200).json({ message: "Volume deleted successfully", data: result });
    } catch (error) {
        console.error("Error in deleting the volume:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.post("/api/create-network", async(req,res)=>{
    const {networkName}=req.body;
    if(!networkName){
        return res.status(400).send("Network name is required");
    }
    try {
        const network = await createNetwork(networkName);
        res.status(200).json({ message: "Network created successfully", data: network });
    } catch (error) {
        console.error("Error in creating the network:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/delete-network", async(req,res)=>{
    const {networkId}=req.body;
    if(!networkId){
        return res.status(400).send("Network ID is required");
    }
    try {
        const result = await deleteNetwork(networkId);
        res.status(200).json({ message: "Network deleted successfully", data: result });
    } catch (error) {
        console.error("Error in deleting the network:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/prune-networks", async(req,res)=>{
    try {
        const result = await pruneNetworks();
        res.status(200).json({ message: "Unused networks pruned successfully", data: result });
    } catch (error) {
        console.error("Error in pruning the networks:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/prune-volumes", async(req,res)=>{
    try {
        const result = await pruneVolumes();
        res.status(200).json({ message: "Unused volumes pruned successfully", data: result });
    } catch (error) {
        console.error("Error in pruning the volumes:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/prune-containers", async(req,res)=>{
    try {
        const result = await pruneContainers();
        res.status(200).json({ message: "Unused containers pruned successfully", data: result });
    } catch (error) {
        console.error("Error in pruning the containers:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/prune-images", async(req,res)=>{
    try {
        const result = await pruneImages();
        res.status(200).json({ message: "Unused images pruned successfully", data: result });
    } catch (error) {
        console.error("Error in pruning the images:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.delete("/api/delete-image", async(req,res)=>{
    const {imageId} =req.body;
    if(!imageId){
        return res.status(400).send("Image ID is required");
    }
    try {
        const result = await removeImage(imageId);
        res.status(200).json({ message: "Image deleted successfully", data: result });
    } catch (error) {
        console.error("Error in deleting the image:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

app.get("/api/system-info", async(req,res)=>{
    try {
        const info = await systemInfo();
        res.status(200).json({ message: "System information retrieved successfully", data: info });
    } catch (error) {
        console.error("Error in retrieving system information:", error);
        return res.status(500).send(error.message," Please refresh the page..");
    }
});

// Proxy server setup
const proxyServer = http.createServer(function(req, res) {
    const hostname = req.headers.host;
    const container = hostname.split('.')[0];
    
    if (proxyMap.has(container)) {
        const { ip, port } = proxyMap.get(container);
        
        // Validate port before proxying
        if (!port || port === 'null') {
            console.log(`Container ${container} has no exposed port - cannot proxy`);
            res.writeHead(503, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>Web Service Unavailable For This Container</h1>
                <p>Container "${container}" is running but doesn't expose any web ports.</p>
                <p>This container may not be running a web service.</p>
                <p>For web services, make sure your container exposes a port (e.g., Like Nginx Container)</p>
            `);
            return;
        }
        
        console.log(`Proxying request at host: ${hostname} to target: http://${ip}:${port}`);
        const targetUrl = `http://${ip}:${port}`;
        
        // Handle proxy errors
        proxy.web(req, res, { 
            target: targetUrl, 
            changeOrigin: true, 
            ws: true 
        }, (err) => {
            console.error(`Proxy error for ${container}:`, err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>Bad Gateway</h1>
                    <p>Container May Not Running A Web Service "${container}"</p>
                    <p>The container may be starting up or not running a web service on port ${port}</p>
                    <p>Error: ${err.message}</p>
                `);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>Container Is Not Running A Web Service</h1>
            <p>No running web service found for "${container}"</p>
            <p>Make sure your container is running and exposes a web port.</p>
        `);    
    }
});

proxyServer.on('upgrade', function(req, socket, head) {
    const hostname = req.headers.host;
    const container = hostname.split('.')[0];
    
    if (proxyMap.has(container)) {
        const { ip, port } = proxyMap.get(container);
        
        if (!port || port === 'null') {
            console.log(`WebSocket upgrade failed - container ${container} has no exposed port`);
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            socket.destroy();
            return;
        }
        
        console.log(`Upgrading WebSocket request to container: ${container} at http://${ip}:${port}`);
        const targetUrl = `http://${ip}:${port}`;
        proxy.ws(req, socket, head, { target: targetUrl });
    } else {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
    }
});

// Start servers
proxyServer.listen(80, () => {
    console.log("Proxy server is running on port 80");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});