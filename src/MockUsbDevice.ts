import { LibUSBException } from "usb";
import { IUsbDevice } from "./IUsbDevice";

export class MockUsbDevice implements IUsbDevice {
    constructor(private readonly logger: ioBroker.Log) {}

    close() {
        this.logger.info("[Mock USB] Closing");
    }

    controlTransfer(
        bmRequestType: number,
        bRequest: number,
        wValue: number,
        wIndex: number,
        data_or_length: number | Buffer,
        callback?: ((error: LibUSBException | undefined, buffer: number | Buffer | undefined) => void) | undefined,
    ) {
        const data = typeof data_or_length === "number" ? data_or_length.toString() : data_or_length.toString("hex");
        this.logger.info("[Mock USB] Transferring " + data);
        return this as any;
    }
}
