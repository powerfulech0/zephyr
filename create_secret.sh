#!/bin/bash

docker compose run --rm aws-cli secretsmanager create-secret --name zephyr/dev --secret-string '{ "POSTGRES_USER": "zephyr_dev_user", "POSTGRES_PASSWORD": "zephyr_dev_password", "POSTGRES_DB": "zephyr_dev_db"  }' --endpoint-url=http://localstack:4566 
