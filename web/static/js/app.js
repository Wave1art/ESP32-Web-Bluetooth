var BluetoothDataSources = [];
var BluetoothDevices = [];

// configure the buttons
var ConnectSourceButton = document.querySelector('#connect_button');

// configure the display
var windSpeedDisplay = document.querySelector('#wind_speed');
var windDirectionDisplay = document.querySelector('#wind_direction');
var longitudeDisplay = document.querySelector('#gps_lon');
var latitudeDisplay = document.querySelector('#gps_lat');


// Register bluetooth data sources, connect to parsers and display elements
registerBluetoothDataSource(BluetoothDataSources, 'environmental_sensing', 0x2A72, blehandle_sint16, windSpeedDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, 'environmental_sensing', 0x2A73, blehandle_sint16, windDirectionDisplay, '')

registerBluetoothDataSource(BluetoothDataSources, 'environmental_sensing', 'latitude', blehandle_double, latitudeDisplay, '')
registerBluetoothDataSource(BluetoothDataSources, 'environmental_sensing', 'longitude', blehandle_double, longitudeDisplay, '')




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
    //acceptAllDevices : true,
    filters:[{name :'ESP32'}],
    optionalServices: ['battery_service', 'generic_access', 'environmental_sensing']
  })
  .then(device => {
    BluetoothDataSources.forEach(source => {
      connectBlueToothCharacteristic(device, source.BluetoothServiceUUID, source.BluetoothCharacteristicUUID, source.ValueHandler, source.TargetSelector, source.DataLog);
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
  console.log(event.target.value.byteLength)
  const value = event.target.value.getInt32(0, false);
  //console.log('Received: ' + value);
  TargetSelector.textContent = String(value / 1000) ;
}

function blehandle_double(event, TargetSelector, DataLog) {
  console.log(event.target.value.byteLength)
  const value = event.target.value.getFloat64(0, false);
  //console.log('Received: ' + value);
  TargetSelector.textContent = String(value.toFixed(6)) ;
}