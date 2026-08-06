import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  VexoranBalanceResponse,
  VexoranProductsResponse,
} from './vexoran.types';

@Injectable()
export class VexoranApiClient {
  private readonly logger = new Logger(VexoranApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (
      this.config.get<string>('VEXORAN_API_URL') ||
      'https://eismrrkygprctnwxmkbw.supabase.co/functions/v1/reseller-api'
    ).replace(/\/$/, '');
  }

  private get apiKey() {
    return this.config.getOrThrow<string>('VEXORAN_API_KEY');
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
          `Vexoran ${action} failed: ${response.status} ${body.slice(0, 300)}`,
        );
        throw new ServiceUnavailableException(
          `Vexoran API failed with status ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Vexoran ${action} error`, error as Error);
      throw new ServiceUnavailableException('Vexoran API is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  getProducts() {
    return this.request<VexoranProductsResponse>('products');
  }

  getBalance() {
    return this.request<VexoranBalanceResponse>('balance');
  }
}
