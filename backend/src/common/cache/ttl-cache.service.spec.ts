import { TtlCacheService } from './ttl-cache.service';

describe('TtlCacheService', () => {
  let cache: TtlCacheService;

  beforeEach(() => {
    cache = new TtlCacheService();
  });

  it('returns undefined for a cache miss', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a value', () => {
    cache.set('key', { data: 'hello' }, 60000);

    expect(cache.get('key')).toEqual({ data: 'hello' });
  });

  it('returns undefined for an expired entry', () => {
    jest.useFakeTimers();

    cache.set('key', 'value', 1000);
    expect(cache.get('key')).toBe('value');

    jest.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeUndefined();

    jest.useRealTimers();
  });

  it('has() returns true for valid entry and false for miss', () => {
    cache.set('key', 'value', 60000);

    expect(cache.has('key')).toBe(true);
    expect(cache.has('other')).toBe(false);
  });

  it('has() returns false for expired entry', () => {
    jest.useFakeTimers();

    cache.set('key', 'value', 500);
    jest.advanceTimersByTime(501);

    expect(cache.has('key')).toBe(false);

    jest.useRealTimers();
  });

  it('delete() removes an entry', () => {
    cache.set('key', 'value', 60000);
    cache.delete('key');

    expect(cache.get('key')).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    cache.set('a', 1, 60000);
    cache.set('b', 2, 60000);
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('overwrites existing entry with new value and TTL', () => {
    jest.useFakeTimers();

    cache.set('key', 'old', 1000);
    cache.set('key', 'new', 5000);

    jest.advanceTimersByTime(1001);
    expect(cache.get('key')).toBe('new');

    jest.advanceTimersByTime(4000);
    expect(cache.get('key')).toBeUndefined();

    jest.useRealTimers();
  });
});
