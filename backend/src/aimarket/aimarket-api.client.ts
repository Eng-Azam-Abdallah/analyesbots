import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiMarketBalanceResponse,
  AiMarketProductsResponse,
} from './aimarket.types';

@Injectable()
export class AiMarketApiClient {
  private readonly logger = new Logger(AiMarketApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('AIMARKET_API_URL') ||
      'https://api.ai-market.store/api/v1'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('AIMARKET_API_KEY');
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
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `AiMarket ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `AiMarket API failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as T & {
        code?: string;
        error?: string;
        success?: boolean;
      };

      if (
        json &&
        typeof json === 'object' &&
        'success' in json &&
        json.success === false
      ) {
        throw new ServiceUnavailableException(
          json.error || json.code || 'AiMarket API returned success=false',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`AiMarket ${path} error`, error as Error);
      throw new ServiceUnavailableException('AiMarket API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<AiMarketProductsResponse>('/products');
  }

  getBalance() {
    return this.request<AiMarketBalanceResponse>('/balance');
  }
}
