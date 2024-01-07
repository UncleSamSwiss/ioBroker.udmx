/*
 * Created with @iobroker/create-adapter v2.6.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import { findByIds } from "usb";
import { IUsbDevice } from "./IUsbDevice";
import { MockUsbDevice } from "./MockUsbDevice";

// These constants specify the anyma uDMX device
const VENDOR_ID = 0x16c0;
const PRODUCT_ID = 0x5dc;

// Load your modules here, e.g.:
// import * as fs from "fs";

class Udmx extends utils.Adapter {
    private dmxBuffer!: Buffer;
    private udmxDevice?: IUsbDevice;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "udmx",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        const addressCount = this.config.addressCount;
        if (!addressCount) {
            this.log.warn("No addresses configured, nothing to do in this adapter");
            return;
        }

        this.dmxBuffer = Buffer.alloc(addressCount);

        if (this.config.mockDevice) {
            this.log.warn("Using a mock USB device for testing!");
            this.udmxDevice = new MockUsbDevice(this.log);
        } else {
            const device = findByIds(VENDOR_ID, PRODUCT_ID);
            if (!device) {
                this.log.error("Couldn't find an Anyma USB adapter, not doing anything!");
                return;
            }

            device.open();

            this.udmxDevice = device;
        }

        const allStates = await this.getStatesAsync("*");

        for (let i = 1; i <= addressCount; i++) {
            const id = "" + i;
            const obj = {
                type: "state",
                common: {
                    name: "Address " + i,
                    read: true,
                    write: true,
                    type: "number",
                    role: "level",
                    min: 0,
                    max: 255,
                },
                native: {},
            } as const;
            await this.setObjectNotExistsAsync(id, obj);
            const existingValue = allStates[this.namespace + "." + id];
            if (existingValue && typeof existingValue.val === "number") {
                this.dmxBuffer.writeUInt8(existingValue.val, i - 1);
            } else {
                this.setStateAck(id, 0);
            }
        }

        this.subscribeStates("*");
        this.sendDmxBuffer();
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            this.udmxDevice?.close();

            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        // Warning: state can be null if it was deleted!
        if (!id || !state || state.ack) {
            return;
        }

        this.log.debug("stateChange " + id + " " + JSON.stringify(state));
        const index = parseInt(id.replace(this.namespace + ".", "")) - 1;
        const value = typeof state.val === "number" ? state.val : parseInt(state.val as string);
        this.dmxBuffer.writeUInt8(value, index);
        this.sendDmxBuffer();

        this.setStateAck(id, value);
    }

    private setStateAck(id: string, value: number): void {
        this.setState(id, { val: value, ack: true });
    }

    private sendDmxBuffer(): void {
        this.udmxDevice?.controlTransfer(0x40, 0x0002, this.dmxBuffer.length, 0, this.dmxBuffer, (error) => {
            if (error) {
                this.log.error("USB error: " + error);
            }
        });
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Udmx(options);
} else {
    // otherwise start the instance directly
    (() => new Udmx())();
}
