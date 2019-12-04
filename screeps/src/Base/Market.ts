import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { Colony, resourceRequest } from "Colony"
import * as C from "Types/Constants";
import { REACTION_CHAIN, IReaction, Terminal_Min_Trade } from "Types/Constants"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
interface overflowBalance {
    A: number;
    P: string;
}

interface underflowBalance {
    R: ResourceConstant;
    A: number;
    P: string;
}

interface sendTrans {

}

function countResources(colonies: { [name: string]: Colony }): { [name: string]: number } {
    let ret: { [name: string]: number } = {};
    for (let col in colonies) {
        let colony = colonies[col];
        let storage = colony.room.storage;
        let terminal = colony.room.terminal;
        if (storage && terminal) {
            let keys = Object.keys(storage.store)
            for (let key of keys) {
                ret[key] = (ret[key] | 0) + storage.store[key as ResourceConstant];
            }
            let tKeys = Object.keys(terminal.store);
            for (let key of tKeys) {
                ret[key] = (ret[key] | 0) + terminal.store[key as ResourceConstant];
            }
        }
    }
    return ret;
}

export const BaseMineral = ["H","O","U","K","L","Z","X"];

const OVERFLOW_THRESHOLD = 3000;
const OVERFLOW_INTERNALTRADE = 3000;
const OVERFLOW_EXTERNALTRADE = 50000;
const UNDERFLOW_EXTERNALTRADE = 10000;
const UNDERFLOW_THRESHOLD = 2000;
export class Market {
    colonies: { [name: string]: Colony };

    constructor(iColonies: { [name: string]: Colony }) {
        this.colonies = iColonies;
    }

    public run(): void {
        if (Game.time % 10 != 2)
            return;
        try {
            let globalRes = countResources(this.colonies);
            let overflow: { [R: string]: overflowBalance[] } = {};
            let underflow: underflowBalance[] = [];
            let buyOrder: { [key: string]: string } = {}; //name for one of the colonies needing the resource
            for (let roomID in this.colonies) {
                let terminal = this.colonies[roomID].room.terminal;
                if (terminal == null)
                    continue;

                let keys = Object.keys(terminal.store) as ResourceConstant[];
                for (let key of keys) {
                    let res = terminal.store[key] || 0;

                    if ((key != RESOURCE_ENERGY && res > OVERFLOW_THRESHOLD) || (key == RESOURCE_ENERGY && res > C.TERMINAL_MIN_STORAGE)) {
                        if (overflow[key] == null)
                            overflow[key] = [];
                        overflow[key].push({ A: res, P: roomID });
                    }
                }

                if (terminal.store.energy < C.TERMINAL_HELPLIM) {
                    underflow.push({ R: RESOURCE_ENERGY, A: C.TERMINAL_HELPLIM * 1.25 - terminal.store.energy, P: roomID });
                }

                for (let req of this.colonies[roomID].resourceExternal) {
                    if ((globalRes[req]|0) + Terminal_Min_Trade < UNDERFLOW_EXTERNALTRADE && REACTION_CHAIN[req].needs.length == 0) {
                        buyOrder[req] = roomID;
                        console.log("added buy order", req, roomID);
                    }

                    let res = terminal.store[req] || 0;
                    if (res < UNDERFLOW_THRESHOLD) {
                        underflow.push({ R: req, A: UNDERFLOW_THRESHOLD - res, P: roomID });
                    }
                }
            }
            
            for (let under of underflow) {
                let avails = overflow[under.R] || [];
                for (let avail of avails) {
                    let term = Game.rooms[avail.P].terminal;
                    if (term) {
                        let amount = Math.min(avail.A, under.A);
                        avail.A -= amount;
                        under.A -= amount;
                        if (amount > C.Terminal_Min_Trade) {
                            let err = term.send(under.R, amount, under.P, "Balancing resources");
                            console.log("Traded", amount, under.R, "from", avail.P, "to", under.P, "with error", PrettyPrintErr(err));
                        }
                    }
                }
            }

            //let orders: { [Res: string]: Order[] } = {}; 
            for (let overR in overflow) {
                let orders: Order[] | null = null;
                let avails = overflow[overR] || [];

                for (let avail of avails) {
                    let term = Game.rooms[avail.P].terminal;
                    if (term && avail.A > OVERFLOW_EXTERNALTRADE + C.Terminal_Min_Trade) {
                        if (orders == null) {
                            orders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: overR as ResourceConstant });
                            orders = orders.filter(function (a) { return a.price > 0.03 && a.remainingAmount > C.Terminal_Min_Trade });
                            orders = orders.sort(function (a, b) { return b.price - a.price; });
                            if (orders.length > 0)
                                console.log("found trade order", orders[0].price, overR, orders[0].remainingAmount);
                        }
                        if (orders != null && orders.length > 0) {
                            //let eCost = Game.market.calcTransactionCost(1000, avail.P, orders[0].roomName);
                            let tradeAmount = Math.min(avail.A - OVERFLOW_EXTERNALTRADE, orders[0].remainingAmount, term.store.energy);

                            if (tradeAmount > C.Terminal_Min_Trade) {
                                let err = Game.market.deal(orders[0].id, tradeAmount, avail.P);
                                console.log("Sold", tradeAmount, overR, "from", avail.P, "at price", orders[0].price, "with error", PrettyPrintErr(err));

                            }
                        }
                    }
                }
            }
            for (let req in buyOrder) {
                let term = Game.rooms[buyOrder[req]].terminal;
                if (term) {
                    let orders: Order[] | null = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: req as ResourceConstant });
                    orders = orders.filter(function (a) { return a.price <= 0.03 && a.remainingAmount > C.Terminal_Min_Trade });
                    orders = orders.sort(function (a, b) { return a.price - b.price; });
                    if (orders.length > 0) {
                        let tradeAmount = Math.min(UNDERFLOW_EXTERNALTRADE - (globalRes[req]|0), orders[0].remainingAmount , term.store.energy);
                        console.log("found trade order", orders[0].price, req, orders[0].remainingAmount, tradeAmount, "last in list", _.last(orders).price);
                        if (tradeAmount > C.Terminal_Min_Trade) {
                            let err = Game.market.deal(orders[0].id, tradeAmount, buyOrder[req]);
                            console.log("bought", tradeAmount, req, "from", buyOrder[req], "at price", orders[0].price, "with error", PrettyPrintErr(err));
                        }
                    }
                }
            }
        }
        catch (e) {
            console.log("CRASH: Market failed,", e);
        }
    }



}
profiler.registerClass(Market, 'Market');
