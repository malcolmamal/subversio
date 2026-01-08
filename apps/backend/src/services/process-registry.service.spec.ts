import { ProcessRegistry } from './process-registry.service';

describe('ProcessRegistry', () => {
  let registry: ProcessRegistry;

  beforeEach(() => {
    registry = new ProcessRegistry();
  });

  it('should register and deregister tasks', () => {
    registry.registerTask('1');
    expect(registry.isTaskActive('1')).toBe(true);
    expect(registry.getActiveCount()).toBe(1);

    registry.deregisterTask('1');
    expect(registry.isTaskActive('1')).toBe(false);
    expect(registry.getActiveCount()).toBe(0);
  });

  it('should return false for unknown tasks', () => {
    expect(registry.isTaskActive('unknown')).toBe(false);
  });
});
