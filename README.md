# kubernetes-docker-nodejs-microservices-demo
Microservices Demo Project (using Node.js, Docker, Kubernetes etc.)

---

## Getting Started: Prerequisites

- Docker Desktop installed (https://docs.docker.com/desktop/)
- For Kubernetes deployment: Kubernetes enabled via Docker Desktop (https://docs.docker.com/desktop/features/kubernetes/#install-and-turn-on-kubernetes)
- For Kubernetes deployment: `kubectl` CLI installed (automatically included with Docker Desktop)
- For Docker Compose deployment: `docker-compose` (included with Docker Desktop)

### Enabling Kubernetes in Docker Desktop

Docker Desktop includes a standalone Kubernetes server and client, allowing local Kubernetes development and testing.

#### Steps:

1. Open **Docker Desktop**
2. Go to **Settings** > **Kubernetes**
3. Check the box for **Enable Kubernetes**
4. Click **Apply & Restart**

This process will:

- Generate necessary certificates and cluster configs
- Download and install Kubernetes components
- Start a local single-node cluster
- Install controllers for networking and storage

**Note:** Setup time depends on internet speed (to pull images).

### Verify the Kubernetes Cluster

Once Kubernetes is enabled, verify the setup using the following commands:

```bash
kubectl version

    Client Version: v1.30.5
    Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
    Server Version: v1.30.5

kubectl get nodes

    NAME             STATUS   ROLES           AGE     VERSION
    docker-desktop   Ready    control-plane   3m16s   v1.30.5

kubectl get pods

    No resources found in default namespace.
```

You should see one node listed and system pods in the Running state.

---

## Run Application

This project supports two deployment methods: **Kubernetes** and **Docker Compose**. Choose the one that best fits your needs.

### Kubernetes Deployment

```shell
chmod +x runner_k8s.sh

# Rebuild all docker images
./runner_k8s.sh rebuild

# Create k8s resources
./runner_k8s.sh start

# Delete k8s resources
./runner_k8s.sh stop

# Rebuild docker + create k8s
./runner_k8s.sh up

# Restart all
./runner_k8s.sh stop up

# Print logs
./runner_k8s.sh logs orders

# Execute shell into a pod
./runner_k8s.sh exec orders
```

### Docker Compose Deployment

```shell
chmod +x runner_docker.sh

# Rebuild all docker images
./runner_docker.sh rebuild

# Start docker-compose services
./runner_docker.sh start

# Stop docker-compose services
./runner_docker.sh stop

# Rebuild docker + start services
./runner_docker.sh up

# Restart all
./runner_docker.sh stop up

# Print logs
./runner_docker.sh logs orders

# Execute shell into a container
./runner_docker.sh exec orders
```

### Test APIs

The API endpoints are accessible through the NGINX gateway on port `31000` for both deployment methods.

**Restaurants API:**
```shell
curl -X POST http://localhost:31000/api/restaurants/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Pizza Palace"}'

curl http://localhost:31000/api/restaurants/ 

# View logs (Kubernetes)
./runner_k8s.sh logs restaurants

# View logs (Docker Compose)
./runner_docker.sh logs restaurants
```

**Orders API:**
```shell
curl -X POST http://localhost:31000/api/orders/ \
-H "Content-Type: application/json" \
-d '{
  "product": "Large Pizza",
  "quantity": 2,
  "price": 100,
  "customerId": "john.doe"
}'

curl http://localhost:31000/api/orders/ 

# View logs (Kubernetes)
./runner_k8s.sh logs order

# View logs (Docker Compose)
./runner_docker.sh logs order
```

### Test Frontend

Navigate to `http://localhost:30000/` on a web browser (CORS-disabled).

```shell
curl http://localhost:30000/

# View logs (Kubernetes)
./runner_k8s.sh logs frontend

# View logs (Docker Compose)
./runner_docker.sh logs frontend
```

---

## Introducing a New Service

Create the new service (`{prefix}-service`) with `Dockerfile`. Pick a port in `300x` range.

### For Kubernetes Deployment

1. Inside `k8s` folder, create k8s resource files (e.g. `{prefix}-deployment.yaml`, `{prefix}-service.yaml`).

2. Add a record to `services.config.json`.
```json
{
  "name": "{prefix}-service",
  "prefix": "{prefix}",
  "folder": "{prefix}-service",
  "port": 3005,
  "dockerImage": "my-app/{prefix}-service:latest",
  "k8sPath": "k8s/{prefix}-service"
}
```

3. Add a record to NGINX config file (`k8s/nginx/nginx-config.yaml`).
```yaml
# Proxy {prefix} API routes to {prefix} backend service
location /api/{prefix} {
  proxy_pass http://{prefix}-service;
}
```

4. Restart cluster.
```shell
./runner_k8s.sh up
```

### For Docker Compose Deployment

1. Add a record to `services.config.json` (same as above).

2. Add the service to `docker/docker-compose.yml`:
```yaml
  {prefix}-service:
    image: my-app/{prefix}-service:latest
    container_name: {prefix}-service
    ports:
      - "3100X:3005"
    environment:
      - RESTAURANTS_SERVICE_URL=http://restaurants-service:3001/api/restaurants
      - ORDERS_SERVICE_URL=http://orders-service:3002/api/orders
      - USERS_SERVICE_URL=http://users-service:3003/api/restaurants
      - DELIVERY_SERVICE_URL=http://delivery-service:3004/api/delivery
    networks:
      - app-network
    restart: unless-stopped
```

3. Add routing to `docker/nginx.conf`:
```nginx
  location /api/{prefix} {
    proxy_pass http://{prefix}-service:3005;
  }
```

4. Restart services.
```shell
./runner_docker.sh up
```

---

## Troubleshooting Commands

### Kubernetes Troubleshooting

```shell
# Describe the pod including events (e.g., image pull errors, volume mount issues, missing secrets/config maps, pending node scheduling)
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>

# Check events for all pods
kubectl get events --sort-by=.metadata.creationTimestamp

# Check pods
kubectl get pods
kubectl get pods,svc,cm -o wide
kubectl get all,cm,pv,pvc -o wide

# Check services
kubectl get svc

# Check PVCs
kubectl get pvc

# Exec into app container
kubectl exec -it restaurants-service-78f66b858f-pgmnb -c restaurants-service -- /bin/sh
```

### Docker Compose Troubleshooting

```shell
# View all running containers
docker-compose -f docker/docker-compose.yml ps

# View logs for all services
docker-compose -f docker/docker-compose.yml logs

# View logs for a specific service
docker-compose -f docker/docker-compose.yml logs <service-name>

# Follow logs in real-time
docker-compose -f docker/docker-compose.yml logs -f <service-name>

# Check container status
docker ps

# Inspect a container
docker inspect <container-name>

# Exec into a container
docker-compose -f docker/docker-compose.yml exec <service-name> sh

# Remove all containers, networks, and volumes
docker-compose -f docker/docker-compose.yml down -v

# Rebuild specific service
docker-compose -f docker/docker-compose.yml build <service-name>
```

