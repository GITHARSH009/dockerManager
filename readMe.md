# 🐳 Docker Manager

A professional web-based Docker management tool that runs in a single container with an integrated frontend and backend.

## Architecture

This application uses a **single container approach** where:
- **Backend**: Node.js/Express server (serves API endpoints)
- **Frontend**: Static HTML/CSS/JS files (served by the same Express server)
- **Port**: 3000 (single port for both frontend and API)

## Features

- 📦 **Container Management**: Start, stop, inspect, and remove containers
- 💿 **Image Management**: List, pull, and manage Docker images
- 📊 **Real-time Stats**: View running/stopped containers and image counts
- 🎨 **Modern UI**: Clean, responsive interface with professional design
- 🔄 **Live Updates**: Real-time container status monitoring

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd docker-management

# Build and run with docker-compose
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Option 2: Using Docker Run

```bash
docker run -d \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name docker-manager \
  yourusername/docker-manager:latest
```

### Option 3: Local Development

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the server
npm start

# Access the application at http://localhost:3000
```

## Access the Application

Once running, access the Docker Manager at:
- **URL**: http://localhost:3000
- **API Base**: http://localhost:3000/api

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/containers` | List all containers |
| GET | `/api/images` | List all images |
| POST | `/api/container-Action` | Container actions (start/stop/remove/inspect) |
| POST | `/api/create-container` | Create new container |
| POST | `/api/pull-image` | Pull Docker image |

## Project Structure

```
docker-management/
├── frontend/           # Static web files
│   ├── index.html     # Main UI
│   ├── styles.css     # Styling
│   └── script.js      # Frontend logic
├── backend/           # Express server
│   ├── index.js       # Main server file
│   ├── package.json   # Dependencies
│   └── .gitignore
├── Dockerfile         # Container build instructions
├── docker-compose.yml # Multi-container orchestration
├── .dockerignore      # Docker build exclusions
└── README.md
```

## Requirements

- Docker installed on host machine
- Docker socket access (`/var/run/docker.sock`)
- Port 3000 available on host

## Security Notes

- The container needs access to Docker socket for container management
- In production, consider running with appropriate user permissions
- The current setup is optimized for development/local use

## Development

To modify the application:

1. **Frontend changes**: Edit files in `frontend/` directory
2. **Backend changes**: Edit files in `backend/` directory  
3. **Rebuild**: Run `docker-compose up --build` to see changes

## Troubleshooting

### Container won't start
- Ensure Docker daemon is running
- Check if port 3000 is available
- Verify Docker socket permissions

### Can't manage containers
- Ensure `/var/run/docker.sock` is properly mounted
- Check container has necessary permissions

### API not responding
- Verify the backend is running on port 3000
- Check logs: `docker-compose logs -f`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `docker-compose up --build`
5. Submit a pull request

# Security Considerations

## 🔒 Security Model

This application follows a **local-only security model**:

- **Local Access Only**: Only manages containers on the **host system** where it's running
- **No Remote Access**: Cannot access other Docker environments or systems
- **User-Controlled**: Users explicitly grant Docker socket access when running the container
- **Read-Only by Default**: Most operations are read-only (list containers/images)

## ⚠️ Important Security Notes

### What This App Can Do:
- ✅ List your local containers and images
- ✅ Start/stop/restart your containers  
- ✅ Pull images from public registries
- ✅ Create new containers
- ❌ **Cannot access other systems**
- ❌ **Cannot access your files** (unless you explicitly mount volumes)

### Docker Socket Access
```bash
# This mount gives the app access to YOUR Docker daemon only
-v /var/run/docker.sock:/var/run/docker.sock
```

**Why it's needed**: To communicate with Docker API
**Risk level**: Low (local system only)
**Mitigation**: Run as non-root user inside container

## 🛡️ Security Best Practices

### For Users:
1. **Review before running**: Always check the Docker run command
2. **Don't expose externally**: Keep it on localhost (default behavior)
3. **Monitor containers**: Regularly check what containers are running
4. **Use specific tags**: Avoid `:latest` in production

### For Production Use:
```bash
# More secure run command
docker run -d \
  --name docker-manager \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/cache \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  -p 127.0.0.1:3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  yourusername/docker-manager:latest
```

### Network Security:
- **Default**: Binds to `0.0.0.0:3000` (container internal)
- **Recommended**: Bind to `127.0.0.1:3000` on host for localhost-only access
- **Firewall**: Ensure port 3000 isn't exposed to the internet

## 🔍 What We Monitor

The application logs:
- Container operations (start/stop/create)
- Image pulls
- API access attempts
- Error conditions

## ⚡ Quick Security Check

Before using, verify:
```bash
# Check what the container can access
docker inspect docker-manager

# Monitor logs for unusual activity  
docker logs docker-manager -f

# List active containers
docker ps
```

## 🚨 Report Security Issues

Found a security concern? Please report responsibly:
- **GitHub Issues**: For general security discussions
- **Direct Contact**: For serious vulnerabilities (provide contact info)

---

**Remember**: This tool is designed for **personal/development use**. For enterprise environments, consider additional security layers and monitoring.