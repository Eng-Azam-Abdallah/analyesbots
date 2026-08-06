import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  InsightXBalanceResponse,
  InsightXProductsResponse,
} from './insightx.types';

@Injectable()
export class InsightXApiClient {
  private readonly logger = new Logger(InsightXApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('INSIGHTX_API_URL') ||
      'https://insightxstore-bot-production.up.railway.app'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('INSIGHTX_API_KEY');
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
          `InsightX ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `InsightX API failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`InsightX ${path} error`, error as Error);
      throw new ServiceUnavailableException('InsightX API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<InsightXProductsResponse>('/api/v1/products');
  }

  getBalance() {
    return this.request<InsightXBalanceResponse>('/api/v1/balance');
  }
}
