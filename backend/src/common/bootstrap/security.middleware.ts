import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as hpp from 'hpp';
import * as compression from 'compression';
import { csrf } from './csrf';

export function setupSecurity(app: INestApplication, configService: ConfigService) {
  // Security middleware
  const cookieSecret = configService.get('app.cookieSecret');
  app.use(cookieParser(cookieSecret));
  app.use(csrf());
  app.use((req, res, next) => {
    // Skip helmet for static file requests (uploads) to avoid CORS issues
    if (req.path.startsWith('/uploads') || req.path.startsWith('/public')) {
      return next();
    }

    // SRS WHEP/WebRTC server for connect-src (frontend may use publicHost IP or hostname)
    const srsPublicHost = configService.get<string>('srs.publicHost') ?? req.hostname;
    const srsPublicApiPort = configService.get<number>('srs.publicApiPort') ?? 1985;
    const srsPublicHttpPort = configService.get<number>('srs.publicHttpPort') ?? 8080;
    const srsConnectSrc = [
      "'self'",
      `http://${srsPublicHost}:${srsPublicApiPort}`,
      `https://${srsPublicHost}:${srsPublicApiPort}`,
      `http://${srsPublicHost}:${srsPublicHttpPort}`,
      `https://${srsPublicHost}:${srsPublicHttpPort}`,
      `http://${req.hostname}:${srsPublicApiPort}`,
      `https://${req.hostname}:${srsPublicApiPort}`,
    ];

    // Allow Bull Board to be framed, restrict other routes
    if (req.path.startsWith('/bull-board')) {
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://js.stripe.com'],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", req.protocol + "://" + req.get('host')],
            connectSrc: srsConnectSrc,
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            frameAncestors: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        hidePoweredBy: true,
      })(req, res, next);
    } else {
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://js.stripe.com'],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:","blob:", req.protocol + "://" + req.get('host'), "http://localhost:3000",
              "http://*.localhost:3000", "https://staging.template.io", "https://*.staging.template.io"],
            connectSrc: srsConnectSrc,
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            frameAncestors: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false, // Disable to allow CORS for static files
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
        hidePoweredBy: true,
      })(req, res, next);
    }
  });
  app.use(hpp());
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Allow Bull Board to be embedded in iframes
    if (req.path.startsWith('/bull-board')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    } else {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  app.use(compression());
}
