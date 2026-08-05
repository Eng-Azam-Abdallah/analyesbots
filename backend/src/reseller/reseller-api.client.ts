import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ResellerBalanceResponse,
  ResellerProductsResponse,
} from './reseller.types';

@Injectable()
export class ResellerApiClient {
  private readonly logger = new Logger(ResellerApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.getOrThrow<string>('RESELLER_API_URL').replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('RESELLER_API_KEY');
  }

  private async request<T>(
    action: string,
    init?: RequestInit & { searchParams?: Record<string, string> },
  ): Promise<T> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    if (init?.searchParams) {
      for (const [key, value] of Object.entries(init.searchParams)) {
        url.searchParams.set(key, value);
      }
    }

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
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Reseller API ${action} failed: ${response.status} ${body}`,
        );
        throw new ServiceUnavailableException(
          `Reseller API ${action} failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`Reseller API ${action} error`, error as Error);
      throw new ServiceUnavailableException(
        `Reseller API ${action} is unavailable`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<ResellerProductsResponse>('products');
  }

  getBalance() {
    return this.request<ResellerBalanceResponse>('balance');
  }
}
