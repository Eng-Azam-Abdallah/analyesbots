import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  QamifyBalanceResponse,
  QamifyPingResponse,
  QamifyProductsResponse,
} from './qamify.types';

@Injectable()
export class QamifyApiClient {
  private readonly logger = new Logger(QamifyApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('QAMIFY_API_URL') || 'https://api.qamify.site'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('QAMIFY_API_KEY');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Qamify ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `Qamify API failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as T & {
        ok?: boolean;
        error?: string;
        code?: string;
      };

      if (json && typeof json === 'object' && json.ok === false) {
        throw new ServiceUnavailableException(
          json.error || json.code || 'Qamify API returned ok=false',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Qamify ${path} error`, error as Error);
      throw new ServiceUnavailableException('Qamify API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getPing() {
    return this.request<QamifyPingResponse>('/v1/ping');
  }

  getProducts() {
    return this.request<QamifyProductsResponse>('/v1/products');
  }

  getBalance() {
    return this.request<QamifyBalanceResponse>('/v1/balance');
  }
}
