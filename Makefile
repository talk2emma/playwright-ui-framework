.DEFAULT_GOAL := help
SHELL := /bin/bash

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies and browsers
	npm ci && npx playwright install --with-deps

test: ## Run the full suite
	npm test

smoke: ## Run @smoke tagged tests
	npm run test:smoke

ui: ## Open Playwright UI mode
	npm run test:ui

debug: ## Run in debug mode
	npm run test:debug

a11y: ## Run accessibility suite
	npm run test:a11y

visual: ## Run visual regression suite
	npm run test:visual

visual-update: ## Refresh visual baselines
	npm run test:visual:update

report: ## Open the HTML report
	npm run report

validate: ## Typecheck, lint and format check
	npm run validate

clean: ## Remove reports and artifacts
	npm run clean

docker-test: ## Run the suite in Docker (CI-identical browsers)
	docker compose run --rm ui-tests

docker-build: ## Build the test image
	docker compose build

.PHONY: help install test smoke ui debug a11y visual visual-update report validate clean docker-test docker-build
