interface ThingDescription {
    readonly version: string;
    readonly radius: number;
    readonly height: number;
    readonly sprite: ThingSprite;
    readonly sequence: string;
    readonly class: string;
    readonly description: string;
}

// https://doomwiki.org/wiki/Thing_types
// results = {};
//
// Array.from(document.querySelectorAll("table.wikitable")).forEach(t => {
//   const rows = t.querySelectorAll("tr");
//   for (const row of rows) {
//     const cells = row.querySelectorAll("td");
// 	 try {
// 		const id = parseInt(cells[0].innerText);
// 		results[id] = {
// 			version: cells[2].innerText,
// 			radius: parseInt(cells[3].innerText),
// 			height: parseInt(cells[4].innerText),
// 			sprite: cells[5].innerText,
// 			sequence: cells[6].innerText,
// 			class: cells[7].innerText,
// 			description: cells[8].innerText
// 		};
//   } catch {}
//   }
// })
//
// console.log(results);

enum ThingSprite {
    PLAY = "PLAY",
    BKEY = "BKEY",
    YKEY = "YKEY",
    SPID = "SPID",
    BPAK = "BPAK",
    SPOS = "SPOS",
    none = "none",
    RKEY = "RKEY",
    none4 = "none4",
    CYBR = "CYBR",
    CELP = "CELP",
    POSS = "POSS",
    TROO = "TROO",
    SARG = "SARG",
    HEAD = "HEAD",
    SKUL = "SKUL",
    POL5 = "POL5",
    POL1 = "POL1",
    POL6 = "POL6",
    POL4 = "POL4",
    POL2 = "POL2",
    POL3 = "POL3",
    COL1 = "COL1",
    COL2 = "COL2",
    COL3 = "COL3",
    COL4 = "COL4",
    CAND = "CAND",
    CBRA = "CBRA",
    COL5 = "COL5",
    COL6 = "COL6",
    RSKU = "RSKU",
    YSKU = "YSKU",
    BSKU = "BSKU",
    CEYE = "CEYE",
    FSKU = "FSKU",
    TRE1 = "TRE1",
    TBLU = "TBLU",
    TGRN = "TGRN",
    TRED = "TRED",
    SMIT = "SMIT",
    ELEC = "ELEC",
    GOR1 = "GOR1",
    GOR2 = "GOR2",
    GOR3 = "GOR3",
    GOR4 = "GOR4",
    GOR5 = "GOR5",
    TRE2 = "TRE2",
    SMBT = "SMBT",
    SMGT = "SMGT",
    SMRT = "SMRT",
    VILE = "VILE",
    CPOS = "CPOS",
    SKEL = "SKEL",
    FATT = "FATT",
    BSPI = "BSPI",
    BOS2 = "BOS2",
    FCAN = "FCAN",
    PAIN = "PAIN",
    KEEN = "KEEN",
    HDB1 = "HDB1",
    HDB2 = "HDB2",
    HDB3 = "HDB3",
    HDB4 = "HDB4",
    HDB5 = "HDB5",
    HDB6 = "HDB6",
    POB1 = "POB1",
    POB2 = "POB2",
    BRS1 = "BRS1",
    SGN2 = "SGN2",
    MEGA = "MEGA",
    SSWV = "SSWV",
    TLMP = "TLMP",
    TLP2 = "TLP2",
    none3 = "none3",
    BBRN = "BBRN",
    none1 = "none1",
    SHOT = "SHOT",
    MGUN = "MGUN",
    LAUN = "LAUN",
    PLAS = "PLAS",
    CSAW = "CSAW",
    BFUG = "BFUG",
    CLIP = "CLIP",
    SHEL = "SHEL",
    ROCK = "ROCK",
    STIM = "STIM",
    MEDI = "MEDI",
    SOUL = "SOUL",
    BON1 = "BON1",
    BON2 = "BON2",
    ARM1 = "ARM1",
    ARM2 = "ARM2",
    PINV = "PINV",
    PSTR = "PSTR",
    PINS = "PINS",
    SUIT = "SUIT",
    PMAP = "PMAP",
    COLU = "COLU",
    BAR1 = "BAR1",
    PVIS = "PVIS",
    BROK = "BROK",
    CELL = "CELL",
    AMMO = "AMMO",
    SBOX = "SBOX",
    BOSS = "BOSS",
    UNKNOWN = "UKNOWN",
}

