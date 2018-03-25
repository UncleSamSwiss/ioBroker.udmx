/* jshint -W097 */ // no "use strict" warnings
/* jshint -W061 */ // no "eval" warnings
/* jslint node: true */
"use strict";

// always required: utils
var utils = require(__dirname + '/lib/utils');

// other dependencies:
var usb = require('usb');
var buffer = require('buffer');

// These variables specify the anyma uDMX device
var vendorId = 0x16c0;
var productId = 0x5dc;

function DmxAdapter() {
    var that = this;
    
    // public fields
    that.adapter = utils.adapter('udmx'); // create the adapter object
    
    // private fields
    that._dmxBuffer = null;
    that._udmxDevice = null;
    
    // register event handlers
    that.adapter.on('ready', function () {
        that.onReady();
    });
    that.adapter.on('stateChange', function (id, state) {
        that.onStateChange(id, state);
    });
    that.adapter.on('unload', function (callback) {
        that.onUnload(callback);
    });
}


DmxAdapter.prototype.main = function (allStates) {
    var that = this;
    
    var addressCount = parseInt(that.adapter.config.addressCount);
    if (!addressCount) {
        that.adapter.log.warn("No addresses configured, nothing to do in this adapter");
        return;
    }
    
    that._dmxBuffer = Buffer.alloc(addressCount);
    
    if (that.adapter.config.mockDevice) {
        that.adapter.log.warn("Using a mock USB device for testing!");
        that._udmxDevice = new MockUsbDevice(that.adapter.log);
    } else {
        that._udmxDevice = usb.findByIds(vendorId, productId);
        if (!that._udmxDevice) {
            that.adapter.log.error("Couldn't find an Anyma USB adapter, not doing anything!");
            return;
        }
        
        that._udmxDevice.open();
    }
    
    for (var i = 1; i <= addressCount; i++) {
        var id = '' + i;
        var obj = {
            type: 'state',
            common: {
                name: 'Address ' + i,
                read: true,
                write: true,
                type: 'number',
                role: 'level',
                min: 0,
                max: 255
            },
            native: {}
        };
        that.adapter.setObject(id, obj);
        var existingValue = allStates[that.adapter.namespace + '.' + i];
        if (existingValue) {
            that._dmxBuffer.writeUInt8(parseInt(existingValue.val), i - 1);
        } else {
            that.setStateAck(id, 0);
        }
    }
    
    that.adapter.subscribeStates('*');
    that.sendDMXBuffer();
};

DmxAdapter.prototype.setStateAck = function (id, value) {
    this.adapter.setState(id, {val: value, ack: true});
};

// startup
DmxAdapter.prototype.onReady = function () {
    var that = this;
    that.adapter.getStates('*', function (err, states) {
        that.main(states);
    });
};

// is called if a subscribed state changes
DmxAdapter.prototype.onStateChange = function (id, state) {
    // Warning: state can be null if it was deleted!
    if (!id || !state || state.ack) {
        return;
    }
    
    var that = this;
    that.adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
    var index = parseInt(id.replace(that.adapter.namespace + '.', '')) - 1;
    that._dmxBuffer.writeUInt8(state.val, index);
    that.sendDMXBuffer();

    that.setStateAck(id, state.val);
};

// unloading
DmxAdapter.prototype.onUnload = function (callback) {
    var that = this;
    if (that._udmxDevice) {
        that._udmxDevice.close();
    }
    
    callback();
};

// send the DMX buffer to the USB device
DmxAdapter.prototype.sendDMXBuffer = function () {
    var that = this;
    if (that._udmxDevice) {
        that._udmxDevice.controlTransfer(0x40, 0x0002, that._dmxBuffer.length, 0, that._dmxBuffer, function (error) {
            if (error) {
                that.adapter.log.error('USB error: ' + error);
            }
        });
    }
};

// Mock USB device for testing on Windows
function MockUsbDevice(logger) {
    this.logger = logger;
}

MockUsbDevice.prototype.close = function () {
    this.logger.info('[Mock USB] Closing');
};

MockUsbDevice.prototype.controlTransfer = function (requestType, request, length, offset, buffer, errorCallback) {
    this.logger.info('[Mock USB] Transferring ' + buffer.toString('hex'));
};

new DmxAdapter();
