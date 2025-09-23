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
    setupDockerEvents
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

// Proxy server setup
const proxyServer = http.createServer(function(req, res) {
    const hostname = req.headers.host;
    const container = hostname.split('.')[0];
    
    if (proxyMap.has(container)) {
        const { ip, port } = proxyMap.get(container);
        console.log(`Proxying request at host: ${hostname} to target:---> http://${ip}:${port}`);
        const targetUrl = `http://${ip}:${port}`;
        return proxy.web(req, res, { target: targetUrl, changeOrigin: true, ws: true });
    }
    
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Container not found');    
});

proxyServer.on('upgrade', function(req, socket, head) {
    const hostname = req.url.hostname;
    const container = hostname.split('.')[0];
    
    if (proxyMap.has(container)) {
        const { ip, port } = proxyMap.get(container);
        console.log(`Upgrading request to container: ${container} at http://${ip}:${port}`);
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