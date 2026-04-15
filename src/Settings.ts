interface Versioned {
    version: number;
}

interface Settings extends Versioned {
    version: number;
    wads: {[name: string]: WadSettings};
}

interface WadSettings extends Versioned {
    version: number;
    levelIndex: number;
    readonly cameraPosition: { x: number, y: number, z: number };
    cameraYaw: number;
    cameraPitch: number;
}

class SettingsStorage {
    private static readonly key: string = "Settings";
    private static storedSettings: Settings | undefined;

    private static getOrDefault<T extends Versioned>(key: string, def: () => T): T {
        const s = localStorage.getItem(key);
        if (s == null || s == "") return def();

        try {
            const parsed = JSON.parse(s);
            return parsed?.version == 1 ? parsed : def();
        } catch {
            return def();
        }
    }

    private static default(): Settings {
        return {
            version: 1,
            wads: {},
        }
    }

    private static defaultWad(): WadSettings {
        return {
            version: 1,
            levelIndex: -1,
            cameraPosition: { x: 0, y: 0, z: 0 },
            cameraYaw: 0,
            cameraPitch: 0,
        }
    }

    public static getSettings(): Settings {
        if (SettingsStorage.storedSettings == null) {
            SettingsStorage.storedSettings = SettingsStorage.getOrDefault<Settings>(SettingsStorage.key, SettingsStorage.default);
        }

        return SettingsStorage.storedSettings;
    }

    public static getWad(name: string): WadSettings {
        const settings = SettingsStorage.getSettings();
        if (settings.wads[name]?.version != 1) {
            settings.wads[name] = SettingsStorage.defaultWad();
        }

        return settings.wads[name];
    }

    public static readonly save = debounce(() => {
        if (SettingsStorage.storedSettings == null) return;

        const s = JSON.stringify(SettingsStorage.storedSettings);
        localStorage.setItem(SettingsStorage.key, s);
    }, 300);
}

function debounce<T extends (...args: any[]) => void>(func: T, delayMs: number): T {
    let timeout: number | undefined;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), delayMs);
    } as T;
}
