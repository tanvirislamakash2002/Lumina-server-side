export const toNumber = (value: any): number => {
    return typeof value === 'bigint' ? Number(value) : value;
};

export const convertBigIntInObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(convertBigIntInObject);
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            result[key] = convertBigIntInObject(obj[key]);
        }
        return result;
    }
    return obj;
};