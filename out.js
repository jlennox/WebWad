"use strict";
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
var ThingSprite;
(function (ThingSprite) {
    ThingSprite["PLAY"] = "PLAY";
    ThingSprite["BKEY"] = "BKEY";
    ThingSprite["YKEY"] = "YKEY";
    ThingSprite["SPID"] = "SPID";
    ThingSprite["BPAK"] = "BPAK";
    ThingSprite["SPOS"] = "SPOS";
    ThingSprite["none"] = "none";
    ThingSprite["RKEY"] = "RKEY";
    ThingSprite["none4"] = "none4";
    ThingSprite["CYBR"] = "CYBR";
    ThingSprite["CELP"] = "CELP";
    ThingSprite["POSS"] = "POSS";
    ThingSprite["TROO"] = "TROO";
    ThingSprite["SARG"] = "SARG";
    ThingSprite["HEAD"] = "HEAD";
    ThingSprite["SKUL"] = "SKUL";
    ThingSprite["POL5"] = "POL5";
    ThingSprite["POL1"] = "POL1";
    ThingSprite["POL6"] = "POL6";
    ThingSprite["POL4"] = "POL4";
    ThingSprite["POL2"] = "POL2";
    ThingSprite["POL3"] = "POL3";
    ThingSprite["COL1"] = "COL1";
    ThingSprite["COL2"] = "COL2";
    ThingSprite["COL3"] = "COL3";
    ThingSprite["COL4"] = "COL4";
    ThingSprite["CAND"] = "CAND";
    ThingSprite["CBRA"] = "CBRA";
    ThingSprite["COL5"] = "COL5";
    ThingSprite["COL6"] = "COL6";
    ThingSprite["RSKU"] = "RSKU";
    ThingSprite["YSKU"] = "YSKU";
    ThingSprite["BSKU"] = "BSKU";
    ThingSprite["CEYE"] = "CEYE";
    ThingSprite["FSKU"] = "FSKU";
    ThingSprite["TRE1"] = "TRE1";
    ThingSprite["TBLU"] = "TBLU";
    ThingSprite["TGRN"] = "TGRN";
    ThingSprite["TRED"] = "TRED";
    ThingSprite["SMIT"] = "SMIT";
    ThingSprite["ELEC"] = "ELEC";
    ThingSprite["GOR1"] = "GOR1";
    ThingSprite["GOR2"] = "GOR2";
    ThingSprite["GOR3"] = "GOR3";
    ThingSprite["GOR4"] = "GOR4";
    ThingSprite["GOR5"] = "GOR5";
    ThingSprite["TRE2"] = "TRE2";
    ThingSprite["SMBT"] = "SMBT";
    ThingSprite["SMGT"] = "SMGT";
    ThingSprite["SMRT"] = "SMRT";
    ThingSprite["VILE"] = "VILE";
    ThingSprite["CPOS"] = "CPOS";
    ThingSprite["SKEL"] = "SKEL";
    ThingSprite["FATT"] = "FATT";
    ThingSprite["BSPI"] = "BSPI";
    ThingSprite["BOS2"] = "BOS2";
    ThingSprite["FCAN"] = "FCAN";
    ThingSprite["PAIN"] = "PAIN";
    ThingSprite["KEEN"] = "KEEN";
    ThingSprite["HDB1"] = "HDB1";
    ThingSprite["HDB2"] = "HDB2";
    ThingSprite["HDB3"] = "HDB3";
    ThingSprite["HDB4"] = "HDB4";
    ThingSprite["HDB5"] = "HDB5";
    ThingSprite["HDB6"] = "HDB6";
    ThingSprite["POB1"] = "POB1";
    ThingSprite["POB2"] = "POB2";
    ThingSprite["BRS1"] = "BRS1";
    ThingSprite["SGN2"] = "SGN2";
    ThingSprite["MEGA"] = "MEGA";
    ThingSprite["SSWV"] = "SSWV";
    ThingSprite["TLMP"] = "TLMP";
    ThingSprite["TLP2"] = "TLP2";
    ThingSprite["none3"] = "none3";
    ThingSprite["BBRN"] = "BBRN";
    ThingSprite["none1"] = "none1";
    ThingSprite["SHOT"] = "SHOT";
    ThingSprite["MGUN"] = "MGUN";
    ThingSprite["LAUN"] = "LAUN";
    ThingSprite["PLAS"] = "PLAS";
    ThingSprite["CSAW"] = "CSAW";
    ThingSprite["BFUG"] = "BFUG";
    ThingSprite["CLIP"] = "CLIP";
    ThingSprite["SHEL"] = "SHEL";
    ThingSprite["ROCK"] = "ROCK";
    ThingSprite["STIM"] = "STIM";
    ThingSprite["MEDI"] = "MEDI";
    ThingSprite["SOUL"] = "SOUL";
    ThingSprite["BON1"] = "BON1";
    ThingSprite["BON2"] = "BON2";
    ThingSprite["ARM1"] = "ARM1";
    ThingSprite["ARM2"] = "ARM2";
    ThingSprite["PINV"] = "PINV";
    ThingSprite["PSTR"] = "PSTR";
    ThingSprite["PINS"] = "PINS";
    ThingSprite["SUIT"] = "SUIT";
    ThingSprite["PMAP"] = "PMAP";
    ThingSprite["COLU"] = "COLU";
    ThingSprite["BAR1"] = "BAR1";
    ThingSprite["PVIS"] = "PVIS";
    ThingSprite["BROK"] = "BROK";
    ThingSprite["CELL"] = "CELL";
    ThingSprite["AMMO"] = "AMMO";
    ThingSprite["SBOX"] = "SBOX";
    ThingSprite["BOSS"] = "BOSS";
    ThingSprite["UNKNOWN"] = "UKNOWN";
})(ThingSprite || (ThingSprite = {}));
const thingDescriptions = {
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
};
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
class UserFileReader {
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
            reader.addEventListener("loadend", (loadEvent) => {
                loaded(reader.result);
            });
            reader.readAsArrayBuffer(file);
        });
    }
}
class BinaryFileReader {
    position = 0;
    u8;
    u16;
    u32;
    i16;
    storedPositions = [];
    static textDecoder = new TextDecoder("us-ascii"); // Correct encoding?
    constructor(file) {
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
        return this;
    }
    pushPosition(newPosition) {
        this.storedPositions.push(this.position);
        this.position = newPosition;
        return this;
    }
    popPosition() {
        this.position = this.storedPositions.pop();
        return this;
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
    readFixLengthString(length) {
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
class WadInfo {
    identifier;
    numlumps;
    infotableofs;
    constructor(reader) {
        this.identifier = reader.readU32();
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
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
    static size = 28;
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
    static mapNameExpression = /^MAP\d\d$|^E\dM\d$/;
    constructor(reader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixLengthString(8);
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
        this.description = thingDescriptions[this.type];
    }
    static readAll(entry, reader) {
        return entry.readAll(reader, (reader) => new ThingEntry(reader));
    }
}
var LinedefFlags;
(function (LinedefFlags) {
    LinedefFlags[LinedefFlags["BLOCKING"] = 1] = "BLOCKING";
    LinedefFlags[LinedefFlags["BLOCKMONSTERS"] = 2] = "BLOCKMONSTERS";
    LinedefFlags[LinedefFlags["TWOSIDED"] = 4] = "TWOSIDED";
    LinedefFlags[LinedefFlags["DONTPEGTOP"] = 8] = "DONTPEGTOP";
    LinedefFlags[LinedefFlags["DONTPEGBOTTOM"] = 16] = "DONTPEGBOTTOM";
    LinedefFlags[LinedefFlags["SECRET"] = 32] = "SECRET";
    LinedefFlags[LinedefFlags["SOUNDBLOCK"] = 64] = "SOUNDBLOCK";
    LinedefFlags[LinedefFlags["DONTDRAW"] = 128] = "DONTDRAW";
    LinedefFlags[LinedefFlags["MAPPED"] = 256] = "MAPPED";
    LinedefFlags[LinedefFlags["REPEAT_SPECIAL"] = 512] = "REPEAT_SPECIAL";
    LinedefFlags[LinedefFlags["SPAC_Use"] = 1024] = "SPAC_Use";
    LinedefFlags[LinedefFlags["SPAC_MCross"] = 2048] = "SPAC_MCross";
    LinedefFlags[LinedefFlags["SPAC_Impact"] = 3072] = "SPAC_Impact";
    LinedefFlags[LinedefFlags["SPAC_Push"] = 4096] = "SPAC_Push";
    LinedefFlags[LinedefFlags["SPAC_PCross"] = 5120] = "SPAC_PCross";
    LinedefFlags[LinedefFlags["SPAC_UseThrough"] = 6144] = "SPAC_UseThrough";
    LinedefFlags[LinedefFlags["TRANSLUCENT"] = 4096] = "TRANSLUCENT";
    LinedefFlags[LinedefFlags["MONSTERSCANACTIVATE"] = 8192] = "MONSTERSCANACTIVATE";
    LinedefFlags[LinedefFlags["BLOCK_PLAYERS"] = 16384] = "BLOCK_PLAYERS";
    LinedefFlags[LinedefFlags["BLOCKEVERYTHING"] = 32768] = "BLOCKEVERYTHING";
})(LinedefFlags || (LinedefFlags = {}));
class LiknedefEntry {
    vertexAIndex;
    vertexBIndex;
    flags; // u16
    linetype;
    tag;
    sidedefRight;
    sidedefLeft;
    vertexA;
    vertexB;
    constructor(reader, vertexes) {
        this.vertexAIndex = reader.readU16();
        this.vertexBIndex = reader.readU16();
        this.flags = reader.readU16();
        this.linetype = reader.readU16();
        this.tag = reader.readU16();
        this.sidedefRight = reader.readU16();
        this.sidedefLeft = reader.readU16();
        this.vertexA = vertexes[this.vertexAIndex];
        this.vertexB = vertexes[this.vertexBIndex];
    }
    hasFlag(flag) {
        return (this.flags & flag) == flag;
    }
    static readAll(entry, reader, vertexes) {
        return entry.readAll(reader, (reader) => new LiknedefEntry(reader, vertexes));
    }
}
var MapEntryName;
(function (MapEntryName) {
    MapEntryName["THINGS"] = "THINGS";
    MapEntryName["LINEDEFS"] = "LINEDEFS";
    MapEntryName["SIDEDEFS"] = "SIDEDEFS";
    MapEntryName["VERTEXES"] = "VERTEXES";
    MapEntryName["SEGS"] = "SEGS";
    MapEntryName["SSECTORS"] = "SSECTORS";
    MapEntryName["NODES"] = "NODES";
    MapEntryName["SECTORS"] = "SECTORS";
    MapEntryName["REJECT"] = "REJECT";
    MapEntryName["BLOCKMAP"] = "BLOCKMAP";
})(MapEntryName || (MapEntryName = {}));
class MapEntry {
    name;
    entries;
    vertexes;
    linedefs;
    things;
    reader;
    constructor(reader, name, entries) {
        this.reader = reader;
        this.name = name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LiknedefEntry.readAll(entries.linedefs, reader, this.vertexes);
        this.things = ThingEntry.readAll(entries.things, reader);
    }
    getNodes() {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }
    static loadAll(reader, entries) {
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
                maps.push(new MapEntry(reader, entry.name, {
                    map: entry,
                    things: demandNextEntry(MapEntryName.THINGS),
                    linedefs: demandNextEntry(MapEntryName.LINEDEFS),
                    sidedefs: demandNextEntry(MapEntryName.SIDEDEFS),
                    vertexes: demandNextEntry(MapEntryName.VERTEXES),
                    segs: demandNextEntry(MapEntryName.SEGS),
                    ssectors: demandNextEntry(MapEntryName.SSECTORS),
                    nodes: demandNextEntry(MapEntryName.NODES),
                    sectors: demandNextEntry(MapEntryName.SECTORS),
                    reject: demandNextEntry(MapEntryName.REJECT),
                    blockmap: demandNextEntry(MapEntryName.BLOCKMAP),
                }));
            }
        }
        return maps;
    }
}
class WadFile {
    file;
    reader;
    wadInfo;
    directory;
    maps;
    constructor(file) {
        this.file = file;
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadInfo(this.reader);
        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.loadAll(this.reader, this.directory);
    }
}
class MapView {
    canvas;
    wad;
    scale = 1;
    baseX;
    baseY;
    currentMap;
    canvasWidth;
    canvasHeight;
    constructor(canvas) {
        this.canvas = canvas;
        canvas.style.position = "fixed";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.baseX = canvas.width / 2;
        this.baseY = canvas.height / 2;
        this.wad = new Promise((resolve, _reject) => {
            new UserFileReader(canvas, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });
        document.addEventListener("wheel", (event) => {
            const step = event.shiftKey ? .1 : .025;
            this.scale += (event.deltaY < 0 ? 1 : -1) * step;
            if (this.scale < .025)
                this.scale = .025;
            // this.baseX += (event.offsetX - this.baseX) * .1;
            // this.baseY += (event.offsetY - this.baseY) * .1;
            this.redraw();
        });
        let isMouseDown = false;
        let lastMouseEvent = null;
        canvas.addEventListener("mousedown", (event) => {
            isMouseDown = true;
            lastMouseEvent = event;
        });
        canvas.addEventListener("mouseup", (_event) => {
            isMouseDown = false;
            lastMouseEvent = null;
        });
        canvas.addEventListener("mousemove", (event) => {
            if (isMouseDown == false)
                return;
            if (lastMouseEvent != null) {
                const deltaX = lastMouseEvent.x - event.x;
                const deltaY = lastMouseEvent.y - event.y;
                this.baseX -= deltaX;
                this.baseY -= deltaY;
                this.redraw();
            }
            lastMouseEvent = event;
        });
    }
    awaitingRender = false;
    redraw() {
        if (this.awaitingRender)
            return;
        this.awaitingRender = true;
        requestAnimationFrame(() => {
            this.redraw2d();
            this.awaitingRender = false;
        });
    }
    redraw3d() {
        const gl = this.canvas.getContext("webgl");
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const fieldOfView = 45 * Math.PI / 180; // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, // destination matrix
        modelViewMatrix, // matrix to translate
        [-0.0, 0.0, -6.0]); // amount to translate
        {
            const numComponents = 2; // pull out 2 values per iteration
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize
            const stride = 0; // how many bytes to get from one set of values to the next
            // 0 = use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            // gl.vertexAttribPointer(
            //     programInfo.attribLocations.vertexPosition,
            //     numComponents,
            //     type,
            //     normalize,
            //     stride,
            //     offset);
            // gl.enableVertexAttribArray(
            //     programInfo.attribLocations.vertexPosition);
        }
    }
    redraw2d() {
        const map = this.currentMap;
        if (map == null)
            return;
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        context.lineWidth = 1;
        for (const def of map.linedefs) {
            context.beginPath();
            context.strokeStyle = def.hasFlag(LinedefFlags.SECRET) ? "red" : "black";
            context.moveTo(def.vertexA.x * this.scale + this.baseX, def.vertexA.y * this.scale + this.baseY);
            context.lineTo(def.vertexB.x * this.scale + this.baseX, def.vertexB.y * this.scale + this.baseY);
            context.stroke();
        }
        for (const thing of map.things) {
            if (thing.description == null)
                continue;
            if (thing.description.sprite == ThingSprite.BON1) {
                context.beginPath();
                context.fillStyle = "blue";
                context.arc(thing.x * this.scale + this.baseX, thing.y * this.scale + this.baseY, thing.description.radius * this.scale, 0, Math.PI * 2);
                context.fill();
            }
            else {
                context.beginPath();
                context.strokeStyle = "green";
                const centerX = thing.x * this.scale + this.baseX;
                const centerY = thing.y * this.scale + this.baseY;
                context.arc(centerX, centerY, thing.description.radius * this.scale, 0, Math.PI * 2);
                context.moveTo(centerX, centerY);
                const lineLength = thing.description.radius * this.scale * 2;
                // context.lineTo(
                context.stroke();
            }
        }
    }
    async displayLevel(name) {
        const wad = await this.wad;
        this.currentMap = wad.maps.find((map) => map.name == name) ?? wad.maps[0];
        this.redraw();
    }
}
const el = document.querySelector(".loadingzone");
const mapView = new MapView(el);
mapView.displayLevel("MAP01");
