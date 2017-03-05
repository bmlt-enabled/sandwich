.PHONY: build run

build:
	docker build . -t radius314/bmlt-fed-docker

debug:
	docker run -d -p 8888:8888 radius314/bmlt-fed-docker