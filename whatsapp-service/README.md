# OneZap WhatsApp Service

Serviço que gerencia conexões WhatsApp usando Baileys para o OneZap SaaS.

## Arquitetura

```
┌─────────────────────┐     ┌──────────────────────┐
│   Frontend (Web)    │────▶│  Firebase Functions  │
└─────────────────────┘     └──────────────────────┘
         │                           │
         │ WebSocket                 │ HTTP
         ▼                           ▼
┌─────────────────────────────────────────────────┐
│           WhatsApp Service (Cloud Run)          │
│  ┌─────────────┐  ┌───────────────────────────┐ │
│  │   Express   │  │     Baileys Manager       │ │
│  │   + WS      │  │  (Multi-instance Baileys) │ │
│  └─────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│    Firestore DB     │
└─────────────────────┘
```

## Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- Docker (opcional)

### Setup

```bash
cd whatsapp-service

# Instalar dependências
npm install

# Criar diretório de sessões
mkdir sessions

# Rodar em desenvolvimento
npm run dev
```

### Com Docker

```bash
# Build
docker-compose build

# Rodar
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## API Endpoints

### Health Check

```
GET /health
```

### Conectar WhatsApp

```
POST /instances/:instanceId/connect
Body: { userId: "firebase-uid" }
Response: { status: "connecting" | "already_connected" }
```

### Desconectar

```
POST /instances/:instanceId/disconnect
Body: { userId: "firebase-uid" }
```

### Status

```
GET /instances/:instanceId/status
Response: { connected: boolean, status: string, phoneNumber: string | null }
```

### Enviar Mensagem

```
POST /instances/:instanceId/send
Body: { userId: "firebase-uid", to: "5511999999999", message: "Olá!" }
```

## WebSocket Events

Conectar: `ws://localhost:8080/ws?instanceId=xxx`

### Eventos recebidos

- `qr` - QR code para escanear
- `connection` - Status da conexão
- `message` - Nova mensagem recebida

## Deploy Cloud Run

```bash
# Build e push para GCR
gcloud builds submit --tag gcr.io/onezap-saas/whatsapp-service

# Deploy
gcloud run deploy whatsapp-service \
  --image gcr.io/onezap-saas/whatsapp-service \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --memory 512Mi \
  --cpu 1
```

## Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| PORT | Porta do servidor | 8080 |
| NODE_ENV | Ambiente | development |
| FIREBASE_PROJECT_ID | ID do projeto Firebase | onezap-saas |
| LOG_LEVEL | Nível de log | info |
| SESSIONS_DIR | Diretório de sessões | /app/sessions |
