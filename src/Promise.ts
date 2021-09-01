import { PromiseType } from "./data/PromiseType";
import {getType, isFunction, isNullOrUndefined, isObject, isString} from "./utils";

export default class Promise {
    private status: PromiseType = PromiseType.PENDING; // 保存当前Promise的状态，初始状态为PENDING
    private value: any; // 保存供then函数接收的数据
    private reason: any; // reject状态下返回的原因

    private onFulfilledCallBack: Function[] = []; // 添加到这个Promise的resolved回调
    private onRejectedCallBack: Function[] = []; // rejected回调

    constructor(asyncFunc: Function) {
        if(!isFunction(asyncFunc)) {
            throw new Error('请传入一个函数来初始化Promise');
        }

        /**
         *  每个Promise都有一对属于自己的resolve和rejected函数
         */
        const resolve = (value: any) => {
          // then的两个参数需要异步执行
          // 根据Promise A+标准 使用宏任务和微任务都可以
          // 此处使用一个比较新的标准queueMicroTask来作为微任务执行，保持和当前浏览器环境一致
          queueMicrotask(() => {
              // 此处判断体现了Promise的状态一经改变就不能再变化
              if(this.status === PromiseType.PENDING) {
                  this.status = PromiseType.FULFILLED;
                  this.value = value;
                  this.onFulfilledCallBack.forEach(callbackFunc => {
                      callbackFunc(value);
                  })
              }
          })
        }

        const rejected = (reason: any) => {
          queueMicrotask(() => {
              if(this.status === PromiseType.PENDING) {
                  this.status = PromiseType.REJECTED;
                  this.reason = reason;
                  this.onRejectedCallBack.forEach(callbackFunc => {
                      callbackFunc(reason);
                  })
              }
          })
        }

        try {
            asyncFunc(resolve, rejected);
        } catch (error: unknown) {
            rejected(error);
        }
    }


    private static executeThen(resolve, reject, executeFunc, value) {
        try {
            const fulFillRet = executeFunc(value);
            resolve(fulFillRet);
        } catch (error: unknown) {
            reject(error);
        }
    }

    /**
     *  1. then函数要返回一个新的Promise，便于链式调用
     */
    then(onFulfilled?: Function, onRejected?: Function): Promise {
        /**
         * 根据Promise A+ 标准 需要做then-值穿透
         * 即: 如果没有传入onFulfilled或传入的不是一个函数
         * 需要自己生成一个函数用于把值传递下去，便于链式调用
         */
        if(!isFunction(onFulfilled)) {
            onFulfilled = (value) => {
                return value;
            }
        }
        if(!isFunction(onRejected)) {
            onRejected = (reason) => {
                // 此处使用throw 而不是return
                throw reason;
            }
        }
        /**
         * 根据当前Promise状态来处理then调用
         */
        switch (this.status) {
            case PromiseType.FULFILLED: {
                return new Promise((resolve, reject) => {
                    Promise.executeThen(resolve, reject, onFulfilled, this.value);
                })
            }
            case PromiseType.REJECTED: {
                return new Promise((resolve, reject) => {
                    Promise.executeThen(resolve, reject, onRejected, this.reason);
                })
            }
            case PromiseType.PENDING: {
                return new Promise((resolve, reject) => {
                    this.onFulfilledCallBack.push((value: any) => {
                        Promise.executeThen(resolve, reject, onFulfilled, value);
                    });
                    this.onRejectedCallBack.push((reason: any) => {
                        Promise.executeThen(resolve, reject, onFulfilled, reason);
                    })
                })
            }
        }
    }


    /**
     * catch方法本质上是在调用then方法
     */
    catch(onRejected: Function): Promise {
        return this.then(null, onRejected);
    }

    finally(finalCallBack: Function): Promise {
        return this.then((value) => {
            return Promise.resolve(finalCallBack()).then(() => value);
        }, (reason) => {
            return Promise.resolve(finalCallBack()).then(() => { throw reason });
        })
    }

    /**
     * 参数为任何部署了Symbol.iterator的数据结构
     * 包括但不限于数组、Map、Set、TypedArray
     * 特殊情况: 字符串 字符串也是一种iterable的数据结构
     * @param promises
     */
    static all(promises: any): Promise {
        // 1. null or undefined
        if(isNullOrUndefined(promises)) {
            throw new TypeError(`请传入一个合法的参数 ${getType(promises)} is not iterable !`)
        } else if(
            isObject(promises) &&
            !(promises[Symbol.iterator] &&
            isFunction(promises[Symbol.iterator]))
        ) {
            // 2. 如果是不合法的对象 抛出错误
            throw new TypeError(`请传入一个合法的参数 object is not iterable !`);
        } else if(isString(promises)) {
            // string直接返回
            return Promise.resolve([promises]);
        }
        const promiseResponse = []; // 保存每个Promise的返回值
        let resolveCount = 0; // 记录已经Resolve的Promise数量
        return new Promise((resolve, reject) => {
            try {
                for(let i = 0; i < promises.length; i++) {
                    Promise.resolve(promises[i]).then((resp) => {
                        // 按顺序保存返回值
                        promiseResponse[i] = resp;
                        resolveCount++;
                        // 如果所有Promise都返回了 则resolve
                        if(resolveCount === promises.length) {
                            resolve(promiseResponse);
                        }
                    }).catch((reason) => {
                        // 遇到reject的整个Promise都要reject
                        reject(reason);
                    })
                }
            } catch (error: unknown) {
                // 防止对象的iterator函数不是一个合理的迭代器函数
                if(error instanceof TypeError) {
                    return Promise.reject('Result of the Symbol.iterator method is not an object')
                }
            }

        })
    }

    static race(promises: any): Promise {
        // 1. null or undefined
        if(isNullOrUndefined(promises)) {
            throw new TypeError(`请传入一个合法的参数 ${getType(promises)} is not iterable !`)
        } else if(
            isObject(promises) &&
            !(promises[Symbol.iterator] &&
            isFunction(promises[Symbol.iterator]))
        ) {
            // 2. 如果是不合法的对象 抛出错误
            throw new TypeError(`请传入一个合法的参数 object is not iterable !`);
        } else if(isString(promises)) {
            // string直接返回
            return Promise.resolve(promises);
        }
        return new Promise((resolve, reject) => {
            try {
                for(let i = 0; i < promises.length; i++) {
                    Promise.resolve(promises[i]).then((resp) => {
                        resolve(resp);
                    }).catch((reason) => {
                        reject(reason);
                    })
                }
            } catch (error: unknown) {
                // 防止对象的iterator函数不是一个合理的迭代器函数
                if(error instanceof TypeError) {
                    return Promise.reject('Result of the Symbol.iterator method is not an object')
                }
            }

        })
    }

    /**
     * 静态resolve方法 返回一个fulfilled状态的Promise
     * @param target
     */
    static resolve(target?: any): Promise {
        // 1.情况一 参数是一个Promise对象, 原封不动的返回原对象
        if(target instanceof Promise) {
            return target;
        }
        // 2.情况二 参数是一个thenable对象
        if(target.then && isFunction(target.then)) {
            return new Promise((resolve, reject) => {
                target.then(resolve, reject);
            })
        }
        // 3.情况三 参数不是thenable对象 或 根本不是对象
        // 4.情况四 不带有参数
        return new Promise((resolve) => {
            resolve(target);
        })
    }

    static reject(reason: any): Promise {
        return new Promise((resolve, reject) => {
            reject(reason);
        });
    }



}

