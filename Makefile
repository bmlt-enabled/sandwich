.PHONY: build run

build:
	docker build . -t radius314/sandwich:latest

push:
	docker push radius314/sandwich:latest

debug:
	docker run -d -p 443:8888 --restart=always --env-file=sample.list -v certs:/opt/certs radius314/sandwich

deploy: build push