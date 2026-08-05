import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ShopDigitalBalanceResponse,
  ShopDigitalProductsResponse,
} from './shopdigital.types';

@Injectable()
export class ShopDigitalApiClient {
  private readonly logger = new Logger(ShopDigitalApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('SHOPDIGITAL_API_URL') ||
      'https://api.shopdigital.app'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('SHOPDIGITAL_API_KEY');
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
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `ShopDigital ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `ShopDigital API failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as T & {
        success?: boolean;
        error?: string;
      };

      if (json && typeof json === 'object' && json.success === false) {
        throw new ServiceUnavailableException(
          json.error || 'ShopDigital API returned success=false',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`ShopDigital ${path} error`, error as Error);
      throw new ServiceUnavailableException('ShopDigital API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<ShopDigitalProductsResponse>('/api/products');
  }

  getBalance() {
    return this.request<ShopDigitalBalanceResponse>('/api/balance');
  }
}
