import { Injectable, NestMiddleware, Logger, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '@/modules/v1/business/entities/business.entity';
import { RequestContext } from '../context/request-context';

/** Subdomains reserved for env (staging, testing). Stripped so tenant is resolved from business subdomain only. */
const RESERVED_SUBDOMAINS = ['staging', 'testing', 'dev'];

/**
 * Middleware to extract subdomain from request and set tenant context
 * This enables automatic database routing based on subdomain
 */
@Injectable()
export class SubdomainTenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SubdomainTenantMiddleware.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {

      // Extract hostname from request
      let hostname = req.hostname;

      if (!hostname) {
        return next();
      }

      // Strip reserved segments (e.g. business.staging.template.io → business.template.io) so tenant = business
      hostname = this.normalizeHostnameForTenant(hostname);

      // Extract subdomain from normalized hostname
      const subdomain = this.extractSubdomain(hostname);


      if (!subdomain) {
        // No subdomain, continue with main domain (no tenant context)
        return next();
      }

      // Look up business by subdomain
      const business = await this.businessRepository.findOne({
        where: { subdomain: subdomain.toLowerCase() },
        select: ['id', 'tenantId', 'subdomain'],
      });


      if (!business || !business.tenantId) {
        // Business not found or no tenantId, continue without tenant context
        this.logger.warn(`Business not found for subdomain: ${subdomain}`);
        throw new BadRequestException('Business not found');
      }

      // Set tenant context in request object for easy access
      (req as any).tenantId = business.tenantId;
      (req as any).businessId = business.id;
      (req as any).subdomain = subdomain;

      // Set tenant context in RequestContext for async operations
      RequestContext.set('tenantId', business.tenantId);
      RequestContext.set('businessId', business.id);
      RequestContext.set('subdomain', subdomain);

      this.logger.debug(
        `Subdomain tenant context set: subdomain=${subdomain}, tenantId=${business.tenantId}`,
      );

      next();
    } catch (error) {
      this.logger.error(
        `Error setting subdomain tenant context: ${error.message}`,
        error.stack,
      );
      // Continue without tenant context on error
      next();
    }
  }

  /**
   * Remove reserved subdomain segments so tenant is resolved by business subdomain only.
   * e.g. business.staging.template.io → business.template.io, business.testing.template.io → business.template.io
   */
  private normalizeHostnameForTenant(hostname: string): string {
    const lower = hostname.toLowerCase();
    const parts = lower.split('.');
    const filtered = parts.filter(
      (part) => !RESERVED_SUBDOMAINS.includes(part),
    );
    return filtered.join('.');
  }

  /**
   * Extract subdomain from hostname
   * e.g., 'mygym.example.com' -> 'mygym'
   */
  private extractSubdomain(hostname: string): string | null {
    if (!hostname) {
      return null;
    }

    // Remove protocol (http:// or https://) if present
    let cleanedHostname = hostname.toLowerCase();
    cleanedHostname = cleanedHostname.replace(/^https?:\/\//, '');

    // Remove port if present
    const hostWithoutPort = cleanedHostname.split(':')[0];

    // If it's just localhost or IP address, return null
    if (
      hostWithoutPort === 'localhost' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)
    ) {
      return null;
    }

    // Split by dots
    const parts = hostWithoutPort.split('.');

    // Support for localhost subdomains (e.g., 'subdomain.localhost')
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0]; // Return the subdomain part
    }

    // If it has 2 or fewer parts, it's the main domain (no subdomain)
    if (parts.length <= 2) {
      return null;
    }

    // If it starts with 'www.', treat as main domain
    if (parts[0] === 'www' && parts.length === 3) {
      return null;
    }

    // Extract subdomain (first part before the main domain)
    return parts[0];
  }
}
