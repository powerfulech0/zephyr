#!/bin/bash

rm -rf .env 
touch .env

docker compose run --rm aws-cli secretsmanager get-secret-value --secret-id zephyr/dev --endpoint-url=http://localstack:4566 | 
  jq -r '.SecretString' | 
  jq -r '. | to_entries[] | "\(.key)=\(.value | @sh)"' >> .env

