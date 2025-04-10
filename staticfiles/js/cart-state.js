class CartState {
    constructor() {
        this.subscribers = [];
        this.cartData = null;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    update(newCartData) {
        this.cartData = newCartData;
        this.notify();
    }

    notify() {
        this.subscribers.forEach(callback => callback(this.cartData));
    }
}

window.cartState = new CartState();
