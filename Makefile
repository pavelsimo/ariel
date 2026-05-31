.PHONY: install build test coverage lint fmt fmt-check docs ci publish clean tools help

install: ## Install project and dev dependencies
	npm ci

build: ## Build JavaScript distribution files
	npm run build

test: ## Run tests
	npm run test

coverage: ## Run tests with coverage
	npm run test -- --coverage

lint: ## Run eslint
	npm run lint

fmt: ## Format code
	npm run fmt

fmt-check: ## Check formatting (CI-safe, exits non-zero if dirty)
	npm run fmt-check

docs: ## Build documentation site to dist/docs-site/
	npm run docs

ci: ## Full CI gate
	npm run ci

publish: ## Publish to npm (requires npm credentials or trusted publishing)
	npm publish --provenance --access public

clean: ## Remove build artifacts
	rm -rf dist/ coverage/ node_modules/.cache

tools: ## Install development tools (lefthook)
	brew install lefthook
	lefthook install

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
