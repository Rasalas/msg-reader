.PHONY: all install build build-js build-css watch dev start deploy clean help mocks

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
	@echo "  make help          - Show this help"
