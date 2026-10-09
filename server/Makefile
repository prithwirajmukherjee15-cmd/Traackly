.PHONY: lint test build verify coverage-check coverage-ratchet format format-check ascii run seed seed-demo

GOFUMPT := $(shell go env GOPATH)/bin/gofumpt
GOIMPORTS := $(shell go env GOPATH)/bin/goimports
GOLANGCI := $(shell test -x $(shell go env GOPATH)/bin/golangci-lint && echo $(shell go env GOPATH)/bin/golangci-lint || echo golangci-lint)

# Integration tests need a MongoDB; they are skipped (and coverage fails) without one.
TRAACKLY_TEST_MONGODB_URI ?= mongodb://127.0.0.1:27017
export TRAACKLY_TEST_MONGODB_URI

# cmd/ only wires dependencies together; coverage is measured over the packages that hold logic.
COVERPKG := ./apperrors/...,./config/...,./internal/...
TEST_PKGS := $(shell go list ./... | grep -v /cmd/)

lint:
	$(GOLANGCI) run ./...

format:
	$(GOFUMPT) -w .
	$(GOIMPORTS) -w .

format-check:
	@test -z "$$($(GOFUMPT) -l .)" || (echo "Files need gofumpt:"; $(GOFUMPT) -l .; exit 1)

test:
	go test -v -race -count=1 -coverprofile=coverage.out -coverpkg=$(COVERPKG) $(TEST_PKGS)

coverage-check:
	@go tool cover -func=coverage.out | grep total | awk '{total=$$3} END {if (total+0 < 95) {print "Coverage " total " below 95%"; exit 1} else {print "Coverage " total}}'

coverage-ratchet:
	./scripts/coverage-ratchet.sh

ascii:
	bash scripts/check-ascii.sh

build:
	go build ./...

verify: format-check lint ascii test coverage-check coverage-ratchet build

run:
	go run ./cmd/traackly

seed:
	go run ./cmd/seed

seed-demo:
	go run ./cmd/seed -demo
