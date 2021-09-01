export function isFunction(func: any) {
    return typeof func === 'function'
}

// 判断是否是对象
export function isObject(target: any) {
    return getType(target) === 'object';
}

export function getType(target: any) {
    return typeof target;
}

export function isString(target: any) {
    return getType(target) === 'string';
}

export function isNullOrUndefined(target: any) {
    return target === null ||
           target === undefined;
}
