#!/bin/bash

set -e  # Exit script on errors
#set -x # Enable debugging

# Source common Docker utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/runner_utils.sh"

DOCKER_DIR="$SCRIPT_DIR/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"

function start_cluster() {
  echo "🚀 Starting Docker Compose services..."

  echo "→ Starting all services with docker-compose"
  cd "$DOCKER_DIR"
  docker-compose -f docker-compose.yml up -d
  cd "$SCRIPT_DIR"

  echo "✅ Docker Compose services started."
  list_resources
}

function stop_cluster() {
  echo "🛑 Stopping Docker Compose services..."

  echo "→ Stopping all services"
  cd "$DOCKER_DIR"
  docker-compose -f docker-compose.yml down
  cd "$SCRIPT_DIR"

  echo "✅ Docker Compose services stopped."
  
  echo "🗑️ To remove volumes, run: cd docker && docker-compose down -v"

  list_resources
}

function print_logs() {
  if [ -z "$2" ]; then
    echo "❗ Please provide a service name or part of it. Example: ./runner_docker.sh logs orders"
    return
  fi

  cd "$DOCKER_DIR"
  SERVICE_NAME=$(docker-compose ps --services | grep "$2" | head -n 1)
  cd "$SCRIPT_DIR"

  if [ -z "$SERVICE_NAME" ]; then
    echo "❌ No service found matching '$2'"
  else
    echo "📄 Showing logs for service: $SERVICE_NAME"
    cd "$DOCKER_DIR"
    docker-compose logs -f "$SERVICE_NAME"
    cd "$SCRIPT_DIR"
  fi
}

function exec_into_container() {
  if [ -z "$2" ]; then
    echo "❗ Please provide a service name or part of it. Example: ./runner_docker.sh exec orders"
    return
  fi

  cd "$DOCKER_DIR"
  SERVICE_NAME=$(docker-compose ps --services | grep "$2" | head -n 1)
  cd "$SCRIPT_DIR"

  if [ -z "$SERVICE_NAME" ]; then
    echo "❌ No service found matching '$2'"
  else
    echo "🚪 Executing shell into container: $SERVICE_NAME"
    cd "$DOCKER_DIR"
    docker-compose exec "$SERVICE_NAME" sh
    cd "$SCRIPT_DIR"
  fi
}

function list_resources() {
  echo "📋 Current Docker Compose Resources:"
  cd "$DOCKER_DIR"
  docker-compose ps
  cd "$SCRIPT_DIR"
}

function help_menu() {
  echo "Usage: ./runner_docker.sh [command] [command] ..."
  echo
  echo "Commands:"
  echo "  rebuild      Rebuild all docker images"
  echo "  start        Start docker-compose services"
  echo "  stop         Stop docker-compose services"
  echo "  up           Rebuild docker + start services"
  echo "  logs [svc]   Print logs from a selected service"
  echo "  exec [svc]   Execute shell into a selected service container"
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
      exec_into_container "$cmd" "$1"
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

