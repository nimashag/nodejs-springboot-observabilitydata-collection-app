#!/bin/bash

set -e  # Exit script on errors
#set -x # Enable debugging

CONFIG_FILE="services.config.json"
DOCKER_DEV_REGISTRY="docker.io"
UPLOADS_PV_PATH_ON_HOST="/tmp/k8-uploads"

function rebuild_images() {
  echo "🔄 Rebuilding Docker images..."

  jq -c '.services[]' $CONFIG_FILE | while read -r svc; do
    NAME=$(echo $svc | jq -r '.name')
    FOLDER=$(echo $svc | jq -r '.folder')
    IMAGE=$(echo $svc | jq -r '.dockerImage')
    REGISTRY_IMAGE="$DOCKER_DEV_REGISTRY/$IMAGE"

    echo "→ Building image for $NAME..."
    docker build -t "$IMAGE" "$FOLDER"

    echo "→ Tagging image as $REGISTRY_IMAGE"
    docker tag "$IMAGE" "$REGISTRY_IMAGE"

    echo "→ Pushing image to $DOCKER_DEV_REGISTRY registry"
    docker push "$REGISTRY_IMAGE" || echo "⚠️ Warning: Failed to push image $REGISTRY_IMAGE, continuing..."
  done

  echo "✅ Docker images built and pushed to $DOCKER_DEV_REGISTRY registry"
}

function start_cluster() {
  echo "🚀 Applying Kubernetes configurations..."

  echo "📂 Creating/verifying directory location for Uploads persistent volume on host server: $UPLOADS_PV_PATH_ON_HOST"
  mkdir -p $UPLOADS_PV_PATH_ON_HOST
  kubectl apply -f "k8s/restaurants-service/uploads-pv.yaml"
  kubectl apply -f "k8s/restaurants-service/uploads-pvc.yaml"

  # All services
  jq -c '.services[]' $CONFIG_FILE | while read -r svc; do
    NAME=$(echo $svc | jq -r '.name')
    PREFIX=$(echo $svc | jq -r '.prefix')
    K8S_PATH=$(echo $svc | jq -r '.k8sPath')

    echo "→ Applying $NAME resources from $K8S_PATH"
    kubectl apply -f "$K8S_PATH/${PREFIX}-deployment.yaml"
    kubectl apply -f "$K8S_PATH/${PREFIX}-service.yaml"
  done

  # NGINX
  NGINX_PATH=$(jq -r '.nginx.k8sPath' $CONFIG_FILE)
  echo "→ Applying NGINX resources from $NGINX_PATH"
  kubectl apply -f "$NGINX_PATH/nginx-config.yaml"
  kubectl apply -f "$NGINX_PATH/nginx-deployment.yaml"
  kubectl apply -f "$NGINX_PATH/nginx-service.yaml"

  echo "✅ Kubernetes resources applied."
  list_resources
}

function stop_cluster() {
  echo "🛑 Deleting Kubernetes resources..."

  # All services
  jq -c '.services[]' $CONFIG_FILE | while read -r svc; do
    NAME=$(echo $svc | jq -r '.name')
    PREFIX=$(echo $svc | jq -r '.prefix')
    K8S_PATH=$(echo $svc | jq -r '.k8sPath')

    echo "→ Deleting $NAME resources from $K8S_PATH"
    kubectl delete -f "$K8S_PATH/${PREFIX}-deployment.yaml" || echo "⚠️ Warning: Failed to delete from $K8S_PATH, continuing..."
    kubectl delete -f "$K8S_PATH/${PREFIX}-service.yaml" || echo "⚠️ Warning: Failed to delete from $K8S_PATH, continuing..."
  done

  # NGINX
  NGINX_PATH=$(jq -r '.nginx.k8sPath' $CONFIG_FILE)
  echo "→ Deleting NGINX resources from $NGINX_PATH"
  kubectl delete -f "$NGINX_PATH/nginx-config.yaml" || echo "⚠️ Warning: Failed to delete from $NGINX_PATH, continuing..."
  kubectl delete -f "$NGINX_PATH/nginx-deployment.yaml" || echo "⚠️ Warning: Failed to delete from $NGINX_PATH, continuing..."
  kubectl delete -f "$NGINX_PATH/nginx-service.yaml" || echo "⚠️ Warning: Failed to delete from $NGINX_PATH, continuing..."

  kubectl delete -f "k8s/restaurants-service/uploads-pvc.yaml" || echo "⚠️ Warning: Failed to delete from uploads-pvc.yaml, continuing..."
  kubectl delete -f "k8s/restaurants-service/uploads-pv.yaml" || echo "⚠️ Warning: Failed to delete uploads-pv.yaml, continuing..."

  echo "✅ Kubernetes resources deleted."

  echo "🗑️ Clean MongoDB persistent volume directory location on host server manually -> rm -rf $UPLOADS_PV_PATH_ON_HOST"

  list_resources
}

function print_logs() {
  if [ -z "$2" ]; then
    echo "❗ Please provide a pod name or part of it. Example: ./runner.sh logs order"
    return
  fi

  POD_NAME=$(kubectl get pods --no-headers -o custom-columns=":metadata.name" | grep "$2" | head -n 1)

  if [ -z "$POD_NAME" ]; then
    echo "❌ No pod found matching '$2'"
  else
    echo "📄 Showing logs for pod: $POD_NAME"
    kubectl logs "$POD_NAME"
  fi
}

function exec_into_pod() {
  if [ -z "$2" ]; then
    echo "❗ Please provide a pod name or part of it. Example: ./runner.sh exec order"
    return
  fi

  POD_NAME=$(kubectl get pods --no-headers -o custom-columns=":metadata.name" | grep "$2" | head -n 1)

  if [ -z "$POD_NAME" ]; then
    echo "❌ No pod found matching '$2'"
  else
    echo "🚪 Executing shell into pod: $POD_NAME"
    # Just always exec with /bin/sh (Mongo pod also needs this)
    kubectl exec -it "$POD_NAME" -- sh
  fi
}

function list_resources() {
  echo "📋 Current Kubernetes Resources:"
  kubectl get all,cm,pv,pvc -o wide
}

function help_menu() {
  echo "Usage: ./runner.sh [command] [command] ..."
  echo
  echo "Commands:"
  echo "  rebuild      Rebuild all docker images"
  echo "  start        Create k8s resources"
  echo "  stop         Delete k8s resources"
  echo "  up           Rebuild docker + create k8s"
  echo "  logs [pod]   Print logs from a selected pod"
  echo "  exec [pod]   Execute shell into a selected pod"
  echo "  help         Show this help menu"
}

# Run all commands passed as arguments
while [[ $# -gt 0 ]]; do
  cmd="$1"
  shift

  case "$cmd" in
    rebuild)
      rebuild_images
      ;;
    start)
      start_cluster
      ;;
    up)
      rebuild_images
      start_cluster
      ;;
    stop)
      stop_cluster
      ;;
    exec)
      exec_into_pod "$cmd" "$1"
      shift
      ;;
    logs)
      print_logs "$cmd" "$1"
      shift
      ;;
    help)
      help_menu
      ;;
    *)
      echo "❌ Unknown command: $cmd"
      help_menu
      exit 1
      ;;
  esac
done
