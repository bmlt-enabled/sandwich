.PHONY: build push debug test deploy

build:
	docker build . -t radius314/sandwich:latest

push:
	docker push radius314/sandwich:latest

debug:
	docker run -d -p 443:8889 --restart=always --env-file=sample.list -v certs:/opt/certs radius314/sandwich

test:
	npm test

deploy: test build push