本项目是一个Promise A+ 规范的实现

### 什么是Promise A+ 规范
具体请参考 [Promises/A+](https://promisesaplus.com/)

### 核心点
1. Promise的构造函数
   * 参数必须是一个函数（入口处判断），函数应接收resolve和reject两个参数
   * 每个Promise构造函数内都应该包含两个独立的resolve和reject函数(可以声明在原型上，但是独立声明会更好)
   * resolve和reject被执行时应该放入微任务队列中执行，这是因为在目前的浏览器环境中就是这么实现的
     ，代码中我使用的是queueMicroTask这个比较的新的API，除此之外还可以使用MutationObserver和Node环境下的
     process.nextTick
     
     需要注意的是在Promise A+标准中并没有规定then的执行必须是微任务，只要求是异步执行就可以，原文如下：
     >Here “platform code” means engine, environment, and promise implementation code. 
      In practice, this requirement ensures that onFulfilled and onRejected execute asynchronously, after the event loop turn in which then is called, and with a fresh stack.
      This can be implemented with either a “macro-task” mechanism such as setTimeout or setImmediate, or with a “micro-task” mechanism such as MutationObserver or process.nextTick
   * 在resolve和reject函数执行之前需要判断当前状态是否为PENDING，是的话才能改变状态，
     此处体现的是Promise的状态一经变化就不能再改变
   * resolve函数和reject函数主要作用就是在遍历调用使用then注册的回调函数
    
2. then方法
   * then方法需要挂载在原型上，因为每个Promise对象都有then方法
   * then方法接收两个函数参数，分别为onFulfilled和onRejected，如果这两个参数有任何一个不为函数，需要我们
     手动生成一个临时函数，临时函数的作用就是把当前值传递下去, 解决下面这种`值透传`的问题(Promise A+标准)
     ``` javascript
     new Promise((resolve) => resolve('something'))
     .then()
     .then()
     .then((value) => console.log(value))
     ```
   * then函数的主要执行逻辑是返回一个Promise, Promise内执行：
       * 当前状态是FULFILLED或REJECTED, 直接用`this.value`或`this.reason`去分别执行传入的两个回调，得到结果后
         resolve返回的这个Promise
       * 当前状态是PENDING, 则我们不清楚这个Promise会resolve还是reject，所以我们需要把两个回调都存入到对应的回调数组中
         存储起来，等待Promise状态改变再依次去执行回调
         
3. catch方法  
   catch方法本质上就是在调用then方法，把回调传入then的第二个参数，依状态执行或保存起来，无特殊含义。  
   但是catch函数可以捕获之前then方法中抛出的错误，所以我们应该优先使用catch方法来捕获错误而不是then的第二个参数  
   
4. finally方法  
   * finally方法也是在调用then方法，不同的是需要将finally回调同时存入then的两个参数，因为不清楚Promise的状态会如何变化
   而finally方法无论什么情况总要被执行
   * 回调在执行时，需要先使用静态resolve方法转化finally回调的运行结果，然后再在then中`return`或者`throw`结果  
   
  
5. 静态all方法 - 返回Promise
   * all方法会等待一组Promise全部resolve然后以数组的方式返回值，或者是其中一个Promise reject之后reject整个Promise 
   * all方法在一般的实现中都默认传入一个数组，然后判断参数是不是数组来抛出错误入参
     但是，根据目前浏览器ES6的实现，all方法可以接收一切部署了`Symbol.iterator`的数据结构，包括但不限于数组、Map、Set、TypedArray等
     这些数据结构的特点是都可以使用统一的`for...of`语法来遍历
   * 需要注意的是，字符串也是一种可遍历的数据结构，如果是字符串，直接返回[[String]]  
   * 使用一个数组来保存所有Promise的结果， 使用for循环加上let-i来把对应的resolve结果存到对应的位置上，
     即：返回的数组里面的结果的顺序需要和传入的Promise的顺序相同
   * 每一个promise在被挂载then方法之前，都需要先调用静态resolve方法转化为Promise
    
6. 静态race方法 - 返回Promise
   * race方法会在一组Promise中对比，有任意一个Promise发生状态改变，都会立即导致返回的Promise的状态变化
   * 接收的参数类型和all方法一致
    
7. 静态resolve和reject方法
   * 接收任意参数，返回一个FULFILL或REJECTED状态的Promise
   * 参数是一个Promise对象, 原封不动的返回原对象
   * 参数是一个thenable对象，即具有then方法的对象，调用他的then方法，向then方法中传入Promise内定义的resolve和reject两个方法
   * 其他情况 返回一个resolve或reject了参数的Promise
    


     
