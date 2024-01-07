"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var MockUsbDevice_exports = {};
__export(MockUsbDevice_exports, {
  MockUsbDevice: () => MockUsbDevice
});
module.exports = __toCommonJS(MockUsbDevice_exports);
class MockUsbDevice {
  constructor(logger) {
    this.logger = logger;
  }
  close() {
    this.logger.info("[Mock USB] Closing");
  }
  controlTransfer(bmRequestType, bRequest, wValue, wIndex, data_or_length, callback) {
    const data = typeof data_or_length === "number" ? data_or_length.toString() : data_or_length.toString("hex");
    this.logger.info("[Mock USB] Transferring " + data);
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MockUsbDevice
});
//# sourceMappingURL=MockUsbDevice.js.map
