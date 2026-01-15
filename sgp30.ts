namespace SGP30 {

    const SGP30_ADDR = 0x58
    let baselineTVOC = 0
    let baselineCO2 = 0

    // ==================================================
    // INITIALISERING
    // ==================================================
    //% block="initialiser SGP30"
    //% group="Oppsett"
    export function init(): void {
        // Init command 0x2003
        i2cWriteWord(SGP30_ADDR, 0x2003)
        basic.pause(10)
        // Start kontinuerlig måling
        i2cWriteWord(SGP30_ADDR, 0x2008)
        basic.pause(10)
    }

    // ==================================================
    // TVOC OG eCO2
    // ==================================================
    //% block="TVOC (ppb)"
    //% group="Luftkvalitet"
    export function TVOC(): number {
        let data = readMeasurement()
        return data[2] << 8 | data[3]
    }

    //% block="eCO₂ (ppm)"
    //% group="Luftkvalitet"
    export function eCO2(): number {
        let data = readMeasurement()
        return data[0] << 8 | data[1]
    }

    // ==================================================
    // RÅDATA
    // ==================================================
    //% block="rådata H₂"
    //% group="Luftkvalitet"
    export function rawH2(): number {
        let data = readMeasurement()
        return data[0] << 8 | data[1]
    }

    //% block="rådata etanol"
    //% group="Luftkvalitet"
    export function rawEthanol(): number {
        let data = readMeasurement()
        return data[2] << 8 | data[3]
    }

    // ==================================================
    // KALIBRERING / BASELINE
    // ==================================================
    //% block="sett baseline"
    //% group="Luftkvalitet"
    export function setBaseline(tvoc: number, co2: number): void {
        baselineTVOC = tvoc
        baselineCO2 = co2
        i2cWriteWord(SGP30_ADDR, 0x201E) // baseline command
        basic.pause(10)
    }

    // ==================================================
    // I2C HJELPEFUNKSJONER
    // ==================================================
    function i2cWriteWord(addr: number, cmd: number): void {
        let buf = pins.createBuffer(2)
        buf[0] = (cmd >> 8) & 0xFF
        buf[1] = cmd & 0xFF
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cRead4(addr: number): number[] {
        let buf = pins.i2cReadBuffer(addr, 4)
        let arr: number[] = []
        for (let i = 0; i < 4; i++) arr.push(buf[i])
        return arr
    }

    function readMeasurement(): number[] {
        i2cWriteWord(SGP30_ADDR, 0x2008) // måle kommando
        basic.pause(12)
        return i2cRead4(SGP30_ADDR)
    }
}
