# VPS deployment (CoffeeBot)

The canonical Git checkout is `/home/chatgpt-ops/projects/coffeebot/repo` and the running app is staged at `/home/chatgpt-ops/projects/coffeebot/app` on the existing VPS.

## Production components

- **Application:** user service `coffeebot.service`, listening only on 127.0.0.1:4173
- **HTTPS:** user service `coffeebot-caddy.service`, with host `coffeebot.95-216-184-214.sslip.io`
- **Source:** private GitHub repository on `main`; never embed GitHub access tokens
- **Persistent state:** `private/data/state.json`, outside Git, written atomically
- **Daily backups:** `coffeebot-backup.timer`, 14-day retention in `backups/`. **These remain on the same VPS** and do not survive total disk loss
- **Secrets:** private, owner-only environment file, excluded from Git and the frontend
- **AI:** Claude Messages API, structured output for evidence assessment, citations checked server-side, diagnostics for rejected and downgraded records
- **Production limits:** discovery and paid AI request limits; demo reset endpoints disabled

The VPS starts with a fresh state: no imported partners, assessments, handovers or outreach records, and no fictional demonstration partners. This does not erase the user's laptop data.

## Release and rollback

Run tests from the Git checkout with Node.js 24 on the PATH: `npm ci` then `npm test`. Copy verified source files into the staging app without overwriting ignored `data/`, `node_modules/` or the private configuration. Restart only the CoffeeBot user service, verify `GET /api/health`, then check HTTPS and a complete staff workflow. Verify persistence across application restarts and restore from a parsed JSON backup.

Caddy requires `cap_net_bind_service=ep` for ports 80 and 443, and inbound firewall permission. Do not modify existing SSH or laptop-relay services and ports.

## Security and operational caveats

There is no authentication by user choice. A private-looking URL is not access control, and any public visitor may access state or change records. Treat this as a demonstration without confidential personal data. In-process API limits reset after a service restart; a stronger persistent quota and login are recommended for extended external access. Arrange an off-VPS backup before using the system for real partner operations.
