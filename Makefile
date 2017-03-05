.PHONY: build run

build:
	docker build . -t radius314/bmlt-fed-docker

debug:
	docker run -d -p 8888:8888 --env-file ./sample.list radius314/bmlt-fed-docker