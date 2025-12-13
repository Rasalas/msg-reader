.PHONY: all install build build-js build-css watch dev start deploy clean help mocks version release-patch release-minor release-major

# Default target
all: build

# Install dependencies
install:
	npm install

# Build everything
build: build-css build-js

# Build JavaScript bundle
build-js:
	npm run build:js

# Build CSS
build-css:
	npm run build:css

# Watch for changes (JS + CSS)
watch:
	npm run watch

# Development mode with live reload
dev:
	npm run dev

# Build and start server
start:
	npm run start

# Build for GitHub Pages and deploy
deploy:
	npm run deploy

# Build for GitHub Pages without deploying
build-gh-pages:
	npm run build-gh-pages

# Clean build artifacts
clean:
	rm -rf dist/*.js dist/*.css .gh-pages

# Deep clean (including node_modules)
clean-all: clean
	rm -rf node_modules

# Generate mock email files
mocks:
	python3 script/generate_mock_emails.py

# Reinstall everything from scratch
reinstall: clean-all install build

# Show current version
version:
	@git describe --tags --always 2>/dev/null || echo "No tags found"

# Release helpers - bump version, create tag and push
release-patch:
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

release-minor:
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

release-major:
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
	@echo "  make build         - Build JS and CSS"
	@echo "  make build-js      - Build JavaScript bundle only"
	@echo "  make build-css     - Build CSS only"
	@echo "  make watch         - Watch for changes (JS + CSS)"
	@echo "  make dev           - Development mode with live reload"
	@echo "  make start         - Build and start server"
	@echo "  make deploy        - Build and deploy to GitHub Pages"
	@echo "  make build-gh-pages- Build for GH Pages without deploying"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make clean-all     - Remove build artifacts and node_modules"
	@echo "  make mocks         - Generate mock email files"
	@echo "  make reinstall     - Clean all and reinstall from scratch"
	@echo "  make version       - Show current version"
	@echo "  make release-patch - Bump patch version and push (1.0.0 -> 1.0.1)"
	@echo "  make release-minor - Bump minor version and push (1.0.0 -> 1.1.0)"
	@echo "  make release-major - Bump major version and push (1.0.0 -> 2.0.0)"
	@echo "  make help          - Show this help"
