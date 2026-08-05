import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TeleShopBotAccountInfo,
  TeleShopBotBalanceData,
  TeleShopBotListResponse,
  TeleShopBotProductDto,
} from './teleshopbot.types';

@Injectable()
export class TeleShopBotApiClient {
  private readonly logger = new Logger(TeleShopBotApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('TELESHOPBOT_API_URL') ||
      'https://teleshopbot.com/api/gemini-18months-links-shop/bots/6a0f0aaae2a8b6c3616d1a8b/v1'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('TELESHOPBOT_API_KEY');
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
          `TeleShopBot ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `TeleShopBot API failed with status ${response.status}`,
        );
      }

      const json = (await response.json()) as T & {
        success?: boolean;
        error?: string;
      };

      if (json && typeof json === 'object' && json.success === false) {
        throw new ServiceUnavailableException(
          json.error || 'TeleShopBot API returned success=false',
        );
      }

      return json;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`TeleShopBot ${path} error`, error as Error);
      throw new ServiceUnavailableException('TeleShopBot API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<TeleShopBotListResponse<TeleShopBotProductDto[]>>(
      '/products',
    );
  }

  getBalance() {
    return this.request<TeleShopBotListResponse<TeleShopBotBalanceData>>(
      '/account/balance',
    );
  }

  getAccountInfo() {
    return this.request<TeleShopBotListResponse<TeleShopBotAccountInfo>>(
      '/account/info',
    );
  }
}
