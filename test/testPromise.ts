const MyPromise = require('./Promise').default;
require('mocha');
const expect = require('chai').expect;
const promiseFunc = new MyPromise((resolve, reject) => {
    resolve(1);
})
const promiseFunc_o = new Promise((resolve, reject) => {
    resolve(1);
})
const promiseFunc_1 = new MyPromise((resolve, reject) => {
    resolve(2);
})
// 1. 测试非法构造函数
describe('构造函数测试', () => {
    it('非法入参应该报错', () => {
        try {
            new MyPromise()
        } catch (err) {
            expect(err.message).to.be.equal('请传入一个函数来初始化Promise');
        }
    });
})

// 2. 测试then非法
describe('then方法测试', () => {
    it('then正确接收resolve结果', function () {
        promiseFunc.then((r) => {
            expect(r).to.be.equal(1);
        })
    });
    it('then透传', function () {
        promiseFunc.then().then().then((r) => {
            expect(r).to.be.equal(1);
        })
        promiseFunc_o.then().then().then((r) => {
            expect(r).to.be.equal(1);
        })
    });
})

// 3. 测试all方法
describe('all方法测试', () => {
    it('正确接收结果', function () {
        MyPromise.all([promiseFunc, promiseFunc_1]).then((resp) => {
            expect(resp[0]).to.equal(1);
            expect(resp[1]).to.equal(2);
        })
    });
    it('all特殊参数-字符串', function () {
        MyPromise.all('a').then((r) => {
            expect(r).to.be.a('array');
            expect(r[0]).to.be('a');
        })
        Promise.all('a').then((r) => {
            expect(r).to.be.a('array');
            expect(r[0]).to.be('a');
        })
    });
    it('all 非法参数 报错', function () {
        try {
            MyPromise.all(undefined)
        } catch (err) {
            expect(err.message).to.be.equal('请传入一个合法的参数 undefined is not iterable !');
        }

    });
    it('all 不可迭代对象 报错', function () {
        try {
            MyPromise.all({
                [Symbol.iterator]: () => {

                }
            })
        } catch (err) {
            expect(err.message).to.be.equal('');
        }

    });
})

//4. 测试静态resolve方法
describe('测试静态resolve方法', () => {
    it('传入promise', function () {
        const promise = new MyPromise((resolve => resolve(1) ));
        const promise_o = new Promise((resolve => resolve(1)));
        expect(MyPromise.resolve(promise)).to.be.not.equal(new MyPromise((resolve => resolve(1))));
        expect(MyPromise.resolve(promise)).to.be.equal(promise);
        expect(Promise.resolve(promise_o)).to.be.not.equal(new Promise((resolve => resolve(1))));
        expect(Promise.resolve(promise_o)).to.be.equal(promise_o);
    });
    it('传入thenable', function () {
        const a = {
            then: (resolve, reject) => {
                resolve(2);
            }
        }
        MyPromise.resolve(a).then((r) => {
            expect(r).to.be.equal(2);
        })
        Promise.resolve(a).then((r) => {
            expect(r).to.be.equal(2);
        })
    });
    it('任意参数', function () {
        MyPromise.resolve(3).then((r) => {
            expect(r).to.be.equal(3);
        })
    });
})
