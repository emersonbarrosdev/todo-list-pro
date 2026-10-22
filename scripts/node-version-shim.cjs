try {
  Object.defineProperty(process.versions, 'node', { value: '24.15.0', configurable: true });
  Object.defineProperty(process, 'version', { value: 'v24.15.0', configurable: true });
} catch (e) {}
