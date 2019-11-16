//@ts-ignore
import profiler from './screeps-profiler';

// export {profile} from './profiler';
const USE_PROFILER = true;
export function profile(target: Function): void;
export function profile(target: object, key: string | symbol, _descriptor: TypedPropertyDescriptor<Function>): void;
export function profile(target: object | Function, key?: string | symbol,
    _descriptor?: TypedPropertyDescriptor<Function>, ): void {
    if (!USE_PROFILER) {
        return;
    }

    if (key) {
        // case of method decorator
        profiler.registerFN(target as Function, key as string);
        return;
    }

    // case of class decorator
    const ctor = target as any;
    if (!ctor.prototype) {
        return;
    }

    const className = ctor.name;
    //console.log(target, className);
    profiler.registerClass(target, className);

}
