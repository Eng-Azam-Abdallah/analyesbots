import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ZoomStooreBalanceResponse,
  ZoomStooreProductsResponse,
} from './zoomstoore.types';

@Injectable()
export class ZoomStooreApiClient {
  private readonly logger = new Logger(ZoomStooreApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('ZOOMSTOORE_API_URL') ||
      'https://api.zooomstoore.online/api/v1'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('ZOOMSTOORE_API_KEY');
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
          // Cloudflare on ZoomStoore blocks default undici signatures (1010).
          'User-Agent':
            'Mozilla/5.0 (compatible; AnalyesMonitor/1.0; +https://github.com/Eng-Azam-Abdallah/analyesbots)',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `ZoomStoore ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `ZoomStoore API failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`ZoomStoore ${path} error`, error as Error);
      throw new ServiceUnavailableException('ZoomStoore API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<ZoomStooreProductsResponse>('/products');
  }

  getBalance() {
    return this.request<ZoomStooreBalanceResponse>('/balance');
  }
}
