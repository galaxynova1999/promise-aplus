import Promise from './Promise';

export function resolved(value: any) {
  return Promise.resolve(value);
}

export function rejected(value: any) {
  return Promise.reject(value);
}

export function deferred() {
  const defer: Record<string, any> = {};
  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
}
