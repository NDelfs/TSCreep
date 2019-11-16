declare const require: (module: string) => any;
declare var global: any;

declare namespace NodeJS {
    interface Global {
        PishiMaster: IPishiMaster;
    }
}


interface IPishiMaster {
    refresh(): void;
    ticksAlive: number;
}

declare var PishiMaster: IPishiMaster;
