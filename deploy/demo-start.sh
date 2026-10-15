#!/bin/sh
# Starts the demo's private MongoDB, then the Traackly server.
# Set MONGODB_URI to use an external database instead (for example Atlas).
set -e

if [ -z "$MONGODB_URI" ]; then
  mkdir -p /tmp/mongo
  # A small cache keeps MongoDB and the server inside a 512 MB free instance.
  # --fork returns once MongoDB is accepting connections.
  mongod --dbpath /tmp/mongo --bind_ip 127.0.0.1 --port 27017 \
    --wiredTigerCacheSizeGB 0.25 --logpath /tmp/mongod.log --fork
  export MONGODB_URI=mongodb://127.0.0.1:27017
fi

exec /app/traackly
