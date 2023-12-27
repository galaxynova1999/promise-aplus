enum PromiseStatus {
  PENDING,
  FULFILLED,
  REJECTED,
}

type resolveFunc<T = any> = (value: T) => void;

type rejectFunc = (reason: any) => void;

export type PromiseCallBack = {
  resolve: resolveFunc;
  reject: rejectFunc;
  onFulfilled: resolveFunc | undefined;
  onRejected: rejectFunc | undefined;
};

function isFunction(func: unknown): func is Function {
  return typeof func === 'function';
}

const isObject = (value: any): value is Object =>
  Object.prototype.toString.call(value) === '[object Object]';

const isThenable = (thenable: any): boolean =>
  (isFunction(thenable) || isObject(thenable)) && 'then' in thenable;

export default class Promise<T = any> {
  private status: PromiseStatus = PromiseStatus.PENDING;

  // @ts-ignore
  private value: T;

  private onFulfilledCallBack: Array<PromiseCallBack> = [];

  private onRejectedCallBack: Array<PromiseCallBack> = [];

  constructor(executor: (onFulfill: resolveFunc, onReject: resolveFunc) => void) {
    const onCurrentPromiseFulfilled = (result: T) => {
      this.status = PromiseStatus.FULFILLED;
      this.value = result;
      queueMicrotask(() => {
        this.handlePromiseTransition();
      });
    };

    const onCurrentPromiseRejected = (result: T) => {
      this.status = PromiseStatus.REJECTED;
      this.value = result;
      queueMicrotask(() => {
        this.handlePromiseTransition();
      });
    };

    let stateTransitioned = false;

    const resolve = (value: T) => {
      if (stateTransitioned) {
        return;
      }
      stateTransitioned = true;
      // resolve的情况 要进行解析
      Promise.tryPromiseResolutionProcedure(
        value,
        this,
        onCurrentPromiseFulfilled,
        onCurrentPromiseRejected,
      );
    };

    const reject = (value: T) => {
      if (stateTransitioned) {
        return;
      }
      stateTransitioned = true;
      onCurrentPromiseRejected(value);
    };

    try {
      executor(resolve, reject);
    } catch (error: any) {
      reject(error);
    }
  }

  private handleSinglePromiseTransition(status: PromiseStatus, callback: PromiseCallBack) {
    const { resolve, reject, onFulfilled, onRejected } = callback;
    if (status === PromiseStatus.FULFILLED) {
      try {
        // 2.2.7.1 如果onFulfilled不是函数，那么promise2必须以promise1的value被fulfilled
        // 2.2.7.2 如果onRejected不是函数，那么promise2必须以promise1的reason被rejected
        isFunction(onFulfilled) ? resolve(onFulfilled(this.value)) : resolve(this.value);
      } catch (error: unknown) {
        reject(error);
      }
    } else {
      try {
        isFunction(onRejected) ? resolve(onRejected(this.value)) : reject(this.value);
      } catch (error: unknown) {
        reject(error);
      }
    }
  }

  private handlePromiseTransition() {
    if (this.status === PromiseStatus.FULFILLED) {
      this.onFulfilledCallBack.forEach((callback) => {
        this.handleSinglePromiseTransition(PromiseStatus.FULFILLED, callback);
      });
      this.onFulfilledCallBack = [];
    } else if (this.status === PromiseStatus.REJECTED) {
      this.onRejectedCallBack.forEach((callback) => {
        this.handleSinglePromiseTransition(PromiseStatus.REJECTED, callback);
      });
      this.onRejectedCallBack = [];
    }
  }

  private static tryPromiseResolutionProcedure(
    thenReturn: any,
    thenPromise: Promise,
    resolve: resolveFunc,
    reject: resolveFunc,
  ) {
    if (thenReturn === thenPromise) {
      reject(new TypeError('can not return self in promise.then'));
      return;
    }
    if (thenReturn instanceof Promise) {
      thenReturn.then(resolve, reject);
      return;
    }
    if (isThenable(thenReturn)) {
      // let pending = true;
      try {
        // 只能读一次
        const then = thenReturn.then;
        if (isFunction(then)) {
          // TODO why?
          // then.call(
          //   thenReturn,
          //   (result: any) => {
          //     if (pending) {
          //       pending = false;
          //       resolve(result);
          //     }
          //   },
          //   (reason: any) => {
          //     if (pending) {
          //       pending = false;
          //       reject(reason);
          //     }
          //   },
          // );
          // queueMicrotask(() => {
          //   if (pending) resolve(thenReturn);
          // });
          // return;
          return new Promise(then.bind(thenReturn)).then(resolve, reject);
        }
      } catch (e) {
        // if (!pending) return;
        reject(e);
        return;
      }
    }

    resolve(thenReturn);
  }

  then(onFulfilled?: resolveFunc, onRejected?: resolveFunc): Promise {
    return new Promise((resolve, reject) => {
      const callback = {
        resolve,
        reject,
        onFulfilled,
        onRejected,
      };
      if (this.status !== PromiseStatus.PENDING) {
        queueMicrotask(() => {
          this.handleSinglePromiseTransition(this.status, callback);
        });
      } else {
        this.onFulfilledCallBack.push(callback);
        this.onRejectedCallBack.push(callback);
      }
    });
  }

  /**
   * catch方法本质上是在调用then方法
   */
  catch(onRejected: resolveFunc): Promise {
    return this.then(undefined, onRejected);
  }

  finally(finalCallBack: Function): Promise {
    return this.then(
      (value) => {
        return Promise.resolve(finalCallBack()).then(() => value);
      },
      (reason) => {
        return Promise.resolve(finalCallBack()).then(() => {
          throw reason;
        });
      },
    );
  }

  /**
   * 静态resolve方法 返回一个fulfilled状态的Promise
   * @param target
   */
  static resolve(target?: unknown): Promise {
    // 1.情况一 参数是一个Promise对象, 原封不动的返回原对象
    if (target instanceof Promise) {
      return target;
    }
    // 2.情况二 参数是一个thenable对象
    if (typeof target === 'object' && isFunction((target as any).then)) {
      return new Promise((resolve, reject) => {
        (target as any).then(resolve, reject);
      });
    }
    // 3.情况三 参数不是thenable对象 或 根本不是对象
    // 4.情况四 不带有参数
    return new Promise((resolve) => {
      resolve(target);
    });
  }

  static reject(reason: any): Promise {
    return new Promise((resolve, reject) => {
      reject(reason);
    });
  }
}
