import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const routePrefixes: Record<string, string> = {
  'auth.routes.ts': '/auth',
  'user.routes.ts': '/users',
  'dashboard.routes.ts': '/dashboard',
  'transaction.routes.ts': '/transactions',
  'fund-application.routes.ts': '/fund-applications',
  'cash-bill.routes.ts': '/cash-bills',
  'payment-account.routes.ts': '/payment-accounts',
  'labels.routes.ts': '/labels',
  'bendahara.routes.ts': '/bendahara',
  'cron.routes.ts': '/cron',
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function normalizePath(value: string): string {
  const normalized = value.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function executableOperations(repositoryRoot: string): string[] {
  const routeDirectory = path.join(repositoryRoot, 'src', 'routes');
  const operations: string[] = [];
  const routePattern = /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/gi;

  for (const [filename, prefix] of Object.entries(routePrefixes)) {
    const source = fs.readFileSync(path.join(routeDirectory, filename), 'utf8');

    for (const match of source.matchAll(routePattern)) {
      const suffix = match[2] === '/' ? '' : match[2];
      operations.push(`${match[1].toUpperCase()} ${normalizePath(`${prefix}${suffix}`)}`);
    }
  }

  return operations.sort();
}

function documentedOperations(repositoryRoot: string): string[] {
  const document = yaml.load(
    fs.readFileSync(path.join(repositoryRoot, 'openapi.yaml'), 'utf8')
  ) as {
    paths?: Record<string, Record<string, unknown>>;
  };
  const operations: string[] = [];

  for (const [routePath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) {
        operations.push(`${method.toUpperCase()} ${normalizePath(routePath)}`);
      }
    }
  }

  return operations.sort();
}

describe('OpenAPI route parity', () => {
  it('documents every executable route with the same HTTP method', () => {
    const repositoryRoot = process.cwd();
    const executable = executableOperations(repositoryRoot);
    const documented = documentedOperations(repositoryRoot);

    expect(documented).toEqual(executable);
  });
});
