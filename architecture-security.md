# Security Architecture, Multi-Tenant Isolation, RBAC, Sandboxing & Compliance

## Autonomous Agentic Software Organization Platform

**Document Version**: 1.0  
**Classification**: Internal - Architecture  
**Author**: Principal Security Architect  
**Date**: June 2025

---

## Table of Contents

1. [Security Architecture (Item 13)](#13-security-architecture)
2. [Multi-Tenant Design (Item 14)](#14-multi-tenant-design)
3. [RBAC/Permissions Model (Item 25)](#25-rbacpermissions-model)
4. [Sandbox Design (Item 26)](#26-sandbox-design)
5. [Production Hardening Checklist (Item 38)](#38-production-hardening-checklist)
6. [SOC2 Readiness Checklist (Item 39)](#39-soc2-readiness-checklist)

---

## 13. Security Architecture

### 13.1 Overview & Security Principles

The Autonomous Agentic Software Organization Platform executes arbitrary AI-generated code, orchestrates multi-step workflows, processes sensitive source code, and manages enterprise credentials. This makes security not a feature but a foundational design constraint. Our security architecture is built on five core principles:

1. **Defense in Depth**: No single control point of failure; multiple overlapping security layers
2. **Zero Trust**: Never trust, always verify; every request authenticated and authorized regardless of origin
3. **Least Privilege**: Every component and user operates with minimum necessary permissions
4. **Secure by Default**: All features ship with the most restrictive secure configuration
5. **Observability & Auditability**: Every security-relevant event is logged, monitored, and retainable

### 13.2 Defense in Depth Architecture

```
+------------------------------------------------------------------+
|                    DEFENSE IN DEPTH LAYERS                        |
+------------------------------------------------------------------+
| Layer 7 | Application Security | Input validation, output encoding|
|         |                      | authN/authZ, rate limiting, WAF   |
+---------+----------------------+-----------------------------------+
| Layer 6 | API Gateway Security | TLS 1.3, mTLS, request signing,   |
|         |                      | API versioning, schema validation |
+---------+----------------------+-----------------------------------+
| Layer 5 | Runtime Security     | Sandboxing, seccomp, AppArmor,    |
|         |                      | gVisor/Firecracker, capability drop|
+---------+----------------------+-----------------------------------+
| Layer 4 | Container Security   | Distroless images, non-root users,|
|         |                      | image scanning, signed containers |
+---------+----------------------+-----------------------------------+
| Layer 3 | Network Security     | VPC isolation, micro-segmentation,|
|         |                      | network policies, service mesh mTLS|
+---------+----------------------+-----------------------------------+
| Layer 2 | Host Security        | Hardened OS, CIS benchmarks,      |
|         |                      | intrusion detection, file integrity|
+---------+----------------------+-----------------------------------+
| Layer 1 | Infrastructure       | Cloud IAM, encrypted storage,     |
|         | Security             | hardware security modules, TPM     |
+------------------------------------------------------------------+
```

Each layer operates independently. A breach at any single layer does not compromise the entire system. The autonomous code execution requirement (AI agents running arbitrary code) makes Layers 4-6 the most critical and heavily fortified.

### 13.3 Zero Trust Architecture

The Zero Trust model assumes the network is already compromised. Every access request must be verified regardless of origin.

#### 13.3.1 Zero Trust Core Components

**Identity-Aware Proxy (IAP)**: All traffic flows through an identity-aware proxy that terminates TLS, validates JWT tokens, enforces MFA requirements, and performs device posture checks.

**Micro-Segmentation**: The network is divided into security zones:
- **Public Zone**: API Gateway, Load Balancers, CDN
- **Application Zone**: Application services (stateless)
- **Data Zone**: Databases, caches, message queues (no direct public access)
- **Sandbox Zone**: Code execution environments (isolated from all other zones)
- **Control Plane Zone**: Kubernetes control plane, Vault, CI/CD
- **Observability Zone**: Monitoring, logging, SIEM

**Service-to-Service Authentication**: All inter-service communication uses mutual TLS (mTLS) via a service mesh (Istio/Linkerd). Each service has a unique SPIFFE identity:

```
service identity: spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

#### 13.3.2 Zero Trust Request Flow

```
User/Agent Request
       |
       v
[Cloudflare/AWS WAF] --- DDoS protection, bot detection
       |
       v
[Identity-Aware Proxy] --- JWT validation, device check, MFA
       |
       v
[API Gateway] --- Rate limiting, request routing, schema validation
       |
       v
[Service Mesh Ingress] --- mTLS client cert validation
       |
       v
[Application Service] --- RBAC/ABAC authorization
       |
       v
[Data Access Layer] --- Tenant validation, query filtering
       |
       v
[Database] --- Row-level security enforcement
```

### 13.4 Authentication Architecture

#### 13.4.1 Multi-Protocol Authentication

The platform supports multiple authentication protocols to serve different user populations:

| Protocol | Use Case | Implementation |
|----------|----------|----------------|
| OAuth 2.0 / OIDC | End-user web application login | Auth0, Keycloak, or custom OIDC provider |
| SAML 2.0 | Enterprise SSO (Okta, Azure AD, Ping) | SAML Service Provider implementation |
| API Keys | Service-to-service, automation | HMAC-SHA256 signed requests |
| mTLS | Internal service communication | SPIFFE/SPIRE with X.509 SVIDs |
| WebAuthn / FIDO2 | Strong MFA | Passkeys, hardware security keys |

#### 13.4.2 JWT Token Architecture

Tokens follow a structured claim format:

```json
{
  "sub": "user_1234567890",
  "iss": "https://auth.agentic-platform.io",
  "aud": "agentic-platform-api",
  "iat": 1704067200,
  "exp": 1704070800,
  "jti": "token-uuid-for-revocation",
  "org_id": "org_abc123",
  "tenant_id": "tenant_xyz789",
  "roles": ["org:admin", "project:editor"],
  "permissions": ["agent:create", "workflow:execute", "sandbox:read"],
  "mfa_verified": true,
  "auth_method": "oidc",
  "session_id": "sess_abc123"
}
```

**Token Management**:
- **Access Tokens**: Short-lived (15 minutes), JWT format, contains full claim set
- **Refresh Tokens**: Long-lived (7 days), opaque format, stored in Redis with TTL
- **Token Binding**: Tokens are bound to the requesting device via `cnf` claim (key thumbprint)
- **Token Revocation**: Centralized revocation list in Redis, checked on every request
- **Rotation**: Refresh tokens are rotated on every use; old token invalidated

#### 13.4.3 Enterprise SSO Configuration

```yaml
sso_providers:
  okta:
    type: "saml"
    entity_id: "https://agentic-platform.io/sp"
    sso_url: "https://company.okta.com/app/agentic-platform/..."
    certificate: "${OKTA_CERT}"
    attribute_mapping:
      email: "user.email"
      first_name: "user.firstName"
      last_name: "user.lastName"
      groups: "groups"
    jit_provisioning: true
    default_role: "org:member"

  azure_ad:
    type: "oidc"
    issuer: "https://login.microsoftonline.com/{tenant}/v2.0"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"
    scopes: ["openid", "profile", "email", "groups"]
    group_role_mapping:
      "Agentic-Platform-Admins": "org:admin"
      "Agentic-Platform-Editors": "org:member"
```

### 13.5 Authorization: RBAC + ABAC Hybrid

The authorization system combines Role-Based Access Control (RBAC) for coarse-grained permissions with Attribute-Based Access Control (ABAC) for fine-grained, context-aware decisions.

#### 13.5.1 RBAC Foundation

Roles are hierarchical and scoped:

```
Organization Roles          Project Roles              Custom Roles
-----------------           -------------              ------------
org:owner                   project:owner              (user-defined)
org:admin                   project:admin              
org:member                  project:editor             
org:viewer                  project:viewer             
org:billing_admin           project:executor           
org:security_admin                                     
```

#### 13.5.2 ABAC Policy Engine

ABAC policies evaluate contextual attributes:

```
ALLOW IF:
  user.role CONTAINS "org:admin"
  OR (
    user.role CONTAINS "project:editor"
    AND resource.project_id IN user.projects
    AND context.time_of_day BETWEEN "06:00" AND "22:00"
    AND context.mfa_verified = true
  )
  AND NOT context.ip_address IN threat_intel.blocklist
```

The policy engine uses Open Policy Agent (OPA) with Rego policies for evaluation. Policies are distributed as bundles and evaluated locally at each service for low latency.

#### 13.5.3 Authorization Flow

```
Request arrives with JWT
       |
       v
[Extract Claims] --- sub, org_id, tenant_id, roles
       |
       v
[Tenant Resolution] --- Validate tenant, set context
       |
       v
[RBAC Check] --- Does user have required role?
       |
       v
[ABAC Evaluation] --- OPA/Rego policy evaluation
       |
       v
[Permission Check] --- Does user have required permission?
       |
       v
[Audit Log] --- Log authorization decision
       |
       v
[Allow / Deny]
```

### 13.6 API Security

#### 13.6.1 Rate Limiting

Multi-tier rate limiting prevents abuse:

```yaml
rate_limits:
  global:
    requests_per_second: 10000
    burst: 15000
  
  per_organization:
    requests_per_minute: 6000
    burst: 9000
  
  per_user:
    requests_per_minute: 600
    burst: 900
  
  per_api_key:
    requests_per_minute: 300
    burst: 450
  
  per_ip:
    requests_per_minute: 120
    burst: 180
  
  per_endpoint:
    "POST /v1/agents/{id}/execute":
      requests_per_minute: 60
      burst: 90
    "POST /v1/sandboxes":
      requests_per_minute: 30
      burst: 45
```

Rate limiting uses a sliding window counter algorithm with Redis as the backend store. When limits are exceeded, the API returns `429 Too Many Requests` with `Retry-After` headers.

#### 13.6.2 Input Validation & Output Encoding

**Input Validation Pipeline**:
1. **Schema Validation**: OpenAPI schema validation at the API gateway layer
2. **Type Checking**: Strict type coercion and validation
3. **Length Limits**: Maximum string lengths, array sizes, nesting depths
4. **Character Whitelisting**: Allowed character sets per field type
5. **Semantic Validation**: Business logic validation (e.g., valid project ID format)
6. **Injection Prevention**: Parameterized queries, prepared statements

**Output Encoding**:
- All API responses are JSON-encoded with proper escaping
- Content-Type headers are strictly set
- Downloaded files are served with `Content-Disposition: attachment`
- No reflected user input in error messages

#### 13.6.3 CORS & CSRF Protection

```yaml
cors:
  allowed_origins:
    - "https://app.agentic-platform.io"
    - "https://*.agentic-platform.io"
  allowed_methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  allowed_headers: ["Authorization", "Content-Type", "X-Request-ID"]
  allow_credentials: true
  max_age: 86400

csrf:
  enabled: true
  token_header: "X-CSRF-Token"
  cookie_name: "csrf_token"
  safe_methods: ["GET", "HEAD", "OPTIONS"]
```

### 13.7 Data Security

#### 13.7.1 Encryption at Rest

All data at rest uses AES-256-GCM encryption:

| Data Store | Encryption Method | Key Management |
|------------|-------------------|----------------|
| PostgreSQL | TDE (Transparent Data Encryption) | Cloud KMS auto-key |
| Redis | Redis encryption with AES-256 | Cloud KMS |
| S3/Object Storage | SSE-S3 or SSE-KMS | AWS KMS / Cloud HSM |
| EBS Volumes | EBS encryption | Cloud KMS |
| Backups | Encrypted snapshots | Cloud KMS with separate key |
| Logs | AES-256 client-side encryption | Cloud KMS |

**Field-Level Encryption** for sensitive fields (API keys, tokens, secrets):

```python
# Example: Field-level encryption for API key storage
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class FieldEncryption:
    def __init__(self, master_key: bytes):
        self.master_key = master_key
    
    def encrypt(self, plaintext: str, context: dict) -> str:
        # Derive key using HKDF with tenant-specific context
        key = hkdf_derive(self.master_key, context['tenant_id'].encode())
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        associated_data = f"{context['tenant_id']}:{context['field_name']}".encode()
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), associated_data)
        return f"enc:v1:{base64(nonce)}:{base64(ciphertext)}"
    
    def decrypt(self, ciphertext: str, context: dict) -> str:
        # Verify context matches before decryption
        # Decrypt and verify associated data
        ...
```

Sensitive fields encrypted at the application layer before database storage:
- API key credentials (encrypted with tenant-specific derived keys)
- OAuth tokens (encrypted with master key rotation support)
- User secrets (encrypted with envelope encryption)
- Source code access tokens (encrypted per-repository)

#### 13.7.2 Encryption in Transit

- **TLS 1.3** is mandatory for all external traffic
- **mTLS** is required for all internal service-to-service communication
- **Certificate pinning** on mobile clients
- **HSTS** headers with max-age of 1 year
- **Perfect Forward Secrecy** (ECDHE) cipher suites only

```nginx
# TLS configuration for API gateway
ssl_protocols TLSv1.3;
ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
ssl_prefer_server_ciphers on;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

#### 13.7.3 Key Management Architecture

```
+-----------------+     +-----------------+     +------------------+
|   Application   |     |   HashiCorp     |     |   Cloud HSM      |
|   (Data Layer)  |     |   Vault         |     |   (Root of Trust)|
|                 |     |                 |     |                  |
| +-------------+ |     | +-------------+ |     | +--------------+ |
| | DEK (data   | |<--->| | KEK (key    | |<--->| | Master Key   | |
| | encryption  | |     | | encryption  | |     | | (FIPS 140-2  | |
| | key)        | |     | | key)        | |     | | Level 3)     | |
| +-------------+ |     | +-------------+ |     | +--------------+ |
+-----------------+     +-----------------+     +------------------+
```

- **Data Encryption Keys (DEKs)**: Per-tenant, generated per encryption operation, encrypted by KEK
- **Key Encryption Keys (KEKs)**: Stored in Vault, never exposed to applications
- **Master Key**: Stored in Cloud HSM, used only for unsealing Vault
- **Key Rotation**: DEKs rotated automatically every 90 days; KEKs rotated annually
- **Key Versioning**: All encrypted data includes key version for decryption after rotation

### 13.8 Network Security

#### 13.8.1 VPC Architecture

```
                          +--------------------+
                          |   Internet Gateway  |
                          +--------+-----------+
                                   |
                          +--------v-----------+
                          |  WAF / CDN / DDoS   |
                          |  (Cloudflare/AWS)   |
                          +--------+-----------+
                                   |
+------------------+      +--------v-----------+
|   Management     |      |   Public Subnets    |
|   VPC (Bastion,  |      |   (Load Balancers)  |
|   CI/CD)         |      +--------+-----------+
+------------------+               |
                          +--------v-----------+
                          |   Private Subnets   |
                          |   (App Services)    |
                          +--------+-----------+
                                   |
                          +--------v-----------+
                          |   Data Subnets      |
                          |   (DB, Cache, MQ)   |
                          +--------+-----------+
                                   |
                          +--------v-----------+
                          |   Sandbox Subnets   |
                          |   (Isolated Exec)   |
                          +--------------------+
```

#### 13.8.2 Security Groups & Network Policies

```yaml
# Kubernetes NetworkPolicy for application services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-service-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: agentic-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
    - from:
        - namespaceSelector:
            matchLabels:
              name: istio-system
      ports:
        - protocol: TCP
          port: 15090
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - namespaceSelector:
            matchLabels:
              name: redis
      ports:
        - protocol: TCP
          port: 6379
    - to:
        - namespaceSelector:
            matchLabels:
              name: vault
      ports:
        - protocol: TCP
          port: 8200
```

#### 13.8.3 Web Application Firewall (WAF)

Managed WAF rules:
- OWASP Top 10 protection
- SQL injection filtering
- XSS prevention
- Command injection detection
- Rate-based blocking
- Bot management and challenge
- Custom rule sets for AI-specific attack patterns (prompt injection, model extraction)

### 13.9 Runtime Security

#### 13.9.1 Container Hardening

All containers are built with security-first principles:

```dockerfile
# Multi-stage build with distroless base
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/server /server
# Run as non-root user (65532:nonroot in distroless)
USER 65532:65532
ENTRYPOINT ["/server"]
```

**Container Security Requirements**:
- Distroless or scratch base images (no shell, no package manager)
- Non-root user execution (UID >= 10000)
- Read-only root filesystem (`readOnlyRootFilesystem: true`)
- Dropped Linux capabilities (only `NET_BIND_SERVICE` if needed)
- No privilege escalation (`allowPrivilegeEscalation: false`)
- Seccomp profiles applied
- Resource limits enforced

#### 13.9.2 Host Security

- **CIS Benchmarks**: Hardened operating system following CIS Level 2 benchmarks
- **AppArmor/SELinux**: Mandatory access control profiles
- **Intrusion Detection**: Falco for runtime threat detection
- **File Integrity Monitoring**: AIDE for critical file monitoring
- **Audit Logging**: Linux audit framework for syscall auditing

### 13.10 Supply Chain Security

#### 13.10.1 Container Supply Chain

```
Developer Push
      |
      v
[Source Code] --> [SAST Scanning] --> [Dependency Scan]
      |                                    |
      v                                    v
[Build] <-- [Signed Dockerfile] --> [SBOM Generation]
      |
      v
[Image Scan] --> [Trivy/Grype vulnerability scan]
      |
      v
[Sign Image] --> [Cosign with keyless signing]
      |
      v
[Push to Registry] --> [Admission Controller verifies signature]
      |
      v
[Deploy to Cluster] --> [Kyverno/OPA Gatekeeper policy enforcement]
```

#### 13.10.2 Dependency Management

- **SBOM Generation**: Every build generates SPDX/CycloneDX SBOM
- **Dependency Scanning**: Snyk, Dependabot, and Trivy scan all dependencies
- **License Compliance**: FOSSA for open-source license compliance
- **Vulnerability Database**: Continuous monitoring of CVE databases
- **Update Policy**: Critical patches applied within 24 hours

### 13.11 Secret Management

#### 13.11.1 Vault Architecture

HashiCorp Vault is deployed in HA mode with auto-unseal:

```
+-------------------------------------------------------------------+
|                     HashiCorp Vault Cluster                        |
|                                                                    |
|  +-------------+    +-------------+    +-------------+            |
|  | Vault Node  |<-->| Vault Node  |<-->| Vault Node  |            |
|  | (Active)    |    | (Standby)   |    | (Standby)   |            |
|  +-------------+    +-------------+    +-------------+            |
|        ^                                                   |
|        | Auto-unseal via Cloud KMS                        |
|        v                                                   |
|  +-------------+    +-------------+    +-------------+           |
|  | PostgreSQL  |    |    Raft     |    |   Cloud     |           |
|  | (Storage)   |    | (Consensus) |    |   HSM       |           |
|  +-------------+    +-------------+    +-------------+           |
+-------------------------------------------------------------------+
```

#### 13.11.2 Secret Types & Lifecycle

| Secret Type | Storage | Rotation | Access Pattern |
|-------------|---------|----------|----------------|
| API Keys | Vault KV v2 | 90 days | Dynamic lease |
| Database Creds | Vault Database | 24 hours | Dynamic generation |
| TLS Certificates | Vault PKI | Auto-renew | Automatic |
| OAuth Tokens | Vault KV v2 | On refresh | Token binding |
| Encryption Keys | Vault Transit | 1 year | API access only |
| Cloud Credentials | Vault AWS/GCP | 1 hour | STS credentials |

#### 13.11.3 Secret Injection Patterns

```yaml
# Kubernetes deployment with Vault secret injection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "api-service"
    vault.hashicorp.com/agent-inject-secret-db: "database/creds/api-service"
    vault.hashicorp.com/agent-inject-template-db: |
      {{ with secret "database/creds/api-service" -}}
      export DB_USER="{{ .Data.username }}"
      export DB_PASSWORD="{{ .Data.password }}"
      {{- end }}
    vault.hashicorp.com/agent-inject-secret-api-key: "kv/api-keys"
    vault.hashicorp.com/agent-inject-template-api-key: |
      {{ with secret "kv/api-keys" -}}
      export API_KEY="{{ .Data.key }}"
      {{- end }}
```

### 13.12 Security Monitoring

#### 13.12.1 SIEM Integration

```
+--------------------------------------------------------------------+
|                      SECURITY MONITORING PIPELINE                   |
+--------------------------------------------------------------------+
| Sources          | Collection        | Analysis        | Response  |
|------------------|-------------------|-----------------|-----------|
| Application Logs | Fluent Bit        | Splunk/Datadog  | PagerDuty |
| Audit Logs       | --> Kafka -->     | + Custom Rules  | + Slack   |
| Sandbox Events   |     Logstash      | + ML Anomaly    | + SOAR    |
| Network Flows    |     -->           |   Detection     |   Playbook|
| K8s Events       |     SIEM          |                 |           |
| WAF Logs         |                   |                 |           |
| Vault Audit      |                   |                 |           |
+--------------------------------------------------------------------+
```

#### 13.12.2 Detection Rules

Critical detection rules for this platform:

| Rule Name | Description | Severity |
|-----------|-------------|----------|
| `sandbox_escape_attempt` | Syscall outside seccomp profile | **Critical** |
| `suspicious_network_egress` | Sandbox connecting to unknown IP | **Critical** |
| `privilege_escalation` | Container attempting privilege gain | **Critical** |
| `mass_data_exfil` | Large data transfer from data zone | **High** |
| `failed_auth_burst` | 10+ failed auth attempts in 5 min | **High** |
| `cross_tenant_access` | Request with mismatched tenant ID | **Critical** |
| `api_key_anomaly` | API key usage from unusual IP/region | **Medium** |
| `sensitive_data_access` | Access to field-level encrypted data | **Medium** |
| `permission_escalation` | Role change followed by sensitive access | **High** |
| `after_hours_admin` | Admin action outside business hours | **Low** |

#### 13.12.3 Anomaly Detection

Machine learning-based anomaly detection:
- **User Behavior Analytics**: Baseline user activity patterns; detect deviations
- **Sandbox Behavior Profiling**: Expected syscall patterns per agent type
- **Network Traffic Analysis**: Baseline inter-service communication
- **Time-Series Analysis**: Unusual request patterns, error rate spikes
- **Peer Group Analysis**: Compare user activity to peer group norms

---

## 14. Multi-Tenant Design

### 14.1 Overview

Multi-tenancy is a foundational architectural concern. The platform serves multiple organizations, each containing multiple teams and projects. Tenant isolation must prevent data leakage, resource interference, and unauthorized cross-tenant access while maximizing resource utilization.

### 14.2 Tenant Model

```
+-------------------------------+
|         PLATFORM              |
|    (Infrastructure Layer)      |
+------------+------------------+
             |
    +--------v--------+  +------v-------+
    |   Tenant A      |  |   Tenant B   |
    |   (Enterprise)  |  |   (Team)     |
    |                 |  |              |
    |  +-----------+  |  |  +--------+  |
    |  |  Org A    |  |  |  | Org B  |  |
    |  |  - Team 1 |  |  |  | - Team |  |
    |  |  - Team 2 |  |  |  +--------+  |
    |  |  - Team 3 |  |  +--------------+
    |  +-----------+  |
    +-----------------+
```

**Tenant Hierarchy**:
- **Platform**: Infrastructure, shared services, platform admin
- **Organization**: Primary billing boundary, SSO domain, data isolation boundary
- **Team**: Sub-tenant within organization, project grouping, delegated administration
- **Project**: Resource container (agents, workflows, sandboxes, memories)

### 14.3 Isolation Strategy: Hybrid Approach

The platform uses a hybrid isolation model that balances security, cost, and operational complexity:

| Layer | Isolation Model | Justification |
|-------|----------------|---------------|
| Compute (K8s) | Namespace per tenant | Strong isolation with shared cluster efficiency |
| Sandboxes | Dedicated pool per tenant | Critical for arbitrary code execution |
| Database (PostgreSQL) | Row-Level Security | Shared instance with query-level isolation |
| Cache (Redis) | Key prefix + logical DB | Shared instance with namespace isolation |
| Object Storage | Separate bucket prefix | Shared storage with path-based isolation |
| Message Queue | Topic/queue per tenant | Shared cluster with logical separation |
| Secrets (Vault) | Separate path per tenant | Shared Vault with path-based ACLs |
| Network | Network policies per namespace | Pod-level network segmentation |

**Enterprise Tier**: Organizations on the enterprise tier receive:
- Dedicated database instance (not shared)
- Dedicated sandbox pool (no shared compute)
- VPC peering option
- Custom domain with dedicated TLS certificate
- Dedicated Redis instance
- Isolated message queue partition

### 14.4 Data Isolation

#### 14.4.1 PostgreSQL Row-Level Security (RLS)

Every table with tenant-scoped data includes a `tenant_id` column and RLS policies:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Force RLS for all users (including table owners)
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their tenant's data
CREATE POLICY tenant_isolation_projects ON projects
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Set tenant ID from application context on every transaction
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
    -- Also set user ID for audit logging
    PERFORM set_config('app.current_user_id', 
        current_setting('app.current_user_id', true), false);
END;
$$ LANGUAGE plpgsql;

-- Composite policy with user permission check
CREATE POLICY project_access_policy ON projects
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND EXISTS (
            SELECT 1 FROM user_project_permissions upp
            WHERE upp.user_id = current_setting('app.current_user_id')::UUID
            AND upp.project_id = projects.id
            AND upp.permission = 'project:read'
        )
    );
```

#### 14.4.2 Database Connection Pooling with Tenant Context

```python
class TenantAwareConnectionPool:
    """Connection pool that automatically sets tenant context on checkout."""
    
    async def checkout_connection(self, tenant_id: UUID, user_id: UUID):
        conn = await self.pool.acquire()
        try:
            # Set tenant context - RLS policies will use this
            await conn.execute(
                "SELECT set_tenant_context($1, $2)",
                tenant_id, user_id
            )
            # Verify context is set correctly
            result = await conn.fetchval(
                "SELECT current_setting('app.current_tenant_id')"
            )
            if result != str(tenant_id):
                raise SecurityException("Tenant context mismatch")
            return conn
        except Exception:
            await self.pool.release(conn)
            raise
```

#### 14.4.3 Tenant Schema Isolation (Enterprise)

For enterprise tenants, a dedicated schema is created:

```sql
-- Create tenant-specific schema
CREATE SCHEMA IF NOT EXISTS tenant_abc123;

-- Set search path to tenant schema
ALTER ROLE tenant_abc123_user SET search_path = tenant_abc123, public;

-- Grant limited permissions
GRANT USAGE ON SCHEMA tenant_abc123 TO tenant_abc123_user;
REVOKE ALL ON SCHEMA public FROM tenant_abc123_user;

-- All tables created in tenant schema automatically isolated
CREATE TABLE tenant_abc123.projects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    -- no tenant_id needed - schema provides isolation
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 14.5 Compute Isolation

#### 14.5.1 Kubernetes Namespace per Tenant

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-abc123
  labels:
    tenant.id: "abc123"
    tenant.tier: "enterprise"
    istio-injection: "enabled"
  annotations:
    quota.cpu: "100"
    quota.memory: "200Gi"
    network.policy: "strict"
---
# Resource quotas per tenant
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-abc123-quota
  namespace: tenant-abc123
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "20"
    secrets: "50"
    configmaps: "50"
---
# LimitRange for default resource constraints
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-abc123-limits
  namespace: tenant-abc123
spec:
  limits:
    - default:
        cpu: "2"
        memory: 4Gi
      defaultRequest:
        cpu: "100m"
        memory: 256Mi
      max:
        cpu: "8"
        memory: 32Gi
      min:
        cpu: "50m"
        memory: 128Mi
      type: Container
---
# NetworkPolicy for tenant namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-abc123-network-policy
  namespace: tenant-abc123
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: api-gateway
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - namespaceSelector:
            matchLabels:
              name: redis
      ports:
        - protocol: TCP
          port: 6379
    - to: []  # Block all other egress by default
```

#### 14.5.2 Tenant-Aware Scheduling

Custom Kubernetes scheduler ensures tenant workloads are distributed:

```yaml
# Pod with tenant affinity/anti-affinity
apiVersion: v1
kind: Pod
metadata:
  name: agent-worker
  namespace: tenant-abc123
  labels:
    tenant.id: "abc123"
spec:
  affinity:
    # Prefer spreading tenant pods across nodes
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: tenant.id
                  operator: In
                  values: ["abc123"]
            topologyKey: kubernetes.io/hostname
    # Sandbox pods require dedicated node pool
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-type
                operator: In
                values: ["sandbox"]
  tolerations:
    - key: "sandbox"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

### 14.6 Sandbox Isolation

Sandbox isolation is the most critical tenant boundary because arbitrary code execution represents the highest risk surface.

#### 14.6.1 Per-Tenant Sandbox Architecture

```
+------------------------------------------------------------------+
|                    SANDBOX ISOLATION LAYER                        |
+------------------------------------------------------------------+
|                                                                   |
|  Tenant A Namespace          Tenant B Namespace                   |
|  +---------------------+     +---------------------+             |
|  | Sandbox Pool A      |     | Sandbox Pool B      |             |
|  | +-----------------+ |     | +-----------------+ |             |
|  | | Sandbox A-1     | |     | | Sandbox B-1     | |             |
|  | | (Docker/gVisor) | |     | | (Docker/gVisor) | |             |
|  | +-----------------+ |     | +-----------------+ |             |
|  | | Sandbox A-2     | |     | | Sandbox B-2     | |             |
|  | | (Docker/gVisor) | |     | | (Docker/gVisor) | |             |
|  | +-----------------+ |     | +-----------------+ |             |
|  +---------------------+     +---------------------+             |
|                                                                   |
|  ISOLATION PROPERTIES:                                            |
|  - Separate network namespace (no inter-tenant communication)     |
|  - Separate cgroup (resource isolation)                           |
|  - Separate IPC namespace                                         |
|  - Separate mount namespace (per-tenant storage)                  |
|  - Seccomp profile per tenant                                     |
|  - AppArmor profile per tenant                                    |
|                                                                   |
+------------------------------------------------------------------+
```

#### 14.6.2 Sandbox Network Isolation

```yaml
# Sandbox NetworkPolicy - tenant A
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sandbox-tenant-a
  namespace: tenant-abc123-sandbox
spec:
  podSelector:
    matchLabels:
      app: sandbox
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only accept from tenant's own namespace
    - from:
        - namespaceSelector:
            matchLabels:
              tenant.id: "abc123"
  egress:
    # Block all external egress by default
    # Allow only to approved egress proxy
    - to:
        - namespaceSelector:
            matchLabels:
              name: egress-proxy
      ports:
        - protocol: TCP
          port: 3128
    # Allow DNS resolution only to tenant-specific resolver
    - to:
        - namespaceSelector:
            matchLabels:
              name: dns-filter
      ports:
        - protocol: UDP
          port: 53
```

### 14.7 Authentication Context & Tenant Resolution

#### 14.7.1 Tenant Resolution Pipeline

Every request goes through tenant resolution:

```python
class TenantResolutionMiddleware:
    """Resolves tenant context for every incoming request."""
    
    async def resolve(self, request: Request) -> TenantContext:
        # 1. Extract tenant hint from request
        tenant_id = (
            request.headers.get("X-Tenant-ID")
            or request.path_params.get("tenant_id")
            or self._extract_from_subdomain(request)
            or self._extract_from_custom_domain(request)
        )
        
        # 2. Authenticate user
        user = await self.authenticate(request)
        
        # 3. Verify user belongs to tenant
        if not await self.verify_tenant_membership(user.id, tenant_id):
            raise TenantAccessDenied(
                f"User {user.id} is not a member of tenant {tenant_id}"
            )
        
        # 4. Load tenant configuration
        tenant_config = await self.load_tenant_config(tenant_id)
        
        # 5. Validate tenant status (active, not suspended)
        if tenant_config.status != "active":
            raise TenantSuspended(f"Tenant {tenant_id} is {tenant_config.status}")
        
        # 6. Set tenant context on request
        return TenantContext(
            tenant_id=tenant_id,
            org_id=tenant_config.org_id,
            tier=tenant_config.tier,
            user_id=user.id,
            user_roles=user.roles,
            features=tenant_config.enabled_features,
            limits=tenant_config.resource_limits
        )
```

#### 14.7.2 Tenant-Aware JWT Claims

```json
{
  "sub": "user_1234567890",
  "iss": "https://auth.agentic-platform.io",
  "aud": "agentic-platform-api",
  "tenant_context": {
    "tenant_id": "tenant_xyz789",
    "org_id": "org_abc123",
    "tier": "enterprise",
    "teams": ["team_1", "team_2"],
    "projects": ["proj_a", "proj_b", "proj_c"]
  },
  "authorization": {
    "org_role": "org:admin",
    "project_roles": {
      "proj_a": "project:owner",
      "proj_b": "project:editor"
    },
    "permissions": [
      "agent:create", "agent:read", "agent:update", "agent:delete",
      "workflow:create", "workflow:execute", "workflow:read",
      "sandbox:create", "sandbox:execute",
      "memory:read", "memory:write",
      "api_key:manage"
    ]
  },
  "constraints": {
    "max_agents": 100,
    "max_sandboxes": 50,
    "max_workflows": 500,
    "allowed_models": ["gpt-4", "claude-3", "codellama"]
  }
}
```

### 14.8 Cross-Tenant Prevention

#### 14.8.1 Defense in Depth Against Data Leakage

| Layer | Control | Implementation |
|-------|---------|----------------|
| Application | Tenant validation middleware | Every request validated |
| Database | Row-Level Security | PostgreSQL RLS enforced |
| Database | Tenant-aware connection pooling | Context set on every connection |
| Cache | Key namespacing | `tenant:{id}:key` format |
| API | Resource scoping | Only return tenant's resources |
| Auth | JWT tenant claims | Tamper-proof tenant binding |
| Network | Network policies | Namespace-level isolation |
| Audit | Cross-tenant access detection | Alert on any cross-tenant query |

#### 14.8.2 Cross-Tenant Detection

```python
class CrossTenantDetector:
    """Detects and prevents cross-tenant access attempts."""
    
    async def validate_access(self, request_tenant_id: UUID, 
                             resource_tenant_id: UUID,
                             user_id: UUID) -> None:
        if request_tenant_id != resource_tenant_id:
            # Log security event
            await self.audit.log_security_event(
                event_type="cross_tenant_access_attempt",
                severity="CRITICAL",
                details={
                    "user_id": str(user_id),
                    "request_tenant": str(request_tenant_id),
                    "target_tenant": str(resource_tenant_id),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            # Alert security team
            await self.alerting.send_critical_alert(
                "Cross-tenant access attempt detected",
                {"user_id": user_id, "tenants": [request_tenant_id, resource_tenant_id]}
            )
            
            # Block request
            raise CrossTenantAccessForbidden()
```

### 14.9 Tenant Onboarding

#### 14.9.1 Automated Provisioning Flow

```
User Signs Up
      |
      v
[Create Organization]
      |
      v
[Generate Tenant ID] --> [Create Tenant Record in DB]
      |                          |
      v                          v
[Create K8s Namespace]    [Initialize RLS Policies]
      |                          |
      v                          v
[Set Resource Quotas]     [Create Vault Path]
      |                          |
      v                          v
[Configure NetworkPolicy] [Provision Sandbox Pool]
      |                          |
      v                          v
[Create Redis DB]         [Initialize Audit Log]
      |                          |
      v                          v
[Send Welcome Email]      [Enable Features per Tier]
```

#### 14.9.2 Custom Domain & SSO Configuration

```python
class TenantConfigurationService:
    async def configure_custom_domain(self, tenant_id: UUID, domain: str):
        # 1. Validate domain ownership
        await self.validate_domain_ownership(tenant_id, domain)
        
        # 2. Issue TLS certificate
        cert = await self.cert_manager.issue_certificate(domain)
        
        # 3. Configure ingress
        await self.k8s.configure_ingress(
            tenant_id=tenant_id,
            host=domain,
            tls_secret=cert.secret_name
        )
        
        # 4. Update tenant record
        await self.db.update_tenant(tenant_id, {
            "custom_domain": domain,
            "domain_verified": True,
            "tls_enabled": True
        })
    
    async def configure_sso(self, tenant_id: UUID, sso_config: SSOConfig):
        # Validate SSO configuration
        await self.validate_saml_metadata(sso_config.metadata_url)
        
        # Store encrypted configuration
        await self.vault.store_sso_config(tenant_id, sso_config)
        
        # Enable SSO for tenant
        await self.db.update_tenant(tenant_id, {
            "sso_enabled": True,
            "sso_provider": sso_config.provider,
            "sso_enforced": sso_config.enforce_sso
        })
```

### 14.10 Tenant Administration

#### 14.10.1 Admin APIs

```yaml
# Tenant Administration API Endpoints
/v1/admin/tenants:
  get:
    summary: List all tenants (platform admin only)
    responses:
      200:
        schema:
          type: array
          items:
            $ref: '#/definitions/Tenant'

/v1/admin/tenants/{tenant_id}:
  get:
    summary: Get tenant details
  patch:
    summary: Update tenant configuration
    body:
      tier: "enterprise"
      resource_limits:
        max_agents: 200
        max_sandboxes: 100
      features:
        - "custom_models"
        - "dedicated_sandbox"
  delete:
    summary: Soft-delete tenant (GDPR compliant)

/v1/admin/tenants/{tenant_id}/usage:
  get:
    summary: Get usage analytics
    returns:
      compute_hours: float
      sandbox_executions: int
      api_requests: int
      storage_gb: float
      token_consumption: int

/v1/admin/tenants/{tenant_id}/audit:
  get:
    summary: Get audit trail for tenant
    returns:
      events: array of AuditEvent
```

#### 14.10.2 Billing Integration

Usage is metered per tenant and reported to billing systems:

```python
class TenantUsageMetering:
    async def record_usage(self, tenant_id: UUID, event: UsageEvent):
        """Record a usage event for billing."""
        await self.usage_db.insert({
            "tenant_id": tenant_id,
            "event_type": event.type,  # sandbox_execution, api_request, token_usage
            "quantity": event.quantity,
            "timestamp": event.timestamp,
            "metadata": event.metadata
        })
    
    async def get_monthly_usage(self, tenant_id: UUID, month: str) -> UsageReport:
        """Generate monthly usage report for billing."""
        return await self.usage_db.aggregate([
            {"$match": {"tenant_id": tenant_id, "month": month}},
            {"$group": {
                "_id": "$event_type",
                "total": {"$sum": "$quantity"},
                "count": {"$sum": 1}
            }}
        ])
```

### 14.11 Tenant Migration

#### 14.11.1 Data Export (GDPR Right to Portability)

```python
class TenantDataExporter:
    async def export_tenant_data(self, tenant_id: UUID) -> ExportArchive:
        """Export all tenant data in a portable format."""
        export_id = uuid4()
        
        async with self.db.transaction():
            # Export projects
            projects = await self.db.projects.find_all(tenant_id=tenant_id)
            
            # Export agents with configurations
            agents = await self.db.agents.find_all(tenant_id=tenant_id)
            
            # Export workflows
            workflows = await self.db.workflows.find_all(tenant_id=tenant_id)
            
            # Export memories
            memories = await self.db.memories.find_all(tenant_id=tenant_id)
            
            # Export audit logs
            audit_logs = await self.db.audit_logs.find_all(tenant_id=tenant_id)
            
            # Create portable archive
            archive = {
                "export_metadata": {
                    "tenant_id": str(tenant_id),
                    "export_id": str(export_id),
                    "exported_at": datetime.utcnow().isoformat(),
                    "version": "1.0"
                },
                "projects": [p.to_dict() for p in projects],
                "agents": [a.to_dict() for a in agents],
                "workflows": [w.to_dict() for w in workflows],
                "memories": [m.to_dict() for m in memories],
                "audit_logs": [a.to_dict() for a in audit_logs]
            }
            
            # Encrypt archive with tenant's key
            encrypted = await self.encrypt_for_export(tenant_id, archive)
            
            # Store with signed integrity hash
            return await self.storage.store_export(export_id, encrypted)
```

#### 14.11.2 Tenant Deletion (GDPR Right to Erasure)

```python
class TenantDeletionService:
    async def delete_tenant(self, tenant_id: UUID) -> None:
        """Complete tenant deletion with GDPR compliance."""
        # 1. Soft delete (immediate)
        await self.db.update_tenant(tenant_id, {"status": "deleting"})
        
        # 2. Revoke all active sessions
        await self.auth.revoke_all_sessions(tenant_id)
        
        # 3. Disable all API keys
        await self.db.api_keys.update_many(
            {"tenant_id": tenant_id},
            {"status": "revoked", "revoked_at": datetime.utcnow()}
        )
        
        # 4. Schedule data purge (30-day grace period)
        await self.scheduler.schedule(
            task="purge_tenant_data",
            run_at=datetime.utcnow() + timedelta(days=30),
            payload={"tenant_id": str(tenant_id)}
        )
        
        # 5. Purge caches
        await self.redis.delete_pattern(f"tenant:{tenant_id}:*")
        
        # 6. Release sandbox resources
        await self.k8s.delete_namespace(f"tenant-{tenant_id}")
        await self.k8s.delete_namespace(f"tenant-{tenant_id}-sandbox")
```



---

## 25. RBAC/Permissions Model

### 25.1 Overview

The permission system for the Autonomous Agentic Software Organization Platform must be comprehensive, flexible, and auditable. It combines Role-Based Access Control (RBAC) for intuitive role assignment with Attribute-Based Access Control (ABAC) for context-aware, fine-grained authorization decisions. The system is built on a hierarchical resource model where permissions flow from organization level down to individual resources.

### 25.2 Permission System Architecture

```
+-------------------------------------------------------------------+
|                   PERMISSION SYSTEM ARCHITECTURE                    |
+-------------------------------------------------------------------+
|                                                                    |
|   Request with JWT + Resource Context                              |
|          |                                                         |
|          v                                                         |
|   [Authentication Layer] --- Verify identity                       |
|          |                                                         |
|          v                                                         |
|   [Tenant Resolution] --- Validate tenant context                  |
|          |                                                         |
|          v                                                         |
|   [RBAC Evaluator] --- Check role-based permissions                |
|          |                                                         |
|          v                                                         |
|   [ABAC Evaluator] --- OPA/Rego policy evaluation                  |
|          |                                                         |
|          v                                                         |
|   [Permission Engine] --- Resolve final decision                   |
|          |                                                         |
|          v                                                         |
|   [Audit Logger] --- Log decision with context                     |
|          |                                                         |
|          v                                                         |
|   [Allow / Deny]                                                   |
|                                                                    |
+-------------------------------------------------------------------+
```

### 25.3 Role Hierarchy

The role system is hierarchical and multi-scoped, allowing fine-grained delegation of authority across organization, team, and project levels.

#### 25.3.1 Organization-Level Roles

| Role | Identifier | Description | Inherits From |
|------|------------|-------------|---------------|
| **Organization Owner** | `org:owner` | Full control over organization, billing, deletion | All roles |
| **Organization Admin** | `org:admin` | Member management, org settings, audit access | `org:member` |
| **Security Admin** | `org:security_admin` | Security policies, access reviews, incident response | `org:member` |
| **Billing Admin** | `org:billing_admin` | Billing, invoices, usage, plan management | None |
| **Member** | `org:member` | Standard member, can create projects | `org:viewer` |
| **Viewer** | `org:viewer` | Read-only access to assigned resources | None |

#### 25.3.2 Project-Level Roles

| Role | Identifier | Description | Inherits From |
|------|------------|-------------|---------------|
| **Project Owner** | `project:owner` | Full control over project, can delete | All project roles |
| **Project Admin** | `project:admin` | Manage project settings, members | `project:editor` |
| **Editor** | `project:editor` | Create and modify resources | `project:viewer` |
| **Executor** | `project:executor` | Can execute agents and workflows | None |
| **Viewer** | `project:viewer` | Read-only access to project | None |

#### 25.3.3 Team-Level Roles

| Role | Identifier | Description |
|------|------------|-------------|
| **Team Admin** | `team:admin` | Manage team members, team projects |
| **Team Member** | `team:member` | Access to team's shared resources |

#### 25.3.4 Role Inheritance Chain

```
org:owner
    |
    +-- org:admin
    |       |
    |       +-- org:security_admin
    |       |       |
    |       |       +-- org:member
    |       |       |       |
    |       |       |       +-- org:viewer
    |       |       |       |
    |       |       |       +-- project:owner (in context of project)
    |       |       |       |       |
    |       |       |       |       +-- project:admin
    |       |       |       |       |       |
    |       |       |       |       |       +-- project:editor
    |       |       |       |       |       |       |
    |       |       |       |       |       |       +-- project:viewer
    |       |       |       |       |       |
    |       |       |       |       |       +-- project:executor
    |       |       |       |       |
    |       |       |       |       +-- team:admin
    |       |       |       |       |       |
    |       |       |       |       |       +-- team:member
```

#### 25.3.5 Custom Roles

Organizations can define custom roles with specific permission sets:

```json
{
  "id": "role_custom_001",
  "name": "Sandbox Operator",
  "description": "Can manage and execute sandboxes but cannot modify agent configurations",
  "org_id": "org_abc123",
  "permissions": [
    "sandbox:create",
    "sandbox:execute",
    "sandbox:read",
    "sandbox:delete",
    "sandbox:configure",
    "project:read",
    "agent:read"
  ],
  "inherits_from": ["project:viewer"],
  "constraints": {
    "max_sandboxes_per_day": 100,
    "allowed_sandbox_types": ["docker"],
    "max_execution_time": 3600
  }
}
```

Custom role constraints:
- Maximum 50 custom roles per organization
- Custom roles cannot exceed permissions of the creator's role
- Custom roles can be scoped to specific projects
- Changes to custom roles trigger audit events

### 25.4 Permission Granularity

#### 25.4.1 Resource Types

The platform defines permissions for the following resource types:

| Resource Type | Description | Example Permissions |
|---------------|-------------|---------------------|
| `project` | Projects are top-level resource containers | `project:create`, `project:read`, `project:update`, `project:delete` |
| `agent` | AI coding agents | `agent:create`, `agent:read`, `agent:update`, `agent:delete`, `agent:execute` |
| `workflow` | Durable workflows | `workflow:create`, `workflow:read`, `workflow:update`, `workflow:delete`, `workflow:execute`, `workflow:approve` |
| `sandbox` | Execution environments | `sandbox:create`, `sandbox:read`, `sandbox:delete`, `sandbox:execute`, `sandbox:configure` |
| `model` | LLM model configurations | `model:create`, `model:read`, `model:update`, `model:delete`, `model:invoke` |
| `memory` | Persistent memories | `memory:create`, `memory:read`, `memory:update`, `memory:delete`, `memory:search` |
| `api_key` | API credentials | `api_key:create`, `api_key:read`, `api_key:revoke`, `api_key:manage` |
| `member` | Organization members | `member:invite`, `member:read`, `member:update`, `member:remove`, `member:manage_roles` |
| `setting` | Organization settings | `setting:read`, `setting:update` |
| `secret` | Secrets and credentials | `secret:create`, `secret:read`, `secret:update`, `secret:delete` |
| `integration` | External integrations | `integration:create`, `integration:read`, `integration:update`, `integration:delete` |
| `billing` | Billing and invoices | `billing:read`, `billing:manage` |
| `audit_log` | Security audit logs | `audit_log:read`, `audit_log:export` |
| `template` | Agent/workflow templates | `template:create`, `template:read`, `template:use` |

#### 25.4.2 Action-Level Permissions

Beyond CRUD, the system defines action-level permissions for specific operations:

```yaml
action_permissions:
  execute:
    description: Execute an agent or workflow
    requires: ["resource:read"]
    
  approve:
    description: Approve a pending execution or change
    requires: ["resource:read"]
    
  configure:
    description: Change configuration of a resource
    requires: ["resource:update"]
    
  export:
    description: Export data from a resource
    requires: ["resource:read"]
    
  share:
    description: Share a resource with other members
    requires: ["resource:read", "member:read"]
    
  clone:
    description: Clone a resource (e.g., fork a workflow)
    requires: ["resource:read", "resource:create"]
    
  rollback:
    description: Rollback to a previous version
    requires: ["resource:update"]
    
  debug:
    description: Access debug information and logs
    requires: ["resource:read"]
    
  admin_override:
    description: Override normal restrictions (security admin)
    requires: ["org:security_admin"]
```

#### 25.4.3 Permission Matrix

```
                        | Owner | Admin | Member | Viewer | Executor |
------------------------+-------+-------+--------+--------+----------+
Create Project          |   X   |   X   |   X    |        |          |
Delete Project          |   X   |       |        |        |          |
Manage Project Members  |   X   |   X   |        |        |          |
Create Agent            |   X   |   X   |   X    |        |          |
Edit Agent Config       |   X   |   X   |   X    |        |          |
Delete Agent            |   X   |   X   |        |        |          |
Execute Agent           |   X   |   X   |   X    |        |    X     |
Create Workflow         |   X   |   X   |   X    |        |          |
Execute Workflow        |   X   |   X   |   X    |        |    X     |
Approve Workflow        |   X   |   X   |        |        |          |
Create Sandbox          |   X   |   X   |   X    |        |    X     |
Execute in Sandbox      |   X   |   X   |   X    |        |    X     |
Read Secrets            |   X   |       |        |        |          |
Manage API Keys         |   X   |   X   |   X    |        |          |
Invite Members          |   X   |   X   |        |        |          |
Manage Billing          |   X   |       |        |        |          |
Read Audit Logs         |   X   |   X*  |        |        |          |
Export Data             |   X   |   X   |   X    |        |          |
Manage Integrations     |   X   |   X   |        |        |          |
View Organization Set.  |   X   |   X   |   X    |   X    |          |
Manage Security Policies|   X   |       |        |        |          |

* Security Admin role
```

### 25.5 Policy Engine

#### 25.5.1 Open Policy Agent (OPA) Integration

The policy engine uses Open Policy Agent (OPA) with Rego policies for flexible, declarative authorization.

```
+-------------------------------------------------------------------+
|                     POLICY ENGINE ARCHITECTURE                     |
+-------------------------------------------------------------------+
|                                                                    |
|   [API Service] --------> [OPA Sidecar] --------> [Decision]      |
|        |                        |                                 |
|        | Input:                 | Rego Policies:                  |
|        | - user context         | - rbac.rego                     |
|        | - resource context     | - abac.rego                     |
|        | - action               | - tenant.rego                   |
|        | - environment          | - custom_org_*.rego             |
|        |                        |                                 |
|        v                        v                                 |
|   [Context Data] --------> [Policy Bundle]                        |
|   - user roles                  (distributed via S3/OCI)          |
|   - resource attributes                                             |
|   - tenant configuration                                            |
|   - time, IP, device                                                |
|                                                                    |
+-------------------------------------------------------------------+
```

#### 25.5.2 Rego Policy Examples

**RBAC Policy** (`rbac.rego`):

```rego
package agentic_platform.rbac

import future.keywords.if
import future.keywords.in

# Role hierarchy definition
role_hierarchy := {
    "org:owner": ["org:admin", "org:security_admin", "org:member", "org:viewer"],
    "org:admin": ["org:member", "org:viewer"],
    "org:security_admin": ["org:member", "org:viewer"],
    "org:member": ["org:viewer"],
    "project:owner": ["project:admin", "project:editor", "project:viewer", "project:executor"],
    "project:admin": ["project:editor", "project:viewer"],
    "project:editor": ["project:viewer"]
}

# Permission assignments per role
role_permissions := {
    "org:owner": [
        "project:*", "agent:*", "workflow:*", "sandbox:*",
        "model:*", "memory:*", "api_key:*", "member:*",
        "setting:*", "secret:*", "billing:*", "audit_log:*"
    ],
    "org:admin": [
        "project:create", "project:read", "project:update",
        "agent:*", "workflow:*", "sandbox:*",
        "api_key:*", "member:invite", "member:read", "member:update",
        "setting:read", "setting:update"
    ],
    "org:member": [
        "project:create", "project:read", "project:update",
        "agent:create", "agent:read", "agent:update", "agent:execute",
        "workflow:create", "workflow:read", "workflow:execute",
        "sandbox:create", "sandbox:read", "sandbox:execute",
        "memory:create", "memory:read", "memory:update",
        "api_key:create", "api_key:read"
    ],
    "org:viewer": [
        "project:read", "agent:read", "workflow:read",
        "sandbox:read", "memory:read"
    ]
}

# Check if user has a specific permission
has_permission if {
    some role in input.user.roles
    expanded_roles := expand_role(role)
    some expanded_role in expanded_roles
    some permission in role_permissions[expanded_role]
    permission_match(permission, input.permission)
}

# Expand role to include inherited roles
expand_role(role) := roles if {
    role in role_hierarchy
    roles := array.concat([role], role_hierarchy[role])
} else := [role]

# Match permission with wildcard support
permission_match(granted, requested) if {
    granted == requested
}

permission_match(granted, requested) if {
    endswith(granted, ":*")
    prefix := trim_suffix(granted, ":*")
    startswith(requested, prefix)
}
```

**ABAC Policy** (`abac.rego`):

```rego
package agentic_platform.abac

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Allow if RBAC permits and no ABAC constraints violated
allow if {
    data.agentic_platform.rbac.has_permission
    not abac_denied
}

# ABAC constraint: time-based access
abac_denied if {
    input.action == "agent:execute"
    input.environment.current_time
    [hour, _] := time.clock(input.environment.current_time)
    hour < 6  # Before 6 AM
    hour >= 22  # After 10 PM
    not input.user.roles[_] == "org:owner"  # Except org owners
}

# ABAC constraint: IP-based restrictions
abac_denied if {
    input.user.org_ip_restriction != ""
    not net.cidr_contains(input.user.org_ip_restriction, input.environment.source_ip)
}

# ABAC constraint: MFA requirement for sensitive operations
abac_denied if {
    input.action in ["secret:read", "api_key:manage", "member:remove"]
    not input.user.mfa_verified
}

# ABAC constraint: sandbox resource limits
abac_denied if {
    input.action == "sandbox:create"
    input.user.current_sandbox_count >= input.user.sandbox_limit
}

# ABAC constraint: require approval for production workflows
abac_denied if {
    input.action == "workflow:execute"
    input.resource.environment == "production"
    input.resource.requires_approval
    not input.approval.granted
}
```

#### 25.5.3 Cedar Alternative Policy Engine

For organizations preferring Cedar (AWS's authorization engine):

```cedar
// Entity definitions
entity User {
    roles: Set<String>,
    org_id: String,
    mfa_verified: Bool,
    ip_address: ipaddr
};

entity Resource {
    tenant_id: String,
    project_id: String,
    owner_id: String,
    classification: String
};

entity Action;

// Role-based permission assignment
permit(principal, action == Action::"project:delete", resource)
when {
    principal.roles.contains("org:owner") ||
    (principal.roles.contains("project:owner") && resource.owner_id == principal.uid)
};

// ABAC: MFA requirement for sensitive actions
permit(principal, action == Action::"secret:read", resource)
when {
    principal.mfa_verified == true
};

// ABAC: IP-based restrictions
forbid(principal, action, resource)
when {
    context.ip_address.isInRange(principal.allowed_ip_range) == false
};

// ABAC: Time-based restrictions
forbid(principal, action == Action::"agent:execute", resource)
when {
    context.time.hour < 6 || context.time.hour >= 22
}
unless {
    principal.roles.contains("org:owner")
};
```

### 25.6 Permission Inheritance

Permissions follow a strict inheritance chain:

```
Organization Permissions
         |
         v
    +---------+---------+---------+
    |         |         |         |
    v         v         v         v
 Team A    Team B   Project X  Project Y
                      (Team A)  (Team B)
    |         |         |         |
    v         v         v         v
 Members   Members   Agents    Agents
           Projects  Workflows Workflows
                     Sandboxes Sandboxes
```

**Inheritance Rules**:
1. Organization roles apply to all teams and projects within the org
2. Team roles apply to all projects within the team
3. Project roles apply only to the specific project
4. Permissions are additive: user has union of all granted permissions
5. Explicit denials override inherited grants
6. Custom role permissions are scoped to the role definition

```python
class PermissionResolver:
    async def resolve_effective_permissions(
        self,
        user_id: UUID,
        org_id: UUID,
        project_id: Optional[UUID] = None
    ) -> PermissionSet:
        """Resolve effective permissions for a user in context."""
        
        # 1. Get organization-level role
        org_role = await self.get_org_role(user_id, org_id)
        org_perms = self.get_role_permissions(org_role)
        
        # 2. Get team memberships and roles
        team_roles = await self.get_team_roles(user_id, org_id)
        team_perms = set()
        for team_role in team_roles:
            team_perms.update(self.get_role_permissions(team_role.role))
        
        # 3. Get project-level role (if project context)
        project_perms = set()
        if project_id:
            project_role = await self.get_project_role(user_id, project_id)
            if project_role:
                project_perms = self.get_role_permissions(project_role)
        
        # 4. Get custom role permissions
        custom_roles = await self.get_custom_roles(user_id, org_id)
        custom_perms = set()
        for custom_role in custom_roles:
            custom_perms.update(custom_role.permissions)
        
        # 5. Combine all permissions (additive)
        effective_perms = org_perms | team_perms | project_perms | custom_perms
        
        # 6. Apply explicit denials
        denials = await self.get_explicit_denials(user_id, org_id, project_id)
        effective_perms -= denials
        
        return PermissionSet(
            permissions=effective_perms,
            source_roles=[org_role] + [r.role for r in team_roles] + [project_role],
            inherited_from= self.build_inheritance_chain(...)
        )
```

### 25.7 API Key Scoping

#### 25.7.1 API Key Permission Model

API keys support scoped permissions with fine-grained access control:

```json
{
  "id": "ak_abc123",
  "name": "CI/CD Deployment Key",
  "org_id": "org_abc123",
  "project_id": "proj_xyz789",
  "permissions": [
    "agent:read",
    "agent:execute",
    "workflow:read",
    "workflow:execute",
    "sandbox:create",
    "sandbox:execute",
    "sandbox:delete"
  ],
  "constraints": {
    "allowed_ip_ranges": ["192.168.1.0/24", "10.0.0.0/8"],
    "allowed_referrers": ["https://ci.company.com/*"],
    "expires_at": "2025-12-31T23:59:59Z",
    "max_requests_per_hour": 1000,
    "allowed_models": ["gpt-4", "claude-3-opus"]
  },
  "created_by": "user_admin_001",
  "created_at": "2025-01-15T10:00:00Z",
  "last_used_at": "2025-06-01T14:30:00Z",
  "usage_count": 4523
}
```

#### 25.7.2 API Key Validation Flow

```python
class APIKeyValidator:
    async def validate_api_key(self, key: str, request_context: RequestContext) -> APIKeyAuth:
        """Validate API key and return authorization context."""
        
        # 1. Hash the key and look up
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        api_key_record = await self.db.api_keys.find_by_hash(key_hash)
        
        if not api_key_record:
            raise InvalidAPIKey()
        
        # 2. Check expiration
        if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
            raise ExpiredAPIKey()
        
        # 3. Check if revoked
        if api_key_record.status == "revoked":
            raise RevokedAPIKey()
        
        # 4. Validate IP restrictions
        if api_key_record.constraints.allowed_ip_ranges:
            if not any(
                ipaddress.ip_address(request_context.source_ip) in ipaddress.ip_network(cidr)
                for cidr in api_key_record.constraints.allowed_ip_ranges
            ):
                raise IPNotAllowed()
        
        # 5. Validate rate limit
        current_count = await self.rate_limiter.get_count(
            f"api_key:{api_key_record.id}:{datetime.utcnow().hour}"
        )
        if current_count >= api_key_record.constraints.max_requests_per_hour:
            raise APIKeyRateLimitExceeded()
        
        # 6. Update usage metrics
        await self.db.api_keys.update_usage(api_key_record.id)
        
        # 7. Build authorization context
        return APIKeyAuth(
            key_id=api_key_record.id,
            permissions=api_key_record.permissions,
            constraints=api_key_record.constraints,
            tenant_id=api_key_record.org_id,
            project_id=api_key_record.project_id
        )
```

#### 25.7.3 API Key Rotation

```python
class APIKeyRotationService:
    async def rotate_api_key(self, key_id: str, rotated_by: UUID) -> APIKeyRotationResult:
        """Rotate an API key with zero-downtime transition."""
        
        # 1. Generate new key
        new_key_plain = secrets.token_urlsafe(48)
        new_key_hash = hashlib.sha256(new_key_plain.encode()).hexdigest()
        
        # 2. Create new key record
        new_key = await self.db.api_keys.create({
            "name": old_key.name,
            "org_id": old_key.org_id,
            "project_id": old_key.project_id,
            "permissions": old_key.permissions,
            "constraints": old_key.constraints,
            "key_hash": new_key_hash,
            "status": "active",
            "rotation_of": key_id,
            "created_by": rotated_by,
            "expires_at": datetime.utcnow() + timedelta(days=90)
        })
        
        # 3. Set old key grace period (24 hours)
        await self.db.api_keys.update(key_id, {
            "status": "rotating",
            "grace_period_end": datetime.utcnow() + timedelta(hours=24)
        })
        
        # 4. Schedule old key deletion
        await self.scheduler.schedule(
            task="delete_api_key",
            run_at=datetime.utcnow() + timedelta(hours=24),
            payload={"key_id": key_id}
        )
        
        # 5. Log rotation event
        await self.audit.log_event(
            event_type="api_key_rotated",
            actor_id=rotated_by,
            target_id=key_id,
            details={"new_key_id": new_key.id}
        )
        
        return APIKeyRotationResult(
            new_key=new_key_plain,  # Only returned once
            new_key_id=new_key.id,
            grace_period_hours=24
        )
```

### 25.8 Audit Trail

#### 25.8.1 Audit Event Schema

Every authorization decision is logged with full context:

```json
{
  "event_id": "evt_abc123",
  "event_type": "authorization_decision",
  "timestamp": "2025-06-15T10:30:00.000Z",
  "severity": "info",
  "outcome": "allow",
  
  "actor": {
    "type": "user",
    "id": "user_123",
    "email": "alice@company.com",
    "ip_address": "203.0.113.42",
    "user_agent": "Mozilla/5.0...",
    "auth_method": "oidc",
    "mfa_verified": true,
    "session_id": "sess_xyz789"
  },
  
  "resource": {
    "type": "sandbox",
    "id": "sb_456",
    "project_id": "proj_789",
    "tenant_id": "tenant_abc"
  },
  
  "action": {
    "name": "sandbox:execute",
    "method": "POST",
    "path": "/v1/sandboxes/sb_456/execute"
  },
  
  "authorization": {
    "decision": "allow",
    "policies_evaluated": ["rbac:org_member", "abac:no_time_restriction"],
    "roles": ["org:member", "project:editor"],
    "permissions_checked": ["sandbox:execute"],
    "abac_constraints_passed": ["mfa_verified", "ip_allowed", "within_hours"]
  },
  
  "context": {
    "request_id": "req_12345",
    "trace_id": "trace_67890",
    "tenant_id": "tenant_abc",
    "region": "us-east-1",
    "service": "sandbox-service"
  }
}
```

#### 25.8.2 Audit Log Retention

| Event Category | Retention Period | Storage Class |
|----------------|-----------------|---------------|
| Authorization decisions | 7 years | Cold storage (GDPR/SOC2) |
| Permission changes | 7 years | Cold storage |
| Role assignments | 7 years | Cold storage |
| API key operations | 7 years | Cold storage |
| Failed authorization attempts | 1 year | Warm storage |
| Access reviews | 7 years | Cold storage |

#### 25.8.3 Access Reviews

```python
class AccessReviewService:
    async def generate_access_review(self, org_id: UUID) -> AccessReview:
        """Generate quarterly access review report."""
        
        review = AccessReview(
            org_id=org_id,
            generated_at=datetime.utcnow(),
            period_start=datetime.utcnow() - timedelta(days=90),
            period_end=datetime.utcnow()
        )
        
        # 1. Identify overprivileged users
        review.overprivileged_users = await self.find_overprivileged_users(org_id)
        
        # 2. Identify unused permissions
        review.unused_permissions = await self.find_unused_permissions(org_id)
        
        # 3. Identify dormant users
        review.dormant_users = await self.find_dormant_users(org_id, days=90)
        
        # 4. Identify excessive role assignments
        review.excessive_roles = await self.find_excessive_roles(org_id)
        
        # 5. Check for privilege escalation patterns
        review.privilege_escalations = await self.find_privilege_escalations(org_id)
        
        # 6. Generate recommendations
        review.recommendations = self.generate_recommendations(review)
        
        # 7. Store and notify
        await self.db.access_reviews.store(review)
        await self.notifications.send_access_review(review)
        
        return review
```

### 25.9 Conditional Access

#### 25.9.1 IP Restrictions

Organizations can restrict access by IP address:

```yaml
conditional_access:
  ip_restrictions:
    org_default:
      allowed_ip_ranges:
        - "10.0.0.0/8"
        - "172.16.0.0/12"
      blocked_ip_ranges:
        - "192.168.1.100/32"  # Blocked specific IP
    
    role_specific:
      org:admin:
        allowed_ip_ranges:
          - "10.1.0.0/16"  # Admin only from specific subnet
      
      org:security_admin:
        require_ip_from:
          - "10.2.0.0/16"  # Security team subnet
```

#### 25.9.2 Time-Based Access

```yaml
conditional_access:
  time_restrictions:
    org_default:
      allowed_hours:
        start: "06:00"
        end: "22:00"
        timezone: "America/New_York"
      allowed_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    exceptions:
      org:owner:
        unrestricted: true
      
      project:executor:
        allowed_hours:
          start: "00:00"
          end: "23:59"  # 24/7 for automated execution
```

#### 25.9.3 MFA Requirements

```yaml
conditional_access:
  mfa_requirements:
    org_default:
      required: true
      methods: ["totp", "webauthn"]
    
    elevated_access:
      actions_requiring_mfa:
        - "secret:read"
        - "secret:create"
        - "api_key:manage"
        - "member:remove"
        - "org:setting:security"
        - "sandbox:configure"
      step_up_auth:
        session_validity_minutes: 15
        require_fresh_mfa: true
```

#### 25.9.4 Device Posture

```yaml
conditional_access:
  device_requirements:
    org_managed_devices:
      require_trusted_device: true
      allowed_platforms: ["macos", "windows", "linux"]
      minimum_os_versions:
        macos: "14.0"
        windows: "11.0"
        linux: "22.04"
      require_disk_encryption: true
      require_antivirus: true
      block_jailbroken: true
```

### 25.10 Permission System API

```yaml
# Permission Management API

/v1/permissions/check:
  post:
    summary: Check if user has permission
    body:
      user_id: "user_123"
      resource_type: "sandbox"
      resource_id: "sb_456"
      action: "sandbox:execute"
      context:
        ip_address: "10.0.1.42"
        time: "2025-06-15T10:30:00Z"
    response:
      allowed: true
      reason: "User has project:editor role with sandbox:execute permission"
      policies: ["rbac:project_editor", "abac:time_allowed"]

/v1/permissions/batch-check:
  post:
    summary: Check multiple permissions at once
    body:
      user_id: "user_123"
      checks:
        - resource_type: "sandbox"
          action: "sandbox:execute"
        - resource_type: "workflow"
          action: "workflow:execute"
        - resource_type: "secret"
          action: "secret:read"
    response:
      results:
        - action: "sandbox:execute"
          allowed: true
        - action: "workflow:execute"
          allowed: true
        - action: "secret:read"
          allowed: false
          reason: "MFA not verified for sensitive operation"

/v1/roles:
  get:
    summary: List all roles in organization
  post:
    summary: Create custom role

/v1/roles/{role_id}:
  get:
    summary: Get role details
  patch:
    summary: Update role permissions
  delete:
    summary: Delete custom role

/v1/members/{member_id}/roles:
  get:
    summary: Get member's roles
  put:
    summary: Assign roles to member

/v1/access-reviews:
  get:
    summary: List access reviews
  post:
    summary: Initiate access review

/v1/audit/logs:
  get:
    summary: Query audit logs
    parameters:
      - event_type
      - actor_id
      - resource_type
      - outcome
      - start_date
      - end_date
```

---

## 26. Sandbox Design

### 26.1 Overview

The sandbox system is the most security-critical component of the platform. It executes arbitrary AI-generated code submitted by autonomous agents, which represents the highest risk surface in the entire architecture. The sandbox must execute untrusted code safely while maintaining performance, providing a realistic development environment, and preventing escape or data exfiltration.

### 26.2 Sandbox Technology Stack

The platform implements a tiered sandbox approach based on trust level:

| Trust Level | Technology | Use Case | Isolation Strength |
|-------------|-----------|----------|-------------------|
| **Trusted** | Docker + gVisor | Internal tools, known code | Strong |
| **Standard** | Docker + seccomp | Standard agent execution | Strong |
| **Untrusted** | Firecracker microVM | User-submitted, AI-generated code | Very Strong |
| **High-Risk** | Firecracker + network isolation | Untrusted code with network | Maximum |

```
+---------------------------------------------------------------------+
|                    SANDBOX TECHNOLOGY STACK                          |
+---------------------------------------------------------------------+
|                                                                      |
|  +-----------------+    +-----------------+    +------------------+ |
|  |  Firecracker    |    |  Docker +       |    |  Docker +        | |
|  |  microVM        |    |  gVisor         |    |  seccomp only    | |
|  |                 |    |  (runsc)        |    |                  | |
|  |  - KVM isolation|    |  - User-space   |    |  - Native kernel | |
|  |  - Virtual NIC  |    |    kernel       |    |  - syscall filter| |
|  |  - Minimal root |    |  - Sentry       |    |  - Cap drop      | |
|  |    fs           |    |  - Gofer        |    |  - No new privs  | |
|  |  - 5ms boot     |    |  - Platform     |    |  - AppArmor      | |
|  |                 |    |    rings        |    |                  | |
|  |  Use: Untrusted |    |  Use: Standard  |    |  Use: Internal   | |
|  |  code, AI-gen   |    |  agents         |    |  tools           | |
|  +-----------------+    +-----------------+    +------------------+ |
|                                                                      |
|  Selection Criteria:                                                 |
|  - Code provenance (AI-generated = microVM)                          |
|  - Network requirements (internet = microVM + proxy)                 |
|  - Data sensitivity (secrets = microVM + encrypted vol)              |
|  - Performance needs (low-latency = gVisor)                          |
|                                                                      |
+---------------------------------------------------------------------+
```

### 26.3 Filesystem Isolation

#### 26.3.1 Overlay Filesystem Architecture

Each sandbox uses an overlay filesystem for isolation and efficiency:

```
+------------------------------------------------------------------+
|                    SANDBOX FILESYSTEM LAYERS                      |
+------------------------------------------------------------------+
|                                                                   |
|   Per-Sandbox Writable Layer (tmpfs/overlay)                     |
|   +------------------------+                                      |
|   | /workspace/            |  <-- Agent's working directory        |
|   | /workspace/src/        |                                      |
|   | /workspace/output/     |                                      |
|   | /tmp/                  |                                      |
|   +------------------------+                                      |
|            |                                                      |
|   Read-Only Base Layers (shared, content-addressed)               |
|   +------------------------+                                      |
|   | Layer N: Language      |  <-- Python 3.11 + pip packages      |
|   | Layer N-1: Tools       |  <-- Git, curl, build tools           |
|   | Layer 2: Base OS       |  <-- Distroless base image            |
|   | Layer 1: Sandbox Agent |  <-- Sandbox monitoring agent         |
|   +------------------------+                                      |
|                                                                   |
|   Mount Propagation: private (no host visibility)                 |
|   Writable Layer Size: configurable (default 10GB, max 100GB)     |
|   Base Layers: shared across sandboxes (deduplication)            |
|                                                                   |
+------------------------------------------------------------------+
```

#### 26.3.2 Filesystem Configuration

```yaml
sandbox_filesystem:
  base_image: "ghcr.io/agentic-platform/sandbox-base:v1.2.0"
  
  layers:
    - name: "base"
      image: "gcr.io/distroless/python3-debian12"
      read_only: true
    - name: "tools"
      image: "ghcr.io/agentic-platform/sandbox-tools:v2.1.0"
      read_only: true
      mount_point: "/usr/local/bin"
    - name: "language-runtime"
      image: "ghcr.io/agentic-platform/python-3.11:v1.0.0"
      read_only: true
    - name: "workspace"
      type: "empty_dir"
      size_limit: "10Gi"
      mount_point: "/workspace"
    - name: "tmp"
      type: "tmpfs"
      size_limit: "2Gi"
      mount_point: "/tmp"
  
  mount_options:
    - mount_point: "/"
      read_only: true
      noexec: true
    - mount_point: "/workspace"
      read_only: false
      noexec: false
    - mount_point: "/tmp"
      read_only: false
      noexec: true
      nosuid: true
      nodev: true
    - mount_point: "/proc"
      type: "proc"
      hide_pid: true  # Hide other processes
    - mount_point: "/sys"
      type: "sysfs"
      read_only: true
    - mount_point: "/dev"
      type: "tmpfs"
      allowed_devices: ["null", "zero", "random", "urandom", "tty"]
  
  security:
    no_new_privileges: true
    read_only_root: true
    mount_propagation: "private"
    rootfs: "/var/lib/sandbox/rootfs"
```

### 26.4 Network Isolation

#### 26.4.1 Default-Deny Network Policy

```yaml
# Default sandbox network policy - deny all by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sandbox-default-deny
  namespace: sandbox-pool
spec:
  podSelector:
    matchLabels:
      app: sandbox
  policyTypes:
    - Ingress
    - Egress
  # No ingress rules = deny all incoming
  # No egress rules = deny all outgoing

---
# Allow specific egress through proxy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sandbox-egress-proxy
  namespace: sandbox-pool
spec:
  podSelector:
    matchLabels:
      app: sandbox
  policyTypes:
    - Egress
  egress:
    # Allow DNS to cluster DNS service only
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow egress proxy for filtered internet
    - to:
        - namespaceSelector:
            matchLabels:
              name: egress-system
          podSelector:
            matchLabels:
              app: sandbox-egress-proxy
      ports:
        - protocol: TCP
          port: 3128
    # Allow internal API communication
    - to:
        - namespaceSelector:
            matchLabels:
              name: api-system
      ports:
        - protocol: TCP
          port: 8080
```

#### 26.4.2 Egress Proxy with Domain Filtering

The egress proxy filters and logs all outbound connections:

```yaml
# Egress proxy configuration
sandbox_egress_proxy:
  type: "squid"
  mode: "whitelist"  # Only allowlisted domains
  
  allowed_domains:
    # Package registries
    - "pypi.org"
    - "pypi.python.org"
    - "files.pythonhosted.org"
    - "registry.npmjs.org"
    - "npmjs.org"
    - "rubygems.org"
    - "crates.io"
    - "packagist.org"
    - "proxy.golang.org"
    
    # Git providers
    - "github.com"
    - "api.github.com"
    - "raw.githubusercontent.com"
    - "gitlab.com"
    - "bitbucket.org"
    
    # API services
    - "api.openai.com"
    - "api.anthropic.com"
    - "generativelanguage.googleapis.com"
    
    # Documentation
    - "docs.python.org"
    - "developer.mozilla.org"
    - "docs.npmjs.com"
    
  blocked_domains:
    - "*.internal"
    - "169.254.169.254"  # AWS metadata
    - "metadata.google.internal"  # GCP metadata
    - "*.local"
    - "10.*"
    - "172.16.*"
    - "192.168.*"
    
  connection_limits:
    max_connections_per_sandbox: 10
    max_connections_per_destination: 3
    max_bandwidth_mbps: 50
    connection_timeout_seconds: 30
    request_timeout_seconds: 60
    
  logging:
    log_all_requests: true
    log_request_body_size: 1024  # Log first 1KB
    log_response_status: true
    log_ssl_sni: true  # Log TLS SNI for HTTPS
    destination: "kafka://audit-topic"
```

#### 26.4.3 DNS Filtering

```yaml
sandbox_dns:
  resolver: "coredns"
  mode: "filtered"
  
  forward_zones:
    - zone: "."
      forward_to: ["8.8.8.8", "1.1.1.1"]
      policy: "allowlist"
  
  rewrite_rules:
    # Block metadata services
    - name: "169.254.169.254"
      answer: "NXDOMAIN"
    - name: "metadata.google.internal"
      answer: "NXDOMAIN"
    - name: "*.internal"
      answer: "NXDOMAIN"
  
  rate_limits:
    queries_per_second: 100
    burst: 200
    per_sandbox: true
```

### 26.5 Resource Constraints

#### 26.5.1 Resource Limits per Sandbox

```yaml
sandbox_resource_limits:
  default:
    cpu:
      request: "500m"
      limit: "2"
    memory:
      request: "512Mi"
      limit: "4Gi"
    ephemeral_storage:
      limit: "10Gi"
    network_bandwidth:
      ingress_mbps: 50
      egress_mbps: 50
    
  tiers:
    free:
      cpu_limit: "1"
      memory_limit: "2Gi"
      storage_limit: "5Gi"
      max_execution_time: 300  # 5 minutes
      max_sandboxes_per_hour: 10
    
    team:
      cpu_limit: "4"
      memory_limit: "8Gi"
      storage_limit: "20Gi"
      max_execution_time: 1800  # 30 minutes
      max_sandboxes_per_hour: 50
    
    enterprise:
      cpu_limit: "8"
      memory_limit: "32Gi"
      storage_limit: "100Gi"
      max_execution_time: 7200  # 2 hours
      max_sandboxes_per_hour: 200
```

#### 26.5.2 Execution Quotas

```yaml
sandbox_quotas:
  execution:
    max_execution_time: 3600  # seconds
    max_idle_time: 300  # seconds before auto-terminate
    max_total_output_size: "100MB"  # stdout + stderr
    max_file_operations: 10000  # read/write syscalls
    max_files_created: 1000
    max_file_size: "50MB"
    max_subprocesses: 10
    max_network_connections: 10
    max_dns_lookups: 100
  
  filesystem:
    max_write_bytes: "1GB"
    max_read_bytes: "1GB"
    allowed_paths:
      - "/workspace/**"
      - "/tmp/**"
      - "/home/sandbox/**"
    blocked_paths:
      - "/proc/**"
      - "/sys/**"
      - "/dev/**"
      - "/etc/passwd"
      - "/etc/shadow"
      - "**/.ssh/**"
      - "**/.aws/**"
      - "**/.env*"
  
  network:
    max_request_size: "10MB"
    max_response_size: "10MB"
    max_total_transfer: "100MB"
    max_requests: 1000
```

### 26.6 Security Hardening

#### 26.6.1 Seccomp-BPF Profiles

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_X86"],
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "openat", "close",
        "fstat", "lseek", "mmap", "mprotect", "munmap",
        "brk", "rt_sigaction", "rt_sigprocmask", "ioctl",
        "pread64", "pwrite64", "readv", "writev",
        "pipe", "dup", "dup2", "fork", "vfork",
        "execve", "exit", "wait4", "kill", "uname",
        "fcntl", "flock", "fsync", "fdatasync",
        "truncate", "ftruncate", "getcwd", "chdir",
        "rename", "mkdir", "rmdir", "creat",
        "link", "unlink", "symlink", "readlink",
        "chmod", "fchmod", "chown", "fchown",
        "lchown", "umask", "gettimeofday", "getrlimit",
        "getrusage", "sysinfo", "times", "ptrace",
        "getuid", "getgid", "setuid", "setgid",
        "geteuid", "getegid", "setpgid", "getppid",
        "getpgrp", "setsid", "setreuid", "setregid",
        "getgroups", "setgroups", "setresuid", "getresuid",
        "setresgid", "getresgid", "getpgid", "setfsuid",
        "setfsgid", "getsid", "capget", "capset",
        "sigpending", "sigtimedwait", "sigwaitinfo",
        "socket", "connect", "accept", "sendto",
        "recvfrom", "sendmsg", "recvmsg", "shutdown",
        "bind", "listen", "getsockname", "getpeername",
        "socketpair", "setsockopt", "getsockopt", "clone",
        "exit_group", "waitid", "set_tid_address",
        "futex", "set_robust_list", "get_robust_list",
        "nanosleep", "getitimer", "setitimer",
        "clock_gettime", "clock_getres", "clock_nanosleep",
        "timer_create", "timer_settime", "timer_gettime",
        "timer_getoverrun", "timer_delete", "times",
        "access", "faccessat", "stat", "lstat",
        "fstatat", "getdents", "getdents64",
        "select", "poll", "epoll_create", "epoll_ctl",
        "epoll_wait", "epoll_pwait",
        "getrandom", "statfs", "fstatfs",
        "prctl", "arch_prctl",
        "sched_yield", "sched_getaffinity", "sched_setaffinity",
        "sched_getparam", "sched_setparam",
        "sched_getscheduler", "sched_setscheduler",
        "sched_get_priority_max", "sched_get_priority_min",
        "sched_rr_get_interval",
        "signalfd", "eventfd", "timerfd_create",
        "timerfd_settime", "timerfd_gettime",
        "signalfd4", "eventfd2", "epoll_create1",
        "dup3", "pipe2", "inotify_init", "inotify_init1",
        "preadv", "pwritev", "rt_tgsigqueueinfo",
        "perf_event_open", "recvmmsg", "fanotify_init",
        "fanotify_mark", "prlimit64", "name_to_handle_at",
        "open_by_handle_at", "clock_adjtime",
        "syncfs", "setns", "getcpu", "process_vm_readv",
        "process_vm_writev", "kcmp", "finit_module",
        "sched_setattr", "sched_getattr", "renameat2",
        "seccomp", "getrandom", "memfd_create",
        "kexec_file_load", "bpf", "execveat",
        "userfaultfd", "membarrier", "mlock2", "copy_file_range",
        "preadv2", "pwritev2"
      ],
      "action": "SCMP_ACT_ALLOW"
    },
    {
      "names": ["mkdirat", "fchownat", "newfstatat", "unlinkat", "renameat", "linkat", "symlinkat", "readlinkat", "fchmodat", "faccessat", "utimensat", "openat2"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

**Blocked Syscalls** (always denied):
- `mount`, `umount`, `umount2` - Filesystem mounting
- `pivot_root` - Root filesystem switching
- `chroot` - Change root directory
- `setns` - Namespace manipulation (unless allowed with restrictions)
- `unshare` - Namespace unsharing
- `ptrace` - Process tracing (unless allowed for debugging)
- `personality` - Execution domain switching
- `add_key`, `request_key`, `keyctl` - Kernel key management
- `bpf` - BPF programs (unless allowed for networking)
- `perf_event_open` - Performance monitoring (restricted)
- `uselib` - Shared library loading
- `init_module`, `finit_module`, `delete_module` - Kernel modules
- `reboot`, `kexec_load`, `kexec_file_load` - System restart
- `iopl`, `ioperm` - I/O port access
- `ioprio_set`, `ioprio_get` - I/O priority
- `swapoff`, `swapon` - Swap management
- `syslog` - Kernel message buffer
- `vhangup` - Terminal hangup
- `lookup_dcookie` - Disk cookie lookup
- `acct` - Process accounting
- `nfsservctl` - NFS daemon control
- `create_module`, `query_module` - Legacy module operations

#### 26.6.2 AppArmor Profile

```bash
# AppArmor profile for sandbox containers
#include <tunables/global>

profile sandbox-default flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/python>
  
  # Deny capability escalation
  deny capability sys_admin,
  deny capability sys_ptrace,
  deny capability sys_module,
  deny capability sys_rawio,
  deny capability sys_boot,
  deny capability net_admin,
  deny capability mac_admin,
  deny capability mac_override,
  deny capability mknod,
  deny capability dac_read_search,
  
  # Allow basic file access within sandbox
  /workspace/** rwk,
  /tmp/** rwk,
  /home/sandbox/** rwk,
  
  # Read-only access to system files
  /usr/** r,
  /lib/** r,
  /lib64/** r,
  /etc/ld.so.cache r,
  /etc/nsswitch.conf r,
  /etc/passwd r,
  /etc/group r,
  
  # Deny access to sensitive files
  deny /etc/shadow r,
  deny /etc/sudoers r,
  deny /root/** r,
  deny /proc/sys/** w,
  deny /sys/** w,
  deny /dev/** w,
  
  # Network access through proxy only
  network inet stream,
  network inet6 stream,
  deny network raw,
  deny network packet,
  
  # Process restrictions
  signal (send, receive) peer=sandbox-default,
  deny ptrace (read, write, trace),
  
  # Mount restrictions
  deny mount,
  deny remount,
  deny umount,
  
  # Deny module loading
  deny /lib/modules/** r,
  deny /usr/lib/modules/** r,
}
```

#### 26.6.3 Capability Dropping

```yaml
sandbox_security_context:
  capabilities:
    drop:
      - ALL  # Drop all capabilities by default
    add:
      - NET_BIND_SERVICE  # Only if binding to privileged port needed
  
  # Alternative: minimal capabilities for standard sandbox
  standard_sandbox:
    drop:
      - AUDIT_CONTROL
      - AUDIT_READ
      - AUDIT_WRITE
      - BLOCK_SUSPEND
      - BPF
      - CHECKPOINT_RESTORE
      - CHOWN
      - DAC_OVERRIDE
      - DAC_READ_SEARCH
      - FOWNER
      - FSETID
      - IPC_LOCK
      - IPC_OWNER
      - KILL
      - LEASE
      - LINUX_IMMUTABLE
      - MAC_ADMIN
      - MAC_OVERRIDE
      - MKNOD
      - NET_ADMIN
      - NET_BROADCAST
      - NET_RAW
      - PERFMON
      - SETFCAP
      - SETGID
      - SETPCAP
      - SETUID
      - SYS_ADMIN
      - SYS_BOOT
      - SYS_CHROOT
      - SYS_MODULE
      - SYS_NICE
      - SYS_PACCT
      - SYS_PTRACE
      - SYS_RAWIO
      - SYS_RESOURCE
      - SYS_TIME
      - SYS_TTY_CONFIG
      - SYSLOG
      - WAKE_ALARM
  
  no_new_privileges: true
  read_only_root_filesystem: true
  run_as_non_root: true
  allow_privilege_escalation: false
  seccomp_profile: "sandbox-restricted.json"
  apparmor_profile: "sandbox-default"
```

### 26.7 Secret Injection

#### 26.7.1 Secure Secret Delivery

Secrets are injected into sandboxes at runtime without persisting to disk:

```python
class SandboxSecretInjector:
    async def inject_secrets(
        self,
        sandbox_id: str,
        secrets: List[Secret],
        injection_method: SecretInjectionMethod
    ) -> None:
        """
        Inject secrets into a running sandbox.
        
        Methods:
        - ENV: Environment variables (visible in /proc)
        - FILE: Temporary files (mounted tmpfs)
        - MOUNT: tmpfs mount with secret files
        - API: Runtime API for secret retrieval
        """
        
        if injection_method == SecretInjectionMethod.ENV:
            # Inject as environment variables
            # Note: these are visible in /proc/<pid>/environ
            # Rotate immediately after sandbox start
            env_vars = {s.name: s.value for s in secrets}
            await self.container_runtime.set_env(sandbox_id, env_vars)
            
        elif injection_method == SecretInjectionMethod.FILE:
            # Create tmpfs mount with secret files
            # Files are in memory only, never touch disk
            for secret in secrets:
                path = f"/run/secrets/{secret.name}"
                await self.container_runtime.write_file(
                    sandbox_id, path, secret.value,
                    permissions=0o400  # Read-only by owner
                )
            
        elif injection_method == SecretInjectionMethod.API:
            # Sandbox agent provides API for secret retrieval
            # Secrets fetched on-demand, never stored in container
            await self.install_secret_agent(sandbox_id, secrets)
```

#### 26.7.2 Secret Injection Configuration

```yaml
sandbox_secret_injection:
  methods:
    environment_variables:
      enabled: true
      security_level: "medium"  # Visible in /proc
      use_for: ["non-sensitive-config"]
      masking:
        mask_in_logs: true
        mask_in_output: true
      
    secret_files:
      enabled: true
      security_level: "high"  # tmpfs, not visible to other processes
      mount_point: "/run/secrets"
      tmpfs_size: "10MB"
      permissions: "0400"
      use_for: ["api-keys", "database-credentials"]
      
    runtime_api:
      enabled: true
      security_level: "highest"  # On-demand, ephemeral
      endpoint: "unix:///run/secrets/agent.sock"
      use_for: ["high-value-secrets", "vault-tokens"]
      caching:
        max_cache_duration: "5m"
        max_cache_size: "1MB"
  
  secret_rotation:
    rotate_after_injection: true
    max_secret_lifetime: "1h"
    cleanup_on_sandbox_exit: true
```

### 26.8 Sandbox Lifecycle

#### 26.8.1 Lifecycle State Machine

```
                          +-----------+
                          |  PENDING  |
                          | (queued)  |
                          +-----+-----+
                                |
                                v
                    +-------------------------+
                    |      CREATING           |
                    | (allocating resources)  |
                    +------------+------------+
                                 |
                                 v
                    +-------------------------+
                    |      INITIALIZING       |
                    | (mounting fs, secrets)  |
                    +------------+------------+
                                 |
                                 v
                    +-------------------------+
         +--------->|       RUNNING          |<-----------+
         |          | (executing code)        |            |
         |          +------------+------------+            |
         |                       |                         |
         |          +------------+------------+            |
         |          |                         |            |
         |          v                         v            |
         |  +---------------+      +------------------+   |
         |  |  PAUSED       |      |   EXECUTING      |   |
         |  | (suspended)   |      | (active code)    |   |
         |  +-------+-------+      +--------+---------+   |
         |          |                        |             |
         |          +------------+-----------+             |
         |                       |                          |
         |          +------------v------------+             |
         |          |      COMPLETING         |             |
         |          | (collecting results)    |             |
         |          +------------+------------+             |
         |                       |                          |
         |          +------------v------------+             |
         +----------|       COMPLETED         |             |
                    | (results available)     |-------------+
                    +------------+------------+
                                 |
                                 v
                    +-------------------------+
                    |       DESTROYING        |
                    | (cleanup, wipe data)    |
                    +------------+------------+
                                 |
                                 v
                    +-------------------------+
                    |       DESTROYED         |
                    | (resources freed)       |
                    +-------------------------+

    Error Transitions:
    Any state ----> ERROR ----> DESTROYING ----> DESTROYED
```

#### 26.8.2 Lifecycle Implementation

```python
class SandboxLifecycleManager:
    async def create_sandbox(self, spec: SandboxSpec) -> Sandbox:
        """Create a new sandbox instance."""
        sandbox = Sandbox(
            id=str(uuid4()),
            status=SandboxStatus.PENDING,
            spec=spec,
            tenant_id=spec.tenant_id,
            created_at=datetime.utcnow()
        )
        
        # 1. Check resource availability
        if not await self.resources.check_available(spec):
            raise InsufficientResources()
        
        # 2. Reserve resources
        sandbox.status = SandboxStatus.CREATING
        await self.resources.reserve(sandbox.id, spec)
        
        # 3. Create container/microVM
        if spec.isolation_level == "microvm":
            container = await self.firecracker.create_vm(spec)
        else:
            container = await self.docker.create_container(spec)
        
        sandbox.container_id = container.id
        
        # 4. Initialize filesystem
        sandbox.status = SandboxStatus.INITIALIZING
        await self.filesystem.setup(sandbox)
        
        # 5. Inject secrets
        if spec.secrets:
            await self.secret_injector.inject_secrets(
                sandbox.container_id,
                spec.secrets,
                spec.secret_injection_method
            )
        
        # 6. Apply security policies
        await self.security.apply_policies(sandbox)
        
        sandbox.status = SandboxStatus.RUNNING
        sandbox.initialized_at = datetime.utcnow()
        
        # 7. Start monitoring
        await self.monitoring.start_monitoring(sandbox)
        
        # 8. Set execution timeout
        if spec.max_execution_time:
            await self.scheduler.schedule(
                task="sandbox_timeout",
                run_at=datetime.utcnow() + timedelta(seconds=spec.max_execution_time),
                payload={"sandbox_id": sandbox.id}
            )
        
        await self.audit.log_event(
            event_type="sandbox_created",
            sandbox_id=sandbox.id,
            tenant_id=sandbox.tenant_id,
            spec_summary=spec.summarize()
        )
        
        return sandbox
    
    async def destroy_sandbox(self, sandbox_id: str) -> None:
        """Destroy sandbox and clean up all resources."""
        sandbox = await self.get_sandbox(sandbox_id)
        sandbox.status = SandboxStatus.DESTROYING
        
        try:
            # 1. Stop any running processes
            await self.runtime.kill_all_processes(sandbox.container_id)
            
            # 2. Collect final logs
            logs = await self.runtime.collect_logs(sandbox.container_id)
            await self.storage.store_logs(sandbox_id, logs)
            
            # 3. Securely wipe writable layers
            await self.filesystem.wipe_workspace(sandbox)
            
            # 4. Revoke any temporary credentials
            await self.secret_injector.revoke_secrets(sandbox_id)
            
            # 5. Destroy container/VM
            if sandbox.spec.isolation_level == "microvm":
                await self.firecracker.destroy_vm(sandbox.container_id)
            else:
                await self.docker.destroy_container(sandbox.container_id)
            
            # 6. Release reserved resources
            await self.resources.release(sandbox_id)
            
            # 7. Clean up network policies
            await self.network.cleanup(sandbox_id)
            
            sandbox.status = SandboxStatus.DESTROYED
            sandbox.destroyed_at = datetime.utcnow()
            
            await self.audit.log_event(
                event_type="sandbox_destroyed",
                sandbox_id=sandbox.id,
                tenant_id=sandbox.tenant_id,
                execution_duration=(sandbox.destroyed_at - sandbox.created_at).total_seconds()
            )
            
        except Exception as e:
            sandbox.status = SandboxStatus.ERROR
            await self.audit.log_event(
                event_type="sandbox_destroy_error",
                sandbox_id=sandbox.id,
                error=str(e)
            )
            raise
```

### 26.9 Sandbox Pools

#### 26.9.1 Pool Architecture

```
+------------------------------------------------------------------+
|                    SANDBOX POOL ARCHITECTURE                      |
+------------------------------------------------------------------+
|                                                                   |
|   Per-Tenant Pool: tenant-abc123-sandbox                         |
|                                                                   |
|   +------------------+  +------------------+  +----------------+ |
|   | Warm Pool        |  | Cold Pool        |  | Active         | |
|   | (pre-warmed)     |  | (pre-created)    |  | (running)      | |
|   |                  |  |                  |  |                | |
|   | [Sandbox A-1]    |  | [Sandbox C-1]    |  | [Sandbox E-1]  | |
|   |   Ready, <100ms  |  |   Created,       |  |   Executing    | |
|   |                  |  |   <1s start      |  |                | |
|   | [Sandbox A-2]    |  | [Sandbox C-2]    |  | [Sandbox E-2]  | |
|   |   Ready, <100ms  |  |   Created,       |  |   Executing    | |
|   |                  |  |   <1s start      |  |                | |
|   +------------------+  +------------------+  +----------------+ |
|                                                                   |
|   Pool Sizing:                                                    |
|   - Warm: 2 (always ready, <100ms startup)                       |
|   - Cold: 5 (created but not initialized, <1s startup)           |
|   - Max Active: 20 (concurrent execution limit)                  |
|                                                                   |
|   Lifecycle:                                                      |
|   Destroyed -> Cold -> Warm -> Active -> Destroyed                |
|                ^       |      |                                    |
|                |       |      +-- On completion -> Cold            |
|                |       |           (recycle limit: 10 uses)       |
|                |       +-- Idle timeout -> Cold                   |
|                +-- Scale up from zero                            |
|                                                                   |
+------------------------------------------------------------------+
```

#### 26.9.2 Pool Manager

```python
class SandboxPoolManager:
    def __init__(self):
        self.warm_pools: Dict[str, asyncio.Queue] = {}
        self.active_sandboxes: Dict[str, Sandbox] = {}
        self.pool_metrics: Dict[str, PoolMetrics] = {}
    
    async def acquire_sandbox(self, tenant_id: str, spec: SandboxSpec) -> Sandbox:
        """Acquire a sandbox from the pool with minimal latency."""
        pool_key = f"{tenant_id}:{spec.base_image}:{spec.isolation_level}"
        
        # 1. Try warm pool first (<100ms acquisition)
        if pool_key in self.warm_pools:
            try:
                sandbox = self.warm_pools[pool_key].get_nowait()
                # Reset sandbox state for reuse
                await self.reset_sandbox(sandbox)
                self.active_sandboxes[sandbox.id] = sandbox
                return sandbox
            except asyncio.QueueEmpty:
                pass
        
        # 2. Try cold pool (<1s acquisition)
        cold_sandbox = await self.cold_pool.acquire(pool_key)
        if cold_sandbox:
            await self.warm_sandbox(cold_sandbox)
            self.active_sandboxes[cold_sandbox.id] = cold_sandbox
            return cold_sandbox
        
        # 3. Create new sandbox (full initialization)
        sandbox = await self.lifecycle.create_sandbox(spec)
        self.active_sandboxes[sandbox.id] = sandbox
        
        # 4. Trigger pool warming
        await self.trigger_pool_warming(tenant_id, spec)
        
        return sandbox
    
    async def release_sandbox(self, sandbox_id: str) -> None:
        """Release sandbox back to pool or destroy."""
        sandbox = self.active_sandboxes.pop(sandbox_id, None)
        if not sandbox:
            return
        
        # Check if sandbox can be recycled
        if sandbox.usage_count < MAX_SANDBOX_RECYCLES:
            # Clean and return to cold pool
            await self.clean_sandbox(sandbox)
            pool_key = f"{sandbox.tenant_id}:{sandbox.spec.base_image}"
            await self.cold_pool.release(pool_key, sandbox)
        else:
            # Max recycles reached, destroy
            await self.lifecycle.destroy_sandbox(sandbox_id)
    
    async def trigger_pool_warming(self, tenant_id: str, spec: SandboxSpec) -> None:
        """Ensure pool has sufficient warm sandboxes."""
        pool_key = f"{tenant_id}:{spec.base_image}:{spec.isolation_level}"
        current_warm = self.warm_pools.get(pool_key, asyncio.Queue()).qsize()
        target_warm = spec.pool_config.warm_pool_size
        
        while current_warm < target_warm:
            # Create new sandbox in background
            asyncio.create_task(self._warm_sandbox_async(tenant_id, spec))
            current_warm += 1
    
    async def _warm_sandbox_async(self, tenant_id: str, spec: SandboxSpec):
        """Create a warm sandbox in the background."""
        try:
            sandbox = await self.lifecycle.create_sandbox(spec)
            pool_key = f"{tenant_id}:{spec.base_image}:{spec.isolation_level}"
            if pool_key not in self.warm_pools:
                self.warm_pools[pool_key] = asyncio.Queue()
            await self.warm_pools[pool_key].put(sandbox)
        except Exception as e:
            logger.error(f"Failed to warm sandbox: {e}")
```

### 26.10 Malicious Code Defense

#### 26.10.1 Multi-Layer Defense

```
+------------------------------------------------------------------+
|                 MALICIOUS CODE DEFENSE LAYERS                     |
+------------------------------------------------------------------+
|                                                                   |
|  Layer 1: Static Analysis                                          |
|  - Import/importlib scanning for dangerous modules                 |
| - subprocess/os.system pattern detection                          |
| - Network call analysis (urllib, requests, socket)                 |
| - File system access pattern analysis                              |
| - Known malicious signature matching                               |
|                                                                   |
|  Layer 2: Syscall Filtering (seccomp-bpf)                          |
| - Predefined allowlist of safe syscalls                           |
| - Real-time syscall monitoring                                    |
| - Automatic kill on policy violation                              |
|                                                                   |
|  Layer 3: Filesystem Access Control                                |
| - Read-only root filesystem                                       |
| - Writable only in /workspace and /tmp                            |
| - No access to /proc, /sys, /dev (except allowed devices)         |
| - Path traversal prevention                                       |
|                                                                   |
|  Layer 4: Network Blocking                                         |
| - Default-deny all outbound connections                           |
| - Explicit allowlist of approved domains                          |
| - Connection rate limiting                                        |
| - Data transfer size limits                                       |
|                                                                   |
|  Layer 5: Resource Exhaustion Prevention                           |
| - CPU time limits (cgroup)                                        |
| - Memory limits (cgroup + OOM killer)                             |
| - Disk space quotas                                               |
| - File descriptor limits                                          |
| - Process count limits                                            |
|                                                                   |
|  Layer 6: Container Escape Prevention                              |
| - No privileged mode                                              |
| - No host namespace sharing                                       |
| - No host path mounts                                             |
| - No dangerous capabilities                                       |
| - AppArmor/SELinux profiles                                       |
|                                                                   |
|  Layer 7: VM-Level Isolation (Firecracker)                         |
| - Full KVM virtualization for untrusted code                      |
| - Virtualized network interface                                   |
| - Minimal attack surface (no PCI, minimal devices)                |
| - Separate kernel per sandbox                                     |
|                                                                   |
+------------------------------------------------------------------+
```

#### 26.10.2 Static Code Analysis

```python
class SandboxCodeAnalyzer:
    """Analyze code for potentially dangerous patterns before execution."""
    
    DANGEROUS_PATTERNS = {
        "process_execution": [
            r"os\.system\s*\(",
            r"subprocess\.(call|run|Popen)",
            r"exec\s*\(",
            r"eval\s*\(",
            r"__import__\s*\(",
            r"importlib\.import_module",
        ],
        "network_access": [
            r"socket\.(socket|connect)",
            r"urllib\.request\.urlopen",
            r"requests\.(get|post|put|delete)",
            r"ftplib\.",
            r"smtplib\.",
        ],
        "filesystem_dangerous": [
            r"os\.chmod\s*\(",
            r"os\.chown\s*\(",
            r"shutil\.rmtree\s*\(",
            r"os\.remove\s*\(",
            r"open\s*\([^)]*,\s*['\"]w",
        ],
        "system_access": [
            r"/etc/passwd",
            r"/etc/shadow",
            r"/proc/",
            r"/sys/",
            r"os\.environ",
            r"platform\.(uname|system)",
        ],
        "data_exfiltration": [
            r"base64\.(b64encode|encode)",
            r"urllib\.parse\.quote",
            r"json\.dumps.*urllib",
        ]
    }
    
    async def analyze(self, code: str, language: str) -> AnalysisResult:
        """Analyze code for security concerns."""
        findings = []
        risk_score = 0
        
        for category, patterns in self.DANGEROUS_PATTERNS.items():
            for pattern in patterns:
                matches = re.finditer(pattern, code, re.IGNORECASE)
                for match in matches:
                    findings.append(SecurityFinding(
                        category=category,
                        pattern=pattern,
                        line_number=code[:match.start()].count('\n') + 1,
                        severity=self.SEVERITY_MAP[category],
                        description=f"Potentially dangerous {category} pattern detected"
                    ))
                    risk_score += self.RISK_WEIGHTS[category]
        
        # Check imports
        imports = self.extract_imports(code, language)
        blocked_imports = [i for i in imports if i in self.BLOCKED_MODULES]
        
        return AnalysisResult(
            risk_score=risk_score,
            findings=findings,
            blocked_imports=blocked_imports,
            recommendation=self.get_recommendation(risk_score)
        )
```

#### 26.10.3 Runtime Threat Detection

```python
class SandboxThreatDetector:
    """Real-time threat detection for running sandboxes."""
    
    async def monitor_sandbox(self, sandbox_id: str) -> None:
        """Continuously monitor a running sandbox for threats."""
        
        while await self.is_running(sandbox_id):
            # Check syscall patterns
            syscall_stats = await self.get_syscall_stats(sandbox_id)
            
            # Detect unusual syscall patterns
            if self.is_unusual_syscall_pattern(syscall_stats):
                await self.handle_threat(
                    sandbox_id,
                    ThreatType.UNUSUAL_SYSCALLS,
                    f"Unusual syscall pattern detected: {syscall_stats}"
                )
            
            # Check network activity
            network_stats = await self.get_network_stats(sandbox_id)
            
            if network_stats.bytes_sent > BYTES_SENT_THRESHOLD:
                await self.handle_threat(
                    sandbox_id,
                    ThreatType.DATA_EXFILTRATION,
                    f"Large data transfer: {network_stats.bytes_sent} bytes"
                )
            
            if network_stats.connections_to_new_hosts > CONNECTION_THRESHOLD:
                await self.handle_threat(
                    sandbox_id,
                    ThreatType.SCANNING,
                    f"Multiple connections to new hosts"
                )
            
            # Check filesystem activity
            fs_stats = await self.get_filesystem_stats(sandbox_id)
            
            if fs_stats.files_accessed_outside_workspace > 0:
                await self.handle_threat(
                    sandbox_id,
                    ThreatType.FILESYSTEM_ESCAPE,
                    f"Access to files outside workspace: {fs_stats.files_accessed}"
                )
            
            # Check process activity
            process_stats = await self.get_process_stats(sandbox_id)
            
            if process_stats.process_count > MAX_PROCESSES:
                await self.handle_threat(
                    sandbox_id,
                    ThreatType.FORK_BOMB,
                    f"Process count exceeded: {process_stats.process_count}"
                )
            
            await asyncio.sleep(1)  # 1-second monitoring interval
    
    async def handle_threat(self, sandbox_id: str, threat_type: ThreatType, 
                           details: str) -> None:
        """Handle detected threat."""
        
        # Log threat
        await self.audit.log_security_event(
            event_type="sandbox_threat_detected",
            severity="CRITICAL",
            sandbox_id=sandbox_id,
            threat_type=threat_type.value,
            details=details
        )
        
        # Take action based on threat level
        if threat_type in [ThreatType.SANDBOX_ESCAPE, ThreatType.DATA_EXFILTRATION]:
            # Immediate termination
            await self.terminate_sandbox(sandbox_id)
            
        elif threat_type in [ThreatType.FORK_BOMB, ThreatType.RESOURCE_EXHAUSTION]:
            # Kill processes but keep sandbox for analysis
            await self.kill_all_processes(sandbox_id)
            
        # Alert security team
        await self.alerting.send_security_alert(
            title=f"Sandbox Threat: {threat_type.value}",
            details={"sandbox_id": sandbox_id, "details": details}
        )
```

### 26.11 Audit Logging

#### 26.11.1 Sandbox Audit Events

Every sandbox operation generates a detailed audit event:

```json
{
  "event_id": "evt_sb_001",
  "event_type": "sandbox_execution",
  "timestamp": "2025-06-15T10:30:00.000Z",
  "severity": "info",
  
  "sandbox": {
    "id": "sb_abc123",
    "tenant_id": "tenant_xyz789",
    "project_id": "proj_456",
    "agent_id": "agent_789",
    "isolation_level": "microvm",
    "base_image": "python-3.11:v1.0.0"
  },
  
  "execution": {
    "command": "python /workspace/main.py",
    "exit_code": 0,
    "execution_time_ms": 45230,
    "cpu_time_ms": 32100,
    "memory_peak_mb": 512,
    "output_size_bytes": 102400,
    "files_read": ["/workspace/main.py", "/workspace/data.csv"],
    "files_written": ["/workspace/output.json"],
    "network_requests": [
      {
        "destination": "pypi.org:443",
        "bytes_sent": 2048,
        "bytes_received": 4096,
        "allowed": true
      }
    ],
    "syscalls_used": ["read", "write", "open", "close", "mmap", "socket", "connect"]
  },
  
  "security": {
    "seccomp_violations": 0,
    "blocked_syscalls": [],
    "apparmor_denials": 0,
    "network_blocked_attempts": 0,
    "threats_detected": [],
    "secrets_accessed": ["API_KEY_OPENAI"]
  },
  
  "actor": {
    "user_id": "user_123",
    "agent_id": "agent_789",
    "ip_address": "10.0.1.42"
  }
}
```

#### 26.11.2 Audit Log Configuration

```yaml
sandbox_audit:
  events:
    - sandbox_created
    - sandbox_destroyed
    - sandbox_execution_started
    - sandbox_execution_completed
    - sandbox_execution_failed
    - sandbox_timeout
    - seccomp_violation
    - apparmor_denial
    - network_blocked
    - filesystem_escape_attempt
    - resource_limit_exceeded
    - secret_accessed
    - threat_detected
  
  output:
    destinations:
      - type: "kafka"
        topic: "sandbox-audit-events"
      - type: "s3"
        bucket: "agentic-platform-audit-logs"
        prefix: "sandbox/"
        format: "jsonl"
    
  retention:
    hot: "30d"      # Elasticsearch for search
    warm: "90d"     # S3 standard
    cold: "7y"      # Glacier for compliance
  
  alerting:
    real_time_events:
      - seccomp_violation
      - filesystem_escape_attempt
      - threat_detected
    alert_destinations:
      - pagerduty
      - slack_security_channel
```

### 26.12 Sandbox Configuration Examples

#### 26.12.1 Standard Sandbox (Docker + gVisor)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sandbox-abc123
  namespace: tenant-xyz789-sandbox
  labels:
    app: sandbox
    tenant.id: "xyz789"
    sandbox.type: "standard"
spec:
  runtimeClassName: gvisor  # Use gVisor runtime
  containers:
    - name: sandbox
      image: agentic-platform/sandbox-python:3.11
      command: ["/bin/sandbox-agent"]
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "2"
          memory: "4Gi"
          ephemeral-storage: "10Gi"
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        runAsGroup: 65532
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: tmp
          mountPath: /tmp
        - name: secrets
          mountPath: /run/secrets
          readOnly: true
  volumes:
    - name: workspace
      emptyDir:
        sizeLimit: 10Gi
    - name: tmp
      emptyDir:
        sizeLimit: 2Gi
    - name: secrets
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "sandbox-secrets"
```

#### 26.12.2 High-Security Sandbox (Firecracker)

```yaml
apiVersion: agentic.io/v1
kind: MicroVMSandbox
metadata:
  name: sandbox-secure-001
  namespace: tenant-xyz789-sandbox
spec:
  isolation: firecracker
  
  microvm:
    vcpus: 2
    memory_mb: 4096
    rootfs_size_gb: 10
    kernel_image: "agentic-platform/sandbox-kernel:v5.15"
    rootfs_image: "agentic-platform/sandbox-python-distroless:v3.11"
  
  network:
    mode: "filtered"
    egress_proxy: "sandbox-egress-proxy:3128"
    allowed_domains:
      - "pypi.org"
      - "github.com"
    dns_filtering: true
  
  security:
    seccomp_profile: "sandbox-restricted"
    no_new_privileges: true
    encrypted_rootfs: true
    measured_boot: true  # TPM measurement
  
  resources:
    max_execution_time: 1800
    max_output_size: "100MB"
    max_network_transfer: "50MB"
  
  secrets:
    injection_method: "runtime_api"
    secrets:
      - name: "API_KEY"
        ref: "vault://secret/data/tenant-xyz789/openai-key"
```



---

## 38. Production Hardening Checklist

### 38.1 Overview

This checklist provides a comprehensive, actionable guide for hardening the Autonomous Agentic Software Organization Platform for production deployment. Each item includes specific configuration examples, verification commands, and severity ratings. This checklist must be completed and verified before any production deployment.

**Severity Legend**:
- **[CRITICAL]**: Must be completed before production; security risk is unacceptable without this control
- **[HIGH]**: Strongly required; significant security risk if not implemented
- **[MEDIUM]**: Should be completed; moderate risk reduction
- **[LOW]**: Recommended; defense in depth enhancement

---

### 38.2 Network Hardening

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.2.1 | **VPC Isolation**: Deploy application in dedicated VPC with no default routes to public internet | [CRITICAL] | `aws ec2 describe-vpcs --vpc-id $VPC_ID` |
| 38.2.2 | **Private Subnets for Data**: All databases, caches, and message queues in private subnets with no public IP | [CRITICAL] | Verify no NAT gateway routes from data subnets |
| 38.2.3 | **Bastion Host Hardening**: All administrative access through hardened bastion hosts with MFA | [CRITICAL] | Verify `Match User` SSH config with `AuthenticationMethods publickey,keyboard-interactive` |
| 38.2.4 | **Security Groups - Default Deny**: All security groups start with deny-all; explicitly allow required traffic | [CRITICAL] | `aws ec2 describe-security-groups` - verify no wide-open rules |
| 38.2.5 | **Security Groups - Least Privilege**: Security group rules specify exact ports and CIDR ranges | [HIGH] | No `0.0.0.0/0` except port 443 to ALB |
| 38.2.6 | **Network ACLs**: Subnet-level NACLs with explicit allow/deny rules | [HIGH] | `aws ec2 describe-network-acls` |
| 38.2.7 | **VPC Flow Logs**: Flow logs enabled on all VPCs for traffic analysis | [HIGH] | `aws ec2 describe-flow-logs --filter Name=resource-id,Values=$VPC_ID` |
| 38.2.8 | **DDoS Protection**: AWS Shield Advanced or Cloudflare Magic Transit enabled | [CRITICAL] | Verify Shield subscription status |
| 38.2.9 | **Web Application Firewall**: Managed WAF rules deployed on all ingress points | [CRITICAL] | `aws wafv2 get-web-acl --name production-acl` |
| 38.2.10 | **TLS Configuration**: TLS 1.3 only, no weak cipher suites | [CRITICAL] | `nmap --script ssl-enum-ciphers -p 443 $HOST` |
| 38.2.11 | **HSTS Headers**: Strict-Transport-Security with max-age=31536000 | [HIGH] | `curl -I https://$HOST \| grep Strict-Transport-Security` |
| 38.2.12 | **Service Mesh mTLS**: All inter-service communication uses mutual TLS | [CRITICAL] | `istioctl authn tls-check $POD` |
| 38.2.13 | **Ingress Controllers**: NGINX ingress with ModSecurity and OWASP CRS | [HIGH] | Verify ModSecurity annotation on ingress |
| 38.2.14 | **API Gateway Rate Limiting**: Rate limits configured per client, per endpoint | [HIGH] | Test with load generator |
| 38.2.15 | **DNS Security**: DNSSEC enabled on all domains | [MEDIUM] | `dig +dnssec $DOMAIN` |
| 38.2.16 | **Private Link/Peering**: Internal services communicate via VPC endpoints, not public internet | [HIGH] | Verify VPC endpoint configuration |
| 38.2.17 | **Network Segmentation**: Micro-segmentation with deny-by-default between namespaces | [CRITICAL] | `kubectl get networkpolicies --all-namespaces` |
| 38.2.18 | **Egress Filtering**: All outbound traffic through explicit proxy with domain filtering | [HIGH] | Verify squid/egress proxy configuration |
| 38.2.19 | **Load Balancer Security**: Internal-facing ALBs only; no direct node exposure | [HIGH] | Verify target group security |
| 38.2.20 | **Certificate Management**: Automated certificate rotation via cert-manager | [HIGH] | `kubectl get certificates -A` |

**Network Hardening Configuration Example**:

```yaml
# NGINX Ingress with ModSecurity
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'";
    nginx.ingress.kubernetes.io/enable-modsecurity: "true"
    nginx.ingress.kubernetes.io/enable-owasp-core-rules: "true"
    nginx.ingress.kubernetes.io/modsecurity-snippet: |
      SecRuleEngine On
      SecRequestBodyAccess On
      SecRequestBodyLimit 10485760
      SecResponseBodyAccess On
      SecResponseBodyLimit 1048576
      SecAuditEngine RelevantOnly
      SecAuditLogParts ABIJDEFHZ
      SecAuditLog /var/log/modsecurity/audit.log
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.agentic-platform.io
      secretName: api-tls
  rules:
    - host: api.agentic-platform.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

---

### 38.3 Database Hardening

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.3.1 | **Encryption at Rest**: TDE enabled on all PostgreSQL instances | [CRITICAL] | `SHOW ssl;` and verify KMS key |
| 38.3.2 | **Encryption in Transit**: SSL/TLS required for all connections | [CRITICAL] | `sslmode=require` in connection strings |
| 38.3.3 | **Strong Passwords**: Database passwords generated by Vault, minimum 32 characters | [CRITICAL] | Verify Vault dynamic credentials |
| 38.3.4 | **Row-Level Security**: RLS enabled on all tenant-scoped tables | [CRITICAL] | `\d+ projects` - verify RLS policies |
| 38.3.5 | **Least Privilege Users**: Application DB user has only required permissions | [CRITICAL] | `\dp` - verify no superuser access |
| 38.3.6 | **Connection Limits**: Max connections configured and enforced | [HIGH] | `SHOW max_connections;` |
| 38.3.7 | **Audit Logging**: PostgreSQL audit extension (pgaudit) enabled | [HIGH] | `SHOW shared_preload_libraries;` |
| 38.3.8 | **Backup Encryption**: All database backups encrypted with separate key | [CRITICAL] | Verify backup encryption in AWS RDS / custom scripts |
| 38.3.9 | **Backup Retention**: Automated backups with 30-day retention minimum | [HIGH] | Verify backup schedule and retention |
| 38.3.10 | **Patch Management**: Database engine kept within 1 month of latest stable | [HIGH] | Check `SELECT version();` against latest |
| 38.3.11 | **Public Access Disabled**: No public accessibility on database instances | [CRITICAL] | `PubliclyAccessible: false` in RDS |
| 38.3.12 | **Parameter Group Security**: Secure parameter group configuration | [HIGH] | `log_connections=on`, `log_disconnections=on` |
| 38.3.13 | **Query Timeout**: Statement timeout configured to prevent runaway queries | [HIGH] | `SHOW statement_timeout;` |
| 38.3.14 | **Dead Connection Cleanup**: Idle connections cleaned up automatically | [MEDIUM] | `idle_in_transaction_session_timeout` |
| 38.3.15 | **Credential Rotation**: Database credentials rotated via Vault every 24 hours | [HIGH] | Verify Vault database engine TTL |
| 38.3.16 | **Schema Separation**: Enterprise tenants in separate schemas or databases | [HIGH] | Verify schema isolation |
| 38.3.17 | **Data Masking**: PII masked in non-production environments | [MEDIUM] | Verify masking in staging |
| 38.3.18 | **Query Monitoring**: pg_stat_statements or equivalent for query analysis | [MEDIUM] | `SELECT * FROM pg_stat_statements LIMIT 5;` |
| 38.3.19 | **Replication Security**: Streaming replication over TLS | [HIGH] | `sslmode=require` on replication connections |
| 38.3.20 | **Connection Pooling**: PgBouncer with prepared statement support | [MEDIUM] | Verify pool configuration |

**PostgreSQL Hardening Configuration**:

```sql
-- Enable and configure pgaudit
ALTER SYSTEM SET shared_preload_libraries = 'pgaudit';
ALTER SYSTEM SET pgaudit.log = 'write,ddl,role';
ALTER SYSTEM SET pgaudit.log_catalog = off;
ALTER SYSTEM SET pgaudit.log_parameter = on;
ALTER SYSTEM SET pgaudit.log_statement_once = off;

-- Connection security
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.3';
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Logging
ALTER SYSTEM SET logging_collector = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;

-- Timeout settings
ALTER SYSTEM SET statement_timeout = '60s';
ALTER SYSTEM SET lock_timeout = '10s';
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60s';
ALTER SYSTEM SET tcp_keepalives_idle = 60;
ALTER SYSTEM SET tcp_keepalives_interval = 10;
ALTER SYSTEM SET tcp_keepalives_count = 6;

-- Enable RLS on all tenant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE sandboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandboxes FORCE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation ON projects
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation ON agents
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation ON workflows
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Restrict application user
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON agents TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflows TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER USER app_user WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
```

---

### 38.4 Container Hardening

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.4.1 | **Non-Root User**: All containers run as non-root user (UID >= 65532) | [CRITICAL] | `docker inspect --format='{{.Config.User}}' $IMAGE` |
| 38.4.2 | **Read-Only Root FS**: All containers use read-only root filesystem | [CRITICAL] | `readOnlyRootFilesystem: true` in security context |
| 38.4.3 | **Distroless Base Images**: Use distroless or scratch base images | [HIGH] | Verify base image in Dockerfile |
| 38.4.4 | **Capability Dropping**: Drop ALL capabilities, add back only required | [CRITICAL] | `capabilities: drop: [ALL]` |
| 38.4.5 | **No Privilege Escalation**: `allowPrivilegeEscalation: false` | [CRITICAL] | Verify security context |
| 38.4.6 | **Seccomp Profiles**: Custom seccomp profiles applied to all containers | [HIGH] | Verify seccomp profile path |
| 38.4.7 | **AppArmor Profiles**: AppArmor profiles applied to all containers | [HIGH] | `aa-status` on nodes |
| 38.4.8 | **Resource Limits**: CPU and memory limits on all containers | [CRITICAL] | `resources.limits` defined |
| 38.4.9 | **Image Scanning**: All images scanned before deployment (Trivy/Snyk) | [CRITICAL] | Verify CI/CD scan results |
| 38.4.10 | **Image Signing**: All images signed with Cosign | [HIGH] | `cosign verify --key cosign.pub $IMAGE` |
| 38.4.11 | **No Sensitive Data in Images**: No secrets, tokens, or keys in images | [CRITICAL] | Secret scanning in CI/CD |
| 38.4.12 | **Multi-Stage Builds**: Build artifacts not present in final image | [HIGH] | Verify Dockerfile stages |
| 38.4.13 | **Image Size Minimization**: Images kept under 200MB where possible | [MEDIUM] | `docker images` |
| 38.4.14 | **SBOM Generation**: Software Bill of Materials generated per image | [HIGH] | Verify SBOM artifact in registry |
| 38.4.15 | **Container Registry Security**: Private registry with vulnerability scanning | [HIGH] | Enable Amazon ECR scanning |
| 38.4.16 | **Runtime Threat Detection**: Falco or equivalent for runtime security | [HIGH] | Verify Falco daemonset |
| 38.4.17 | **Image Pull Policy**: Always pull from registry, never use local cache | [MEDIUM] | `imagePullPolicy: Always` |
| 38.4.18 | **No Host Network**: Containers do not use host networking | [CRITICAL] | `hostNetwork: false` |
| 38.4.19 | **No Host PID**: Containers do not share host PID namespace | [CRITICAL] | `hostPID: false` |
| 38.4.20 | **Security Context Validation**: OPA/Gatekeeper policies enforce security context | [HIGH] | `kubectl get constrainttemplates` |

**Pod Security Standards (PSS) Configuration**:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-app
  namespace: production
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 65532
    runAsGroup: 65532
    fsGroup: 65532
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: agentic-platform/api:v1.2.3
      imagePullPolicy: Always
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
        seccompProfile:
          type: RuntimeDefault
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
        limits:
          cpu: "1000m"
          memory: "1Gi"
          ephemeral-storage: "5Gi"
      volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /cache
  volumes:
    - name: tmp
      emptyDir:
        sizeLimit: 1Gi
    - name: cache
      emptyDir:
        sizeLimit: 2Gi
```

---

### 38.5 Kubernetes Hardening

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.5.1 | **Pod Security Standards**: Restricted PSS enforced cluster-wide | [CRITICAL] | `kubectl label --dry-run=server --overwrite ns production pod-security.kubernetes.io/enforce=restricted` |
| 38.5.2 | **Network Policies**: Default deny-all NetworkPolicy in every namespace | [CRITICAL] | `kubectl get networkpolicies -A` |
| 38.5.3 | **RBAC - Least Privilege**: Service accounts have minimal required permissions | [CRITICAL] | `kubectl get clusterroles,roles -A` |
| 38.5.4 | **No Default Service Account**: Default service account has no permissions | [CRITICAL] | `kubectl get sa default -n $NS -o yaml` |
| 38.5.5 | **Pod Security Admission**: PSA webhook enabled and configured | [CRITICAL] | `kubectl get validatingwebhookconfigurations` |
| 38.5.6 | **Admission Controllers**: OPA Gatekeeper or Kyverno for policy enforcement | [CRITICAL] | Verify constraint templates |
| 38.5.7 | **Secrets Encryption**: etcd encryption at rest for Secrets | [CRITICAL] | `ps -ef \| grep encryption-provider-config` |
| 38.5.8 | **API Server Security**: API server accessible only from authorized CIDRs | [CRITICAL] | `--authorized-ip-ranges` on AKS/EKS/GKE |
| 38.5.9 | **Audit Logging**: Kubernetes audit log enabled with comprehensive policy | [HIGH] | `/var/log/kube-audit/audit.log` |
| 38.5.10 | **Node Hardening**: CIS-hardened node images | [HIGH] | Run kube-bench |
| 38.5.11 | **Container Runtime Security**: containerd with gVisor/Firecracker support | [HIGH] | `crictl version` |
| 38.5.12 | **Service Mesh Security**: Istio with mTLS in STRICT mode | [HIGH] | `PeerAuthentication` with `mtls: mode: STRICT` |
| 38.5.13 | **Namespace Isolation**: Each tenant in dedicated namespace | [CRITICAL] | `kubectl get ns -l tenant.id` |
| 38.5.14 | **Resource Quotas**: ResourceQuota per namespace | [HIGH] | `kubectl get resourcequota -A` |
| 38.5.15 | **Limit Ranges**: LimitRange per namespace for default resource constraints | [HIGH] | `kubectl get limitrange -A` |
| 38.5.16 | **ImagePullSecrets**: Registry authentication via imagePullSecrets | [MEDIUM] | Verify secret existence |
| 38.5.17 | **Runtime Class**: gVisor runtime class for sandbox workloads | [HIGH] | `kubectl get runtimeclass gvisor` |
| 38.5.18 | **Certificate Rotation**: Automated rotation of cluster certificates | [HIGH] | `kubeadm certs check-expiration` |
| 38.5.19 | **Control Plane Logging**: Control plane components log to central SIEM | [HIGH] | Verify CloudWatch/Stackdriver integration |
| 38.5.20 | **Cluster Autoscaler Security**: Autoscaler runs with minimal permissions | [MEDIUM] | Verify IAM role |

**OPA Gatekeeper Policy Examples**:

```yaml
# Require security context
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredsecuritycontext
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredSecurityContext
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredsecuritycontext
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.securityContext.runAsNonRoot
          msg := "Container must set runAsNonRoot: true"
        }
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.securityContext.allowPrivilegeEscalation == false
          msg := "Container must set allowPrivilegeEscalation: false"
        }
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.securityContext.capabilities.drop[_] == "ALL"
          msg := "Container must drop ALL capabilities"
        }
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.securityContext.readOnlyRootFilesystem
          msg := "Container must set readOnlyRootFilesystem: true"
        }
---
# Apply the constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredSecurityContext
metadata:
  name: require-security-context
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces: ["kube-system", "istio-system", "gatekeeper-system"]
```

---

### 38.6 Application Hardening

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.6.1 | **Input Validation**: All user inputs validated against strict schemas | [CRITICAL] | Verify OpenAPI schemas cover all endpoints |
| 38.6.2 | **Output Encoding**: All API responses properly encoded | [HIGH] | Verify Content-Type headers and JSON encoding |
| 38.6.3 | **Parameterized Queries**: No string concatenation in SQL queries | [CRITICAL] | Code review / SQL injection testing |
| 38.6.4 | **Authentication on All Endpoints**: No unauthenticated endpoints except health | [CRITICAL] | Security scan of API endpoints |
| 38.6.5 | **Authorization Checks**: Every endpoint validates authorization | [CRITICAL] | Code review / automated testing |
| 38.6.6 | **Rate Limiting**: Rate limits on all public endpoints | [HIGH] | Load testing |
| 38.6.7 | **CSRF Protection**: CSRF tokens on all state-changing operations | [HIGH] | Verify CSRF middleware |
| 38.6.8 | **CORS Configuration**: Strict CORS with explicit allowed origins | [HIGH] | Verify CORS middleware configuration |
| 38.6.9 | **Request Size Limits**: Maximum request body sizes enforced | [HIGH] | `client_max_body_size` / app-level limits |
| 38.6.10 | **Security Headers**: All security headers set on responses | [HIGH] | `curl -I` to check headers |
| 38.6.11 | **Dependency Management**: All dependencies scanned for vulnerabilities | [CRITICAL] | Snyk/Dependabot reports |
| 38.6.12 | **Error Handling**: No sensitive information in error messages | [HIGH] | Trigger errors and inspect responses |
| 38.6.13 | **Logging Sanitization**: No PII or secrets in logs | [CRITICAL] | Log review / automated scanning |
| 38.6.14 | **Session Management**: Secure session configuration | [HIGH] | Verify session cookie flags |
| 38.6.15 | **JWT Security**: Short-lived access tokens, secure token storage | [HIGH] | Verify token TTL and storage |
| 38.6.16 | **API Versioning**: API versioned to allow security updates | [MEDIUM] | `/v1/`, `/v2/` path prefixes |
| 38.6.17 | **Health Check Exposure**: Health checks expose no sensitive data | [MEDIUM] | `GET /health` response review |
| 38.6.18 | **Webhook Security**: Webhook endpoints verify signatures | [HIGH] | Verify HMAC signature validation |
| 38.6.19 | **File Upload Security**: File uploads validated, scanned, sandboxed | [CRITICAL] | Upload malicious test file |
| 38.6.20 | **Deserialization Security**: No unsafe deserialization | [CRITICAL] | Code review |

**Security Headers Configuration**:

```python
# FastAPI middleware example
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app = FastAPI()
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.agentic-platform.io"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-CSRF-Token"],
    max_age=86400
)
```

---

### 38.7 Secrets Management

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.7.1 | **Vault Deployment**: HashiCorp Vault deployed in HA with auto-unseal | [CRITICAL] | `vault status` shows HA mode |
| 38.7.2 | **No Hardcoded Secrets**: Zero hardcoded secrets in source code | [CRITICAL] | Secret scanning in CI/CD (truffleHog, git-leaks) |
| 38.7.3 | **Dynamic Database Credentials**: Database creds generated by Vault | [CRITICAL] | Verify `vault read database/creds/...` |
| 38.7.4 | **Short-Lived Credentials**: All service credentials TTL <= 1 hour | [HIGH] | Verify credential TTL |
| 38.7.5 | **Automatic Rotation**: Vault rotates credentials automatically | [HIGH] | Verify rotation schedule |
| 38.7.6 | **Encryption at Rest**: Vault storage encrypted | [CRITICAL] | Verify auto-unseal with cloud KMS |
| 38.7.7 | **Encryption in Transit**: Vault TLS with valid certificates | [CRITICAL] | `VAULT_ADDR=https://...` |
| 38.7.8 | **Audit Logging**: Vault audit log enabled | [HIGH] | `vault audit list` |
| 38.7.9 | **Access Control**: Vault ACL policies enforce least privilege | [HIGH] | `vault policy list` |
| 38.7.10 | **Secret Injection**: Secrets injected at runtime, never in env | [HIGH] | Verify Vault Agent sidecar |
| 38.7.11 | **Certificate Management**: TLS certs managed by Vault PKI | [HIGH] | `vault list pki/issue/...` |
| 38.7.12 | **Key Rotation**: Encryption keys rotated quarterly | [HIGH] | Verify key rotation schedule |
| 38.7.13 | **Secret Versioning**: Vault KV v2 with versioning enabled | [MEDIUM] | `kv-v2` mount path |
| 38.7.14 | **Emergency Seal**: Emergency seal capability documented and tested | [HIGH] | Document seal procedure |
| 38.7.15 | **Backup Testing**: Vault backup and restore tested quarterly | [HIGH] | Run restore drill |

---

### 38.8 Monitoring and Alerting

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.8.1 | **SIEM Integration**: Centralized SIEM (Splunk/Datadog) receiving all logs | [CRITICAL] | Verify log ingestion rate |
| 38.8.2 | **Security Alerting**: PagerDuty/SOps alerts for critical security events | [CRITICAL] | Trigger test alert |
| 38.8.3 | **Failed Login Monitoring**: Alerts on brute force attempts | [HIGH] | Simulate failed logins |
| 38.8.4 | **Privilege Escalation Detection**: Alerts on role changes | [HIGH] | Simulate role change |
| 38.8.5 | **Sandbox Escape Detection**: Real-time detection of escape attempts | [CRITICAL] | Test seccomp/AppArmor alerting |
| 38.8.6 | **Data Exfiltration Detection**: Alerts on unusual data transfers | [CRITICAL] | Simulate large transfer |
| 38.8.7 | **Anomaly Detection**: ML-based anomaly detection on user behavior | [HIGH] | Verify baseline established |
| 38.8.8 | **Audit Trail Completeness**: 100% of security events logged | [CRITICAL] | Log completeness audit |
| 38.8.9 | **Log Integrity**: Logs tamper-evident (signed or immutable) | [HIGH] | Verify log signing |
| 38.8.10 | **Dashboards**: Security dashboards for real-time monitoring | [HIGH] | Verify dashboard availability |
| 38.8.11 | **Runbook Documentation**: Incident response runbooks for all alert types | [HIGH] | Review runbook completeness |
| 38.8.12 | **On-Call Rotation**: 24/7 security on-call rotation established | [CRITICAL] | Verify PagerDuty schedule |

---

### 38.9 Backup and Recovery

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.9.1 | **Database Backups**: Automated daily backups with point-in-time recovery | [CRITICAL] | Verify RPO < 1 hour |
| 38.9.2 | **Backup Encryption**: All backups encrypted with AES-256 | [CRITICAL] | Verify encryption key |
| 38.9.3 | **Backup Testing**: Monthly restore testing | [CRITICAL] | Document last restore test |
| 38.9.4 | **Cross-Region Replication**: Backups replicated to secondary region | [HIGH] | Verify replica region |
| 38.9.5 | **Recovery Time Objective**: RTO <= 4 hours documented | [HIGH] | Run recovery drill |
| 38.9.6 | **Recovery Point Objective**: RPO <= 1 hour documented | [HIGH] | Measure actual RPO |
| 38.9.7 | **Disaster Recovery Plan**: DR plan documented and tested quarterly | [CRITICAL] | Review DR plan document |
| 38.9.8 | **Configuration Backups**: All infrastructure as code in version control | [HIGH] | Verify GitOps repository |
| 38.9.9 | **Secret Backups**: Vault backup with Shamir's secret sharing | [HIGH] | Verify unseal keys distribution |
| 38.9.10 | **Backup Retention**: 30-day online, 7-year archive retention | [HIGH] | Verify retention policies |

---

### 38.10 Incident Response

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.10.1 | **Incident Response Plan**: Documented IR plan with defined roles | [CRITICAL] | Review IR plan |
| 38.10.2 | **Response Time SLAs**: Severity-based response times defined | [CRITICAL] | P1: 15min, P2: 1hr, P3: 4hr, P4: 24hr |
| 38.10.3 | **Escalation Procedures**: Clear escalation paths documented | [CRITICAL] | Review escalation matrix |
| 38.10.4 | **Communication Templates**: Pre-drafted communication templates | [HIGH] | Review templates |
| 38.10.5 | **Forensic Capability**: Ability to capture and preserve forensic evidence | [HIGH] | Verify snapshot capability |
| 38.10.6 | **Quarterly Drills**: Tabletop exercises conducted quarterly | [HIGH] | Document drill dates |
| 38.10.7 | **Post-Incident Reviews**: All incidents followed by post-mortem | [HIGH] | Review recent post-mortems |
| 38.10.8 | **Law Enforcement Coordination**: Legal contacts for law enforcement coordination | [MEDIUM] | Document legal contacts |
| 38.10.9 | **Breach Notification**: GDPR/SOC2 breach notification procedures | [CRITICAL] | Review notification procedures |
| 38.10.10 | **Incident Metrics**: MTTD and MTTR tracked and reported | [MEDIUM] | Review incident metrics |

---

### 38.11 Security Testing

| # | Item | Severity | Verification |
|---|------|----------|-------------|
| 38.11.1 | **Penetration Testing**: Annual third-party penetration test | [CRITICAL] | Review latest pen test report |
| 38.11.2 | **Vulnerability Scanning**: Weekly automated vulnerability scans | [HIGH] | Verify scan schedule |
| 38.11.3 | **SAST**: Static application security testing in CI/CD | [HIGH] | Verify SAST tool in pipeline |
| 38.11.4 | **DAST**: Dynamic application security testing on staging | [HIGH] | Verify DAST tool |
| 38.11.5 | **Dependency Scanning**: All dependencies scanned continuously | [HIGH] | Verify Snyk/Dependabot |
| 38.11.6 | **Container Scanning**: All container images scanned before deploy | [CRITICAL] | Verify image scan in CI |
| 38.11.7 | **Fuzz Testing**: Fuzz testing on critical input paths | [MEDIUM] | Review fuzzing results |
| 38.11.8 | **Chaos Engineering**: Chaos testing of security controls | [MEDIUM] | Verify chaos experiments |
| 38.11.9 | **Bug Bounty**: Bug bounty program or responsible disclosure | [MEDIUM] | Verify program existence |
| 38.11.10 | **Security Regression Tests**: Automated security regression suite | [HIGH] | Review test suite |

---

## 39. SOC 2 Type II Readiness Checklist

### 39.1 Overview

This checklist provides a comprehensive guide for achieving SOC 2 Type II compliance. It maps the Trust Service Criteria (TSC) to specific controls, evidence requirements, and policy requirements. Each section includes the control objectives, specific controls, evidence to collect, and verification methods.

**SOC 2 Trust Service Criteria**:
- **Security (CC)**: Common Criteria - Required for all SOC 2 reports
- **Availability (A)**: System availability and uptime
- **Processing Integrity (PI)**: Data processing accuracy and completeness
- **Confidentiality (C)**: Data confidentiality and access control
- **Privacy (P)**: Personal information handling

---

### 39.2 Control Environment & Common Criteria

#### 39.2.1 CC1.0 - Control Environment

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC1.1 | Organization demonstrates commitment to integrity and ethical values | Board resolution, Code of Conduct signed by all employees | [ ] |
| CC1.2 | Board of Directors exercises oversight responsibility | Board meeting minutes, governance charter | [ ] |
| CC1.3 | Management establishes structures, reporting lines, and authorities | Organization chart, role definitions, delegation matrix | [ ] |
| CC1.4 | Organization demonstrates commitment to attract, develop, and retain competent individuals | HR policies, job descriptions, training records | [ ] |
| CC1.5 | Organization holds individuals accountable for internal control responsibilities | Responsibility assignments, performance reviews | [ ] |

#### 39.2.2 CC2.0 - Communication and Information

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC2.1 | Organization obtains and uses relevant information to support internal control | Information classification policy, data inventory | [ ] |
| CC2.2 | Organization internally communicates information to support internal control | Internal communication records, policy distribution logs | [ ] |
| CC2.3 | Organization communicates with external parties regarding matters affecting internal control | Customer communication records, vendor agreements | [ ] |

#### 39.2.3 CC3.0 - Risk Assessment

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC3.1 | Organization specifies objectives with sufficient clarity to enable risk identification | Security objectives document, risk appetite statement | [ ] |
| CC3.2 | Organization identifies risks to achievement of objectives | Risk register, threat modeling documentation | [ ] |
| CC3.3 | Organization considers potential for fraud | Fraud risk assessment, anti-fraud controls | [ ] |
| CC3.4 | Organization identifies and assesses changes that could impact internal control | Change management logs, impact assessments | [ ] |

#### 39.2.4 CC4.0 - Monitoring Activities

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC4.1 | Organization selects and performs ongoing evaluations to ascertain whether internal controls are present and functioning | Monitoring schedule, evaluation results | [ ] |
| CC4.2 | Organization evaluates and communicates internal control deficiencies | Deficiency tracking log, remediation plans | [ ] |

#### 39.2.5 CC5.0 - Control Activities

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC5.1 | Organization selects and develops control activities that contribute to mitigation of risks | Control activity documentation, risk-control mapping | [ ] |
| CC5.2 | Organization selects and develops general control activities over technology | IT general controls documentation | [ ] |
| CC5.3 | Organization deploys control activities through policies and procedures | Policy library, procedure documentation | [ ] |

#### 39.2.6 CC6.0 - Logical and Physical Access Controls

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC6.1 | Logical access security measures to protect against threats | Access control policy, IAM configuration | [ ] |
| CC6.2 | Prior to issuing system credentials and granting access, registration and authorization is required | User provisioning process, approval workflows | [ ] |
| CC6.3 | Access credentials are removed when terminated | Termination checklist, access revocation logs | [ ] |
| CC6.4 | Access to system components is restricted | RBAC configuration, least privilege evidence | [ ] |
| CC6.5 | Physical access to facilities is restricted | Physical security policy, access logs | [ ] |
| CC6.6 | Logical access security measures include encryption | Encryption configuration, key management policy | [ ] |
| CC6.7 | Restricts access to information and systems using encryption | TLS configuration, field-level encryption evidence | [ ] |

#### 39.2.7 CC7.0 - System Operations

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC7.1 | Detection of security events and anomalies | SIEM configuration, detection rules | [ ] |
| CC7.2 | Incident response and recovery procedures | Incident response plan, recovery testing | [ ] |
| CC7.3 | Security incident detection, response, and recovery testing | Incident logs, test results | [ ] |
| CC7.4 | System monitoring and vulnerability management | Vulnerability scan results, patch management | [ ] |
| CC7.5 | Security incident detection and response | IR procedure execution evidence | [ ] |

#### 39.2.8 CC8.0 - Change Management

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC8.1 | Change management process for system changes | Change management policy, change logs | [ ] |
| CC8.2 | Changes are authorized, tested, and approved | Change approval records, test results | [ ] |
| CC8.3 | Changes are documented and tracked | Change tickets, version control logs | [ ] |

#### 39.2.9 CC9.0 - Risk Mitigation

| Control ID | Control Description | Evidence Required | Status |
|------------|-------------------|-------------------|--------|
| CC9.1 | Vendor risk management process | Vendor risk assessments, due diligence | [ ] |
| CC9.2 | Vendor contract security requirements | Security addendums, SLAs | [ ] |

---

### 39.3 Security (Common Criteria)

| Control ID | Control Description | Implementation | Evidence |
|------------|-------------------|----------------|----------|
| SEC-001 | **Access Control Policy**: Policy defines how access is granted, reviewed, and revoked | RBAC/ABAC system with policy engine | Policy document, system configuration |
| SEC-002 | **Authentication Requirements**: Multi-factor authentication enforced for all administrative access | MFA configuration in IdP | IdP configuration screenshot |
| SEC-003 | **Password Policy**: Strong password requirements enforced | Password policy configuration | Policy document, IdP settings |
| SEC-004 | **Session Management**: Sessions timeout after period of inactivity | JWT TTL, session timeout config | Application configuration |
| SEC-005 | **Network Security**: Network segmentation and access controls implemented | VPC, security groups, network policies | Network architecture diagram |
| SEC-006 | **Encryption at Rest**: All sensitive data encrypted at rest | AES-256, database TDE, field-level encryption | Encryption configuration |
| SEC-007 | **Encryption in Transit**: All data transmitted over encrypted channels | TLS 1.3, mTLS | SSL certificate audit |
| SEC-008 | **Vulnerability Management**: Regular vulnerability scanning and remediation | Weekly scans, remediation SLA | Scan reports, remediation tickets |
| SEC-009 | **Penetration Testing**: Annual third-party penetration testing | Pen test contract, scope | Pen test report |
| SEC-010 | **Security Monitoring**: Continuous security monitoring and alerting | SIEM, detection rules | SIEM configuration |
| SEC-011 | **Incident Response**: Documented incident response procedures | IR plan, runbooks | IR plan document |
| SEC-012 | **Security Training**: Annual security awareness training | Training platform, completion records | Training records |
| SEC-013 | **Background Checks**: Background checks for employees with access | HR policy, vendor agreement | Background check policy |
| SEC-014 | **Data Classification**: Data classified by sensitivity level | Classification policy, data inventory | Classification matrix |
| SEC-015 | **Least Privilege**: Access granted on least privilege basis | RBAC configuration, access reviews | Role definitions |
| SEC-016 | **Access Reviews**: Quarterly access reviews performed | Review schedule, review results | Access review logs |
| SEC-017 | **Secure Development**: Secure SDLC followed | SDLC documentation, SAST/DAST evidence | Pipeline configuration |
| SEC-018 | **Sandbox Security**: Secure execution of untrusted code | Sandbox hardening documentation | Seccomp, AppArmor configs |
| SEC-019 | **Secret Management**: Secrets managed through Vault | Vault configuration | Vault audit logs |
| SEC-020 | **Audit Logging**: Comprehensive audit logging | Audit log configuration | Sample audit logs |

---

### 39.4 Availability

| Control ID | Control Description | Implementation | Evidence |
|------------|-------------------|----------------|----------|
| AVA-001 | **System Monitoring**: Infrastructure monitoring with alerting | Datadog/Prometheus/Grafana | Dashboard screenshots |
| AVA-002 | **Incident Response**: Availability incident procedures | IR plan with availability section | IR plan |
| AVA-003 | **Backup and Recovery**: Regular backups with tested recovery | Backup schedules, restore tests | Restore test results |
| AVA-004 | **Capacity Planning**: Capacity monitoring and planning | Capacity reports, scaling policies | Capacity planning docs |
| AVA-005 | **High Availability**: HA architecture for critical components | Multi-AZ deployment, failover | Architecture diagram |
| AVA-006 | **Disaster Recovery**: DR site and failover procedures | DR plan, DR test results | DR test report |
| AVA-007 | **Change Management**: Changes assessed for availability impact | Change control board records | Change tickets |
| AVA-008 | **Service Level Agreements**: Availability SLAs defined and tracked | SLA definitions, uptime reports | Uptime reports |
| AVA-009 | **Performance Monitoring**: Performance degradation detection | APM tooling, alert thresholds | Performance dashboards |
| AVA-010 | **Vendor Management**: Vendor availability commitments | Vendor contracts, SLA tracking | Vendor contracts |

**Availability Targets**:
- **Platform Uptime**: 99.95% (excluding scheduled maintenance)
- **API Response Time**: P95 < 500ms
- **Sandbox Startup**: P95 < 2 seconds (warm pool), P95 < 5 seconds (cold start)
- **RTO**: 4 hours
- **RPO**: 1 hour

---

### 39.5 Processing Integrity

| Control ID | Control Description | Implementation | Evidence |
|------------|-------------------|----------------|----------|
| PI-001 | **Input Validation**: All inputs validated for accuracy | Schema validation, input sanitization | Validation rules |
| PI-002 | **Processing Accuracy**: Data processing accuracy verified | Unit tests, integration tests | Test results |
| PI-003 | **Error Handling**: Errors detected, logged, and corrected | Error handling configuration | Error logs |
| PI-004 | **Data Integrity**: Data integrity maintained throughout processing | Checksums, transaction integrity | DB constraints |
| PI-005 | **Output Validation**: Outputs validated for accuracy | Output testing, regression tests | Test reports |
| PI-006 | **Workflow Validation**: Workflow executions validated | Workflow audit logs | Sample workflow logs |
| PI-007 | **Sandbox Execution Integrity**: Sandbox results are accurate and tamper-evident | Execution hashes, output signing | Execution audit |
| PI-008 | **Model Output Validation**: AI-generated outputs validated | Output validation pipeline | Validation rules |
| PI-009 | **Data Reconciliation**: Periodic data reconciliation performed | Reconciliation procedures | Reconciliation reports |
| PI-010 | **Quality Assurance**: QA process for production changes | QA checklist, release process | QA documentation |

---

### 39.6 Confidentiality

| Control ID | Control Description | Implementation | Evidence |
|------------|-------------------|----------------|----------|
| CON-001 | **Access Control**: Confidential data accessible only to authorized users | RBAC with confidentiality labels | Access control matrix |
| CON-002 | **Encryption**: Confidential data encrypted at rest and in transit | AES-256, TLS 1.3 | Encryption configurations |
| CON-003 | **Data Classification**: Confidential data identified and classified | Classification policy, data inventory | Classification records |
| CON-004 | **Confidentiality Agreements**: NDAs with employees and vendors | Signed agreements | Agreement repository |
| CON-005 | **Data Retention**: Data retained per retention policy | Retention schedule, automated deletion | Retention policy |
| CON-006 | **Data Disposal**: Secure disposal of confidential data | Disposal procedures, wipe verification | Disposal logs |
| CON-007 | **Transmission Security**: Secure transmission of confidential data | TLS, encrypted file transfer | Protocol documentation |
| CON-008 | **Third-Party Access**: Third-party access to confidential data controlled | Vendor access agreements | Vendor contracts |
| CON-009 | **Tenant Isolation**: Multi-tenant data isolation | RLS, namespace isolation | Tenant isolation tests |
| CON-010 | **Secret Handling**: Secrets and credentials handled securely | Vault, secret rotation | Secret management audit |

---

### 39.7 Privacy

| Control ID | Control Description | Implementation | Evidence |
|------------|-------------------|----------------|----------|
| PRV-001 | **Privacy Notice**: Privacy notice provided to data subjects | Privacy policy | Published privacy policy |
| PRV-002 | **Consent**: Consent obtained for data processing | Consent management system | Consent records |
| PRV-003 | **Data Minimization**: Only necessary personal data collected | Data collection assessment | Data inventory |
| PRV-004 | **Purpose Limitation**: Data used only for stated purposes | Purpose specification | Processing records |
| PRV-005 | **Right to Access**: Process for data subject access requests | DSAR process, request handling | DSAR procedure |
| PRV-006 | **Right to Rectification**: Process for correcting personal data | Data correction procedure | Correction logs |
| PRV-007 | **Right to Erasure**: Process for deleting personal data (GDPR) | Deletion procedure, retention schedule | Deletion logs |
| PRV-008 | **Right to Portability**: Process for data portability | Export functionality | Portability procedure |
| PRV-009 | **Data Processing Agreements**: DPAs with all subprocessors | Executed DPAs | DPA repository |
| PRV-010 | **Cookie Compliance**: Cookie consent and management | Cookie consent banner | Consent platform |
| PRV-011 | **Breach Notification**: Process for privacy breach notification | Breach notification procedure | Notification timeline |
| PRV-012 | **Privacy by Design**: Privacy considered in system design | Privacy impact assessments | PIA documents |
| PRV-013 | **Cross-Border Transfers**: Mechanisms for international transfers | SCCs, adequacy decisions | Transfer mechanism docs |
| PRV-014 | **Retention Limits**: Personal data retained only as long as necessary | Retention schedule | Retention policy |
| PRV-015 | **Data Subject Rights**: Process for handling all data subject rights | Rights request workflow | Request handling logs |

---

### 39.8 Evidence Collection Templates

#### 39.8.1 Access Control Evidence

```yaml
evidence_access_control:
  type: "Access Control Configuration"
  control_mapping:
    - "CC6.1"
    - "CC6.2"
    - "CC6.3"
    - "CC6.4"
    - "SEC-001"
    - "SEC-015"
    - "SEC-016"
  
  evidence_items:
    - item: "RBAC Configuration"
      description: "Role definitions and permission assignments"
      location: "OPA policies, database role tables"
      frequency: "Continuous"
      retention: "7 years"
    
    - item: "Access Review Records"
      description: "Quarterly access review results"
      location: "Access review system"
      frequency: "Quarterly"
      retention: "7 years"
    
    - item: "User Provisioning Log"
      description: "User account creation, modification, deletion"
      location: "IdP audit log, application audit log"
      frequency: "Continuous"
      retention: "7 years"
    
    - item: "Termination Checklist"
      description: "Employee termination access revocation"
      location: "HR system"
      frequency: "Per-termination"
      retention: "7 years"
    
    - item: "MFA Enrollment Report"
      description: "Users with MFA enabled"
      location: "IdP reporting"
      frequency: "Monthly"
      retention: "7 years"
```

#### 39.8.2 Change Management Evidence

```yaml
evidence_change_management:
  type: "Change Management Records"
  control_mapping:
    - "CC3.4"
    - "CC8.1"
    - "CC8.2"
    - "CC8.3"
    - "AVA-007"
  
  evidence_items:
    - item: "Change Request Tickets"
      description: "All production change requests"
      location: "Jira/ServiceNow"
      frequency: "Per-change"
      retention: "7 years"
    
    - item: "Change Approval Records"
      description: "Change approval signatures"
      location: "Change management system"
      frequency: "Per-change"
      retention: "7 years"
    
    - item: "Deployment Pipeline Logs"
      description: "CI/CD pipeline execution logs"
      location: "GitHub Actions/GitLab CI"
      frequency: "Per-deployment"
      retention: "7 years"
    
    - item: "Test Results"
      description: "Pre-deployment test results"
      location: "Test result database"
      frequency: "Per-deployment"
      retention: "7 years"
    
    - item: "Rollback Procedures"
      description: "Documented rollback procedures"
      location: "Runbook repository"
      frequency: "Per-release"
      retention: "7 years"
```

#### 39.8.3 Security Monitoring Evidence

```yaml
evidence_security_monitoring:
  type: "Security Monitoring and Incident Response"
  control_mapping:
    - "CC7.1"
    - "CC7.2"
    - "CC7.3"
    - "CC7.4"
    - "CC7.5"
    - "SEC-010"
    - "SEC-011"
  
  evidence_items:
    - item: "SIEM Configuration"
      description: "SIEM rules and alert configuration"
      location: "SIEM platform"
      frequency: "Quarterly review"
      retention: "7 years"
    
    - item: "Security Event Logs"
      description: "All security events and alerts"
      location: "SIEM, cloud provider logs"
      frequency: "Continuous"
      retention: "7 years"
    
    - item: "Incident Response Log"
      description: "Security incident tracking"
      location: "Incident management system"
      frequency: "Per-incident"
      retention: "7 years"
    
    - item: "Incident Response Test Results"
      description: "IR drill and tabletop exercise results"
      location: "Test records"
      frequency: "Quarterly"
      retention: "7 years"
    
    - item: "Vulnerability Scan Results"
      description: "Vulnerability scan reports"
      location: "Vulnerability management platform"
      frequency: "Weekly"
      retention: "7 years"
```

---

### 39.9 Policy Requirements

The following policies must be documented, approved, and communicated:

| # | Policy | Owner | Review Frequency | Approval Required |
|---|--------|-------|-----------------|-------------------|
| 39.9.1 | **Information Security Policy** | CISO | Annual | Board |
| 39.9.2 | **Access Control Policy** | CISO | Annual | CISO |
| 39.9.3 | **Password Policy** | CISO | Annual | CISO |
| 39.9.4 | **Data Classification Policy** | CISO | Annual | CISO |
| 39.9.5 | **Encryption Policy** | CISO | Annual | CISO |
| 39.9.6 | **Acceptable Use Policy** | CISO | Annual | HR + CISO |
| 39.9.7 | **Incident Response Policy** | CISO | Annual | CISO |
| 39.9.8 | **Business Continuity / Disaster Recovery Policy** | CTO | Annual | CTO |
| 39.9.9 | **Change Management Policy** | CTO | Annual | CTO |
| 39.9.10 | **Vendor Management Policy** | CISO | Annual | CISO |
| 39.9.11 | **Risk Management Policy** | CISO | Annual | Board |
| 39.9.12 | **Privacy Policy** | DPO | Annual | DPO |
| 39.9.13 | **Data Retention Policy** | DPO | Annual | DPO |
| 39.9.14 | **Secure Development Policy** | CTO | Annual | CTO |
| 39.9.15 | **Remote Access Policy** | CISO | Annual | CISO |
| 39.9.16 | **Asset Management Policy** | CISO | Annual | CISO |
| 39.9.17 | **Physical Security Policy** | CISO | Annual | CISO |
| 39.9.18 | **Personnel Security Policy** | HR + CISO | Annual | HR + CISO |
| 39.9.19 | **Communications Security Policy** | CISO | Annual | CISO |
| 39.9.20 | **Operations Security Policy** | CTO | Annual | CTO |

---

### 39.10 Monitoring Controls

#### 39.10.1 Continuous Monitoring Program

```
+------------------------------------------------------------------+
|                   CONTINUOUS MONITORING PROGRAM                    |
+------------------------------------------------------------------+
|                                                                   |
|  Monitoring Area          | Frequency    | Responsible   | Tool   |
|  -------------------------|-------------|--------------|--------|
|  Access control review    | Monthly      | Security Team | IdP    |
|  Vulnerability scanning   | Weekly       | Security Team | Trivy  |
|  Penetration testing      | Annual       | Third Party   | Vendor |
|  Security incident review | Monthly      | Security Team | SIEM   |
|  Log review               | Daily        | Security Team | Splunk |
|  User access review       | Quarterly    | Managers      | IdP    |
|  Privileged access review | Quarterly    | CISO          | Vault  |
|  Change management review | Monthly      | CTO           | Jira   |
|  Vendor risk assessment   | Annual       | Procurement   | VRMP   |
|  Backup recovery test     | Quarterly    | Platform Team | Custom |
|  DR drill                 | Quarterly    | Platform Team | Custom |
|  Policy review            | Annual       | CISO          | Docs   |
|  Security training        | Annual       | HR            | LMS    |
|  Control effectiveness    | Quarterly    | Compliance    | Audit  |
|  Key rotation verification| Monthly      | Security Team | Vault  |
|  Certificate expiration   | Weekly       | Platform Team | CM     |
|  Sandbox security audit   | Quarterly    | Security Team | Custom |
|  Tenant isolation test    | Quarterly    | Security Team | Custom |
|  Encryption key audit     | Annual       | CISO          | KMS    |
|  Code repository scan     | Per-commit   | DevOps        | SAST   |
|                                                                   |
+------------------------------------------------------------------+
```

#### 39.10.2 Control Effectiveness Assessment

| Control Category | Control | Test Method | Frequency | Last Tested | Result |
|-----------------|---------|-------------|-----------|-------------|--------|
| Access Control | RBAC enforcement | Automated testing | Monthly | - | [ ] |
| Access Control | MFA enforcement | Sample testing | Monthly | - | [ ] |
| Access Control | Account provisioning | Process walkthrough | Quarterly | - | [ ] |
| Access Control | Account deprovisioning | Sample testing | Quarterly | - | [ ] |
| Access Control | Access reviews | Document review | Quarterly | - | [ ] |
| Security | Vulnerability management | Scan review | Weekly | - | [ ] |
| Security | Penetration testing | Third-party test | Annual | - | [ ] |
| Security | Incident response | Tabletop exercise | Quarterly | - | [ ] |
| Security | Security monitoring | Alert testing | Monthly | - | [ ] |
| Security | Encryption effectiveness | Configuration review | Quarterly | - | [ ] |
| Change Mgmt | Change approval | Ticket review | Monthly | - | [ ] |
| Change Mgmt | Testing requirements | Pipeline review | Monthly | - | [ ] |
| Change Mgmt | Emergency changes | Process review | Quarterly | - | [ ] |
| Availability | Backup recovery | Recovery test | Quarterly | - | [ ] |
| Availability | DR failover | DR drill | Quarterly | - | [ ] |
| Availability | Capacity monitoring | Dashboard review | Monthly | - | [ ] |
| Processing | Input validation | Test case review | Quarterly | - | [ ] |
| Processing | Data integrity | Reconciliation test | Monthly | - | [ ] |
| Privacy | DSAR handling | Process test | Quarterly | - | [ ] |
| Privacy | Data deletion | Deletion verification | Quarterly | - | [ ] |

---

### 39.11 Incident Management

#### 39.11.1 Incident Classification

| Severity | Definition | Response Time | Escalation | Examples |
|----------|-----------|---------------|------------|----------|
| **P1 - Critical** | Active data breach, system compromise, sandbox escape | 15 minutes | Immediate executive notification | Ransomware, data exfiltration, active attack |
| **P2 - High** | Significant security event, potential data exposure | 1 hour | CISO notification within 4 hours | Vulnerability exploitation attempt, unauthorized admin access |
| **P3 - Medium** | Security anomaly, policy violation | 4 hours | Security team lead | Multiple failed logins, configuration drift |
| **P4 - Low** | Minor security event, informational | 24 hours | Weekly report | Certificate expiring, policy non-compliance |

#### 39.11.2 Incident Response Playbook Outline

1. **Detection**: Automated alerting via SIEM, manual report, threat intel
2. **Triage**: Classify severity, assign incident commander
3. **Containment**: Isolate affected systems, preserve evidence
4. **Investigation**: Root cause analysis, impact assessment
5. **Remediation**: Fix vulnerability, remove attacker access
6. **Recovery**: Restore normal operations
7. **Post-Incident**: Post-mortem, lessons learned, control improvements

---

### 39.12 Access Management

#### 39.12.1 Access Lifecycle

```
+-----------+    +----------+    +---------+    +----------+    +-----------+
|  Request  | -> |  Approve | -> | Provision| -> |  Review  | -> |  Revoke   |
|           |    |          |    |          |    |          |    |           |
| Ticket    |    | Manager  |    | Automated|    | Quarterly|    | Automated |
| submitted |    | + System |    | via IdP  |    | access   |    | on term.  |
|           |    |  owner   |    | + Vault  |    | review   |    |           |
+-----------+    +----------+    +---------+    +----------+    +-----------+
     |                                                        |
     |<-------------------- Re-certify ---------------------->|<- Orphaned
                                                              |   account
                                                              |   cleanup
```

#### 39.12.2 Access Management Controls

| Control | Implementation | Evidence |
|---------|---------------|----------|
| Unique User IDs | Each user has unique, non-transferable identity | IdP user directory |
| Strong Authentication | MFA required for all access | MFA enrollment report |
| Least Privilege | RBAC with minimum required permissions | Role definitions |
| Segregation of Duties | Critical functions require multiple approvals | Approval workflow logs |
| Access Reviews | Quarterly reviews of all access | Review completion records |
| Automated Deprovisioning | Access revoked within 1 hour of termination | Deprovisioning logs |
| Privileged Access Monitoring | Admin actions logged and alerted | Audit logs, alert rules |
| Emergency Access | Break-glass procedure for emergency access | Break-glass usage logs |

---

### 39.13 Change Management

#### 39.13.1 Change Approval Matrix

| Change Type | Approval Required | Testing Required | CAB Review |
|-------------|------------------|------------------|------------|
| Standard (low risk) | Team lead | Automated tests | No |
| Normal (medium risk) | Team lead + System owner | Full test suite | Weekly CAB |
| Emergency (critical fix) | On-call manager | Minimum tests | Post-hoc CAB |
| Major (architecture) | CTO + CISO | Full regression | Dedicated CAB |

#### 39.13.2 Change Management Evidence

- Change request tickets with risk assessment
- Test results attached to change records
- Approval signatures (electronic)
- Deployment pipeline logs
- Post-deployment validation results
- Rollback procedures documented

---

### 39.14 Vendor Management

#### 39.14.1 Vendor Risk Assessment

| Assessment Area | Questions | Risk Rating |
|----------------|-----------|-------------|
| **Security** | SOC 2? ISO 27001? Pen test results? | Critical |
| **Availability** | SLA? Uptime history? DR capability? | High |
| **Data Handling** | Data residency? Encryption? Access controls? | Critical |
| **Incident Response** | IR procedures? Notification timeline? | High |
| **Compliance** | GDPR compliance? CCPA? HIPAA? | Critical |
| **Financial** | Financial stability? Insurance? | Medium |
| **Subprocessors** | Subprocessors? Fourth-party risk? | High |

#### 39.14.2 Vendor Management Lifecycle

1. **Due Diligence**: Security questionnaire, evidence review
2. **Contract Negotiation**: Security addendum, SLA, DPA
3. **Onboarding**: Technical integration, access provisioning
4. **Ongoing Monitoring**: Annual reassessment, continuous monitoring
5. **Offboarding**: Data return/deletion, access revocation

---

### 39.15 Risk Assessment

#### 39.15.1 Risk Assessment Framework

```
Risk Score = Likelihood x Impact

Likelihood Scale:
1 - Rare (once in 5+ years)
2 - Unlikely (once in 2-5 years)
3 - Possible (once in 1-2 years)
4 - Likely (multiple times per year)
5 - Almost Certain (ongoing/continuous)

Impact Scale:
1 - Negligible (minimal operational impact)
2 - Minor (localized impact, < $10K)
3 - Moderate (significant impact, $10K-$100K, customer notification)
4 - Major (severe impact, $100K-$1M, regulatory notification)
5 - Critical (catastrophic, >$1M, major breach, business shutdown)

Risk Treatment:
Score 20-25: Immediate treatment required (P1)
Score 12-16: Treatment required within 30 days (P2)
Score 6-10:  Treatment required within 90 days (P3)
Score 1-5:   Accept or monitor (P4)
```

#### 39.15.2 Risk Register Template

| ID | Risk Description | Likelihood | Impact | Score | Treatment | Owner | Target Date | Status |
|----|-----------------|------------|--------|-------|-----------|-------|-------------|--------|
| R-001 | Sandbox escape leading to host compromise | 2 | 5 | 10 | Mitigate: gVisor/Firecracker, seccomp | CISO | Q1 2025 | [ ] |
| R-002 | Cross-tenant data leakage | 2 | 5 | 10 | Mitigate: RLS, namespace isolation | CISO | Q1 2025 | [ ] |
| R-003 | API credential compromise | 3 | 4 | 12 | Mitigate: Vault, short-lived creds | CISO | Q1 2025 | [ ] |
| R-004 | Supply chain attack via dependency | 3 | 4 | 12 | Mitigate: SBOM, dependency scanning | CTO | Q1 2025 | [ ] |
| R-005 | DDoS attack causing service unavailability | 3 | 3 | 9 | Mitigate: Cloudflare Shield, auto-scaling | CTO | Q1 2025 | [ ] |
| R-006 | Insider threat / malicious employee | 2 | 4 | 8 | Mitigate: Least privilege, monitoring | CISO | Q1 2025 | [ ] |
| R-007 | Data breach via misconfigured storage | 2 | 5 | 10 | Mitigate: Automated scanning, encryption | CISO | Q1 2025 | [ ] |
| R-008 | Regulatory non-compliance (GDPR) | 2 | 4 | 8 | Mitigate: Privacy program, DPA | DPO | Q1 2025 | [ ] |
| R-009 | Third-party vendor breach | 2 | 3 | 6 | Mitigate: Vendor risk program | CISO | Q1 2025 | [ ] |
| R-010 | Ransomware attack | 1 | 5 | 5 | Mitigate: Backup, network segmentation | CISO | Q1 2025 | [ ] |

---

### 39.16 SOC 2 Readiness Assessment

#### 39.16.1 Readiness Scorecard

```
+------------------------------------------------------------------+
|                    SOC 2 READINESS SCORECARD                       |
+------------------------------------------------------------------+
|                                                                   |
|  Trust Service Criteria | Controls | Evidence | Gaps   | Score   |
|  -----------------------|----------|----------|--------|---------|
|  Security (CC)          | 20/20    | 18/20    | 2      | 90%     |
|  Availability (A)       | 10/10    | 9/10     | 1      | 90%     |
|  Processing Integrity   | 10/10    | 8/10     | 2      | 80%     |
|  Confidentiality (C)    | 10/10    | 10/10    | 0      | 100%    |
|  Privacy (P)            | 15/15    | 12/15    | 3      | 80%     |
|  -----------------------|----------|----------|--------|---------|
|  TOTAL                  | 65/65    | 57/65    | 8      | 88%     |
|                                                                   |
|  READINESS STATUS: IN PROGRESS                                    |
|  TARGET AUDIT DATE: Q4 2025                                       |
|  BLOCKERS: 2 Critical gaps in Security, 3 in Privacy              |
|                                                                   |
+------------------------------------------------------------------+
```

#### 39.16.2 Pre-Audit Checklist

| # | Task | Responsible | Due Date | Status |
|---|------|-------------|----------|--------|
| 1 | All policies documented and approved | CISO | - | [ ] |
| 2 | All controls implemented and operational | CTO | - | [ ] |
| 3 | Evidence collection for all controls | Compliance | - | [ ] |
| 4 | Control effectiveness testing completed | Internal Audit | - | [ ] |
| 5 | Gap remediation completed | All | - | [ ] |
| 6 | Vendor risk assessments completed | Procurement | - | [ ] |
| 7 | Penetration test completed | Security Team | - | [ ] |
| 8 | Vulnerability scan clean (no critical/high) | Security Team | - | [ ] |
| 9 | Incident response procedures tested | Security Team | - | [ ] |
| 10 | DR test completed | Platform Team | - | [ ] |
| 11 | Access reviews completed | All Managers | - | [ ] |
| 12 | Background checks completed | HR | - | [ ] |
| 13 | Security awareness training completed | HR | - | [ ] |
| 14 | Third-party SOC 2 reports collected | Procurement | - | [ ] |
| 15 | Data processing agreements executed | Legal | - | [ ] |
| 16 | Audit trail completeness verified | Compliance | - | [ ] |
| 17 | Management attestation prepared | CFO | - | [ ] |
| 18 | Auditor selected and engaged | CISO | - | [ ] |
| 19 | Audit scope agreed | CISO + Auditor | - | [ ] |
| 20 | Readiness assessment report finalized | Compliance | - | [ ] |

---

*End of Security Architecture Document*

**Document Information**:
- Version: 1.0
- Total Sections: 6 (Items 13, 14, 25, 26, 38, 39)
- Lines of Documentation: ~3500+
- Last Updated: June 2025
- Next Review: Quarterly
