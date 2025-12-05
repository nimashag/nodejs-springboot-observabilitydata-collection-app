# kubernetes-docker-nodejs-microservices-demo
Microservices Demo Project (using Node.js, Docker, Kubernetes etc.)

---

## Getting Started: Prerequisites

- Docker Desktop installed (https://docs.docker.com/desktop/)
- Kubernetes enabled via Docker Desktop (https://docs.docker.com/desktop/features/kubernetes/#install-and-turn-on-kubernetes)
- `kubectl` CLI installed (automatically included with Docker Desktop)

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

```shell
chmod +x runner.sh

# Rebuild all docker images
./runner.sh rebuild

# Create k8s resources
./runner.sh start

# Delete k8s resources
./runner.sh stop

# Rebuild docker + create k8s
./runner.sh up

# Restart all
./runner.sh stop up

# Print logs
./runner.sh logs orders
```

### Test APIs

Restaurants
```shell
curl -X POST http://localhost:31000/api/restaurants/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Pizza Palace"}'

curl http://localhost:31000/api/restaurants/ 

./runner.sh logs restaurants
```

Orders
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

./runner.sh logs order
```

### Test Frontend

Navigate to `http://localhost:30000/` on a web browser (CORS-disabled).

```shell
curl http://localhost:30000/

./runner.sh logs frontend
```

---

## Introducing a New Service

Create the new service (`{prefix}-service`) with `Dockerfile`. Pick a port in `300x` range.

Inside `k8s` folder, create k8s resource files (e.g. `{prefix}-deployment.yaml`, `{prefix}-service.yaml`).

Add a record to `services.config.json`.
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

Add a record to NGINX config file (`k8s/nginx/nginx-config.yaml`).
```yaml
# Proxy {prefix} API routes to {prefix} backend service
location /api/{prefix} {
  proxy_pass http://{prefix}-service;
}
```

Restart cluster.
```shell
./runner.sh up
```

---

## Troubleshooting Commands

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

