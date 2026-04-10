class ThingsViewerElements {
    public readonly thingSelect: HTMLSelectElement;
    public readonly closeButton: HTMLButtonElement;
    public readonly spritesSelect: HTMLSelectElement;
    public readonly spriteDisplay: HTMLCanvasElement;
    public readonly description: HTMLDivElement;

    constructor(dialog: HTMLDialogElement) {
        function find<T extends HTMLElement>(query: string): T {
            const element = dialog.querySelector(query);
            if (element == null) throw new Error(`Unable to find "${query}".`);
            return element as T;
        }

        this.thingSelect = find("select[name=thing]");
        this.closeButton = find("button[name=close]");
        this.spritesSelect = find("select[name=sprites]");
        this.spriteDisplay = find("canvas[name=spriteDisplay]");
        this.description = find("div.description");
    }
}

class ThingsViewerUI {
    private readonly dialog: HTMLDialogElement;
    private readonly elements: ThingsViewerElements;

    constructor(private readonly wad: WadFile) {
        const things = Object.entries(Things.descriptions)
            .map(([id, description]) => ({
                name: description.description,
                index: id
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        this.dialog = document.createElement("dialog");
        this.dialog.classList.add("thingsViewerDialog");
        this.dialog.innerHTML = `
                <label>Thing:</label>
                <select name="thing">
                    ${things.map((thing) => `<option value="${thing.index}">${Html.escape(thing.name)}</option>`).join("")}
                </select>
                <label>Sprites:</label>
                <select name="sprites"></select>
                <button name="close">Close</button>
                <div class="description"></div>
                <canvas name="spriteDisplay"></select>
            </form>
        `;

        this.elements = new ThingsViewerElements(this.dialog);

        this.elements.closeButton.addEventListener("click", _ => this.dialog.close());
        this.elements.thingSelect.addEventListener("change", (e) => this.onThingChanged(e));
        this.elements.spritesSelect.addEventListener("change", (e) => this.onSpriteChanged(e));
        this.dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") this.dialog.close(); });

        this.elements.thingSelect.dispatchEvent(new Event("change", { bubbles: true }));

        document.body.appendChild(this.dialog);
    }

    private onThingChanged(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const thingIndex = parseInt(select.value);
        const thingDescription = Things.descriptions[thingIndex];
        console.log("thingDescription", thingDescription);
        this.elements.description.textContent = JSON.stringify(thingDescription, undefined, 2);

        this.elements.spritesSelect.innerHTML = "";
        const images = this.wad.getImageData(thingDescription.sprite)
        for (const image of images) {
            const option = new Option(image.name, image.name);
            this.elements.spritesSelect.appendChild(option);
        }

        this.elements.spritesSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    private onSpriteChanged(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const spriteName = select.value;
        const context = this.elements.spriteDisplay.getContext("2d")!;
        const image = this.wad.getImageData(spriteName)[0];
        if (image == null) {
            console.error(`Unable to find image data for "${spriteName}".`);
            return;
        }

        this.elements.spriteDisplay.width = image.width;
        this.elements.spriteDisplay.height = image.height;
        context.putImageData(image, 0, 0);
    }

    public show(): void {
        this.dialog.show();
    }
}

class Html {
    private static readonly escapeElement = document.createElement("div");

    public static escape(text: string): string {
        Html.escapeElement.textContent = text;
        return Html.escapeElement.innerHTML;
    }
}
