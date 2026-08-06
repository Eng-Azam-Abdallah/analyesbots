import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  EmStoreBalanceResponse,
  EmStoreProductsResponse,
} from './emstore.types';

@Injectable()
export class EmStoreApiClient {
  private readonly logger = new Logger(EmStoreApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('EMSTORE_API_URL') ||
      'https://ssondigitalworks.online/api/reseller'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('EMSTORE_API_KEY');
  }

  private async request<T>(
    action: string,
    init?: RequestInit,
  ): Promise<T> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);

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
          `EmStore ${action} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `EmStore API failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as T & {
        ok?: boolean;
        error?: string;
      };

      if (json && typeof json === 'object' && json.ok === false) {
        throw new ServiceUnavailableException(
          json.error || 'EmStore API returned ok=false',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`EmStore ${action} error`, error as Error);
      throw new ServiceUnavailableException('EmStore API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<EmStoreProductsResponse>('products');
  }

  getBalance() {
    return this.request<EmStoreBalanceResponse>('balance');
  }
}
