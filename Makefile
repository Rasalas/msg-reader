.PHONY: all install build dev preview start deploy clean help mocks mocks-bulk version release-patch release-minor release-major test test-unit test-integration check-main

# Default target
all: build

# Install dependencies
install:
	npm install

# Build everything with Vite
build:
	npm run build

# Development mode with HMR
dev:
	npm run dev

# Preview production build
preview:
	npm run preview

# Build and preview (alias for common workflow)
start: build preview

# Build for GitHub Pages and deploy
deploy:
	npm run deploy

# Build for GitHub Pages without deploying
build-gh-pages:
	npm run build-gh-pages

# Clean build artifacts
clean:
	rm -rf dist .gh-pages

# Deep clean (including node_modules)
clean-all: clean
	rm -rf node_modules

# Generate mock email files
mocks:
	python3 script/generate_mock_emails.py

# Generate bulk mock email files (usage: make mocks-bulk COUNT=100)
COUNT ?= 100
mocks-bulk:
	python3 script/generate_bulk_emails.py $(COUNT)

# Reinstall everything from scratch
reinstall: clean-all install build

# Run all tests
test:
	npm test

# Run only unit tests (faster)
test-unit:
	npm test -- --testPathIgnorePatterns="tests/integration"

# Run only integration tests
test-integration:
	npm test -- --testPathPattern="tests/integration"

# Show current version
version:
	@git describe --tags --always 2>/dev/null || echo "No tags found"

# Check if on main branch (used by release targets)
check-main:
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$BRANCH" != "main" ]; then \
		echo "Error: Releases must be created from main branch (current: $$BRANCH)"; \
		exit 1; \
	fi

# Release helpers - bump version, create tag and push
release-patch: check-main test
	@CURRENT=$$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//'); \
	if [ -z "$$CURRENT" ]; then \
		echo "No existing tags found. Creating v0.0.1"; \
		NEW="0.0.1"; \
	else \
		MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
		MINOR=$$(echo $$CURRENT | cut -d. -f2); \
		PATCH=$$(echo $$CURRENT | cut -d. -f3); \
		NEW="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	fi; \
	echo "Bumping version: v$$CURRENT -> v$$NEW"; \
	git tag -a "v$$NEW" -m "Release v$$NEW"; \
	echo "Pushing tag v$$NEW..."; \
	git push origin "v$$NEW"

release-minor: check-main test
	@CURRENT=$$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//'); \
	if [ -z "$$CURRENT" ]; then \
		echo "No existing tags found. Creating v0.1.0"; \
		NEW="0.1.0"; \
	else \
		MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
		MINOR=$$(echo $$CURRENT | cut -d. -f2); \
		NEW="$$MAJOR.$$((MINOR + 1)).0"; \
	fi; \
	echo "Bumping version: v$$CURRENT -> v$$NEW"; \
	git tag -a "v$$NEW" -m "Release v$$NEW"; \
	echo "Pushing tag v$$NEW..."; \
	git push origin "v$$NEW"

release-major: check-main test
	@CURRENT=$$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//'); \
	if [ -z "$$CURRENT" ]; then \
		echo "No existing tags found. Creating v1.0.0"; \
		NEW="1.0.0"; \
	else \
		MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
		NEW="$$((MAJOR + 1)).0.0"; \
	fi; \
	echo "Bumping version: v$$CURRENT -> v$$NEW"; \
	git tag -a "v$$NEW" -m "Release v$$NEW"; \
	echo "Pushing tag v$$NEW..."; \
	git push origin "v$$NEW"

# Show help
help:
	@echo "Available targets:"
	@echo "  make install       - Install npm dependencies"
	@echo "  make build         - Build with Vite (production)"
	@echo "  make dev           - Development mode with HMR"
	@echo "  make preview       - Preview production build"
	@echo "  make start         - Build and preview"
	@echo "  make deploy        - Build and deploy to GitHub Pages"
	@echo "  make build-gh-pages- Build for GH Pages without deploying"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make clean-all     - Remove build artifacts and node_modules"
	@echo "  make mocks         - Generate mock email files (scenarios)"
	@echo "  make mocks-bulk    - Generate bulk emails (COUNT=100)"
	@echo "  make reinstall     - Clean all and reinstall from scratch"
	@echo "  make test          - Run all tests"
	@echo "  make test-unit     - Run only unit tests (faster)"
	@echo "  make test-integration - Run only integration tests"
	@echo "  make version       - Show current version"
	@echo "  make release-patch - Bump patch version and push (1.0.0 -> 1.0.1)"
	@echo "  make release-minor - Bump minor version and push (1.0.0 -> 1.1.0)"
	@echo "  make release-major - Bump major version and push (1.0.0 -> 2.0.0)"
	@echo "  make help          - Show this help"
