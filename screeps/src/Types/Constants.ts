export const CONSTRUCTIONSTORAGE = -100000;


export const TERMINAL_HELPLIM = 2e4;
export const TERMINAL_STORE = 5e4;
export const TERMINAL_MIN_STORAGE = 5e4;
export const Terminal_Min_Trade = 1e3;


export const Controler_AllowedDef = 500;

export interface IReaction {
    r: ResourceConstant,
    needs: ResourceConstant[],
    reacts?: string[],
}
export const REACTION_CHAIN: { [name: string]: IReaction } = {
    /*....*/
    UL: { r: "UL", needs: ["U", "L"] },
    ZK: { r: "ZK", needs: ["Z", "K"] },
    G: { r: "G", needs: ["ZK", "UL"], reacts: ["GO", "GH"] },//nuclear and base min
    GO: { r: "GO", needs: ["G", "O"], reacts: ["GHO2"] },
    GH: { r: "GH", needs: ["G", "H"], reacts: ["GH2O"] },
    GH2O: { r: "GH2O", needs: ["GH", "OH"], reacts: ["XGH2O"] },
    GHO2: { r: "GHO2", needs: ["GO", "OH"], reacts: ["XGHO2"] },
    XGH2O: { r: "XGH2O", needs: ["GH2O", "X"] },
    XGHO2: { r: "XGHO2", needs: ["GHO2", "X"] },
    UO: { r: "UO", needs: ["U", "O"] },//200% harvest speed
    LH: { r: "LH", needs: ["L", "H"] },//repair/build 50%
    OH: { r: "OH", needs: ["O", "H"], reacts: ["UH2O", "UHO2", "ZH2O", "ZHO2", "KH2O", "KHO2", "LH2O", "LHO2", "GH2O", "GHO2"] },
    Z: { r: "Z", needs: [] },
    K: { r: "K", needs: [] },
    U: { r: "U", needs: [] },
    L: { r: "L", needs: [] },
    H: { r: "H", needs: [] },
    O: { r: "O", needs: [] },
    X: { r: "X", needs: [] },
}

export const BOOSTING = 1;
export const UNBOSTING = 2;
export const REACTION = 10;
