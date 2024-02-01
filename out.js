"use strict";
class HitTester {
    matrix;
    // Storing in Int16Array to (hopefully...) improve memory locality and speed.
    points = null;
    index = 0;
    infos = [];
    count = 0;
    constructor(matrix) {
        this.matrix = matrix;
    }
    startUpdate(count) {
        if (this.count < count) {
            this.points = new Int16Array(count * 3 /* PointIndex.NumberOfEntries */);
            this.infos = new Array(count);
        }
        this.index = 0;
        this.count = count;
    }
    addPoint(x, y, radius, info) {
        if (this.points == null)
            throw new Error("Object not initialized.");
        const pointsIndex = this.index * 3;
        this.points[pointsIndex + 0 /* PointIndex.x */] = x;
        this.points[pointsIndex + 1 /* PointIndex.y */] = y;
        this.points[pointsIndex + 2 /* PointIndex.radius */] = radius;
        this.infos[this.index] = info;
        ++this.index;
    }
    hitTest(x, y) {
        const points = this.points;
        if (points == null)
            return null;
        const translated = new DOMPoint(x, y).matrixTransform(this.matrix.inverse());
        let pointIndex = 0;
        for (let i = 0; i < this.count; ++i) {
            const pointX = points[pointIndex + 0 /* PointIndex.x */];
            const pointY = points[pointIndex + 1 /* PointIndex.y */];
            const pointRadius = points[pointIndex + 2 /* PointIndex.radius */];
            pointIndex += 3 /* PointIndex.NumberOfEntries */;
            const dx = Math.abs(pointX - translated.x);
            if (dx > pointRadius)
                continue;
            const dy = Math.abs(pointY - translated.y);
            if (dy > pointRadius)
                continue;
            if (Math.pow(dx, 2) + Math.pow(dy, 2) > Math.pow(pointRadius, 2))
                continue;
            return { info: this.infos[i], index: i };
        }
        return null;
    }
}
class Things {
    static descriptions = {
        1: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": "",
            "description": "Player 1 start"
        },
        2: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": "",
            "description": "Player 2 start"
        },
        3: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": "",
            "description": "Player 3 start"
        },
        4: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": "",
            "description": "Player 4 start"
        },
        5: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BKEY" /* ThingSprite.BKEY */,
            "sequence": "AB",
            "class": "P",
            "description": "Blue keycard"
        },
        6: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "YKEY" /* ThingSprite.YKEY */,
            "sequence": "AB",
            "class": "P",
            "description": "Yellow keycard"
        },
        7: {
            "version": "R",
            "radius": 128,
            "height": 100,
            "sprite": "SPID" /* ThingSprite.SPID */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Spiderdemon"
        },
        8: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BPAK" /* ThingSprite.BPAK */,
            "sequence": "A",
            "class": "P",
            "description": "Backpack"
        },
        9: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "SPOS" /* ThingSprite.SPOS */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Shotgun guy"
        },
        10: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "W",
            "class": "",
            "description": "Bloody mess"
        },
        11: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "none" /* ThingSprite.none */,
            "sequence": "-",
            "class": "",
            "description": "Deathmatch start"
        },
        12: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "W",
            "class": "",
            "description": "Bloody mess 2"
        },
        13: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "RKEY" /* ThingSprite.RKEY */,
            "sequence": "AB",
            "class": "P",
            "description": "Red keycard"
        },
        14: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "none4" /* ThingSprite.none4 */,
            "sequence": "-",
            "class": "",
            "description": "Teleport landing"
        },
        15: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "N",
            "class": "",
            "description": "Dead player"
        },
        16: {
            "version": "R",
            "radius": 40,
            "height": 110,
            "sprite": "CYBR" /* ThingSprite.CYBR */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Cyberdemon"
        },
        17: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "CELP" /* ThingSprite.CELP */,
            "sequence": "A",
            "class": "P1",
            "description": "Energy cell pack"
        },
        18: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "POSS" /* ThingSprite.POSS */,
            "sequence": "L",
            "class": "",
            "description": "Dead former human"
        },
        19: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "SPOS" /* ThingSprite.SPOS */,
            "sequence": "L",
            "class": "",
            "description": "Dead former sergeant"
        },
        20: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "TROO" /* ThingSprite.TROO */,
            "sequence": "M",
            "class": "",
            "description": "Dead imp"
        },
        21: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "SARG" /* ThingSprite.SARG */,
            "sequence": "N",
            "class": "",
            "description": "Dead demon"
        },
        22: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "HEAD" /* ThingSprite.HEAD */,
            "sequence": "L",
            "class": "",
            "description": "Dead cacodemon"
        },
        23: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "SKUL" /* ThingSprite.SKUL */,
            "sequence": "K",
            "class": "",
            "description": "Dead lost soul (invisible)"
        },
        24: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "POL5" /* ThingSprite.POL5 */,
            "sequence": "A",
            "class": "",
            "description": "Pool of blood and flesh"
        },
        25: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL1" /* ThingSprite.POL1 */,
            "sequence": "A",
            "class": "O",
            "description": "Impaled human"
        },
        26: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL6" /* ThingSprite.POL6 */,
            "sequence": "AB",
            "class": "O",
            "description": "Twitching impaled human"
        },
        27: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL4" /* ThingSprite.POL4 */,
            "sequence": "A",
            "class": "O",
            "description": "Skull on a pole"
        },
        28: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL2" /* ThingSprite.POL2 */,
            "sequence": "A",
            "class": "O",
            "description": "Five skulls \"shish kebab\""
        },
        29: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL3" /* ThingSprite.POL3 */,
            "sequence": "AB",
            "class": "O",
            "description": "Pile of skulls and candles"
        },
        30: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL1" /* ThingSprite.COL1 */,
            "sequence": "A",
            "class": "O",
            "description": "Tall green pillar"
        },
        31: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL2" /* ThingSprite.COL2 */,
            "sequence": "A",
            "class": "O",
            "description": "Short green pillar"
        },
        32: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL3" /* ThingSprite.COL3 */,
            "sequence": "A",
            "class": "O",
            "description": "Tall red pillar"
        },
        33: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL4" /* ThingSprite.COL4 */,
            "sequence": "A",
            "class": "O",
            "description": "Short red pillar"
        },
        34: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "CAND" /* ThingSprite.CAND */,
            "sequence": "A",
            "class": "",
            "description": "Candle"
        },
        35: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "CBRA" /* ThingSprite.CBRA */,
            "sequence": "A",
            "class": "O",
            "description": "Candelabra"
        },
        36: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL5" /* ThingSprite.COL5 */,
            "sequence": "AB",
            "class": "O",
            "description": "Short green pillar with beating heart"
        },
        37: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL6" /* ThingSprite.COL6 */,
            "sequence": "A",
            "class": "O",
            "description": "Short red pillar with skull"
        },
        38: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "RSKU" /* ThingSprite.RSKU */,
            "sequence": "AB",
            "class": "P",
            "description": "Red skull key"
        },
        39: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "YSKU" /* ThingSprite.YSKU */,
            "sequence": "AB",
            "class": "P",
            "description": "Yellow skull key"
        },
        40: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "BSKU" /* ThingSprite.BSKU */,
            "sequence": "AB",
            "class": "P",
            "description": "Blue skull key"
        },
        41: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "CEYE" /* ThingSprite.CEYE */,
            "sequence": "ABCB",
            "class": "O",
            "description": "Evil eye"
        },
        42: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "FSKU" /* ThingSprite.FSKU */,
            "sequence": "ABC",
            "class": "O",
            "description": "Floating skull"
        },
        43: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "TRE1" /* ThingSprite.TRE1 */,
            "sequence": "A",
            "class": "O",
            "description": "Burnt tree"
        },
        44: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "TBLU" /* ThingSprite.TBLU */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Tall blue firestick"
        },
        45: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "TGRN" /* ThingSprite.TGRN */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Tall green firestick"
        },
        46: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "TRED" /* ThingSprite.TRED */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Tall red firestick"
        },
        47: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMIT" /* ThingSprite.SMIT */,
            "sequence": "A",
            "class": "O",
            "description": "Brown stump"
        },
        48: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "ELEC" /* ThingSprite.ELEC */,
            "sequence": "A",
            "class": "O",
            "description": "Tall techno column"
        },
        49: {
            "version": "R",
            "radius": 16,
            "height": 68,
            "sprite": "GOR1" /* ThingSprite.GOR1 */,
            "sequence": "ABCB",
            "class": "O^",
            "description": "Hanging victim, twitching"
        },
        50: {
            "version": "R",
            "radius": 16,
            "height": 84,
            "sprite": "GOR2" /* ThingSprite.GOR2 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging victim, arms out"
        },
        51: {
            "version": "R",
            "radius": 16,
            "height": 84,
            "sprite": "GOR3" /* ThingSprite.GOR3 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging victim, one-legged"
        },
        52: {
            "version": "R",
            "radius": 16,
            "height": 68,
            "sprite": "GOR4" /* ThingSprite.GOR4 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging pair of legs"
        },
        53: {
            "version": "R",
            "radius": 16,
            "height": 52,
            "sprite": "GOR5" /* ThingSprite.GOR5 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging leg"
        },
        54: {
            "version": "R",
            "radius": 32,
            "height": 16,
            "sprite": "TRE2" /* ThingSprite.TRE2 */,
            "sequence": "A",
            "class": "O",
            "description": "Large brown tree"
        },
        55: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMBT" /* ThingSprite.SMBT */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Short blue firestick"
        },
        56: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMGT" /* ThingSprite.SMGT */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Short green firestick"
        },
        57: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMRT" /* ThingSprite.SMRT */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Short red firestick"
        },
        58: {
            "version": "S",
            "radius": 30,
            "height": 56,
            "sprite": "SARG" /* ThingSprite.SARG */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Spectre"
        },
        59: {
            "version": "R",
            "radius": 20,
            "height": 84,
            "sprite": "GOR2" /* ThingSprite.GOR2 */,
            "sequence": "A",
            "class": "^",
            "description": "Hanging victim, arms out"
        },
        60: {
            "version": "R",
            "radius": 20,
            "height": 68,
            "sprite": "GOR4" /* ThingSprite.GOR4 */,
            "sequence": "A",
            "class": "^",
            "description": "Hanging pair of legs"
        },
        61: {
            "version": "R",
            "radius": 20,
            "height": 52,
            "sprite": "GOR3" /* ThingSprite.GOR3 */,
            "sequence": "A",
            "class": "^",
            "description": "Hanging victim, one-legged"
        },
        62: {
            "version": "R",
            "radius": 20,
            "height": 52,
            "sprite": "GOR5" /* ThingSprite.GOR5 */,
            "sequence": "A",
            "class": "^",
            "description": "Hanging leg"
        },
        63: {
            "version": "R",
            "radius": 20,
            "height": 68,
            "sprite": "GOR1" /* ThingSprite.GOR1 */,
            "sequence": "ABCB",
            "class": "^",
            "description": "Hanging victim, twitching"
        },
        64: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "VILE" /* ThingSprite.VILE */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Arch-vile"
        },
        65: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "CPOS" /* ThingSprite.CPOS */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Heavy weapon dude"
        },
        66: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "SKEL" /* ThingSprite.SKEL */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Revenant"
        },
        67: {
            "version": "2",
            "radius": 48,
            "height": 64,
            "sprite": "FATT" /* ThingSprite.FATT */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Mancubus"
        },
        68: {
            "version": "2",
            "radius": 64,
            "height": 64,
            "sprite": "BSPI" /* ThingSprite.BSPI */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Arachnotron"
        },
        69: {
            "version": "2",
            "radius": 24,
            "height": 64,
            "sprite": "BOS2" /* ThingSprite.BOS2 */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Hell knight"
        },
        70: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "FCAN" /* ThingSprite.FCAN */,
            "sequence": "ABC",
            "class": "O",
            "description": "Burning barrel"
        },
        71: {
            "version": "2",
            "radius": 31,
            "height": 56,
            "sprite": "PAIN" /* ThingSprite.PAIN */,
            "sequence": "A+",
            "class": "MO*^",
            "description": "Pain elemental"
        },
        72: {
            "version": "2",
            "radius": 16,
            "height": 72,
            "sprite": "KEEN" /* ThingSprite.KEEN */,
            "sequence": "A+",
            "class": "MO*^",
            "description": "Commander Keen"
        },
        73: {
            "version": "2",
            "radius": 16,
            "height": 88,
            "sprite": "HDB1" /* ThingSprite.HDB1 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging victim, guts removed"
        },
        74: {
            "version": "2",
            "radius": 16,
            "height": 88,
            "sprite": "HDB2" /* ThingSprite.HDB2 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging victim, guts and brain removed"
        },
        75: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB3" /* ThingSprite.HDB3 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging torso, looking down"
        },
        76: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB4" /* ThingSprite.HDB4 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging torso, open skull"
        },
        77: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB5" /* ThingSprite.HDB5 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging torso, looking up"
        },
        78: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB6" /* ThingSprite.HDB6 */,
            "sequence": "A",
            "class": "O^",
            "description": "Hanging torso, brain removed"
        },
        79: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "POB1" /* ThingSprite.POB1 */,
            "sequence": "A",
            "class": "",
            "description": "Pool of blood"
        },
        80: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "POB2" /* ThingSprite.POB2 */,
            "sequence": "A",
            "class": "",
            "description": "Pool of blood"
        },
        81: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "BRS1" /* ThingSprite.BRS1 */,
            "sequence": "A",
            "class": "",
            "description": "Pool of brains"
        },
        82: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "SGN2" /* ThingSprite.SGN2 */,
            "sequence": "A",
            "class": "WP1",
            "description": "Super shotgun"
        },
        83: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "MEGA" /* ThingSprite.MEGA */,
            "sequence": "ABCD",
            "class": "AP",
            "description": "Megasphere"
        },
        84: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "SSWV" /* ThingSprite.SSWV */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Wolfenstein SS"
        },
        85: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "TLMP" /* ThingSprite.TLMP */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Tall techno floor lamp"
        },
        86: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "TLP2" /* ThingSprite.TLP2 */,
            "sequence": "ABCD",
            "class": "O",
            "description": "Short techno floor lamp"
        },
        87: {
            "version": "2",
            "radius": 20,
            "height": 32,
            "sprite": "none3" /* ThingSprite.none3 */,
            "sequence": "-",
            "class": "",
            "description": "Spawn spot"
        },
        88: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "BBRN" /* ThingSprite.BBRN */,
            "sequence": "A+",
            "class": "O2*",
            "description": "Romero's head"
        },
        89: {
            "version": "2",
            "radius": 20,
            "height": 32,
            "sprite": "none1" /* ThingSprite.none1 */,
            "sequence": "-",
            "class": "",
            "description": "Monster spawner"
        },
        2001: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SHOT" /* ThingSprite.SHOT */,
            "sequence": "A",
            "class": "WP1",
            "description": "Shotgun"
        },
        2002: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "MGUN" /* ThingSprite.MGUN */,
            "sequence": "A",
            "class": "WP1",
            "description": "Chaingun"
        },
        2003: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "LAUN" /* ThingSprite.LAUN */,
            "sequence": "A",
            "class": "WP1",
            "description": "Rocket launcher"
        },
        2004: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "PLAS" /* ThingSprite.PLAS */,
            "sequence": "A",
            "class": "WP1",
            "description": "Plasma gun"
        },
        2005: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "CSAW" /* ThingSprite.CSAW */,
            "sequence": "A",
            "class": "WP2",
            "description": "Chainsaw"
        },
        2006: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "BFUG" /* ThingSprite.BFUG */,
            "sequence": "A",
            "class": "WP1",
            "description": "BFG9000"
        },
        2007: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "CLIP" /* ThingSprite.CLIP */,
            "sequence": "A",
            "class": "P1",
            "description": "Clip"
        },
        2008: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SHEL" /* ThingSprite.SHEL */,
            "sequence": "A",
            "class": "P1",
            "description": "4 shotgun shells"
        },
        2010: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "ROCK" /* ThingSprite.ROCK */,
            "sequence": "A",
            "class": "P1",
            "description": "Rocket"
        },
        2011: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "STIM" /* ThingSprite.STIM */,
            "sequence": "A",
            "class": "P3",
            "description": "Stimpack"
        },
        2012: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "MEDI" /* ThingSprite.MEDI */,
            "sequence": "A",
            "class": "P3",
            "description": "Medikit"
        },
        2013: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SOUL" /* ThingSprite.SOUL */,
            "sequence": "ABCDCB",
            "class": "AP",
            "description": "Supercharge"
        },
        2014: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BON1" /* ThingSprite.BON1 */,
            "sequence": "ABCDCB",
            "class": "AP",
            "description": "Health bonus"
        },
        2015: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BON2" /* ThingSprite.BON2 */,
            "sequence": "ABCDCB",
            "class": "AP",
            "description": "Armor bonus"
        },
        2018: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "ARM1" /* ThingSprite.ARM1 */,
            "sequence": "AB",
            "class": "P1",
            "description": "Armor"
        },
        2019: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "ARM2" /* ThingSprite.ARM2 */,
            "sequence": "AB",
            "class": "P2",
            "description": "Megaarmor"
        },
        2022: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "PINV" /* ThingSprite.PINV */,
            "sequence": "ABCD",
            "class": "AP",
            "description": "Invulnerability"
        },
        2023: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "PSTR" /* ThingSprite.PSTR */,
            "sequence": "A",
            "class": "AP",
            "description": "Berserk"
        },
        2024: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PINS" /* ThingSprite.PINS */,
            "sequence": "ABCD",
            "class": "AP",
            "description": "Partial invisibility"
        },
        2025: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SUIT" /* ThingSprite.SUIT */,
            "sequence": "A",
            "class": "P",
            "description": "Radiation shielding suit"
        },
        2026: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PMAP" /* ThingSprite.PMAP */,
            "sequence": "ABCDCB",
            "class": "AP1",
            "description": "Computer area map"
        },
        2028: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "COLU" /* ThingSprite.COLU */,
            "sequence": "A",
            "class": "O",
            "description": "Floor lamp"
        },
        2035: {
            "version": "S",
            "radius": 10,
            "height": 42,
            "sprite": "BAR1" /* ThingSprite.BAR1 */,
            "sequence": "AB",
            "class": "O*",
            "description": "Exploding barrel"
        },
        2045: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PVIS" /* ThingSprite.PVIS */,
            "sequence": "AB",
            "class": "AP",
            "description": "Light amplification visor"
        },
        2046: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BROK" /* ThingSprite.BROK */,
            "sequence": "A",
            "class": "P1",
            "description": "Box of rockets"
        },
        2047: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "CELL" /* ThingSprite.CELL */,
            "sequence": "A",
            "class": "P1",
            "description": "Energy cell"
        },
        2048: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "AMMO" /* ThingSprite.AMMO */,
            "sequence": "A",
            "class": "P1",
            "description": "Box of bullets"
        },
        2049: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SBOX" /* ThingSprite.SBOX */,
            "sequence": "A",
            "class": "P1",
            "description": "Box of shotgun shells"
        },
        3001: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "TROO" /* ThingSprite.TROO */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Imp"
        },
        3002: {
            "version": "S",
            "radius": 30,
            "height": 56,
            "sprite": "SARG" /* ThingSprite.SARG */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Demon"
        },
        3003: {
            "version": "S",
            "radius": 24,
            "height": 64,
            "sprite": "BOSS" /* ThingSprite.BOSS */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Baron of Hell"
        },
        3004: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "POSS" /* ThingSprite.POSS */,
            "sequence": "AB+",
            "class": "MO*",
            "description": "Zombieman"
        },
        3005: {
            "version": "R",
            "radius": 31,
            "height": 56,
            "sprite": "HEAD" /* ThingSprite.HEAD */,
            "sequence": "A+",
            "class": "MO*^",
            "description": "Cacodemon"
        },
        3006: {
            "version": "R",
            "radius": 16,
            "height": 56,
            "sprite": "SKUL" /* ThingSprite.SKUL */,
            "sequence": "AB+",
            "class": "M1O*^",
            "description": "Lost soul"
        }
    };
}
class mat4 {
    static create() {
        const out = new Float32Array(16);
        out[0] = 1;
        out[5] = 1;
        out[10] = 1;
        out[15] = 1;
        return out;
    }
    /**
     * Generates a perspective projection matrix with the given bounds.
     * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
     * which matches WebGL/OpenGL's clip volume.
     * Passing null/undefined/no value for far will generate infinite projection matrix.
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {number} fovy Vertical field of view in radians
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum, can be null or Infinity
     * @returns {mat4} out
     */
    static perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[15] = 0;
        if (far != null && far !== Infinity) {
            const nf = 1 / (near - far);
            out[10] = (far + near) * nf;
            out[14] = 2 * far * near * nf;
        }
        else {
            out[10] = -1;
            out[14] = -2 * near;
        }
        return out;
    }
    /**
     * Translate a mat4 by the given vector
     *
     * @param {mat4} out the receiving matrix
     * @param {ReadonlyMat4} a the matrix to translate
     * @param {ReadonlyVec3} v vector to translate by
     * @returns {mat4} out
     */
    static translate(out, a, v) {
        let x = v[0], y = v[1], z = v[2];
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;
        if (a === out) {
            out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
            out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
            out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
            out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        }
        else {
            a00 = a[0];
            a01 = a[1];
            a02 = a[2];
            a03 = a[3];
            a10 = a[4];
            a11 = a[5];
            a12 = a[6];
            a13 = a[7];
            a20 = a[8];
            a21 = a[9];
            a22 = a[10];
            a23 = a[11];
            out[0] = a00;
            out[1] = a01;
            out[2] = a02;
            out[3] = a03;
            out[4] = a10;
            out[5] = a11;
            out[6] = a12;
            out[7] = a13;
            out[8] = a20;
            out[9] = a21;
            out[10] = a22;
            out[11] = a23;
            out[12] = a00 * x + a10 * y + a20 * z + a[12];
            out[13] = a01 * x + a11 * y + a21 * z + a[13];
            out[14] = a02 * x + a12 * y + a22 * z + a[14];
            out[15] = a03 * x + a13 * y + a23 * z + a[15];
        }
        return out;
    }
}
class UserFileInput {
    constructor(target, loaded) {
        target.addEventListener("dragover", (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        target.addEventListener("dragleave", (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        target.addEventListener("drop", (event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            const reader = new FileReader();
            reader.addEventListener("loadend", (_loadEvent) => {
                loaded(reader.result);
            });
            reader.readAsArrayBuffer(file);
        });
    }
}
class MapView {
    canvas;
    wad;
    isMouseDown = false;
    currentMap;
    awaitingRender = false;
    constructor(canvas) {
        this.canvas = canvas;
        this.wad = new Promise((resolve, _reject) => {
            canvas.addEventListener("dblclick", async (_event) => {
                if (this.wad != null)
                    return;
                try {
                    canvas.classList.add("loading");
                    const response = await fetch("./doom1.wad");
                    if (response.status != 200) {
                        alert(`Download failed :(  ${response.statusText} (${response.status}) ${await response.text()}`);
                        return;
                    }
                    const blob = await response.blob();
                    resolve(new WadFile(await blob.arrayBuffer()));
                }
                finally {
                    canvas.classList.remove("loading");
                }
            });
            new UserFileInput(canvas, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });
        document.addEventListener("wheel", (e) => this.onWheel(e));
        window.addEventListener("resize", (e) => this.onResize(e));
        canvas.addEventListener("mousedown", (e) => {
            this.isMouseDown = true;
            this.onMouseDown(e);
        });
        canvas.addEventListener("mouseup", (e) => {
            this.isMouseDown = false;
            this.onMouseUp(e);
        });
        canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
        canvas.addEventListener("dblclick", (e) => this.onDoubleClick(e));
        document.addEventListener("keyup", (e) => this.onKeyUp(e));
    }
    redraw() {
        if (this.awaitingRender)
            return;
        this.awaitingRender = true;
        requestAnimationFrame(() => {
            this.draw();
            this.awaitingRender = false;
        });
    }
}
function matVecMul(m, v) {
    return {
        x: m.a * v.x + m.c * v.y + m.e,
        y: m.b * v.x + m.d * v.y + m.f
    };
}
class Triangulation {
    static getRectangles(map) {
        let rectangles = [];
        for (const linedef of map.linedefs) {
            const a = linedef.vertexA;
            const b = linedef.vertexB;
            const sectora = linedef.sidedefLeft?.sector;
            const sectorb = linedef.sidedefRight?.sector;
            const floora = sectora?.floorHeight ?? 0;
            const floorb = sectorb?.floorHeight ?? 0;
            const ceilinga = sectora?.ceilingHeight ?? 0;
            const ceilingb = sectorb?.ceilingHeight ?? 0;
            // Triangulation.rectToTriangleVertical(triangles, a.x, a.y, b.x, b.y, floora, floorb);
            // Triangulation.rectToTriangleVertical(triangles, a.x, a.y, b.x, b.y, ceilinga, ceilingb);
            const bl = { x: a.x, y: a.y, z: floora };
            const br = { x: a.x, y: a.y, z: ceilingb };
            const tl = { x: b.x, y: b.y, z: floora };
            const tr = { x: b.x, y: b.y, z: ceilingb };
            rectangles.push({
                x: { x: a.x, y: a.y, z: floora },
                y: { x: a.x, y: a.y, z: floora },
                x2: { x: b.x, y: b.y, z: floorb },
                y2: { x: b.x, y: b.y, z: floorb }
            });
            rectangles.push({
                x: { x: a.x, y: a.y, z: ceilinga },
                y: { x: a.x, y: a.y, z: ceilinga },
                x2: { x: b.x, y: b.y, z: ceilingb },
                y2: { x: b.x, y: b.y, z: ceilingb }
            });
        }
        for (const [sectorIndex, linedefs] of Object.entries(map.linedefsPerSector)) {
            const vertices = [];
            const usedVertixes = new Set();
            for (const linedef of linedefs) {
                for (const vertex of [linedef.vertexA, linedef.vertexB]) {
                    const vertexValue = (vertex.x << 16) | vertex.y;
                    if (!usedVertixes.has(vertexValue)) {
                        usedVertixes.add(vertexValue);
                        vertices.push(vertex);
                    }
                }
            }
            const sector = map.sectors[parseInt(sectorIndex)];
            const floorHeight = sector.floorHeight;
            let x = Number.POSITIVE_INFINITY;
            let y = Number.POSITIVE_INFINITY;
            let dx = Number.NEGATIVE_INFINITY;
            let dy = Number.NEGATIVE_INFINITY;
            for (const linedef of linedefs) {
                x = Math.min(x, linedef.vertexA.x);
                x = Math.min(x, linedef.vertexB.x);
                y = Math.min(y, linedef.vertexA.y);
                y = Math.min(y, linedef.vertexB.y);
                dx = Math.max(dx, linedef.vertexA.x);
                dx = Math.max(dx, linedef.vertexB.x);
                dy = Math.max(dy, linedef.vertexA.y);
                dy = Math.max(dy, linedef.vertexB.y);
            }
            if (x == Number.POSITIVE_INFINITY ||
                y == Number.POSITIVE_INFINITY ||
                dx == Number.NEGATIVE_INFINITY ||
                dy == Number.NEGATIVE_INFINITY) {
                continue;
            }
            // Triangulation.rectToTriangleHorizontal(triangles, x, y, dx, dy, floorHeight);
            rectangles.push({
                x: { x: x, y: y, z: floorHeight },
                y: { x: x, y: dy, z: floorHeight },
                x2: { x: dx, y: y, z: floorHeight },
                y2: { x: dx, y: dy, z: floorHeight }
            });
        }
        return rectangles;
    }
    static rectToTriangleHorizontal(triangles, x, y, x2, y2, z) {
        const bl = { x: x, y: y, z: z };
        const tl = { x: x, y: y2, z: z };
        const br = { x: x2, y: y, z: z };
        const tr = { x: x2, y: y2, z: z };
        triangles.push({ v1: bl, v2: tl, v3: br });
        triangles.push({ v1: tr, v2: tl, v3: br });
    }
    static rectToTriangleVertical(triangles, x, y, x2, y2, z, z2) {
        const bl = { x: x, y: y, z: z };
        const br = { x: x, y: y, z: z2 };
        const tl = { x: x2, y: y2, z: z };
        const tr = { x: x2, y: y2, z: z2 };
        triangles.push({ v1: br, v2: bl, v3: tr });
        triangles.push({ v1: bl, v2: tl, v3: tr });
    }
    static rectToTriangle(triangles, rect) {
        if (rect.x.z == rect.x2.z) {
            Triangulation.rectToTriangleHorizontal(triangles, rect.x.x, rect.x.y, rect.x2.x, rect.y2.y, rect.x.z);
        }
        else {
            Triangulation.rectToTriangleVertical(triangles, rect.x.x, rect.x.y, rect.x2.x, rect.x2.y, rect.x.z, rect.x2.z);
        }
    }
    static getStl(triangles) {
        let stlString = "solid doom_map\n";
        for (let triangle of triangles) {
            const v1 = triangle.v1;
            const v2 = triangle.v2;
            const v3 = triangle.v3;
            stlString += `facet normal 0 0 0\n`;
            stlString += `    outer loop\n`;
            stlString += `        vertex ${v1.x} ${v1.y} ${v1.z}\n`;
            stlString += `        vertex ${v2.x} ${v2.y} ${v2.z}\n`;
            stlString += `        vertex ${v3.x} ${v3.y} ${v3.z}\n`;
            stlString += `    endloop\n`;
            stlString += `endfacet\n`;
        }
        stlString += "endsolid doom_map\n";
        return stlString;
    }
}
// class MapView3D extends MapView {
// }
class MapView2D extends MapView {
    thingHitTester;
    canvasWidth;
    canvasHeight;
    highlightedThingIndex = -1;
    dashedStrokeOffset = 0;
    levelIndex = 0;
    viewMatrix = new DOMMatrix([1, 0, 0, -1, 0, 0]);
    constructor(canvas) {
        super(canvas);
        canvas.style.position = "fixed";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.thingHitTester = new HitTester(this.viewMatrix);
        setInterval(() => {
            if (this.highlightedThingIndex == -1)
                return;
            --this.dashedStrokeOffset;
            this.redraw();
        }, 40);
        this.redraw();
    }
    onWheel(event) {
        if (this.currentMap == null)
            return;
        const pos = matVecMul(this.viewMatrix.inverse(), {
            x: event.clientX * 1,
            y: event.clientY * 1
        });
        const speed = event.shiftKey ? 0.15 : 0.08;
        const scale = 1 + (event.deltaY < 0 ? speed : -speed);
        this.viewMatrix.translateSelf(pos.x, pos.y);
        this.viewMatrix.scaleSelf(scale);
        this.viewMatrix.translateSelf(-pos.x, -pos.y);
        this.redraw();
    }
    onResize(event) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.redraw();
    }
    onMouseDown(_event) { }
    onMouseUp(_event) { }
    onMouseMove(event) {
        if (this.currentMap == null)
            return;
        const hitResult = this.thingHitTester.hitTest(event.offsetX, event.offsetY);
        const newHighlightedIndex = hitResult?.index ?? -1;
        if (this.highlightedThingIndex != newHighlightedIndex) {
            console.log(hitResult?.info, hitResult?.info?.description);
            this.highlightedThingIndex = newHighlightedIndex;
            this.dashedStrokeOffset = 0;
            this.redraw();
        }
        if (this.isMouseDown) {
            const inverse = this.viewMatrix.inverse();
            const pointDelta = new DOMPoint(event.movementX, event.movementY).matrixTransform(inverse);
            const pointOrigin = new DOMPoint(0, 0).matrixTransform(inverse);
            this.viewMatrix.translateSelf(pointDelta.x - pointOrigin.x, pointDelta.y - pointOrigin.y);
            this.redraw();
        }
    }
    onDoubleClick(_event) {
        const map = this.currentMap;
        if (map == null) {
            console.error("No map!");
            return;
        }
        const triangles = [];
        const rects = Triangulation.getRectangles(map);
        for (const rect of rects) {
            Triangulation.rectToTriangle(triangles, rect);
        }
        const stl = Triangulation.getStl(triangles);
        console.log(stl);
    }
    onKeyUp(event) {
        switch (event.key) {
            case "-":
                this.levelIndex = Math.max(this.levelIndex - 1, 0);
                this.displayLevel(this.levelIndex);
                break;
            case "+":
                this.levelIndex = this.levelIndex + 1;
                this.displayLevel(this.levelIndex);
                break;
        }
    }
    drawHelpText2d(context) {
        function drawCentered(text, width, height) {
            const metrics = context.measureText(text);
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            context.fillText(text, width / 2 - metrics.width / 2, height / 2 - actualHeight / 2, width);
        }
        function drawBottomLeft(text, width, height) {
            const lines = text.split("\n");
            const linePadding = 5;
            let yoffset = 0;
            const heights = lines.map((t) => {
                const metrics = context.measureText(t);
                const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + linePadding;
                yoffset += height;
                return height;
            });
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                context.fillText(line, 0, height - yoffset, width);
                yoffset -= heights[i];
            }
        }
        context.setTransform(undefined);
        context.font = "40px serif";
        drawCentered("Drag & Drop WAD", this.canvasWidth, this.canvasHeight);
        context.font = "20px serif";
        drawCentered("Or double click to load the shareware WAD", this.canvasWidth, this.canvasHeight + 40);
        context.font = "20px serif";
        drawBottomLeft("Controls:\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse\nChange level: + and -", this.canvasWidth, this.canvasHeight);
    }
    draw() {
        const context = this.canvas.getContext("2d");
        context.setTransform(undefined);
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        context.setTransform(this.viewMatrix);
        context.imageSmoothingQuality = "high";
        context.imageSmoothingEnabled = true;
        const map = this.currentMap;
        if (map == null) {
            this.drawHelpText2d(context);
            return;
        }
        // Draws a circle at the origin.
        if (true) {
            context.beginPath();
            context.fillStyle = "red";
            context.arc(0, 0, 20, 0, Math.PI * 2);
            context.fill();
        }
        context.lineWidth = 1;
        let i = 0;
        for (const linedef of map.linedefs) {
            context.beginPath();
            if (linedef.hasFlag(32 /* LinedefFlags.SECRET */)) {
                context.strokeStyle = "purple";
            }
            else if (linedef.hasFlag(128 /* LinedefFlags.DONTDRAW */)) {
                context.strokeStyle = "grey";
            }
            else {
                context.strokeStyle = "black";
            }
            context.moveTo(linedef.vertexA.x, linedef.vertexA.y);
            context.lineTo(linedef.vertexB.x, linedef.vertexB.y);
            context.stroke();
        }
        // Not all entries are used as index values, so we must grab this while enumerating.
        let selectedThingEntry = null;
        let thingIndex = 0;
        this.thingHitTester.startUpdate(map.things.length);
        for (const thing of map.things) {
            if (thing.description == null) {
                continue;
            }
            // Are the thing's x/y actually the centers?
            const centerX = thing.x;
            const centerY = thing.y;
            const radius = thing.description.radius;
            const isHighlighted = thingIndex == this.highlightedThingIndex;
            this.thingHitTester.addPoint(centerX, centerY, radius, thing);
            ++thingIndex;
            if (isHighlighted) {
                selectedThingEntry = thing;
                continue;
            }
            if (thing.type == 2014 /* ThingsType.HealthBonus */) {
                context.beginPath();
                context.fillStyle = "blue";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                context.fill();
            }
            else {
                context.beginPath();
                context.strokeStyle = "green";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                // context.moveTo(centerX, centerY);
                // const lineLength = thing.description.radius * this.scale * 2;
                // context.lineTo(
                context.stroke();
            }
        }
        // Draw last to allow the box to have highest Z order.
        if (selectedThingEntry != null) {
            const thing = selectedThingEntry;
            const centerX = thing.x;
            const centerY = thing.y;
            const radius = thing.description.radius;
            const point = new DOMPoint(centerX, centerY);
            const transformedPoint = point.matrixTransform(this.viewMatrix);
            context.beginPath();
            context.strokeStyle = "red";
            context.setLineDash([6, 6]);
            context.lineDashOffset = this.dashedStrokeOffset;
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
            context.stroke();
            context.setLineDash([]);
            context.setTransform(undefined);
            context.beginPath();
            const boxX = transformedPoint.x - radius;
            const boxY = transformedPoint.y + radius;
            context.clearRect(boxX, boxY, 300, 100);
            context.rect(boxX, boxY, 300, 100);
            context.font = "12pt serif";
            context.fillStyle = "Black";
            context.textBaseline = "top";
            context.fillText(thing.description?.description ?? "", boxX + 5, boxY + 5, 300);
            context.stroke();
        }
        context.setTransform(undefined);
        context.font = "12pt serif";
        context.fillStyle = "Black";
        context.textBaseline = "top";
        context.fillText(this.currentMap?.displayName ?? "Unknown", 0, 0, 300);
    }
    async displayLevel(index) {
        this.levelIndex = index;
        const wad = await this.wad;
        this.currentMap = wad.maps[index] ?? wad.maps[0];
        const player1Start = this.currentMap.things.find((t) => t.type == 1 /* ThingsType.PlayerOneStart */);
        this.currentMap.linedefs;
        if (player1Start != undefined) {
            // Eh. Centering on the player start isn't the best, but might be improvable.
            // this.viewMatrix.translateSelf(-player1Start.x, -player1Start.y);
            // this.redraw();
        }
        this.fitLevelToView(this.currentMap);
    }
    fitLevelToView(map) {
        let x = Number.POSITIVE_INFINITY;
        let y = Number.POSITIVE_INFINITY;
        let dx = Number.NEGATIVE_INFINITY;
        let dy = Number.NEGATIVE_INFINITY;
        for (const linedef of map.linedefs) {
            x = Math.min(x, linedef.vertexA.x);
            x = Math.min(x, linedef.vertexB.x);
            y = Math.min(y, linedef.vertexA.y * 1);
            y = Math.min(y, linedef.vertexB.y * 1);
            dx = Math.max(dx, linedef.vertexA.x);
            dx = Math.max(dx, linedef.vertexB.x);
            dy = Math.max(dy, linedef.vertexA.y * 1);
            dy = Math.max(dy, linedef.vertexB.y * 1);
        }
        const canvasWidth = this.canvasWidth;
        const canvasHeight = this.canvasHeight;
        const scaleX = canvasWidth / (dx - x);
        const scaleY = canvasHeight / (dy - y);
        const scale = Math.min(scaleX, scaleY);
        let translateX = (canvasWidth - (dx - x) * scale) / 2 - x * scale;
        let translateY = (canvasHeight - (dy - y) * scale) / 2 - y * scale;
        this.viewMatrix.a = scale;
        this.viewMatrix.d = scale;
        this.viewMatrix.e = translateX;
        this.viewMatrix.f = translateY;
        this.redraw();
    }
}
class MapView3D extends MapView {
    constructor(canvas) {
        super(canvas);
        canvas.style.position = "fixed";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.redraw();
    }
    async displayLevel(index) {
        const wad = await this.wad;
        this.currentMap = wad.maps[index] ?? wad.maps[0];
    }
    draw() { }
    onWheel(_event) { }
    onResize(_event) { }
    onMouseDown(_event) { }
    onMouseUp(_event) { }
    onMouseMove(_event) { }
    onDoubleClick(_event) { }
    onKeyUp(_event) { }
}
const el = document.querySelector("canvas");
const mapView = new MapView2D(el);
mapView.displayLevel(0);
class BinaryFileReader {
    position = 0;
    u8;
    u16;
    u32;
    i16;
    storedPositions = [];
    static textDecoder = new TextDecoder("us-ascii"); // Correct encoding?
    constructor(file) {
        // Doing this is pretty silly... verify there's even unaligned values.
        function createOffsetArrays(count, ctor) {
            const arrays = [];
            const roundedFile = file.slice(0, file.byteLength - count - file.byteLength % count);
            for (let i = 0; i < count; ++i) {
                arrays.push(ctor(roundedFile.slice(i, roundedFile.byteLength - (count - i % count))));
            }
            return arrays;
        }
        this.u8 = new Uint8Array(file);
        this.u16 = createOffsetArrays(2, (buff) => new Uint16Array(buff));
        this.u32 = createOffsetArrays(4, (buff) => new Uint32Array(buff));
        this.i16 = createOffsetArrays(2, (buff) => new Int16Array(buff));
    }
    seek(position) {
        this.position = position;
    }
    pushPosition(newPosition) {
        this.storedPositions.push(this.position);
        if (newPosition !== undefined) {
            this.position = newPosition;
        }
    }
    popPosition() {
        this.position = this.storedPositions.pop();
    }
    readU8() {
        const result = this.u8[this.position];
        ++this.position;
        return result;
    }
    readU16() {
        const offset = this.position % 2;
        const result = this.u16[offset][(this.position - offset) / 2];
        this.position += 2;
        return result;
    }
    readU32() {
        const offset = this.position % 4;
        const result = this.u32[offset][(this.position - offset) / 4];
        this.position += 4;
        return result;
    }
    readI16() {
        const offset = this.position % 2;
        const result = this.i16[offset][(this.position - offset) / 2];
        this.position += 2;
        return result;
    }
    readArray(length) {
        const array = this.u8.slice(this.position, this.position + length);
        this.position += length;
        return array;
    }
    readFixedLengthString(length) {
        const start = this.position;
        let sub = 0;
        for (let i = 0; i < length; ++i) {
            if (this.readU8() == 0) {
                sub = 1;
                break;
            }
        }
        const slice = this.u8.slice(start, this.position - sub);
        const result = BinaryFileReader.textDecoder.decode(slice);
        this.position = start + length;
        return result;
    }
}
class WadHeader {
    identifier;
    numlumps;
    infotableofs;
    constructor(reader) {
        this.identifier = reader.readU32();
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
    }
}
// https://doomwiki.org/wiki/WAD
class WadFile {
    wadInfo;
    directory;
    maps;
    patches;
    reader;
    constructor(file) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadHeader(this.reader);
        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.readAll(this, this.reader, this.directory);
        this.patches = PatchEntry.readAll(this, this.reader);
    }
}
class BoundingBox {
    top;
    bottom;
    left;
    right;
    constructor(reader) {
        this.top = reader.readI16();
        this.bottom = reader.readI16();
        this.left = reader.readI16();
        this.right = reader.readI16();
    }
}
// https://doomwiki.org/wiki/Node
class NodeEntry {
    x;
    y;
    dx;
    dy;
    boundingBoxLeft;
    boundingBoxRight;
    rightChild;
    leftChild;
    constructor(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.dx = reader.readI16();
        this.dy = reader.readI16();
        this.boundingBoxLeft = new BoundingBox(reader);
        this.boundingBoxRight = new BoundingBox(reader);
        this.rightChild = reader.readI16();
        this.leftChild = reader.readI16();
    }
    static loadAll(reader, nodeEntry) {
        return nodeEntry.readAll(reader, (reader) => new NodeEntry(reader));
    }
}
// "lump"
class DirectoryEntry {
    filepos;
    size;
    name;
    static mapNameExpression = /^MAP\d+$|^E\d+M\d+$/;
    constructor(reader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixedLengthString(8);
    }
    static read(reader, count) {
        const entries = [];
        for (let i = 0; i < count; ++i) {
            entries.push(new DirectoryEntry(reader));
        }
        return entries;
    }
    isMapEntry() {
        return DirectoryEntry.mapNameExpression.test(this.name);
    }
    readAll(reader, read) {
        const results = [];
        reader.pushPosition(this.filepos);
        const end = reader.position + this.size;
        while (reader.position <= end) {
            results.push(read(reader));
        }
        reader.popPosition();
        return results;
    }
}
class Vertex {
    x;
    y;
    constructor(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
    }
    static readAll(entry, reader) {
        return entry.readAll(reader, (reader) => new Vertex(reader));
    }
    static areEqual(a, b) {
        return a.x == b.x && a.y == b.y;
    }
}
class ThingEntry {
    x;
    y;
    angle;
    type;
    spawnFlags;
    description;
    constructor(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.angle = reader.readU16();
        this.type = reader.readU16();
        this.spawnFlags = reader.readU16();
        this.description = Things.descriptions[this.type];
        if (this.description == null) {
            console.info("Unknown thing type", this);
        }
    }
    static readAll(entry, reader) {
        return entry.readAll(reader, (reader) => new ThingEntry(reader));
    }
}
class LinedefEntry {
    map;
    vertexAIndex;
    vertexBIndex;
    flags; // u16
    linetype;
    tag;
    sidedefRightIndex;
    sidedefLeftIndex;
    get vertexA() { return this.map.vertexes[this.vertexAIndex]; }
    get vertexB() { return this.map.vertexes[this.vertexBIndex]; }
    get sidedefRight() { return this.map.sidedefs[this.sidedefRightIndex]; }
    get sidedefLeft() { return this.sidedefLeftIndex == 0xFFFF ? null : this.map.sidedefs[this.sidedefLeftIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.vertexAIndex = reader.readU16();
        this.vertexBIndex = reader.readU16();
        this.flags = reader.readU16();
        this.linetype = reader.readU16();
        this.tag = reader.readU16();
        this.sidedefRightIndex = reader.readU16();
        this.sidedefLeftIndex = reader.readU16();
    }
    hasFlag(flag) {
        return (this.flags & flag) == flag;
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new LinedefEntry(map, reader));
    }
    static areEqual(a, b) {
        return Vertex.areEqual(a.vertexA, b.vertexA) && Vertex.areEqual(a.vertexB, b.vertexB);
    }
}
// https://doomwiki.org/wiki/Sidedef
class SideDefEntry {
    map;
    textureXOffset;
    textureYOffset;
    textureNameUpper;
    textureNameLower;
    textureNameMiddle;
    sectorIndex;
    get textureUpper() { return this.map.wadFile.patches[this.textureNameUpper]; }
    get textureLower() { return this.map.wadFile.patches[this.textureNameLower]; }
    get textureMiddle() { return this.map.wadFile.patches[this.textureNameMiddle]; }
    get sector() { return this.map.sectors[this.sectorIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.textureXOffset = reader.readI16();
        this.textureYOffset = reader.readI16();
        this.textureNameUpper = reader.readFixedLengthString(8);
        this.textureNameLower = reader.readFixedLengthString(8);
        this.textureNameMiddle = reader.readFixedLengthString(8);
        this.sectorIndex = reader.readU16();
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SideDefEntry(map, reader));
    }
}
// https://doomwiki.org/wiki/Sector
class SectorEntry {
    map;
    floorHeight;
    ceilingHeight;
    textureNameFloor;
    textureNameCeiling;
    lightLevel;
    specialType;
    tag;
    get textureFloor() { return this.map.wadFile.patches[this.textureNameFloor]; }
    get textureCeiling() { return this.map.wadFile.patches[this.textureNameCeiling]; }
    constructor(map, reader) {
        this.map = map;
        this.floorHeight = reader.readI16();
        this.ceilingHeight = reader.readI16();
        this.textureNameFloor = reader.readFixedLengthString(8);
        this.textureNameCeiling = reader.readFixedLengthString(8);
        this.lightLevel = reader.readI16();
        this.specialType = reader.readI16();
        this.tag = reader.readI16();
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SectorEntry(map, reader));
    }
}
class SegmentEntry {
    map;
    vertextStartIndex;
    vertextEndIndex;
    angle;
    linedefIndex;
    direction; // Direction: 0 (same as linedef) or 1 (opposite of linedef)
    offset; // Offset: distance along linedef to start of seg
    get vertexes() { return this.map.vertexes.slice(this.vertextStartIndex, this.vertextEndIndex); }
    get linedef() { return this.map.linedefs[this.linedefIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.vertextStartIndex = reader.readI16();
        this.vertextEndIndex = reader.readI16();
        this.angle = reader.readI16();
        this.linedefIndex = reader.readI16();
        this.direction = reader.readI16();
        this.offset = reader.readI16();
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SegmentEntry(map, reader));
    }
}
class SubSectorEntry {
    segCount;
    firstSegIndex;
    segments;
    constructor(map, reader) {
        this.segCount = reader.readI16();
        this.firstSegIndex = reader.readI16();
        this.segments = map.segments.slice(this.firstSegIndex, this.segCount);
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SubSectorEntry(map, reader));
    }
}
class MapEntry {
    wadFile;
    name;
    displayName;
    entries;
    vertexes;
    linedefs;
    sidedefs;
    things;
    segments;
    subSectors;
    sectors;
    linedefsPerSector;
    reader;
    constructor(wadFile, reader, name, entries) {
        this.wadFile = wadFile;
        this.reader = reader;
        this.name = name;
        this.displayName = entries.map.name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LinedefEntry.readAll(this, entries.linedefs, reader);
        this.sidedefs = SideDefEntry.readAll(this, entries.sidedefs, reader);
        this.things = ThingEntry.readAll(entries.things, reader);
        this.segments = SegmentEntry.readAll(this, entries.segs, reader);
        this.subSectors = SubSectorEntry.readAll(this, entries.ssectors, reader);
        this.sectors = SectorEntry.readAll(this, entries.sectors, reader);
        // Must come after sectors are loaded.
        this.linedefsPerSector = this.getLinedefsPerSector();
    }
    getLinedefsPerSector() {
        const linedefsPerSector = {};
        for (const linedef of this.linedefs) {
            for (const sidedef of [linedef.sidedefLeft, linedef.sidedefRight]) {
                if (sidedef == null)
                    continue;
                let linedefs = linedefsPerSector[sidedef.sectorIndex];
                if (linedefs == null) {
                    linedefs = [];
                    linedefsPerSector[sidedef.sectorIndex] = linedefs;
                }
                linedefs.push(linedef);
            }
        }
        return linedefsPerSector;
    }
    getNodes() {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }
    static readAll(wadFile, reader, entries) {
        const maps = [];
        let i = 0;
        function demandNextEntry(type) {
            const next = entries[i + 1];
            if (next.name == type) {
                ++i;
                return next;
            }
            throw new Error(`Missing entry ${type}`);
        }
        for (; i < entries.length; ++i) {
            const entry = entries[i];
            if (entry.isMapEntry()) {
                maps.push(new MapEntry(wadFile, reader, entry.name, {
                    map: entry,
                    things: demandNextEntry("THINGS" /* MapEntryName.THINGS */),
                    linedefs: demandNextEntry("LINEDEFS" /* MapEntryName.LINEDEFS */),
                    sidedefs: demandNextEntry("SIDEDEFS" /* MapEntryName.SIDEDEFS */),
                    vertexes: demandNextEntry("VERTEXES" /* MapEntryName.VERTEXES */),
                    segs: demandNextEntry("SEGS" /* MapEntryName.SEGS */),
                    ssectors: demandNextEntry("SSECTORS" /* MapEntryName.SSECTORS */),
                    nodes: demandNextEntry("NODES" /* MapEntryName.NODES */),
                    sectors: demandNextEntry("SECTORS" /* MapEntryName.SECTORS */),
                    reject: demandNextEntry("REJECT" /* MapEntryName.REJECT */),
                    blockmap: demandNextEntry("BLOCKMAP" /* MapEntryName.BLOCKMAP */),
                }));
            }
        }
        // This should really be parsing out the numbers, but they should happen to order correctly regardless due
        // to leading 0 padding.
        return maps.sort((a, b) => a.name < b.name ? -1 : 1);
    }
}
// https://doomwiki.org/wiki/Picture_format
class PatchEntry {
    width;
    height;
    leftOffset;
    topOffset;
    columnofs;
    posts;
    constructor(reader, directoryEntry) {
        reader.position = directoryEntry.filepos;
        const relative = reader.position;
        this.width = reader.readU16();
        this.height = reader.readU16();
        this.leftOffset = reader.readI16();
        this.topOffset = reader.readI16();
        const columnofs = [];
        for (let i = 0; i < this.width; ++i) {
            columnofs.push(reader.readU32());
        }
        this.columnofs = columnofs;
        // Save position at the end of the patch entry.
        reader.pushPosition();
        const posts = [];
        for (const offset of columnofs) {
            reader.position = offset + relative;
            posts.push(new PatchPostEntry(reader));
        }
        this.posts = posts;
        reader.popPosition();
    }
    static readAll(file, reader) {
        const patches = {};
        const firstSpriteIndex = file.directory.findIndex((dir) => dir.name == "S_START" || dir.name == "SS_START");
        if (firstSpriteIndex == -1)
            return patches;
        for (let i = firstSpriteIndex + 1; i < file.directory.length; ++i) {
            const dir = file.directory[i];
            if (dir.name == "S_END" || dir.name == "SS_END")
                break;
            if (dir.size == 0) {
                console.info("Empty dir entry in sprite list?", dir);
                continue;
            }
            patches[dir.name] = new PatchEntry(reader, dir);
        }
        return patches;
    }
}
class PatchPostEntry {
    topdelta;
    length;
    // public readonly unused: u8;
    data;
    // public readonly unused2: u8;
    constructor(reader) {
        this.topdelta = reader.readU8();
        this.length = reader.readU8();
        reader.readU8(); // unused
        this.data = reader.readArray(this.length);
        reader.readU8(); // unused
    }
}
