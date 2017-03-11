.PHONY: build run

build:
	docker build . -t radius314/bmlt-aggregator

push:
	docker push radius314/bmlt-aggregator

debug:
	docker run -d -p 8888:8888 --restart=always --env-file ./sample.list radius314/bmlt-aggregator
