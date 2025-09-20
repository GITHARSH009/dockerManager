const express=require('express');
const app=express();
const cors=require('cors');
var Docker=require('dockerode');
var docker=new Docker({socketPath: '/var/run/docker.sock'});
const path=require('path');

// var docker=new Docker({host:'127.0.0.1',port:2375});

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.resolve("./frontend")));

app.get("/",(req,res)=>{
    return res.sendFile(path.resolve("./frontend/index.html"));
});


//Endpoints Setup
app.get("/api/health",(req,res)=>{
    res.send("Hello from Docker Backend!");
});


const pullImage=async(imageName,tagName='latest')=>{
     const image=`${imageName}:${tagName}`;
     return new Promise((resolve,reject)=>{
        docker.pull(image,(err,stream)=>{
        if(err){
            console.error("Error in pulling the image:",err);
            return reject("Error in pulling the image");
        }
        function onFinished(err,output){
            if(err){
                console.error("Error in pulling the image:", err);
                return reject("Error in pulling the image");
            }
            resolve(output);
        }
        function onProgress(event){
            console.log(`Pulling image ${image}: ${event.status}`);
            if(event.status === 'Download complete') {
               console.log(`Image ${image} pulled successfully.`);
            }
        }
        docker.modem.followProgress(stream,onFinished,onProgress);
     });
     })
}

const imageList=async()=>{
    return new Promise((resolve,reject)=>{
        docker.listImages((err,images)=>{
            if(err){
            console.error("Error in fetching the images:",err);
            return reject("Error fetching Images");
        }
        resolve(images);
        });
    });
}

app.get("/api/containers",(req,res)=>{
     docker.listContainers({all:true},(err,containers)=>{
        if(err){
            console.error("Error in fetching the containers:", err);
            return res.status(500).send("Error fetching Containers");
        }
        const containersDetails= containers.map((container)=>{
            return {
                id: container.Id,
                name: container.Names[0].replace('/',''),
                image:container.Image,
                status: container.State,
            }
        });
        res.status(200).send(containersDetails);
     });
});

app.get("/api/images",async (req,res)=>{
     try {
        const images=await imageList();
        const imageDetails=images.map((image)=>{
           return {
                id: image.Id,
                repoTags: image.RepoTags || [],
                Labels: image.Labels || {},
                created: new Date(image.Created * 1000).toLocaleString(),
                size: (image.Size / (1024 * 1024)).toFixed(2) + ' MB',
           }
        });
        res.status(200).json({message:"Images fetched successfully",data:imageDetails});
     } catch (error) {
        console.error("Error in fetching the images:", error);
        return res.status(500).send("Error fetching Images");
     }
});

app.post("/api/container-Action",(req,res)=>{
     const {containerId,type}=req.body;
       if(!containerId || !type){
          return res.status(400).send("Container ID and Type are required");
       }
       const desiredContainer=docker.getContainer(containerId);
    if(!desiredContainer){
        return res.status(404).send("Container not found");
    }

    if(type==="start"){
        desiredContainer.start((err,data)=>{
            if(err){
                console.error("Error in starting the container:", err);
                return res.status(500).send("Error in starting the container");
            }
            res.status(200).json({message:"Container started successfully", data});
        });
    }
    else if(type==='inspect'){
        desiredContainer.inspect((err,data)=>{
            if(err){
                console.error("Error in inspecting the container:", err);
                return res.status(500).send("Error in inspecting the container");
            }
            res.status(200).json({message:"Conatiner inspected successfully", data});
        });
    }
    else if(type==='stop'){
        desiredContainer.stop((err,data)=>{
            if(err){
                console.error("Error in stopping the container:", err);
                return res.status(500).send("Error in stopping the container");
            }
            res.status(200).json({message:"Container stopped successfully", data});
        });
    }
    else if(type==='remove'){
        desiredContainer.remove((err,data)=>{
            if(err){
                console.error("Error in removing the container:", err);
                return res.status(500).send("Error in removing the container");
            }
            res.status(200).json({message:"Container removed successfully", data});
        });
    }
    else{
        return res.status(400).send("Invalid action type");
    }
});

app.post("/api/create-container",async(req,res)=>{
    const {imageName,tagName='latest',containerName}=req.body;
    if(!imageName || !containerName){
        return res.status(400).send("Image name, tag name and container details are required");
    }

    const image=`${imageName}:${tagName}`;
    const images=await imageList();
    let isPresent=false;
    images.forEach((img)=>{
        if(img.RepoTags && img.RepoTags.includes(image)){
            isPresent=true;
            return;
        }
    });
    if(!isPresent){
        try {
            await pullImage(imageName,tagName);
        } catch (error) {
            console.error("Error in pulling the image:", error);
            return res.status(500).send("Error in pulling the image");
        }
    };

    docker.createContainer({
        Image: image,
        name:containerName,
        Tty: true,
        HostConfig:{
            AutoRemove:true,
            PublishAllPorts:true,
            Binds:['/var/run/docker.sock:/var/run/docker.sock']
        }
    },(err,container)=>{
        if(err){
            console.error("Error in creating the container:",err);
            return res.status(500).send("Error in creating the Conatiner");
        }
        return res.status(200).json({message:"Container created Successfully",data:container});
    });

});


app.post("/api/pull-image",async(req,res)=>{
    const {imageName,tagName='latest'}=req.body;
    if(!imageName){
        return res.status(400).send("Image name is required");
    }
    try {
        const image=await pullImage(imageName,tagName);
        res.status(200).json({message:"Image pulled successfully",data:image});
    } catch (error) {
        console.error("Error in pulling the image:", error);
        return res.status(500).send("Error in pulling the image");
    }
})

app.listen(3000,async()=>{
    console.log("Server is running on port 3000");
});