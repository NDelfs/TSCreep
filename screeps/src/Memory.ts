export function wrap(iMemory: any, iTag: string, iDef: any): any {
    if (!iMemory[iTag]) {
        iMemory[iTag] = _.clone(iDef);
    }
    return iMemory[iTag];
}