const thingDescriptions: {[itemId: number]: ThingDescription} = {
    1: {
      "version": "S",
      "radius": 16,
      "height": 56,
      "sprite": ThingSprite.PLAY,
      "sequence": "A+",
      "class": "",
      "description": "Player 1 start"
    },
    2: {
      "version": "S",
      "radius": 16,
      "height": 56,
      "sprite": ThingSprite.PLAY,
      "sequence": "A+",
      "class": "",
      "description": "Player 2 start"
    },
    3: {
      "version": "S",
      "radius": 16,
      "height": 56,
      "sprite": ThingSprite.PLAY,
      "sequence": "A+",
      "class": "",
      "description": "Player 3 start"
    },
    4: {
      "version": "S",
      "radius": 16,
      "height": 56,
      "sprite": ThingSprite.PLAY,
      "sequence": "A+",
      "class": "",
      "description": "Player 4 start"
    },
    5: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BKEY,
      "sequence": "AB",
      "class": "P",
      "description": "Blue keycard"
    },
    6: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.YKEY,
      "sequence": "AB",
      "class": "P",
      "description": "Yellow keycard"
    },
    7: {
      "version": "R",
      "radius": 128,
      "height": 100,
      "sprite": ThingSprite.SPID,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Spiderdemon"
    },
    8: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BPAK,
      "sequence": "A",
      "class": "P",
      "description": "Backpack"
    },
    9: {
      "version": "S",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.SPOS,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Shotgun guy"
    },
    10: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PLAY,
      "sequence": "W",
      "class": "",
      "description": "Bloody mess"
    },
    11: {
      "version": "S",
      "radius": 16,
      "height": 56,
      "sprite": ThingSprite.none,
      "sequence": "-",
      "class": "",
      "description": "Deathmatch start"
    },
    12: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PLAY,
      "sequence": "W",
      "class": "",
      "description": "Bloody mess 2"
    },
    13: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.RKEY,
      "sequence": "AB",
      "class": "P",
      "description": "Red keycard"
    },
    14: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.none4,
      "sequence": "-",
      "class": "",
      "description": "Teleport landing"
    },
    15: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PLAY,
      "sequence": "N",
      "class": "",
      "description": "Dead player"
    },
    16: {
      "version": "R",
      "radius": 40,
      "height": 110,
      "sprite": ThingSprite.CYBR,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Cyberdemon"
    },
    17: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.CELP,
      "sequence": "A",
      "class": "P1",
      "description": "Energy cell pack"
    },
    18: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.POSS,
      "sequence": "L",
      "class": "",
      "description": "Dead former human"
    },
    19: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SPOS,
      "sequence": "L",
      "class": "",
      "description": "Dead former sergeant"
    },
    20: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.TROO,
      "sequence": "M",
      "class": "",
      "description": "Dead imp"
    },
    21: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SARG,
      "sequence": "N",
      "class": "",
      "description": "Dead demon"
    },
    22: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.HEAD,
      "sequence": "L",
      "class": "",
      "description": "Dead cacodemon"
    },
    23: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SKUL,
      "sequence": "K",
      "class": "",
      "description": "Dead lost soul (invisible)"
    },
    24: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.POL5,
      "sequence": "A",
      "class": "",
      "description": "Pool of blood and flesh"
    },
    25: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.POL1,
      "sequence": "A",
      "class": "O",
      "description": "Impaled human"
    },
    26: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.POL6,
      "sequence": "AB",
      "class": "O",
      "description": "Twitching impaled human"
    },
    27: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.POL4,
      "sequence": "A",
      "class": "O",
      "description": "Skull on a pole"
    },
    28: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.POL2,
      "sequence": "A",
      "class": "O",
      "description": "Five skulls \"shish kebab\""
    },
    29: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.POL3,
      "sequence": "AB",
      "class": "O",
      "description": "Pile of skulls and candles"
    },
    30: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COL1,
      "sequence": "A",
      "class": "O",
      "description": "Tall green pillar"
    },
    31: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COL2,
      "sequence": "A",
      "class": "O",
      "description": "Short green pillar"
    },
    32: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COL3,
      "sequence": "A",
      "class": "O",
      "description": "Tall red pillar"
    },
    33: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COL4,
      "sequence": "A",
      "class": "O",
      "description": "Short red pillar"
    },
    34: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.CAND,
      "sequence": "A",
      "class": "",
      "description": "Candle"
    },
    35: {
      "version": "S",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.CBRA,
      "sequence": "A",
      "class": "O",
      "description": "Candelabra"
    },
    36: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COL5,
      "sequence": "AB",
      "class": "O",
      "description": "Short green pillar with beating heart"
    },
    37: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COL6,
      "sequence": "A",
      "class": "O",
      "description": "Short red pillar with skull"
    },
    38: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.RSKU,
      "sequence": "AB",
      "class": "P",
      "description": "Red skull key"
    },
    39: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.YSKU,
      "sequence": "AB",
      "class": "P",
      "description": "Yellow skull key"
    },
    40: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BSKU,
      "sequence": "AB",
      "class": "P",
      "description": "Blue skull key"
    },
    41: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.CEYE,
      "sequence": "ABCB",
      "class": "O",
      "description": "Evil eye"
    },
    42: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.FSKU,
      "sequence": "ABC",
      "class": "O",
      "description": "Floating skull"
    },
    43: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.TRE1,
      "sequence": "A",
      "class": "O",
      "description": "Burnt tree"
    },
    44: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.TBLU,
      "sequence": "ABCD",
      "class": "O",
      "description": "Tall blue firestick"
    },
    45: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.TGRN,
      "sequence": "ABCD",
      "class": "O",
      "description": "Tall green firestick"
    },
    46: {
      "version": "S",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.TRED,
      "sequence": "ABCD",
      "class": "O",
      "description": "Tall red firestick"
    },
    47: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.SMIT,
      "sequence": "A",
      "class": "O",
      "description": "Brown stump"
    },
    48: {
      "version": "S",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.ELEC,
      "sequence": "A",
      "class": "O",
      "description": "Tall techno column"
    },
    49: {
      "version": "R",
      "radius": 16,
      "height": 68,
      "sprite": ThingSprite.GOR1,
      "sequence": "ABCB",
      "class": "O^",
      "description": "Hanging victim, twitching"
    },
    50: {
      "version": "R",
      "radius": 16,
      "height": 84,
      "sprite": ThingSprite.GOR2,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging victim, arms out"
    },
    51: {
      "version": "R",
      "radius": 16,
      "height": 84,
      "sprite": ThingSprite.GOR3,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging victim, one-legged"
    },
    52: {
      "version": "R",
      "radius": 16,
      "height": 68,
      "sprite": ThingSprite.GOR4,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging pair of legs"
    },
    53: {
      "version": "R",
      "radius": 16,
      "height": 52,
      "sprite": ThingSprite.GOR5,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging leg"
    },
    54: {
      "version": "R",
      "radius": 32,
      "height": 16,
      "sprite": ThingSprite.TRE2,
      "sequence": "A",
      "class": "O",
      "description": "Large brown tree"
    },
    55: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.SMBT,
      "sequence": "ABCD",
      "class": "O",
      "description": "Short blue firestick"
    },
    56: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.SMGT,
      "sequence": "ABCD",
      "class": "O",
      "description": "Short green firestick"
    },
    57: {
      "version": "R",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.SMRT,
      "sequence": "ABCD",
      "class": "O",
      "description": "Short red firestick"
    },
    58: {
      "version": "S",
      "radius": 30,
      "height": 56,
      "sprite": ThingSprite.SARG,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Spectre"
    },
    59: {
      "version": "R",
      "radius": 20,
      "height": 84,
      "sprite": ThingSprite.GOR2,
      "sequence": "A",
      "class": "^",
      "description": "Hanging victim, arms out"
    },
    60: {
      "version": "R",
      "radius": 20,
      "height": 68,
      "sprite": ThingSprite.GOR4,
      "sequence": "A",
      "class": "^",
      "description": "Hanging pair of legs"
    },
    61: {
      "version": "R",
      "radius": 20,
      "height": 52,
      "sprite": ThingSprite.GOR3,
      "sequence": "A",
      "class": "^",
      "description": "Hanging victim, one-legged"
    },
    62: {
      "version": "R",
      "radius": 20,
      "height": 52,
      "sprite": ThingSprite.GOR5,
      "sequence": "A",
      "class": "^",
      "description": "Hanging leg"
    },
    63: {
      "version": "R",
      "radius": 20,
      "height": 68,
      "sprite": ThingSprite.GOR1,
      "sequence": "ABCB",
      "class": "^",
      "description": "Hanging victim, twitching"
    },
    64: {
      "version": "2",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.VILE,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Arch-vile"
    },
    65: {
      "version": "2",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.CPOS,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Heavy weapon dude"
    },
    66: {
      "version": "2",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.SKEL,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Revenant"
    },
    67: {
      "version": "2",
      "radius": 48,
      "height": 64,
      "sprite": ThingSprite.FATT,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Mancubus"
    },
    68: {
      "version": "2",
      "radius": 64,
      "height": 64,
      "sprite": ThingSprite.BSPI,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Arachnotron"
    },
    69: {
      "version": "2",
      "radius": 24,
      "height": 64,
      "sprite": ThingSprite.BOS2,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Hell knight"
    },
    70: {
      "version": "2",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.FCAN,
      "sequence": "ABC",
      "class": "O",
      "description": "Burning barrel"
    },
    71: {
      "version": "2",
      "radius": 31,
      "height": 56,
      "sprite": ThingSprite.PAIN,
      "sequence": "A+",
      "class": "MO*^",
      "description": "Pain elemental"
    },
    72: {
      "version": "2",
      "radius": 16,
      "height": 72,
      "sprite": ThingSprite.KEEN,
      "sequence": "A+",
      "class": "MO*^",
      "description": "Commander Keen"
    },
    73: {
      "version": "2",
      "radius": 16,
      "height": 88,
      "sprite": ThingSprite.HDB1,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging victim, guts removed"
    },
    74: {
      "version": "2",
      "radius": 16,
      "height": 88,
      "sprite": ThingSprite.HDB2,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging victim, guts and brain removed"
    },
    75: {
      "version": "2",
      "radius": 16,
      "height": 64,
      "sprite": ThingSprite.HDB3,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging torso, looking down"
    },
    76: {
      "version": "2",
      "radius": 16,
      "height": 64,
      "sprite": ThingSprite.HDB4,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging torso, open skull"
    },
    77: {
      "version": "2",
      "radius": 16,
      "height": 64,
      "sprite": ThingSprite.HDB5,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging torso, looking up"
    },
    78: {
      "version": "2",
      "radius": 16,
      "height": 64,
      "sprite": ThingSprite.HDB6,
      "sequence": "A",
      "class": "O^",
      "description": "Hanging torso, brain removed"
    },
    79: {
      "version": "2",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.POB1,
      "sequence": "A",
      "class": "",
      "description": "Pool of blood"
    },
    80: {
      "version": "2",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.POB2,
      "sequence": "A",
      "class": "",
      "description": "Pool of blood"
    },
    81: {
      "version": "2",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BRS1,
      "sequence": "A",
      "class": "",
      "description": "Pool of brains"
    },
    82: {
      "version": "2",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SGN2,
      "sequence": "A",
      "class": "WP1",
      "description": "Super shotgun"
    },
    83: {
      "version": "2",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.MEGA,
      "sequence": "ABCD",
      "class": "AP",
      "description": "Megasphere"
    },
    84: {
      "version": "2",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.SSWV,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Wolfenstein SS"
    },
    85: {
      "version": "2",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.TLMP,
      "sequence": "ABCD",
      "class": "O",
      "description": "Tall techno floor lamp"
    },
    86: {
      "version": "2",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.TLP2,
      "sequence": "ABCD",
      "class": "O",
      "description": "Short techno floor lamp"
    },
    87: {
      "version": "2",
      "radius": 20,
      "height": 32,
      "sprite": ThingSprite.none3,
      "sequence": "-",
      "class": "",
      "description": "Spawn spot"
    },
    88: {
      "version": "2",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.BBRN,
      "sequence": "A+",
      "class": "O2*",
      "description": "Romero's head"
    },
    89: {
      "version": "2",
      "radius": 20,
      "height": 32,
      "sprite": ThingSprite.none1,
      "sequence": "-",
      "class": "",
      "description": "Monster spawner"
    },
    2001: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SHOT,
      "sequence": "A",
      "class": "WP1",
      "description": "Shotgun"
    },
    2002: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.MGUN,
      "sequence": "A",
      "class": "WP1",
      "description": "Chaingun"
    },
    2003: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.LAUN,
      "sequence": "A",
      "class": "WP1",
      "description": "Rocket launcher"
    },
    2004: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PLAS,
      "sequence": "A",
      "class": "WP1",
      "description": "Plasma gun"
    },
    2005: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.CSAW,
      "sequence": "A",
      "class": "WP2",
      "description": "Chainsaw"
    },
    2006: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BFUG,
      "sequence": "A",
      "class": "WP1",
      "description": "BFG9000"
    },
    2007: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.CLIP,
      "sequence": "A",
      "class": "P1",
      "description": "Clip"
    },
    2008: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SHEL,
      "sequence": "A",
      "class": "P1",
      "description": "4 shotgun shells"
    },
    2010: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.ROCK,
      "sequence": "A",
      "class": "P1",
      "description": "Rocket"
    },
    2011: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.STIM,
      "sequence": "A",
      "class": "P3",
      "description": "Stimpack"
    },
    2012: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.MEDI,
      "sequence": "A",
      "class": "P3",
      "description": "Medikit"
    },
    2013: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SOUL,
      "sequence": "ABCDCB",
      "class": "AP",
      "description": "Supercharge"
    },
    2014: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BON1,
      "sequence": "ABCDCB",
      "class": "AP",
      "description": "Health bonus"
    },
    2015: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BON2,
      "sequence": "ABCDCB",
      "class": "AP",
      "description": "Armor bonus"
    },
    2018: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.ARM1,
      "sequence": "AB",
      "class": "P1",
      "description": "Armor"
    },
    2019: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.ARM2,
      "sequence": "AB",
      "class": "P2",
      "description": "Megaarmor"
    },
    2022: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PINV,
      "sequence": "ABCD",
      "class": "AP",
      "description": "Invulnerability"
    },
    2023: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PSTR,
      "sequence": "A",
      "class": "AP",
      "description": "Berserk"
    },
    2024: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PINS,
      "sequence": "ABCD",
      "class": "AP",
      "description": "Partial invisibility"
    },
    2025: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SUIT,
      "sequence": "A",
      "class": "P",
      "description": "Radiation shielding suit"
    },
    2026: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PMAP,
      "sequence": "ABCDCB",
      "class": "AP1",
      "description": "Computer area map"
    },
    2028: {
      "version": "S",
      "radius": 16,
      "height": 16,
      "sprite": ThingSprite.COLU,
      "sequence": "A",
      "class": "O",
      "description": "Floor lamp"
    },
    2035: {
      "version": "S",
      "radius": 10,
      "height": 42,
      "sprite": ThingSprite.BAR1,
      "sequence": "AB",
      "class": "O*",
      "description": "Exploding barrel"
    },
    2045: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.PVIS,
      "sequence": "AB",
      "class": "AP",
      "description": "Light amplification visor"
    },
    2046: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.BROK,
      "sequence": "A",
      "class": "P1",
      "description": "Box of rockets"
    },
    2047: {
      "version": "R",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.CELL,
      "sequence": "A",
      "class": "P1",
      "description": "Energy cell"
    },
    2048: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.AMMO,
      "sequence": "A",
      "class": "P1",
      "description": "Box of bullets"
    },
    2049: {
      "version": "S",
      "radius": 20,
      "height": 16,
      "sprite": ThingSprite.SBOX,
      "sequence": "A",
      "class": "P1",
      "description": "Box of shotgun shells"
    },
    3001: {
      "version": "S",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.TROO,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Imp"
    },
    3002: {
      "version": "S",
      "radius": 30,
      "height": 56,
      "sprite": ThingSprite.SARG,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Demon"
    },
    3003: {
      "version": "S",
      "radius": 24,
      "height": 64,
      "sprite": ThingSprite.BOSS,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Baron of Hell"
    },
    3004: {
      "version": "S",
      "radius": 20,
      "height": 56,
      "sprite": ThingSprite.POSS,
      "sequence": "AB+",
      "class": "MO*",
      "description": "Zombieman"
    },
    3005: {
      "version": "R",
      "radius": 31,
      "height": 56,
      "sprite": ThingSprite.HEAD,
      "sequence": "A+",
      "class": "MO*^",
      "description": "Cacodemon"
    },
    3006: {
      "version": "R",
      "radius": 16,
      "height": 56,
      "sprite": ThingSprite.SKUL,
      "sequence": "AB+",
      "class": "M1O*^",
      "description": "Lost soul"
    }
  }
