import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { config } from '../config/env.config';
import { createLogger } from '../utils/logger';

const log = createLogger('ApiClient');

interface ApiClientOptions {
  baseURL?: string;
  token?: string;
  extraHeaders?: Record<string, string>;
}

/**
 * Thin HTTP client for *test setup*, not for testing the API itself.
 *
 * UI tests should create their fixtures over HTTP — seeding a user through the
 * API takes 200ms, whereas driving the signup form takes 20 seconds and
 * couples every test to a screen it is not testing.
 */
export class ApiClient {
  private context: APIRequestContext | undefined;

  constructor(private readonly options: ApiClientOptions = {}) {}

  private async ctx(): Promise<APIRequestContext> {
    if (!this.context) {
      const token = this.options.token ?? config.apiToken;
      this.context = await request.newContext({
        baseURL: this.options.baseURL ?? config.apiBaseURL,
        ignoreHTTPSErrors: config.ignoreHTTPSErrors,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...this.options.extraHeaders,
        },
      });
    }
    return this.context;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const context = await this.ctx();
    const response = await context.get(path, params ? { params } : undefined);
    return this.parse<T>(response, 'GET', path);
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    const context = await this.ctx();
    const response = await context.post(path, data === undefined ? undefined : { data });
    return this.parse<T>(response, 'POST', path);
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    const context = await this.ctx();
    const response = await context.put(path, data === undefined ? undefined : { data });
    return this.parse<T>(response, 'PUT', path);
  }

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const context = await this.ctx();
    const response = await context.patch(path, data === undefined ? undefined : { data });
    return this.parse<T>(response, 'PATCH', path);
  }

  async delete(path: string): Promise<void> {
    const context = await this.ctx();
    const response = await context.delete(path);
    if (!response.ok() && response.status() !== 404) {
      throw new Error(`DELETE ${path} failed: ${response.status()} ${await response.text()}`);
    }
  }

  /** Raw response, for callers that need headers or a non-JSON body. */
  async raw(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
  ): Promise<APIResponse> {
    const context = await this.ctx();
    return context.fetch(path, { method: method.toUpperCase(), data });
  }

  async dispose(): Promise<void> {
    await this.context?.dispose();
    this.context = undefined;
  }

  private async parse<T>(response: APIResponse, method: string, path: string): Promise<T> {
    if (!response.ok()) {
      const body = await response.text();
      log.error(`${method} ${path} failed`, {
        status: response.status(),
        body: body.slice(0, 500),
      });
      throw new Error(`${method} ${path} → ${response.status()}: ${body.slice(0, 500)}`);
    }
    const text = await response.text();
    log.debug(`${method} ${path} → ${response.status()}`);
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
