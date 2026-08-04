import { isLikelyMobileBrowser, LC0_LIGHT_ENGINE_OPTIONS } from '../lc0Worker';

function setNavigator(value: unknown) {
    Object.defineProperty(globalThis, 'navigator', { value, configurable: true });
}

describe('isLikelyMobileBrowser', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    afterEach(() => {
        if (originalDescriptor) Object.defineProperty(globalThis, 'navigator', originalDescriptor);
        else delete (globalThis as { navigator?: unknown }).navigator;
    });

    it('returns false when navigator is undefined (SSR)', () => {
        delete (globalThis as { navigator?: unknown }).navigator;
        expect(isLikelyMobileBrowser()).toBe(false);
    });

    it('trusts navigator.userAgentData.mobile when present', () => {
        setNavigator({ userAgentData: { mobile: true }, userAgent: 'Mozilla/5.0 (Macintosh)' });
        expect(isLikelyMobileBrowser()).toBe(true);

        setNavigator({ userAgentData: { mobile: false }, userAgent: 'Mozilla/5.0 (iPhone)' });
        expect(isLikelyMobileBrowser()).toBe(false);
    });

    it('falls back to a userAgent regex when userAgentData is absent', () => {
        setNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
        expect(isLikelyMobileBrowser()).toBe(true);

        setNavigator({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
        expect(isLikelyMobileBrowser()).toBe(true);

        setNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });
        expect(isLikelyMobileBrowser()).toBe(false);
    });
});

describe('LC0_LIGHT_ENGINE_OPTIONS', () => {
    it('requests wasm-only execution and a capped thread count', () => {
        expect(LC0_LIGHT_ENGINE_OPTIONS.executionProviders).toEqual(['wasm']);
        expect(LC0_LIGHT_ENGINE_OPTIONS.ortNumThreads).toBe(2);
    });
});
