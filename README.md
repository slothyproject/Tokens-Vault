# Central Hub

Enterprise-grade Railway management platform with AI-powered automation.

## Overview

Central Hub transforms the "Dissident Token Vault" into a comprehensive Railway service management platform. It provides:

- 🔐 **Enterprise Security** - JWT authentication, AES-256-GCM encryption, rate limiting
- 🚄 **Railway Integration** - Full GraphQL API integration with retry logic
- 🧠 **AI Intelligence** - Performance analysis, cost optimization, anomaly detection
- 📊 **Real-Time Monitoring** - WebSocket-based live updates
- 🤖 **Auto-Healing** - Automated service recovery and health management
- 📱 **Modern UI** - Progressive Web App with offline support

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Railway API token

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/central-hub.git
cd central-hub

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations (if using PostgreSQL)
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/central_hub
JWT_SECRET=your-super-secret-key-min-32-chars
ENCRYPTION_MASTER_KEY=your-master-key-32-chars
RAILWAY_API_TOKEN=your-railway-token

# Optional
PORT=3000
NODE_ENV=development
OLLAMA_API_KEY=your-ollama-api-key
DISCORD_WEBHOOK_URL=your-discord-webhook
```

## API Documentation

Full API documentation is available at `/api-docs` when running the server.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new user account |
| `/api/auth/login` | POST | Authenticate and get tokens |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/services` | GET | List all services |
| `/api/services/sync` | POST | Sync with Railway |
| `/api/services/:id/deploy` | POST | Deploy service |
| `/api/services/:id/restart` | POST | Restart service |
| `/api/ai/analyze/:serviceId` | GET | Get AI insights |
| `/api/ai/predict/:serviceId` | GET | Get predictions |
| `/api/health` | GET | Health check |

### WebSocket

Connect to `/ws` for real-time updates:

```javascript
const ws = new WebSocket('wss://your-server.com/ws?token=YOUR_JWT_TOKEN');

ws.onopen = () => {
  // Subscribe to service updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    serviceId: 'your-service-id',
    channel: 'deployments'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

Current test coverage: **45+ tests passing**

## Deployment

### Docker

```bash
# Build image
docker build -t central-hub .

# Run container
docker run -p 3000:3000 --env-file .env central-hub
```

### Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm install --production`
4. Start with `npm start`

## Security Features

- ✅ JWT tokens with refresh mechanism
- ✅ AES-256-GCM encryption for credentials
- ✅ Argon2id/bcrypt password hashing
- ✅ Rate limiting (100 req/15min)
- ✅ Account lockout after 5 failed attempts
- ✅ CORS configuration
- ✅ Security headers (Helmet)
- ✅ Input validation and sanitization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Web UI     │  │  Mobile App  │  │   CLI Tool   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Express    │  │ Rate Limiter │  │   Auth MW    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   Auth   │ │ Railway  │ │    AI    │ │ WebSocket│      │
│  │ Service  │ │  Client  │ │ Engine   │ │  Server  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │PostgreSQL│ │  Redis   │ │Railway   │                   │
│  │          │ │ (Cache)  │ │  API     │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `security:` Security improvements

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@centralhub.io
- 💬 Discord: [Join our server](https://discord.gg/centralhub)
- 📖 Docs: https://docs.centralhub.io

## Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Powered by [Railway](https://railway.app/)
- AI features by [Ollama](https://ollama.com/)

---

**Central Hub v2.0.0** - Enterprise Railway Management Platform
