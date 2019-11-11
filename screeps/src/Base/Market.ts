import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import * as C from "Types/Constants"; 
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


const OVERFLOW_THRESHOLD = 5000;
const OVERFLOW_INTERNALTRADE = 3000;
const OVERFLOW_EXTERNALTRADE = 50000;
const UNDERFLOW_THRESHOLD = 2000;

export function Market(): void {
    if (Game.time % 10 != 2)
        return;

    let overflow: { [R: string]: overflowBalance[] } = {};
    let underflow: underflowBalance[] = [];
    for (let roomID in Game.rooms) {
        let room = Game.rooms[roomID];
        if (room.terminal == null)
            continue;

        let keys = Object.keys(room.terminal.store) as ResourceConstant[];
        for (let key of keys) {
            let res = room.terminal.store[key] || 0;

            if ((key != RESOURCE_ENERGY && res > OVERFLOW_THRESHOLD) || (key == RESOURCE_ENERGY && res > C.TERMINAL_MIN_STORAGE)) {
                if (overflow[key] == null)
                    overflow[key] = [];
                overflow[key].push({ A: res, P: room.name });
            }
        }

        if (room.terminal.store.energy < C.TERMINAL_HELPLIM) {
            underflow.push({ R: RESOURCE_ENERGY, A: C.TERMINAL_HELPLIM * 1.25 - room.terminal.store.energy, P: room.name });
        }
        if (room.name == "E49N47") {
            let reqs: ResourceConstant[] = [RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_HYDROGEN];

            for (let req of reqs) {
                let res = room.terminal.store[req] || 0;
                if (res < UNDERFLOW_THRESHOLD) {
                    underflow.push({ R: req, A: UNDERFLOW_THRESHOLD - res, P: room.name });
                }
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
                    console.log("Traded", under.R, "from", avail.P, "to", under.P, "with error", PrettyPrintErr(err));
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
                    orders = orders.filter(function (a) { return a.price > 0.03 });
                    orders = orders.sort(function (a, b) { return b.price - a.price; });
                    if (orders.length > 0)
                        console.log(orders[0].price, overR);
                }
                if (orders != null) {
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
}
