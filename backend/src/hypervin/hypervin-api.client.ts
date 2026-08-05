import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import type {
  HyperVinBalanceResponse,
  HyperVinProductsResponse,
} from './hypervin.types';

@Injectable()
export class HyperVinApiClient {
  private readonly logger = new Logger(HyperVinApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('HYPERVIN_API_URL') || 'https://hypervin.xyz'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('HYPERVIN_API_KEY');
  }

  /** Optional IPv4/IPv6 when DNS for the hostname fails (NXDOMAIN). */
  private get apiIp() {
    return this.config.get<string>('HYPERVIN_API_IP')?.trim() || '';
  }

  private describeNetworkError(error: unknown): string {
    const err = error as {
      code?: string;
      cause?: { code?: string; message?: string };
      message?: string;
    };
    const code = err?.cause?.code || err?.code || '';
    const message = err?.cause?.message || err?.message || String(error);

    if (
      code === 'ENOTFOUND' ||
      message.includes('ENOTFOUND') ||
      message.includes('getaddrinfo')
    ) {
      return (
        'تعذّر حل نطاق hypervin.xyz عبر DNS (النطاق غير موجود حاليًا). ' +
        'اطلب من @Hylehub إصلاح DNS أو زوّد HYPERVIN_API_IP في .env'
      );
    }

    if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
      return 'انتهت مهلة الاتصال بخادم HyperVin';
    }

    return `HyperVin API is unavailable (${code || message})`;
  }

  private async requestWithIp<T>(
    path: string,
    init: RequestInit | undefined,
    ip: string,
  ): Promise<T> {
    const base = new URL(this.baseUrl);
    const url = new URL(path, this.baseUrl);
    const method = (init?.method || 'GET').toUpperCase();
    const body =
      typeof init?.body === 'string'
        ? init.body
        : init?.body
          ? String(init.body)
          : undefined;

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Host: base.hostname,
      ...(init?.headers as Record<string, string> | undefined),
    };

    const payload = await new Promise<string>((resolve, reject) => {
      const req = https.request(
        {
          host: ip,
          servername: base.hostname,
          path: `${url.pathname}${url.search}`,
          method,
          headers,
          timeout: 30_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (!res.statusCode || res.statusCode >= 400) {
              reject(
                new ServiceUnavailableException(
                  `HyperVin API failed with status ${res.statusCode}: ${text.slice(0, 200)}`,
                ),
              );
              return;
            }
            resolve(text);
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('ETIMEDOUT'));
      });
      if (body) req.write(body);
      req.end();
    });

    const json = JSON.parse(payload) as T & {
      success?: boolean;
      error?: string;
    };

    if (json && typeof json === 'object' && json.success === false) {
      throw new ServiceUnavailableException(
        json.error || 'HyperVin API returned success=false',
      );
    }

    return json;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const ip = this.apiIp;
    if (ip) {
      try {
        return await this.requestWithIp<T>(path, init, ip);
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        this.logger.error(`HyperVin ${path} IP error`, error as Error);
        throw new ServiceUnavailableException(this.describeNetworkError(error));
      }
    }

    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `HyperVin ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `HyperVin API failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as T & {
        success?: boolean;
        error?: string;
      };

      if (json && typeof json === 'object' && json.success === false) {
        throw new ServiceUnavailableException(
          json.error || 'HyperVin API returned success=false',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`HyperVin ${path} error`, error as Error);
      throw new ServiceUnavailableException(this.describeNetworkError(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<HyperVinProductsResponse>('/api/products');
  }

  getBalance() {
    return this.request<HyperVinBalanceResponse>('/api/wallet/balance', {
      method: 'POST',
      body: '{}',
    });
  }
}
