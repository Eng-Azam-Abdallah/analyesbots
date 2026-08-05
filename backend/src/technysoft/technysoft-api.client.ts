import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TechnySoftMeResponse,
  TechnySoftProductDto,
} from './technysoft.types';

@Injectable()
export class TechnySoftApiClient {
  private readonly logger = new Logger(TechnySoftApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('TECHNYSOFT_API_URL') ||
      'https://api.technysoft.com'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('TECHNYSOFT_API_KEY');
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
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `TechnySoft ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `TechnySoft API failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`TechnySoft ${path} error`, error as Error);
      throw new ServiceUnavailableException('TechnySoft API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getMe() {
    return this.request<TechnySoftMeResponse>('/v1/me');
  }

  getProducts() {
    return this.request<TechnySoftProductDto[]>('/v1/products');
  }
}
