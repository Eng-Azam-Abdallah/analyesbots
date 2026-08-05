import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TelegramBuyerBalanceResponse,
  TelegramBuyerProductsResponse,
} from './telegrambuyer.types';

@Injectable()
export class TelegramBuyerApiClient {
  private readonly logger = new Logger(TelegramBuyerApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('TELEGRAM_BUYER_API_URL') ||
      'http://15.235.133.206:55033'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('TELEGRAM_BUYER_API_KEY');
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
          `TelegramBuyer ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `Telegram Buyer API failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`TelegramBuyer ${path} error`, error as Error);
      throw new ServiceUnavailableException(
        'Telegram Buyer API is unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<TelegramBuyerProductsResponse>(
      '/api/telegram-buyer/products',
    );
  }

  getBalance() {
    return this.request<TelegramBuyerBalanceResponse>(
      '/api/telegram-buyer/balance',
    );
  }
}
