//% color=#A30F93 weight=30 icon="\uf0c2" block="SGP30 - Luftkvalitet"
namespace SGP30 {

    const SGP30_ADDR = 0x58

    // Lagrede verdier
    let eco2 = 400
    let tvoc = 0
    let h2 = 0
    let ethanol = 0

    let initialized = false
    let measuring = false

    // ==================================================
    // INITIALISERING
    // ==================================================
    //% block="initialiser SGP30"
    //% group="Oppsett"
    export function init(): void {
        if (initialized) return
        initialized = true

        // IAQ init
        i2cWriteWord(0x2003)

        // Datasheet: minst 15 s burn-in
        basic.pause(15000)

        startBackgroundMeasurement()
    }

    // ==================================================
    // BAKGRUNNSMÅLING (1 Hz)
    // ==================================================
    function startBackgroundMeasurement(): void {
        if (measuring) return
        measuring = true

        control.inBackground(function () {
            while (true) {
                // IAQ
                i2cWriteWord(0x2008)
                basic.pause(12)

                let d = i2cRead6()
                eco2 = (d[0] << 8) | d[1]
                tvoc = (d[3] << 8) | d[4]

                // Rå gass-signaler
                i2cWriteWord(0x2050)
                basic.pause(25)

                d = i2cRead6()
                h2 = (d[0] << 8) | d[1]
                ethanol = (d[3] << 8) | d[4]

                basic.pause(1000)
            }
        })
    }

    // ==================================================
    // KLIMAKOMPENSASJON (BME280)
    // ==================================================
    //% block="sett klimakompensasjon temperatur %temp °C luftfuktighet %rh %"
    //% group="Kalibrering"
    export function setClimateCompensation(temp: number, rh: number): void {
        if (!initialized) init()

        // Begrens verdier (datasheet)
        if (rh < 0) rh = 0
        if (rh > 100) rh = 100
        if (temp < -45) temp = -45
        if (temp > 130) temp = 130

        // Absolutt luftfuktighet (g/m³)
        let absHumidity =
            216.7 *
            (rh / 100) *
            (6.112 * Math.exp((17.62 * temp) / (243.12 + temp))) /
            (273.15 + temp)

        // SGP30-format: g/m³ * 256
        let ah = Math.round(absHumidity * 256)

        // Send kommando 0x2061
        let buf = pins.createBuffer(5)
        buf[0] = 0x20
        buf[1] = 0x61
        buf[2] = (ah >> 8) & 0xFF
        buf[3] = ah & 0xFF
        buf[4] = crc8(buf[2], buf[3])

        pins.i2cWriteBuffer(SGP30_ADDR, buf)
    }

    // ==================================================
    // VERDI-BLOKKER
    // ==================================================
    //% block="eCO₂ (ppm)"
    //% group="Luftkvalitet"
    export function eCO2(): number {
        if (!initialized) init()
        return eco2
    }

    //% block="TVOC (ppb)"
    //% group="Luftkvalitet"
    export function TVOC(): number {
        if (!initialized) init()
        return tvoc
    }

    //% block="rå H₂"
    //% group="Luftkvalitet"
    export function rawH2(): number {
        if (!initialized) init()
        return h2
    }

    //% block="rå etanol"
    //% group="Luftkvalitet"
    export function rawEthanol(): number {
        if (!initialized) init()
        return ethanol
    }

    // ==================================================
    // I2C + CRC
    // ==================================================
    function i2cWriteWord(cmd: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = (cmd >> 8) & 0xFF
        buf[1] = cmd & 0xFF
        pins.i2cWriteBuffer(SGP30_ADDR, buf)
    }

    function i2cRead6(): number[] {
        let buf = pins.i2cReadBuffer(SGP30_ADDR, 6)
        let arr: number[] = []
        for (let i = 0; i < 6; i++) arr.push(buf[i])
        return arr
    }

    function crc8(msb: number, lsb: number): number {
        let crc = 0xFF
        let data = [msb, lsb]

        for (let b of data) {
            crc ^= b
            for (let i = 0; i < 8; i++) {
                if (crc & 0x80) crc = (crc << 1) ^ 0x31
                else crc <<= 1
            }
        }
        return crc & 0xFF
    }
}