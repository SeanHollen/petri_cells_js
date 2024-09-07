
# Makefile to launch Python3 simple HTTP server

PORT = 3000

.PHONY: server

server:
	@echo "Server started. Navigate to http://localhost:$(PORT)/index.html"
	@python3 -m http.server $(PORT) > /dev/null
