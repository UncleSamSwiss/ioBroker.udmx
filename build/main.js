"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_usb = require("usb");
var import_MockUsbDevice = require("./MockUsbDevice");
const VENDOR_ID = 5824;
const PRODUCT_ID = 1500;
class Udmx extends utils.Adapter {
  dmxBuffer;
  udmxDevice;
  constructor(options = {}) {
    super({
      ...options,
      name: "udmx"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    const addressCount = this.config.addressCount;
    if (!addressCount) {
      this.log.warn("No addresses configured, nothing to do in this adapter");
      return;
    }
    this.dmxBuffer = Buffer.alloc(addressCount);
    if (this.config.mockDevice) {
      this.log.warn("Using a mock USB device for testing!");
      this.udmxDevice = new import_MockUsbDevice.MockUsbDevice(this.log);
    } else {
      const device = (0, import_usb.findByIds)(VENDOR_ID, PRODUCT_ID);
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
          max: 255
        },
        native: {}
      };
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
  onUnload(callback) {
    var _a;
    try {
      (_a = this.udmxDevice) == null ? void 0 : _a.close();
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (!id || !state || state.ack) {
      return;
    }
    this.log.debug("stateChange " + id + " " + JSON.stringify(state));
    const index = parseInt(id.replace(this.namespace + ".", "")) - 1;
    const value = typeof state.val === "number" ? state.val : parseInt(state.val);
    this.dmxBuffer.writeUInt8(value, index);
    this.sendDmxBuffer();
    this.setStateAck(id, value);
  }
  setStateAck(id, value) {
    this.setState(id, { val: value, ack: true });
  }
  sendDmxBuffer() {
    var _a;
    (_a = this.udmxDevice) == null ? void 0 : _a.controlTransfer(64, 2, this.dmxBuffer.length, 0, this.dmxBuffer, (error) => {
      if (error) {
        this.log.error("USB error: " + error);
      }
    });
  }
}
if (require.main !== module) {
  module.exports = (options) => new Udmx(options);
} else {
  (() => new Udmx())();
}
//# sourceMappingURL=main.js.map
