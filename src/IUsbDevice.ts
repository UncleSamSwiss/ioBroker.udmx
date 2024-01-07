import { LibUSBException } from "usb";

export interface IUsbDevice {
    controlTransfer(
        bmRequestType: number,
        bRequest: number,
        wValue: number,
        wIndex: number,
        data_or_length: number | Buffer,
        callback?: ((error: LibUSBException | undefined, buffer: number | Buffer | undefined) => void) | undefined,
    ): void;
    close(): void;
}
