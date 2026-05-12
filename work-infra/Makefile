.PHONY: setup dev build test lint clean migrate deploy

# ============================================================
# Setup
# ============================================================
setup:
	@echo "Setting up AASOP development environment..."
	@which pnpm > /dev/null || (echo "Installing pnpm..." && npm install -g pnpm@9.0.0)
	@pnpm install
	@[ -f .env ] || cp .env.example .env
	@echo "Setup complete. Edit .env with your configuration."

# ============================================================
# Development
# ============================================================
dev:
	@echo "Starting infrastructure services..."
	@docker compose up -d postgres redis qdrant nats temporal temporal-ui prometheus grafana loki minio
	@echo "Waiting for services to be healthy..."
	@sleep 10
	@echo "Starting development servers..."
	@pnpm dev

# ============================================================
# Build
# ============================================================
build:
	@pnpm build

build-%:
	@pnpm --filter $* build

# ============================================================
# Testing
# ============================================================
test:
	@pnpm test

test-unit:
	@pnpm test:unit

test-integration:
	@pnpm test:integration

test-e2e:
	@pnpm test:e2e

test-coverage:
	@pnpm test -- --coverage

# ============================================================
# Lint & Format
# ============================================================
lint:
	@pnpm lint

lint-fix:
	@pnpm lint:fix

format:
	@pnpm format

format-check:
	@pnpm format:check

typecheck:
	@pnpm typecheck

# ============================================================
# Database
# ============================================================
migrate:
	@cd packages/database && pnpm prisma migrate dev

migrate-deploy:
	@cd packages/database && pnpm prisma migrate deploy

generate:
	@cd packages/database && pnpm prisma generate

migrate-reset:
	@cd packages/database && pnpm prisma migrate reset

seed:
	@cd packages/database && pnpm prisma db seed

db-studio:
	@cd packages/database && pnpm prisma studio

# ============================================================
# Docker
# ============================================================
docker-build:
	@docker compose build

docker-up:
	@docker compose up -d

docker-down:
	@docker compose down

docker-logs:
	@docker compose logs -f

docker-clean:
	@docker compose down -v
	@docker system prune -f

# ============================================================
# Infrastructure (Terraform)
# ============================================================
infra-init:
	@cd infra/terraform/environments/dev && terraform init

infra-plan:
	@cd infra/terraform/environments/dev && terraform plan

infra-up:
	@cd infra/terraform/environments/dev && terraform init && terraform apply

infra-down:
	@cd infra/terraform/environments/dev && terraform destroy

infra-fmt:
	@cd infra/terraform && terraform fmt -recursive

infra-validate:
	@cd infra/terraform && terraform validate

# ============================================================
# Kubernetes
# ============================================================
k8s-deploy:
	@kubectl apply -f infra/kubernetes/

k8s-delete:
	@kubectl delete -f infra/kubernetes/

k8s-status:
	@kubectl get all -n aasop

k8s-logs-%:
	@kubectl logs -n aasop -l app.kubernetes.io/name=$* --tail=100 -f

k8s-shell-%:
	@kubectl exec -it -n aasop deployment/$* -- /bin/sh

k8s-port-forward-api:
	@kubectl port-forward -n aasop svc/api 4000:4000

k8s-port-forward-web:
	@kubectl port-forward -n aasop svc/web 3000:3000

# ============================================================
# Helm / Add-ons
# ============================================================
k8s-install-nginx:
	@helm upgrade --install ingress-nginx ingress-nginx \
		--repo https://kubernetes.github.io/ingress-nginx \
		--namespace ingress-nginx --create-namespace \
		--set controller.metrics.enabled=true \
		--set controller.metrics.serviceMonitor.enabled=true

k8s-install-cert-manager:
	@helm upgrade --install cert-manager cert-manager \
		--repo https://charts.jetstack.io \
		--namespace cert-manager --create-namespace \
		--set installCRDs=true

k8s-install-keda:
	@helm upgrade --install keda kedacore/keda \
		--namespace keda --create-namespace

# ============================================================
# Security Scanning
# ============================================================
security-scan:
	@echo "Running security scans..."
	@which trivy > /dev/null || (echo "Installing Trivy..." && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin)
	@trivy fs --severity HIGH,CRITICAL .
	@trivy config infra/terraform
	@trivy config infra/kubernetes

docker-scan:
	@echo "Scanning Docker images..."
	@for app in api web agent-runtime workflow-worker realtime; do \
		echo "Scanning $$app..."; \
		trivy image aasop/$$app:latest; \
	done

# ============================================================
# Cleanup
# ============================================================
clean:
	@docker compose down -v 2>/dev/null || true
	@rm -rf node_modules dist .next
	@find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name .next -exec rm -rf {} + 2>/dev/null || true

# ============================================================
# Help
# ============================================================
help:
	@echo "AASOP - Autonomous Agentic Software Organization Platform"
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make setup          - Initial project setup"
	@echo "    make dev            - Start all dev services"
	@echo "    make build          - Build all packages"
	@echo "    make build-<app>    - Build specific app (api, web, agent-runtime, etc.)"
	@echo ""
	@echo "  Testing:"
	@echo "    make test           - Run all tests"
	@echo "    make test-unit      - Run unit tests"
	@echo "    make test-integration - Run integration tests"
	@echo "    make test-coverage  - Run tests with coverage"
	@echo ""
	@echo "  Lint & Format:"
	@echo "    make lint           - Run linter"
	@echo "    make lint-fix       - Fix lint errors"
	@echo "    make format         - Format code"
	@echo "    make typecheck      - Run type checker"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate        - Run database migrations (dev)"
	@echo "    make migrate-deploy - Deploy migrations (prod)"
	@echo "    make generate       - Generate Prisma client"
	@echo "    make seed           - Seed development data"
	@echo "    make db-studio      - Open Prisma Studio"
	@echo ""
	@echo "  Docker:"
	@echo "    make docker-build   - Build Docker images"
	@echo "    make docker-up      - Start Docker Compose"
	@echo "    make docker-down    - Stop Docker Compose"
	@echo "    make docker-logs    - View Docker logs"
	@echo "    make docker-clean   - Clean Docker containers & volumes"
	@echo ""
	@echo "  Infrastructure:"
	@echo "    make infra-init     - Initialize Terraform"
	@echo "    make infra-plan     - Plan Terraform changes"
	@echo "    make infra-up       - Apply Terraform (dev)"
	@echo "    make infra-down     - Destroy Terraform (dev)"
	@echo "    make infra-fmt      - Format Terraform files"
	@echo ""
	@echo "  Kubernetes:"
	@echo "    make k8s-deploy     - Deploy to Kubernetes"
	@echo "    make k8s-delete     - Delete K8s resources"
	@echo "    make k8s-status     - Show K8s status"
	@echo "    make k8s-logs-<app> - View app logs"
	@echo "    make k8s-shell-<app> - Shell into app pod"
	@echo ""
	@echo "  Security:"
	@echo "    make security-scan  - Run security scans"
	@echo "    make docker-scan    - Scan Docker images"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean          - Clean all build artifacts"
	@echo "    make help           - Show this help"
