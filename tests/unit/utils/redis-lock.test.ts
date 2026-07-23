import { describe, expect, it } from 'bun:test';
import {
  acquireRedisLock,
  releaseRedisLock,
  setRedisNx,
  type RedisLockClient,
} from '@/utils/redis-lock';

class FakeRedisLockClient implements RedisLockClient {
  private readonly values = new Map<string, string>();
  shouldThrow = false;

  async set(
    key: string,
    value: string,
    _expiryMode: 'EX',
    _ttlSeconds: number,
    _condition: 'NX'
  ): Promise<string | null> {
    if (this.shouldThrow) throw new Error('Redis unavailable');
    if (this.values.has(key)) return null;

    this.values.set(key, value);
    return 'OK';
  }

  async eval(
    _script: string,
    _numberOfKeys: number,
    key: string,
    token: string
  ): Promise<unknown> {
    if (this.shouldThrow) throw new Error('Redis unavailable');
    if (this.values.get(key) !== token) return 0;

    this.values.delete(key);
    return 1;
  }
}

describe('Redis lock algorithm', () => {
  it('uses a UUID fencing token and prevents a second acquisition', async () => {
    const redis = new FakeRedisLockClient();
    const first = await acquireRedisLock(redis, 'lock:bill:1', 10);
    const second = await acquireRedisLock(redis, 'lock:bill:1', 10);

    expect(first.acquired).toBe(true);
    expect(first.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(second).toEqual({ acquired: false, token: '' });
  });

  it('does not release a lock owned by another fencing token', async () => {
    const redis = new FakeRedisLockClient();
    const lock = await acquireRedisLock(redis, 'lock:bill:2', 10);

    expect(await releaseRedisLock(redis, 'lock:bill:2', 'wrong-token')).toBe(false);
    expect((await acquireRedisLock(redis, 'lock:bill:2', 10)).acquired).toBe(false);
    expect(await releaseRedisLock(redis, 'lock:bill:2', lock.token)).toBe(true);
    expect((await acquireRedisLock(redis, 'lock:bill:2', 10)).acquired).toBe(true);
  });

  it('sets an NX value only once', async () => {
    const redis = new FakeRedisLockClient();

    expect(await setRedisNx(redis, 'lock:job', 'one', 10)).toBe(true);
    expect(await setRedisNx(redis, 'lock:job', 'two', 10)).toBe(false);
  });

  it('fails closed when Redis operations throw', async () => {
    const redis = new FakeRedisLockClient();
    redis.shouldThrow = true;

    expect(await acquireRedisLock(redis, 'lock:bill:3', 10)).toEqual({
      acquired: false,
      token: '',
    });
    expect(await releaseRedisLock(redis, 'lock:bill:3', 'token')).toBe(false);
    expect(await setRedisNx(redis, 'lock:job', 'token', 10)).toBe(false);
  });
});
