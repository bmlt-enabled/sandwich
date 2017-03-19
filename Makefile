.PHONY: build run

build:
	docker build . -t radius314/bmlt-aggregator

push:
	docker push radius314/bmlt-aggregator

debug:
	docker run -d -p 443:8888 --restart=always --env-file=sample.list -v certs:/opt/certs radius314/bmlt-aggregator
