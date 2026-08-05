import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CanbosoBalanceResponse,
  CanbosoProductsResponse,
} from './canboso.types';

@Injectable()
export class CanbosoApiClient {
  private readonly logger = new Logger(CanbosoApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('CANBOSO_API_URL') || 'https://canboso.com'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('CANBOSO_API_KEY');
  }

  private describeNetworkError(error: unknown): string {
    const err = error as {
      code?: string;
      cause?: { code?: string; message?: string };
      message?: string;
      name?: string;
    };
    const code = err?.cause?.code || err?.code || '';
    const message = err?.cause?.message || err?.message || String(error);

    if (
      code === 'UND_ERR_CONNECT_TIMEOUT' ||
      code === 'ETIMEDOUT' ||
      message.includes('timeout') ||
      message.includes('Timeout')
    ) {
      return (
        'تعذّر الاتصال بـ canboso.com:443 (انتهت مهلة الاتصال من هذه الشبكة). ' +
        'الربط جاهز وسيعمل عند توفر الوصول للخادم'
      );
    }

    if (code === 'ENOTFOUND' || message.includes('ENOTFOUND')) {
      return 'تعذّر حل نطاق canboso.com عبر DNS';
    }

    return `Canboso API is unavailable (${code || message})`;
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
          `Canboso ${path} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `Canboso API failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Canboso ${path} error`, error as Error);
      throw new ServiceUnavailableException(this.describeNetworkError(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<CanbosoProductsResponse>(
      '/api/v2/telegram-buyer/products',
    );
  }

  getBalance() {
    return this.request<CanbosoBalanceResponse>(
      '/api/v2/telegram-buyer/balance',
    );
  }
}
