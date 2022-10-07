import sys
import time
sys.path.append("")

from micropython import const

import uasyncio as asyncio
import aioble
import bluetooth

import random
import struct


_ENV_SENSE_UUID = bluetooth.UUID("90D3D000-C950-4DD6-9410-2B7AEB1DD7D8")  # custom service definition
_ENV_SENSE_TEMP_UUID = bluetooth.UUID("90D3D001-C950-4DD6-9410-2B7AEB1DD7D8") # org.bluetooth.characteristic.temperature
_ENV_SENSE_AWS_UUID = bluetooth.UUID("90D3D002-C950-4DD6-9410-2B7AEB1DD7D8") # org.bluetooth.characteristic true wind speed
_ENV_SENSE_AWA_UUID = bluetooth.UUID("90D3D003-C950-4DD6-9410-2B7AEB1DD7D8") # uses apparent wind direction rather than speed - should not do this in practice!!

# latitude longitude
_ENV_SENSE_LAT_UUID = bluetooth.UUID("90D3D005-C950-4DD6-9410-2B7AEB1DD7D8")
_ENV_SENSE_LON_UUID = bluetooth.UUID("90D3D006-C950-4DD6-9410-2B7AEB1DD7D8")

_ENV_SENSE_SPEED_UUID = bluetooth.UUID("90D3D007-C950-4DD6-9410-2B7AEB1DD7D8")
_ENV_SENSE_MAX_SPEED_UUID = bluetooth.UUID("90D3D008-C950-4DD6-9410-2B7AEB1DD7D8")
_ENV_SENSE_DISTANCE_UUID = bluetooth.UUID("90D3D009-C950-4DD6-9410-2B7AEB1DD7D8")
_ENV_SENSE_HEADING_UUID = bluetooth.UUID("90D3D00A-C950-4DD6-9410-2B7AEB1DD7D8")
_ENV_SENSE_IS_RECORDING_UUID = bluetooth.UUID("90D3D00B-C950-4DD6-9410-2B7AEB1DD7D8")

# org.bluetooth.characteristic.gap.appearance.xml
_ADV_APPEARANCE_GENERIC_THERMOMETER = const(768)

# How frequently to send advertising beacons.
_ADV_INTERVAL_US = 250_000


# Register GATT server.
device_service = aioble.Service(_ENV_SENSE_UUID)
temp_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_TEMP_UUID, read=True, notify=True)
aws_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_AWS_UUID, read=True, notify=True)
awa_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_AWA_UUID, read=True, notify=True)

lat_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_LAT_UUID, read=True, notify=True)
lon_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_LON_UUID, read=True, notify=True)

speed_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_SPEED_UUID, read=True, notify=True)
max_speed_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_MAX_SPEED_UUID, read=True, notify=True)
distance_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_DISTANCE_UUID, read=True, notify=True)
heading_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_HEADING_UUID, read=True, notify=True)
recording_status_characteristic = aioble.Characteristic( device_service, _ENV_SENSE_IS_RECORDING_UUID, read=True, notify=True)

aioble.register_services(device_service)

_timer_start = time.ticks_ms()
_connected_timer_start = time.ticks_ms()

# All variables big endian

# This would be periodically polling a hardware sensor.
async def temp_sensor():
    t = 24.5
    while True:
        encoded_temp = struct.pack(">h", int(t * 100))
        print(f'Total time: {int(time.ticks_diff(time.ticks_ms(), _timer_start) / 1000)}, Connected time: {int(time.ticks_diff(time.ticks_ms(), _connected_timer_start) / 1000)}, Temperature: {t}')
        temp_characteristic.write(encoded_temp, send_update=True)
        t += random.uniform(-0.5, 0.5)
        await asyncio.sleep_ms(1000)


async def location_sensor():
    lat = 51.0000012
    lon = 0.1
    while True:
        encoded_lat = struct.pack(">d", lat )
        encoded_lon = struct.pack(">d", lon )
        lat_characteristic.write(encoded_lat, send_update=True)
        lon_characteristic.write(encoded_lon, send_update=True)
        lat += random.uniform(-0.005, 0.005)
        lon += random.uniform(-0.005, 0.005)
        await asyncio.sleep_ms(1000)


async def wind_sensor():
    aws = 5.5
    awa = 90
    while True:
        encoded_aws = struct.pack(">h", int(aws * 100))
        encoded_awa = struct.pack(">h", int(awa * 100))
        aws_characteristic.write(encoded_aws, send_update=True)
        awa_characteristic.write(encoded_awa, send_update=True)
        aws += random.uniform(-0.05, 0.05)
        awa = (awa + random.uniform(-10, 10)) % 360
        await asyncio.sleep_ms(1000)


async def speed_heading_sensor():
    speed = 6.0
    max_speed = 0.0
    distance = 0.0
    heading = 80

    time_step_s = 1

    while True:
        # Send the data
        speed_to_send = struct.pack(">h", int(speed * 100))
        max_speed_to_send = struct.pack(">h", int(max_speed * 100))
        distance_to_send = struct.pack(">h", int(distance * 100))
        heading_to_send = struct.pack(">h", int(heading * 100))
        speed_characteristic.write(speed_to_send, send_update=True)
        max_speed_characteristic.write(max_speed_to_send, send_update=True)
        distance_characteristic.write(distance_to_send, send_update=True)
        heading_characteristic.write(heading_to_send, send_update=True)

        #print("Sent Speed, heading, max speed and distance")

        # simulate updates
        max_speed = max([max_speed, speed])
        distance += speed * time_step_s / 60 / 60
        speed = max([0, speed + random.uniform(-0.5, 0.5)])
        heading = (heading + random.uniform(-5, 5)) % 360
        await asyncio.sleep_ms(int(time_step_s * 1000))

async def notify_recording_status():
    recording_status = False
    while True:
        recording_status_characteristic.write(struct.pack(">h", int(recording_status)), send_update=True)
        await asyncio.sleep(5)

# Serially wait for connections. Don't advertise while a central is
# connected.
async def peripheral_task():
    while True:
        async with await aioble.advertise(
            _ADV_INTERVAL_US,
            name="MicroPython_BLE_Test",
            services=[_ENV_SENSE_UUID],
            appearance=_ADV_APPEARANCE_GENERIC_THERMOMETER,
        ) as connection:
            print("Connection from:", connection.device)
            global _connected_timer_start
            _connected_timer_start = time.ticks_ms()
            #await connection.disconnected() # Don't use this as it crashes everything after 60 seconds when timeout happens.
            while connection.is_connected() == True:
                #print(f'Connection status: {connection.is_connected()}')
                await asyncio.sleep_ms(1000)
            print('Connection lost. switching back to advertising mode')


# Run tasks
async def main():
    print('Starting Bluetooth sensor example.')
    sensors = [asyncio.create_task(temp_sensor()),
               asyncio.create_task(location_sensor()),
               asyncio.create_task(wind_sensor()),
               asyncio.create_task(speed_heading_sensor()),
               asyncio.create_task(notify_recording_status())
               ]

    t2 = asyncio.create_task(peripheral_task())
    await asyncio.gather(*sensors, t2)

    print('Example finished.')

asyncio.run(main())
