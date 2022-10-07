var BluetoothDataSources = [];
var BluetoothDevices = [];

// configure the buttons
var ConnectSourceButton = document.querySelector('#connect_button');

// configure the display
var windSpeedDisplay = document.querySelector('#wind_speed');
var windAngleDisplay = document.querySelector('#wind_angle');
var longitudeDisplay = document.querySelector('#gps_lon');
var latitudeDisplay = document.querySelector('#gps_lat');

var speedDisplay = document.querySelector('#speed');
var maxSpeedDisplay = document.querySelector('#max_speed');
var distanceDisplay = document.querySelector('#distance');
var headingDisplay = document.querySelector('#heading');
var isRecordingDisplay = document.querySelector('#is_recording');


// Register bluetooth data sources, connect to parsers and display elements
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D002-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, windSpeedDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D003-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, windAngleDisplay, '')

registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D005-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_double, latitudeDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D006-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_double, longitudeDisplay, '')

registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D007-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, speedDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D008-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, maxSpeedDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D009-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, distanceDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D00A-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, headingDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8", "90D3D00B-C950-4DD6-9410-2B7AEB1DD7D8", blehandle_sint16, isRecordingDisplay, '')

// Utility functions
function registerBluetoothDataSource(BluetoothDataSourcesArray, BluetoothServiceUUID, BluetoothCharacteristicUUID, ValueHandler, TargetSelector, DataLog) {
  // Appends a data source, parser and target to the data sources list
  BluetoothDataSourcesArray.push({
    BluetoothServiceUUID: BluetoothServiceUUID,
    BluetoothCharacteristicUUID : BluetoothCharacteristicUUID,
    ValueHandler: ValueHandler,
    TargetSelector: TargetSelector,
    DataLog: DataLog});
};

function connectBlueToothCharacteristic(BluetoothDevice, BluetoothServiceUUID, BluetoothCharacteristicUUID, ValueHandler, TargetSelector, DataLog){
  // Connects a bluetooth characteristic to a document and to a DataLog, which holds historic information
  console.log('Connecting bluetooth data source: ' + BluetoothServiceUUID + ', ' + BluetoothCharacteristicUUID)
  BluetoothDevice.gatt.connect()
      .then(server => server.getPrimaryService(BluetoothServiceUUID))
      .then(service => service.getCharacteristic(BluetoothCharacteristicUUID))
      .then(characteristic => characteristic.startNotifications())
      .then(characteristic => characteristic.addEventListener('characteristicvaluechanged', function(event){ ValueHandler(event, TargetSelector, DataLog) }))
      // .catch(error => {
      //   console.log('error:' + error);
      // });
};


ConnectSourceButton.addEventListener('click', function() {
  console.log('Requesting Bluetooth Service...')
  navigator.bluetooth.requestDevice({
    //acceptAllDevices : true, { services: ['battery_service'] }
    filters:[{services :["90D3D000-C950-4DD6-9410-2B7AEB1DD7D8".toLowerCase()]}],
    optionalServices: ['battery_service', 'generic_access', 'environmental_sensing', "90D3D000-C950-4DD6-9410-2B7AEB1DD7D8".toLowerCase()]
  })
  .then(device => {
    BluetoothDataSources.forEach(source => {
      connectBlueToothCharacteristic(device, source.BluetoothServiceUUID.toLowerCase(), source.BluetoothCharacteristicUUID.toLowerCase(), source.ValueHandler, source.TargetSelector, source.DataLog);
    })
  })
  .catch(error => {
    console.log('error:' + error);
  });
});


// Bluetooth data handlers - these could be split up into more modular sub-capabilities
function blehandle_sint16(event, TargetSelector, DataLog) {
  const value = event.target.value.getInt16(0, false);
  //console.log('Received: ' + value);
  TargetSelector.textContent = String(value / 100) ;
}

function blehandle_sint32(event, TargetSelector, DataLog) {
  //console.log(event.target.value.byteLength)
  const value = event.target.value.getInt32(0, false);
  //console.log('Received: ' + value);
  TargetSelector.textContent = String(value / 1000) ;
}

function blehandle_double(event, TargetSelector, DataLog) {
  //console.log(event.target.value.byteLength)
  const value = event.target.value.getFloat64(0, false);
  //console.log('Received: ' + value);
  TargetSelector.textContent = String(value.toFixed(6)) ;
}