#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
npm start &
sleep 1
open http://localhost:3000
wait
