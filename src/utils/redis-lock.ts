import crypto from 'node:crypto';

export interface RedisLockClient {
  set(
    key: string,
    value: string,
    expiryMode: 'EX',
    ttlSeconds: number,
    condition: 'NX'
  ): Promise<string | null>;
  eval(script: string, numberOfKeys: number, key: string, token: string): Promise<unknown>;
}

type ErrorHandler = (error: unknown) => void;

const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export async function acquireRedisLock(
  client: RedisLockClient,
  key: string,
  ttlSeconds: number,
  onError: ErrorHandler = () => {}
): Promise<{ acquired: boolean; token: string }> {
  try {
    const token = crypto.randomUUID();
    const result = await client.set(key, token, 'EX', ttlSeconds, 'NX');

    return result === 'OK' ? { acquired: true, token } : { acquired: false, token: '' };
  } catch (error) {
    onError(error);
    return { acquired: false, token: '' };
  }
}

export async function releaseRedisLock(
  client: RedisLockClient,
  key: string,
  token: string,
  onError: ErrorHandler = () => {}
): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    return (await client.eval(RELEASE_LOCK_LUA, 1, key, token)) === 1;
  } catch (error) {
    onError(error);
    return false;
  }
}

export async function setRedisNx(
  client: RedisLockClient,
  key: string,
  value: string,
  ttlSeconds: number,
  onError: ErrorHandler = () => {}
): Promise<boolean> {
  try {
    return (await client.set(key, value, 'EX', ttlSeconds, 'NX')) === 'OK';
  } catch (error) {
    onError(error);
    return false;
  }
}
